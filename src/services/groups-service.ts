'use client';

import { db, persistenceReady } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  query,
  limit,
} from 'firebase/firestore';
import type { Group, UserRole, AppUser } from '@/lib/types';
import { logAudit } from '@/services/audit-service';
import { isAfter } from 'date-fns';
import { uploadGroupPhoto } from './storage-service';
import { safeDate } from '@/utils/date';

type UserInfo = { id: string; name: string; role: UserRole[] };

// Local simple cache for static lists to prevent redundant network hits
const groupsCache = new Map<string, { data: Group[], timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export const getAllGroups = async (userInfo: UserInfo): Promise<Group[]> => {
  const staticGroups = await getStaticGroups(userInfo);
  return staticGroups.sort((a,b) => a.name.localeCompare(b.name));
};

export const getStaticGroups = async (userInfo: UserInfo): Promise<Group[]> => {
  if (!userInfo?.id) return [];
  
  const cacheKey = `groups_${userInfo.id}`;
  const cached = groupsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.data;
  }

  const groupsCollection = collection(db, 'groups');
  const snap = await getDocs(query(groupsCollection));
  
  const allGroups = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
  const validGroups = filterAndCleanupExpired(allGroups);
  
  groupsCache.set(cacheKey, { data: validGroups, timestamp: Date.now() });
  return validGroups;
};

function filterAndCleanupExpired(groups: Group[]): Group[] {
  const now = new Date();
  const validGroups: Group[] = [];
  const expiredIds: string[] = [];

  groups.forEach(g => {
    const expiry = safeDate(g.expiresAt);
    if (expiry && isAfter(now, expiry)) {
      expiredIds.push(g.id);
    } else {
      validGroups.push(g);
    }
  });

  if (expiredIds.length > 0) {
    expiredIds.forEach(id => {
      deleteDoc(doc(db, 'groups', id)).catch(() => {});
    });
  }

  return validGroups;
}

export const getGroup = async (id: string, userInfo: UserInfo): Promise<Group | null> => {
  const docSnap = await getDoc(doc(db, 'groups', id));
  if (docSnap.exists()) {
    const group = { id: docSnap.id, ...docSnap.data() } as Group;
    return group;
  }
  return null;
};

export const createGroup = async (groupData: Partial<Group>, userInfo: UserInfo): Promise<Group> => {
  await persistenceReady;
  const docRef = doc(collection(db, 'groups'));
  groupsCache.clear(); // Invalidate cache on change

  let finalPhotoUrl = groupData.photoUrl || '';
  if (finalPhotoUrl?.startsWith('data:image')) {
    finalPhotoUrl = await uploadGroupPhoto(docRef.id, finalPhotoUrl);
  }

  const dataToSave = {
    ...groupData,
    createdBy: userInfo.id,
    createdByName: userInfo.name,
    memberCount: groupData.peopleIds?.length || 0,
    photoUrl: finalPhotoUrl,
  };
  
  await setDoc(docRef, dataToSave);
  logAudit('Create Group', `Created: ${dataToSave.name}`, userInfo);
  return { id: docRef.id, ...dataToSave } as Group;
};

export const updateGroup = async (id: string, groupData: Partial<Group>, userInfo: UserInfo): Promise<void> => {
  await persistenceReady;
  groupsCache.clear();
  const docRef = doc(db, 'groups', id);
  
  const finalData = { ...groupData };
  if (groupData.peopleIds) {
    finalData.memberCount = groupData.peopleIds.length;
  }
  
  await updateDoc(docRef, finalData);
  logAudit('Update Group', `Updated: ${id}`, userInfo);
};

export const deleteGroup = async (id: string, userInfo: UserInfo): Promise<void> => {
  await persistenceReady;
  groupsCache.clear();
  await deleteDoc(doc(db, 'groups', id));
  logAudit('Delete Group', `Deleted: ${id}`, userInfo);
};

export const addPeopleToGroup = async (groupId: string, peopleIds: string[], userInfo: UserInfo): Promise<void> => {
  await persistenceReady;
  groupsCache.clear();
  const groupRef = doc(db, 'groups', groupId);
  await runTransaction(db, async (transaction) => {
    const groupDoc = await transaction.get(groupRef);
    if (!groupDoc.exists()) throw new Error("Group not found.");
    const currentPeopleIds: string[] = groupDoc.data().peopleIds || [];
    const newPeopleIds = Array.from(new Set([...peopleIds, ...currentPeopleIds]));
    transaction.update(groupRef, { peopleIds: newPeopleIds, memberCount: newPeopleIds.length });
  });
  logAudit('Add Group Members', `Added ${peopleIds.length} members to ${groupId}`, userInfo);
};

export const removePeopleFromGroup = async (groupId: string, peopleIds: string[], userInfo: UserInfo): Promise<void> => {
  await persistenceReady;
  groupsCache.clear();
  const groupRef = doc(db, 'groups', groupId);
  await runTransaction(db, async (transaction) => {
    const groupDoc = await transaction.get(groupRef);
    if (!groupDoc.exists()) throw new Error("Group not found.");
    const currentPeopleIds: string[] = groupDoc.data().peopleIds || [];
    const removeSet = new Set(peopleIds);
    const newPeopleIds = currentPeopleIds.filter(id => !removeSet.has(id));
    transaction.update(groupRef, { peopleIds: newPeopleIds, memberCount: newPeopleIds.length });
  });
  logAudit('Remove Group Members', `Removed ${peopleIds.length} from ${groupId}`, userInfo);
};
