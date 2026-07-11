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
  type DocumentSnapshot,
  limit,
  arrayUnion,
  Timestamp,
  serverTimestamp,
  documentId,
  onSnapshot,
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

const PAGE_SIZE = 100;
const MAX_FIRESTORE_LIMIT = 5000;

export type SyncStatus = 'initializing' | 'cached' | 'syncing' | 'synced' | 'timeout';

let masterPeopleCache: Person[] | null = null;
let masterPeopleMap: Map<string, Person> = new Map();
let masterUnsubscribe: (() => void) | null = null;
let cachePromise: Promise<Person[]> | null = null;
let currentSyncStatus: SyncStatus = 'initializing';

// Callback registry for reactive UI updates
const statusListeners = new Set<(status: SyncStatus) => void>();
const dataListeners = new Set<(people: Person[]) => void>();

export const getSyncStatus = () => currentSyncStatus;

const updateSyncStatus = (status: SyncStatus) => {
  currentSyncStatus = status;
  statusListeners.forEach(l => l(status));
};

/**
 * Components can subscribe to the sync status (e.g. to show a "Syncing..." spinner)
 */
export const subscribeToSyncStatus = (callback: (status: SyncStatus) => void) => {
  statusListeners.add(callback);
  callback(currentSyncStatus);
  return () => statusListeners.delete(callback);
};

/**
 * Components can subscribe to people data for reactive re-rendering as snapshots arrive.
 */
export const subscribeToPeopleData = (callback: (people: Person[]) => void) => {
  dataListeners.add(callback);
  if (masterPeopleCache) callback(masterPeopleCache);
  return () => dataListeners.delete(callback);
};

/**
 * Core stream initializer. 
 * Resolves as soon as cache is available or after a 6s safety timeout.
 */
export const initMasterPeopleStream = (): Promise<Person[]> => {
  if (cachePromise) return cachePromise;

  cachePromise = new Promise((resolve) => {
    const peopleRef = collection(db, 'people');
    const q = query(peopleRef, limit(MAX_FIRESTORE_LIMIT));
    
    let resolved = false;

    // Timeout safety: Resolve after 6 seconds even if the network is dead
    const safetyTimeout = setTimeout(() => {
      if (!resolved) {
        console.warn("[Sync] Initial snapshot timeout. Showing cached/empty data.");
        updateSyncStatus('timeout');
        resolved = true;
        resolve(masterPeopleCache || []);
      }
    }, 6000);

    masterUnsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
      const results: Person[] = [];
      const newMap = new Map<string, Person>();

      snap.docs.forEach((d) => {
        const p = processPersonDoc(d);
        results.push(p);
        newMap.set(p.id, p);
      });

      masterPeopleCache = results;
      masterPeopleMap = newMap;
      
      const isFromCache = snap.metadata.fromCache;
      const isSyncing = snap.metadata.hasPendingWrites || !snap.metadata.fromCache;
      
      if (!isFromCache) {
        updateSyncStatus('synced');
      } else if (isSyncing) {
        updateSyncStatus('syncing');
      } else {
        updateSyncStatus('cached');
      }

      // Notify all data listeners for instant UI updates
      dataListeners.forEach(l => l(results));

      // Resolve the promise as soon as we have "something" (cache or net)
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
  return initMasterPeopleStream();
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

  const peopleCollection = collection(db, 'people');
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
  if (masterPeopleCache) {
    const match = masterPeopleCache.find(p => normalizePhone(p.phone) === norm);
    if (match) return isAssignedToUser(match, userInfo) ? match : null;
  }
  const peopleRef = collection(db, 'people');
  const q = query(peopleRef, where('phone', '==', norm), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const p = processPersonDoc(snap.docs[0]);
  return isAssignedToUser(p, userInfo) ? p : null;
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
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      const idsInGroup = groupDoc.exists() ? groupDoc.data()?.peopleIds || [] : [];
      basePeople = allResults.filter(p => idsInGroup.includes(p.id));
    }
  } else {
    basePeople = allResults;
  }

  const applyUIFilters = (list: Person[]) => {
    return list.filter((p) => {
      // Global exclusion for deleted or eliminated contacts, 
      // unless specifically requested by ID or within their designated dynamic groups
      const isExplicitRequest = personIds && personIds.length > 0;
      const isDesignatedGroup = groupId === 'dynamic-recycle-bin' || groupId === 'dynamic-shifted-not-interested';
      
      if (!isExplicitRequest && !isDesignatedGroup) {
        if (p.isDeleted === true) return false;
        if (ELIMINATED_STATUSES.includes(p.lastCallStatus || '')) return false;
      }

      // New deep-link filters
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
      
      if (filters.chantingRoundsMin) {
          const min = parseInt(filters.chantingRoundsMin);
          if ((p.chantingStatus || 0) < min) return false;
      } else if (filters.chantingRounds && filters.chantingRounds !== '__ALL__') {
        const rounds = parseInt(filters.chantingRounds);
        if (p.chantingStatus !== rounds) return false;
      }

      if (filters.name && !p.fullName?.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.phone && !normalizePhone(p.phone).includes(normalizePhone(filters.phone))) return false;
      if (filters.location && !p.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.stayingWith && p.stayingWith !== filters.stayingWith) return false;
      if (filters.callStatus && filters.callStatus !== '__ALL__' && p.lastCallStatus !== filters.callStatus) return false;
      
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

  const filtered = options.scope === 'my' ? basePeople.filter(p => isAssignedToUser(p, userInfo)) : basePeople;
  const uiFiltered = applyUIFilters(filtered);
  const sorted = uiFiltered.sort((a, b) => {
    const da = safeDate(a.createdAt)?.getTime() || 0;
    const db = safeDate(b.createdAt)?.getTime() || 0;
    if (da !== db) return db - da;
    return (a.fullName || '').localeCompare(b.fullName || '');
  });

  if (ignoreLimit) return { people: sorted, lastDocId: null, totalCount: sorted.length };
  const slice = sorted.slice(0, PAGE_SIZE);
  const lastId = sorted.length > PAGE_SIZE ? sorted[PAGE_SIZE - 1].id : null;
  return { people: slice, lastId: lastId, totalCount: sorted.length };
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

/**
 * Computes live member counts for static groups by filtering the people cache.
 * Excludes soft-deleted and eliminated contacts to ensure UI consistency.
 */
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
  const docRef = doc(db, 'people', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? processPersonDoc(docSnap) : null;
};

export const createPerson = async (data: Partial<Person>, userInfo: { id: string; name: string; role: UserRole[] }): Promise<{ success: boolean; message?: string; person?: Person }> => {
  await persistenceReady;
  const docRef = doc(collection(db, 'people'));
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
  const docRef = doc(db, 'people', id);
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
  const q = query(collection(db, 'people'), where('phone', '==', normalizePhone(data.phone!)), limit(1));
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
  const q = query(collection(db, 'people'), where('phone', '==', norm), limit(1));
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
  const docRef = doc(db, 'people', personId);
  await updateDoc(docRef, {
    isDeleted: false,
    deletedAt: null,
    lastCallStatus: null, // Clearing this re-includes them in their prior stage dynamic group
  });
  logAudit('Restore Contact', `Restored contact ${personId}`, userInfo);
};

export const deletePeople = async (ids: string[], userInfo: { id: string; name: string; role: UserRole[] }) => {
  for (const id of ids) await deletePerson(id, userInfo);
};

export const importPeople = async (peopleData: any[], userInfo: { id: string; name: string; role: UserRole[] }, onProgress?: (current: number, total: number) => void) => {
  let successCount = 0;
  const errors: { name: string; phone: string; error: string }[] = [];
  const total = peopleData.length;
  for (let i = 0; i < total; i++) {
    const p = peopleData[i];
    try {
      if (!p.fullName || !p.phone) throw new Error("Missing required field.");
      const result = await upsertPerson(p, userInfo);
      if (result.success) successCount++; else errors.push({ name: p.fullName, phone: p.phone, error: result.message || 'Validation failed' });
    } catch (e: any) { errors.push({ name: p.fullName || 'Unknown', phone: p.phone || 'N/A', error: e.message || 'System error' }); }
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
  const sessionRef = doc(collection(db, 'co_enabler_sessions'));
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

export const backfillIsDeleted = async (userInfo: { id: string; name: string; role: UserRole[] }) => {
  await persistenceReady;
  const peopleRef = collection(db, 'people');
  const snap = await getDocs(query(peopleRef, limit(MAX_FIRESTORE_LIMIT)));
  let count = 0;
  for (const d of snap.docs) { if (d.data().isDeleted === undefined) { await updateDoc(d.ref, { isDeleted: false }); count++; } }
  return count;
};

export const backfillEnablerId = async (allUsers: AppUser[], userInfo: { id: string; name: string; role: UserRole[] }) => {
  await persistenceReady;
  const peopleRef = collection(db, 'people');
  const snap = await getDocs(query(peopleRef, limit(MAX_FIRESTORE_LIMIT)));
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
