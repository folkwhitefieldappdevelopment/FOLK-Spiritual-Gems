'use client';

import { db, persistenceReady } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  or,
  type DocumentSnapshot,
  limit,
  arrayUnion,
  Timestamp,
  serverTimestamp,
  documentId,
  onSnapshot,
  writeBatch,
  orderBy,
  getCountFromServer,
} from 'firebase/firestore';
import type { Person, AppUser, UserRole, FolkStage, CoEnablerSession, FilterState } from '@/lib/types';
import { isAssignedToUser, ELIMINATED_STATUSES } from '@/lib/types';
import { logAudit } from '@/services/audit-service';
import { generateDynamicGroups, dynamicGroupDefinitions } from '@/lib/dynamic-groups';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { createInitialProgress } from '@/lib/data';
import { safeDate } from '@/utils/date';
import { startOfDay, endOfDay } from 'date-fns';
import { getFolkGuides, getUsers, getAssignableUsersForAssignments } from '@/services/user-service';
import { getEnablers } from './settings-service';
import { updateContactCache } from './contact-cache-service';

const PAGE_SIZE = 100;
const MAX_ADMIN_LIMIT = 50000;
const SCOPED_LIMIT = 5000;

export type SyncStatus = 'initializing' | 'cached' | 'syncing' | 'synced' | 'timeout';

let masterPeopleCache: Person[] | null = null;
let masterPeopleMap: Map<string, Person> = new Map();
let masterUnsubscribe: (() => void) | null = null;
let cachePromise: Promise<Person[]> | null = null;
let currentSyncStatus: SyncStatus = 'initializing';
let currentSyncWarning: string | null = null;

export const getSyncStatus = () => currentSyncStatus;
export const getSyncWarning = () => currentSyncWarning;

const updateSyncStatus = (status: SyncStatus, warning: string | null = null) => {
  currentSyncStatus = status;
  currentSyncWarning = warning;
  statusListeners.forEach(l => l(status, warning));
};

export const subscribeToSyncStatus = (callback: (status: SyncStatus, warning: string | null) => void) => {
  statusListeners.add(callback);
  callback(currentSyncStatus, currentSyncWarning);
  return () => statusListeners.delete(callback);
};

export const subscribeToPeopleData = (callback: (people: Person[]) => void) => {
  dataListeners.add(callback);
  if (masterPeopleCache) callback(masterPeopleCache);
  return () => dataListeners.delete(callback);
};

/**
 * Initializes a role-aware master stream to optimize Firestore costs.
 * Folk Enablers only sync their assigned contacts.
 */
export const initMasterPeopleStream = (user: AppUser): Promise<Person[]> => {
  if (cachePromise) return cachePromise;

  cachePromise = new Promise((resolve) => {
    const peopleRef = collection(db!, 'people');
    let q;

    const isAdmin = user.role.includes('Admin');
    const isGuide = user.role.includes('Folk Guide') && !isAdmin;

    if (isAdmin) {
      q = query(peopleRef, orderBy(documentId()), limit(MAX_ADMIN_LIMIT));
    } else if (isGuide) {
      q = query(peopleRef, where('folkGuideId', '==', user.id), limit(SCOPED_LIMIT));
    } else {
      // Scoped query for Enablers (My Contacts + Co-Enabler assignments)
      q = query(
        peopleRef, 
        or(where('enablerId', '==', user.id), where('coEnablerId', '==', user.id)),
        limit(SCOPED_LIMIT)
      );
    }
    
    let resolved = false;

    const safetyTimeout = setTimeout(() => {
      if (!resolved) {
        updateSyncStatus('timeout');
        resolved = true;
        resolve(masterPeopleCache || []);
      }
    }, 10000);

    masterUnsubscribe = onSnapshot(q, async (snap) => {
      const results: Person[] = [];
      const newMap = new Map<string, Person>();

      snap.docs.forEach((d) => {
        const p = processPersonDoc(d);
        results.push(p);
        newMap.set(p.id, p);
      });

      masterPeopleCache = results;
      masterPeopleMap = newMap;
      
      updateContactCache(results);

      const isFromCache = snap.metadata.fromCache;
      const isSyncing = snap.metadata.hasPendingWrites;
      
      // Verification logic for missing records in large sets
      let warning: string | null = null;
      if (!isFromCache && isAdmin) {
          try {
            const countSnap = await getCountFromServer(peopleRef);
            const serverCount = countSnap.data().count;
            if (serverCount > results.length) {
                warning = `Loaded ${results.length.toLocaleString()} of ${serverCount.toLocaleString()} contacts — some records may be hidden due to system limits.`;
            }
          } catch (e) {
            console.warn("Count check failed", e);
          }
      }

      if (!isFromCache && !isSyncing) {
        updateSyncStatus('synced', warning);
      } else if (isSyncing || !isFromCache) {
        updateSyncStatus('syncing', warning);
      } else {
        updateSyncStatus('cached', warning);
      }

      dataListeners.forEach(l => l(results));

      if (!resolved) {
        clearTimeout(safetyTimeout);
        resolved = true;
        resolve(results);
      }
    }, (err) => {
      console.error("[MasterStream] Listener failed:", err);
      if (!resolved) {
        clearTimeout(safetyTimeout);
        resolved = true;
        resolve([]);
      }
    });
  });

  return cachePromise;
};

export const getCachedPeople = async (): Promise<Person[]> => {
  if (masterPeopleCache) return masterPeopleCache;
  return []; // Should be initialized via App Shell first
};

export const normalizePhone = (phone: string): string => {
  return String(phone || '').replace(/\D/g, '').slice(-10);
};

const sanitizeData = (data: any): any => {
  if (data === undefined) return null;
  if (Array.isArray(data)) return data.map(sanitizeData);
  if (data !== null && typeof data === 'object' && data.constructor === Object) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }
  return data;
};

export const processPersonDoc = (doc: DocumentSnapshot): Person => {
  const data = doc.data() as any;
  if (!data.fullName) {
    if (data.firstName || data.lastName) {
      data.fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    } else {
      data.fullName = 'Unknown Contact';
    }
  }
  if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate().toISOString();
  if (data.lastCallAt?.toDate) data.lastCallAt = data.lastCallAt.toDate().toISOString();
  if (Array.isArray(data.callHistory)) {
    data.callHistory = data.callHistory.map((log: any) => {
      if (log.calledAt?.toDate) log.calledAt = log.calledAt.toDate().toISOString();
      return log;
    });
  }
  return { id: doc.id, ...data } as Person;
};

export async function getPeopleByIds(ids: string[]): Promise<Person[]> {
  if (ids.length === 0) return [];
  const cached = ids.map(id => masterPeopleMap.get(id)).filter((p): p is Person => !!p);
  if (cached.length === ids.length) return cached;

  const peopleCollection = collection(db!, 'people');
  const results: Person[] = [];
  const CHUNK_SIZE = 30;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const q = query(peopleCollection, where(documentId(), 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      results.push(processPersonDoc(d));
    });
  }
  return results;
}

export const getPersonByPhone = async (phone: string, userInfo: { id: string; name: string; role: UserRole[] }): Promise<Person | null> => {
  const norm = normalizePhone(phone);
  if (norm.length < 10) return null;
  const isAdmin = userInfo.role.includes('Admin');
  if (masterPeopleCache) {
    const match = masterPeopleCache.find(p => normalizePhone(p.phone) === norm);
    if (match) return (isAdmin || isAssignedToUser(match, userInfo)) ? match : null;
  }
  const peopleRef = collection(db!, 'people');
  const q = query(peopleRef, where('phone', '==', norm), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const p = processPersonDoc(snap.docs[0]);
  return (isAdmin || isAssignedToUser(p, userInfo)) ? p : null;
};

export async function getPeopleForReminders(userInfo: { id: string; name: string; role: UserRole[] }): Promise<Person[]> {
  const allResults = await getCachedPeople();
  return allResults.filter(p => p.nextFollowUpAt && isAssignedToUser(p, userInfo));
}

export const getPeople = async (
  userInfo: { id: string; name: string; role: UserRole[] },
  options: {
    groupId?: string;
    personIds?: string[];
    scope?: 'all' | 'my';
    filters?: Partial<FilterState>;
    lastDocId?: string;
    ignoreLimit?: boolean;
  } = {}
): Promise<{ people: Person[]; lastDocId: string | null; totalCount: number | null }> => {
  const { groupId, personIds, filters = {}, ignoreLimit = false } = options;
  let allResults = await getCachedPeople();
  let basePeople: Person[] = [];

  if (personIds !== undefined) {
    basePeople = allResults.filter(p => personIds.includes(p.id));
    if (basePeople.length < personIds.length) {
      const missingIds = personIds.filter(id => !masterPeopleMap.has(id));
      if (missingIds.length > 0) {
          const freshDocs = await getPeopleByIds(missingIds);
          freshDocs.forEach(d => masterPeopleMap.set(d.id, d));
          basePeople = allResults.filter(p => personIds.includes(p.id));
      }
    }
  } else if (groupId) {
    if (groupId.startsWith('dynamic-')) {
      const dynamicGroups = generateDynamicGroups(allResults);
      const idsToFetch = dynamicGroups.find((g) => g.id === groupId)?.peopleIds || [];
      basePeople = allResults.filter((p) => idsToFetch.includes(p.id));
    } else {
      const groupDoc = await getDoc(doc(db!, 'groups', groupId));
      const idsInGroup = groupDoc.exists() ? groupDoc.data()?.peopleIds || [] : [];
      basePeople = allResults.filter(p => idsInGroup.includes(p.id));
    }
  } else {
    basePeople = allResults;
  }

  const applyUIFilters = (list: Person[]) => {
    return list.filter((p) => {
      const isExplicitRequest = personIds !== undefined;
      const isDesignatedGroup = groupId === 'dynamic-recycle-bin' || groupId === 'dynamic-shifted-not-interested';
      
      if (!isExplicitRequest && !isDesignatedGroup) {
        if (p.isDeleted === true) return false;
        if (ELIMINATED_STATUSES.includes(p.lastCallStatus || '')) return false;
      }

      if (filters.stage && filters.stage !== '__ALL__' && p.currentFolkStage !== filters.stage) return false;
      
      if (filters.enablerId && filters.enablerId !== '__ALL__') {
          if (filters.enablerId === '__UNASSIGNED__') {
              if (p.enablerId || p.enablerInTouchWith) return false;
          } else {
              const parts = filters.enablerId.split('::');
              const id = parts.length > 1 ? parts[1] : parts[0];
              const nameFallback = parts.length > 1 ? parts[0] : filters.enablerName;

              const matchesId = p.enablerId === id;
              const matchesNameFallback = !p.enablerId && nameFallback && p.enablerInTouchWith?.split('::')[0].trim() === nameFallback.trim();
              if (!matchesId && !matchesNameFallback) return false;
          }
      }
      
      const rounds = p.chantingStatus || 0;
      if (filters.chantingRoundsMin || filters.chantingRoundsMax) {
          if (filters.chantingRoundsMin) {
              const min = parseInt(filters.chantingRoundsMin);
              if (rounds < min) return false;
          }
          if (filters.chantingRoundsMax) {
              const max = parseInt(filters.chantingRoundsMax);
              if (rounds > max) return false;
          }
      } else if (filters.chantingRounds) {
        const target = parseInt(filters.chantingRounds);
        if (rounds !== target) return false;
      }

      if (filters.name && !p.fullName?.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.phone && !normalizePhone(p.phone).includes(normalizePhone(filters.phone))) return false;
      if (filters.location && !p.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.stayingWith && p.stayingWith !== filters.stayingWith) return false;
      if (filters.callStatus && p.lastCallStatus !== filters.callStatus) return false;
      
      if (filters.contactSources && filters.contactSources.length > 0) {
        const pSources = p.contactSource || [];
        if (!filters.contactSources.some(s => pSources.includes(s))) return false;
      }
      if (filters.eventName || filters.callerName || filters.callDateFrom || filters.callDateTo) {
        const logs = p.callHistory || [];
        const match = logs.some(log => {
          const logDate = safeDate(log.calledAt);
          let dateMatch = true;
          if (filters.callDateFrom && logDate) dateMatch = dateMatch && logDate >= startOfDay(new Date(filters.callDateFrom));
          if (filters.callDateTo && logDate) dateMatch = dateMatch && logDate <= endOfDay(new Date(filters.callDateTo));
          const eventMatch = filters.eventName ? log.event?.toLowerCase().includes(filters.eventName.toLowerCase()) : true;
          const callerMatch = filters.callerName ? log.callerName?.toLowerCase().includes(filters.callerName.toLowerCase()) : true;
          return dateMatch && eventMatch && callerMatch;
        });
        if (!match) return false;
      }
      return true;
    });
  };

  let filtered = basePeople;
  if (options.scope === 'my') {
    if (userInfo.role.includes('Folk Guide')) {
      const teamMembers = await getAssignableUsersForAssignments(userInfo as any);
      const teamIds = new Set(teamMembers.map(u => u.id));
      const teamNames = new Set(teamMembers.map(u => (u.name || '').trim().toLowerCase()));
      filtered = basePeople.filter(p =>
        isAssignedToUser(p, userInfo) ||
        (p.enablerId && teamIds.has(p.enablerId)) ||
        (!p.enablerId && p.enablerInTouchWith && teamNames.has(p.enablerInTouchWith.split('::')[0].trim().toLowerCase()))
      );
    } else {
      filtered = basePeople.filter(p => isAssignedToUser(p, userInfo));
    }
  }

  const uiFiltered = applyUIFilters(filtered);
  const sorted = uiFiltered.sort((a, b) => {
    const da = safeDate(a.createdAt)?.getTime() || 0;
    const db = safeDate(b.createdAt)?.getTime() || 0;
    if (da !== db) return db - da;
    return (a.fullName || '').localeCompare(b.fullName || '');
  });

  if (ignoreLimit) return { people: sorted, lastDocId: null, totalCount: sorted.length };
  
  let startIndex = 0;
  if (options.lastDocId) {
    const idx = sorted.findIndex(p => p.id === options.lastDocId);
    startIndex = idx >= 0 ? idx + 1 : 0;
  }
  const slice = sorted.slice(startIndex, startIndex + PAGE_SIZE);
  const lastId = (startIndex + PAGE_SIZE) < sorted.length ? sorted[startIndex + PAGE_SIZE - 1].id : null;
  return { people: slice, lastDocId: lastId, totalCount: sorted.length };
};

export const getUnassignedPeople = async (userInfo: AppUser) => {
  const { people } = await getPeople(userInfo, { scope: 'all', ignoreLimit: true });
  const unassigned = people.filter(p => !p.enablerId && !p.enablerInTouchWith && p.isDeleted !== true);
  const enablerStats: Record<string, number> = {};
  people.forEach(p => {
    if (p.enablerInTouchWith && p.isDeleted !== true) {
      const name = p.enablerInTouchWith.split('::')[0];
      enablerStats[name] = (enablerStats[name] || 0) + 1;
    }
  });
  return { people: unassigned, totalCount: unassigned.length, enablerStats };
};

export const getDynamicGroupCounts = async (userInfo: { id: string; name: string; role: UserRole[] }, viewScope: string): Promise<Record<string, number>> => {
  const results = await getCachedPeople();
  const filteredResults = viewScope === 'mine' ? results.filter((p) => isAssignedToUser(p, userInfo)) : results;
  const counts: Record<string, number> = {};
  dynamicGroupDefinitions.forEach((def) => { counts[def.id] = filteredResults.filter((p) => p.isDeleted !== true).filter(def.filter).length; });
  counts['dynamic-recycle-bin'] = filteredResults.filter((p) => p.isDeleted === true).length;
  return counts;
};

export const getLiveGroupMemberCounts = async (
  groups: { id: string; peopleIds: string[] }[]
): Promise<Record<string, number>> => {
  const allResults = await getCachedPeople();
  const counts: Record<string, number> = {};
  for (const g of groups) {
    const idSet = new Set(g.peopleIds || []);
    counts[g.id] = allResults.filter(p =>
      idSet.has(p.id) &&
      p.isDeleted !== true &&
      !ELIMINATED_STATUSES.includes(p.lastCallStatus || '')
    ).length;
  }
  return counts;
};

export const getPerson = async (id: string): Promise<Person | null> => {
  if (!id) return null;
  if (masterPeopleMap.has(id)) return masterPeopleMap.get(id)!;
  const docRef = doc(db!, 'people', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? processPersonDoc(docSnap) : null;
};

export const createPerson = async (data: Partial<Person>, userInfo: { id: string; name: string; role: UserRole[] }): Promise<{ success: boolean; message?: string; person?: Person }> => {
  await persistenceReady;
  const docRef = doc(collection(db!, 'people'));
  const normPhone = normalizePhone(data.phone!);
  const finalData = sanitizeData({ ...data, phone: normPhone, createdAt: serverTimestamp(), isDeleted: false, fullName_lowercase: (data.fullName || '').toLowerCase(), progress: data.progress && data.progress.length > 0 ? data.progress : createInitialProgress() });
  try {
    await setDoc(docRef, finalData);
    logAudit('Create Contact', `Created: ${data.fullName}`, userInfo);
    return { success: true, person: { id: docRef.id, ...finalData } as Person };
  } catch (err: any) {
    errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'create', requestResourceData: finalData }));
    return { success: false, message: 'Database error.' };
  }
};

export const updatePerson = async (id: string, data: Partial<Person>, userInfo?: { id: string; name: string; role: UserRole[] }): Promise<{ success: boolean; message?: string }> => {
  await persistenceReady;
  const docRef = doc(db!, 'people', id);
  const { callHistory, ...rest } = data;
  const finalData = sanitizeData(rest);
  if (finalData.lastCallAt === '__now__') finalData.lastCallAt = serverTimestamp();
  if (finalData.fullName) finalData.fullName_lowercase = finalData.fullName.toLowerCase();
  if (callHistory && Array.isArray(callHistory)) {
    const sanitizedLogs = callHistory.map((log) => {
      const sLog = sanitizeData(log);
      if (sLog.calledAt === '__now__' || !sLog.calledAt) sLog.calledAt = serverTimestamp();
      else if (typeof sLog.calledAt === 'string') sLog.calledAt = Timestamp.fromDate(new Date(sLog.calledAt));
      return sLog;
    });
    finalData.callHistory = arrayUnion(...sanitizedLogs);
  }
  try {
    await updateDoc(docRef, finalData);
    if (userInfo) logAudit('Update Contact', `Updated: ${id}`, userInfo);
    return { success: true };
  } catch (err: any) {
    errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: finalData }));
    return { success: false, message: 'Update failed.' };
  }
};

export const upsertPerson = async (data: Partial<Person>, userInfo: { id: string; name: string; role: UserRole[] }): Promise<{ success: boolean; message?: string; person?: Person }> => {
  const q = query(collection(db!, 'people'), where('phone', '==', normalizePhone(data.phone!)), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const existing = processPersonDoc(snap.docs[0]);
    const result = await updatePerson(existing.id, data, userInfo);
    return { ...result, person: { ...existing, ...data } as Person };
  }
  return createPerson(data, userInfo);
};

export const checkDuplicatePhone = async (phone: string, excludeId?: string): Promise<Person | null> => {
  const norm = normalizePhone(phone);
  if (norm.length < 10) return null;
  if (masterPeopleCache) {
    const match = masterPeopleCache.find(p => normalizePhone(p.phone) === norm && p.id !== excludeId);
    if (match) return match;
  }
  const q = query(collection(db!, 'people'), where('phone', '==', norm), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const p = processPersonDoc(snap.docs[0]);
  return p.id === excludeId ? null : p;
};

export const deletePerson = async (id: string, userInfo: { id: string; name: string; role: UserRole[] }) => {
  return updatePerson(id, { isDeleted: true, deletedAt: serverTimestamp() }, userInfo);
};

export const restorePerson = async (personId: string, userInfo: { id: string; name: string; role: UserRole[] }) => {
  await persistenceReady;
  const docRef = doc(db!, 'people', personId);
  await updateDoc(docRef, {
    isDeleted: false,
    deletedAt: null,
    lastCallStatus: null,
  });
  logAudit('Restore Contact', `Restored contact ${personId}`, userInfo);
};

export const deletePeople = async (ids: string[], userInfo: { id: string; name: string; role: UserRole[] }) => {
  for (const id of ids) await deletePerson(id, userInfo);
};

export const importPeople = async (
  peopleData: any[], 
  userInfo: AppUser, 
  onProgress?: (current: number, total: number) => void
) => {
  let successCount = 0;
  const errors: { name: string; phone: string; error: string }[] = [];
  const total = peopleData.length;

  const isAdmin = userInfo.role.includes('Admin');
  const isGuide = userInfo.role.includes('Folk Guide') && !isAdmin;
  const isEnabler = userInfo.role.includes('Folk Enabler') && !isGuide && !isAdmin;

  let teamOptions: EnablerOption[] = [];
  if (isGuide) {
      teamOptions = await getEnablers(userInfo, 'assignment');
  }

  for (let i = 0; i < total; i++) {
    const p = peopleData[i];
    try {
      if (!p.phone) throw new Error("Phone number is required.");
      const existingMatch = await checkDuplicatePhone(p.phone);
      if (!existingMatch && !p.fullName) throw new Error("Full name is required for new contacts.");

      if (isEnabler) {
          p.enablerInTouchWith = userInfo.name;
          p.enablerId = userInfo.id;
          p.folkGuideId = userInfo.reportsTo?.guideId || '';
          p.folkGuide = userInfo.reportsTo ? `${userInfo.reportsTo.guideName} (${userInfo.reportsTo.guideFgCode})` : '';
      } else if (isGuide) {
          p.folkGuideId = userInfo.id;
          p.folkGuide = `${userInfo.name} (${userInfo.fgCode || 'N/A'})`;
          
          const rowEnabler = (p.enablerInTouchWith || '').split('::')[0].trim().toLowerCase();
          const match = teamOptions.find(t => t.label.toLowerCase() === rowEnabler);
          if (match) {
              p.enablerInTouchWith = match.label;
              p.enablerId = match.value.split('::')[1];
          } else {
              p.enablerInTouchWith = userInfo.name;
              p.enablerId = userInfo.id;
          }
      }

      const result = await upsertPerson(p, { id: userInfo.id, name: userInfo.name, role: userInfo.role });
      if (result.success) successCount++; 
      else errors.push({ name: p.fullName, phone: p.phone, error: result.message || 'Validation failed' });
    } catch (e: any) { 
      errors.push({ name: p.fullName || 'Unknown', phone: p.phone || 'N/A', error: e.message || 'System error' }); 
    }
    if (onProgress) onProgress(i + 1, total);
  }
  return { successCount, errors };
};

export const assignEnablerToPeople = async (personIds: string[], enabler: AppUser, userInfo: { id: string; name: string; role: UserRole[] }) => {
  for (const id of personIds) await updatePerson(id, { enablerInTouchWith: enabler.name, enablerId: enabler.id }, userInfo);
};

export const assignCoEnablerToPeople = async (personIds: string[], coEnabler: AppUser | null, userInfo: { id: string; name: string; role: UserRole[] }) => {
  for (const id of personIds) await updatePerson(id, { coEnablerName: coEnabler?.name || null, coEnablerId: coEnabler?.id || null }, userInfo);
};

export const assignCoEnablerSession = async (personIds: string[], sessionData: Omit<CoEnablerSession, 'id'>, userInfo: AppUser): Promise<string> => {
  await persistenceReady;
  const sessionRef = doc(collection(db!, 'co_enabler_sessions'));
  await setDoc(sessionRef, { ...sessionData, createdAt: serverTimestamp() });
  logAudit('Create Co-Enabler Session', `Created external session for task: ${sessionData.task}`, { id: userInfo.id, name: userInfo.name, role: userInfo.role });
  return sessionRef.id;
};

export const updatePeopleContactSource = async (personIds: string[], sources: string[], userInfo: { id: string; name: string; role: UserRole[] }) => {
  for (const id of personIds) await updatePerson(id, { contactSource: sources }, userInfo);
};

export const bulkUpdatePeopleFields = async (
  personIds: string[],
  fields: Partial<Person>,
  userInfo: { id: string; name: string; role: UserRole[] }
) => {
  for (const id of personIds) await updatePerson(id, fields, userInfo);
};

export const scanForDuplicates = async (userInfo: { id: string; name: string; role: UserRole[] }) => {
  const results = await getCachedPeople();
  const phoneMap = new Map<string, Person[]>();
  results.forEach(p => { const norm = normalizePhone(p.phone); if (!phoneMap.has(norm)) phoneMap.set(norm, []); phoneMap.get(norm)!.push(p); });
  const duplicates: Record<string, Person[]> = {};
  phoneMap.forEach((list, phone) => { if (list.length > 1) duplicates[phone] = list; });
  return duplicates;
};

export const findDuplicateContacts = async (): Promise<Record<string, Person[]>> => {
  const allPeople = await getCachedPeople();
  const phoneMap = new Map<string, Person[]>();

  allPeople.forEach(p => {
    if (p.isDeleted) return;
    const norm = normalizePhone(p.phone);
    if (!norm || norm.length < 10) return;
    
    if (!phoneMap.has(norm)) {
      phoneMap.set(norm, []);
    }
    phoneMap.get(norm)!.push(p);
  });

  const duplicates: Record<string, Person[]> = {};
  phoneMap.forEach((list, phone) => {
    if (list.length > 1) {
      duplicates[phone] = list;
    }
  });

  return duplicates;
};

export const mergeContacts = async (keepId: string, discardIds: string[], userInfo: { id: string; name: string; role: UserRole[] }) => {
  await persistenceReady;
  const keepRef = doc(db!, 'people', keepId);
  const keepSnap = await getDoc(keepRef);
  if (!keepSnap.exists()) throw new Error("Target contact not found.");
  
  const keepData = processPersonDoc(keepSnap);
  const discards = await getPeopleByIds(discardIds);
  
  const updates: any = {};
  let mergedCallHistory = [...(keepData.callHistory || [])];
  let mergedAttendanceHistory = [...(keepData.attendanceHistory || [])];

  discards.forEach(d => {
    const fieldsToMerge: (keyof Person)[] = [
      'location', 'nativePlace', 'stayingWith', 'occupation', 'organisation', 
      'folkId', 'rentDetails', 'relationshipStatus', 'customData', 'photoUrl',
      'currentFolkStage', 'enablerInTouchWith', 'enablerId', 'folkGuide', 'folkGuideId'
    ];

    fieldsToMerge.forEach(field => {
      if (!keepData[field] && d[field]) {
        updates[field] = d[field];
      }
    });

    if (d.callHistory && Array.isArray(d.callHistory)) {
      mergedCallHistory = [...mergedCallHistory, ...d.callHistory];
    }
    if (d.attendanceHistory && Array.isArray(d.attendanceHistory)) {
      mergedAttendanceHistory = [...mergedAttendanceHistory, ...d.attendanceHistory];
    }
  });

  mergedCallHistory.sort((a, b) => {
    const da = a.calledAt ? new Date(a.calledAt as string).getTime() : 0;
    const db = b.calledAt ? new Date(b.calledAt as string).getTime() : 0;
    return db - da;
  });

  const docRef = doc(db!, 'people', keepId);
  await updateDoc(docRef, {
      ...updates,
      callHistory: mergedCallHistory,
      attendanceHistory: mergedAttendanceHistory,
  });
  
  const batch = writeBatch(db!);
  discardIds.forEach(id => {
    batch.delete(doc(db!, 'people', id));
  });
  await batch.commit();

  await logAudit('Merge Contacts', `Merged ${discardIds.length} duplicates into ${keepData.fullName}`, userInfo);
};

export const backfillIsDeleted = async (userInfo: { id: string; name: string; role: UserRole[] }) => {
  await persistenceReady;
  const peopleRef = collection(db!, 'people');
  const snap = await getDocs(query(peopleRef, limit(1000)));
  let count = 0;
  for (const d of snap.docs) { if (d.data().isDeleted === undefined) { await updateDoc(d.ref, { isDeleted: false }); count++; } }
  return count;
};

export const backfillEnablerId = async (allUsers: AppUser[], userInfo: { id: string; name: string; role: UserRole[] }) => {
  await persistenceReady;
  const peopleRef = collection(db!, 'people');
  const snap = await getDocs(query(peopleRef, limit(1000)));
  let count = 0;
  const userMap = new Map<string, string>();
  allUsers.forEach(u => userMap.set(u.name.toLowerCase().trim(), u.id));
  for (const d of snap.docs) {
    const data = d.data();
    if (data.enablerInTouchWith && !data.enablerId) {
      const name = data.enablerInTouchWith.split('::')[0].toLowerCase().trim();
      const id = userMap.get(name);
      if (id) { await updateDoc(d.ref, { enablerId: id }); count++; }
    }
  }
  return count;
};

const statusListeners = new Set<(status: SyncStatus, warning: string | null) => void>();
const dataListeners = new Set<(people: Person[]) => void>();
