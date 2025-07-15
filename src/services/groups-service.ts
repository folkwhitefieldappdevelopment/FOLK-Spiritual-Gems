
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
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import type { Group, AppUser, UserRole, Person } from '@/lib/types';
import { logAudit } from './audit-service';
import { generateDynamicGroups } from '@/lib/dynamic-groups';

// This function now fetches BOTH static (Firestore) and dynamic (code-defined) groups
export const getAllGroups = async (appUser: AppUser, allPeople: Person[]): Promise<Group[]> => {
  const staticGroups = await getStaticGroups(appUser);
  const dynamicGroups = generateDynamicGroups(allPeople);

  return [...staticGroups, ...dynamicGroups].sort((a,b) => a.name.localeCompare(b.name));
};


export const getStaticGroups = async (appUser: AppUser): Promise<Group[]> => {
  const groupsCollection = collection(db, 'groups');
  const results = new Map<string, Group>();
  const queries: Promise<QuerySnapshot<DocumentData>>[] = [];
  
  // Admins see everything.
  if (appUser.role.includes('Admin')) {
    const allGroupsSnap = await getDocs(groupsCollection);
    allGroupsSnap.forEach(doc => {
      const groupData = { id: doc.id, ...doc.data() } as Group;
      if (!Array.isArray(groupData.visibility)) {
        // @ts-ignore - backward compatibility
        groupData.visibility = groupData.visibility === 'team' ? ['Folk Guide', 'Folk Enabler'] : [];
      }
      results.set(doc.id, groupData);
    });
    return Array.from(results.values()).sort((a,b) => a.name.localeCompare(b.name));
  }
  
  // --- For non-admins ---

  // 1. Get groups created by the current user.
  queries.push(getDocs(query(groupsCollection, where('createdBy', '==', appUser.id))));

  // 2. Get groups shared with the user's role(s).
  if (appUser.role.length > 0) {
    // Firestore's 'array-contains-any' is perfect here.
    queries.push(getDocs(query(groupsCollection, where('visibility', 'array-contains-any', appUser.role))));
  }

  const snapshots = await Promise.all(queries);

  snapshots.forEach(snap => {
    snap.forEach(doc => {
        if (!results.has(doc.id)) {
            const groupData = { id: doc.id, ...doc.data() } as Group;
            if (!Array.isArray(groupData.visibility)) {
              // @ts-ignore - backward compatibility
              groupData.visibility = groupData.visibility === 'team' ? (appUser.role.includes('Folk Guide') ? ['Folk Enabler'] : []) : [];
            }
            results.set(doc.id, groupData);
        }
    });
  });
  
  return Array.from(results.values()).sort((a,b) => a.name.localeCompare(b.name));
};

export const getGroup = async (id: string, allPeople: Person[] = []): Promise<Group | null> => {
  if (id.startsWith('dynamic-')) {
    const dynamicGroups = generateDynamicGroups(allPeople);
    return dynamicGroups.find(g => g.id === id) || null;
  }

  const docRef = doc(db, 'groups', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const groupData = { id: docSnap.id, ...docSnap.data(), isDynamic: false } as Group;
    if (!Array.isArray(groupData.visibility)) {
       // @ts-ignore - backward compatibility
      groupData.visibility = [];
    }
    return groupData;
  }
  return null;
};

export const createGroup = async (groupData: Omit<Group, 'id' | 'memberCount' | 'peopleIds' | 'createdBy' | 'creatorRole'>, appUser: AppUser): Promise<Group> => {
  const groupsCollection = collection(db, 'groups');
  const dataToSave = {
    ...groupData,
    createdBy: appUser.id,
    creatorRole: appUser.role,
    visibility: groupData.visibility || [],
    memberCount: 0,
    peopleIds: [],
    isDynamic: false,
  };
  const docRef = await addDoc(groupsCollection, dataToSave);
  await logAudit('Create Group', `Created group: ${groupData.name}`, appUser);
  return { id: docRef.id, ...dataToSave } as Group;
};

export const updateGroup = async (id: string, groupData: Partial<Omit<Group, 'id'>>, appUser: AppUser): Promise<void> => {
  const docRef = doc(db, 'groups', id);
  await updateDoc(docRef, groupData);
  await logAudit('Update Group', `Updated group: ${groupData.name || id}`, appUser);
};

export const deleteGroup = async (id: string, appUser: AppUser): Promise<void> => {
  const group = await getGroup(id);
  const docRef = doc(db, 'groups', id);
  await deleteDoc(docRef);
  if (group) {
    await logAudit('Delete Group', `Deleted group: ${group.name} (${id})`, appUser);
  }
};

export const addPeopleToGroup = async (groupId: string, peopleIds: string[], appUser: AppUser): Promise<void> => {
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

  await logAudit('Add to Group', `Added ${peopleIds.length} members to group: ${groupName}`, appUser);
};

export const removePeopleFromGroup = async (groupId: string, peopleIdsToRemove: string[], appUser: AppUser): Promise<void> => {
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
  
  await logAudit('Remove from Group', `Removed ${peopleIdsToRemove.length} members from group: ${groupName}`, appUser);
};
