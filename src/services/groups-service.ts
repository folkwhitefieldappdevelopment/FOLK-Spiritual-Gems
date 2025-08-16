

'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  query,
  where,
} from 'firebase/firestore';
import type { Group, AppUser, UserRole } from '@/lib/types';
import { logAudit } from './audit-service';
import { generateDynamicGroups, dynamicGroupDefinitions } from '@/lib/dynamic-groups';
import { getPeople as getAllPeople } from './people-service';

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

export const getAllGroups = async (userInfo: UserInfo): Promise<Group[]> => {
  const staticGroups = await getStaticGroups(userInfo);
  return staticGroups.sort((a,b) => a.name.localeCompare(b.name));
};

export const getStaticGroups = async (userInfo: UserInfo): Promise<Group[]> => {
  const groupsCollection = collection(db, 'groups');
  
  // Admins see all groups, others see public groups or groups they created
  const q = userInfo.role.includes('Admin') 
    ? query(groupsCollection) 
    : query(groupsCollection, where('createdBy', '==', userInfo.id));

  const snapshot = await getDocs(q);
  const results: Group[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
  
  return results.sort((a,b) => a.name.localeCompare(b.name));
};

export const getGroup = async (id: string, userInfo: UserInfo): Promise<Group | null> => {
  // Handle dynamic groups
  if (id.startsWith('dynamic-')) {
    const dynamicGroupDef = dynamicGroupDefinitions.find(def => def.id === id);
    if (!dynamicGroupDef) {
        return null;
    }
    const { people } = await getAllPeople(userInfo, { pageSize: 10000 }); 
    const dynamicGroups = generateDynamicGroups(people);
    return dynamicGroups.find(g => g.id === id) || null;
  }

  // Handle static groups from Firestore
  const docRef = doc(db, 'groups', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data(), isDynamic: false } as Group;
  }
  return null;
};

export const createGroup = async (groupData: Omit<Group, 'id' | 'memberCount' | 'peopleIds' | 'createdBy' | 'creatorRole' | 'visibility'>, userInfo: UserInfo): Promise<Group> => {
  const groupsCollection = collection(db, 'groups');
  const dataToSave = {
    ...groupData,
    createdBy: userInfo.id,
    creatorRole: userInfo.role,
    visibility: [], // Default to private
    memberCount: 0,
    peopleIds: [],
    isDynamic: false,
  };
  const docRef = await addDoc(groupsCollection, dataToSave);
  await logAudit('Create Group', `Created group: ${groupData.name}`, userInfo);
  return { id: docRef.id, ...dataToSave } as Group;
};

export const updateGroup = async (id: string, groupData: Partial<Omit<Group, 'id'>>, userInfo: UserInfo): Promise<void> => {
  const docRef = doc(db, 'groups', id);
  await updateDoc(docRef, groupData);
  await logAudit('Update Group', `Updated group: ${groupData.name || id}`, userInfo);
};

export const deleteGroup = async (id: string, userInfo: UserInfo): Promise<void> => {
  const group = await getGroup(id, userInfo);
  const docRef = doc(db, 'groups', id);
  await deleteDoc(docRef);
  if (group) {
    await logAudit('Delete Group', `Deleted group: ${group.name} (${id})`, userInfo);
  }
};

export const addPeopleToGroup = async (groupId: string, peopleIds: string[], userInfo: UserInfo): Promise<void> => {
  const groupRef = doc(db, 'groups', groupId);
  let groupName = 'Unknown Group';

  await runTransaction(db, async (transaction) => {
    const groupDoc = await transaction.get(groupRef);
    if (!groupDoc.exists()) {
      throw new Error("Group not found.");
    }
    groupName = groupDoc.data().name;

    const currentPeopleIds: string[] = groupDoc.data().peopleIds || [];
    const newPeopleIds = Array.from(new Set([...currentPeopleIds, ...peopleIds]));

    if (newPeopleIds.length > currentPeopleIds.length) {
      transaction.update(groupRef, { 
        peopleIds: newPeopleIds,
        memberCount: newPeopleIds.length
      });
    }
  });

  await logAudit('Add to Group', `Added ${peopleIds.length} members to group: ${groupName}`, userInfo);
};

export const removePeopleFromGroup = async (groupId: string, peopleIdsToRemove: string[], userInfo: UserInfo): Promise<void> => {
  const groupRef = doc(db, 'groups', groupId);
  let groupName = 'Unknown Group';

  await runTransaction(db, async (transaction) => {
    const groupDoc = await transaction.get(groupRef);
    if (!groupDoc.exists()) {
      throw new Error("Group not found.");
    }
    groupName = groupDoc.data().name;

    const currentPeopleIds: string[] = groupDoc.data().peopleIds || [];
    const idsToRemoveSet = new Set(peopleIdsToRemove);
    const newPeopleIds = currentPeopleIds.filter(id => !idsToRemoveSet.has(id));

    if (newPeopleIds.length < currentPeopleIds.length) {
      transaction.update(groupRef, {
        peopleIds: newPeopleIds,
        memberCount: newPeopleIds.length
      });
    }
  });
  
  await logAudit('Remove from Group', `Removed ${peopleIdsToRemove.length} members from group: ${groupName}`, userInfo);
};
