
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
import type { Group, AppUser } from '@/lib/types';

export const getGroups = async (appUser: AppUser): Promise<Group[]> => {
  const groupsCollection = collection(db, 'groups');
  const results = new Map<string, Group>();
  const queries: Promise<QuerySnapshot<DocumentData>>[] = [];

  // Query 1: Always get the user's own groups
  queries.push(getDocs(query(groupsCollection, where('createdBy', '==', appUser.id))));

  // If user is Admin, they get all groups.
  // We can just get all and the Set will handle duplicates.
  if (appUser.role.includes('Admin')) {
    queries.push(getDocs(collection(db, 'groups')));
  } else {
    // If not admin, all roles (Guide, Enabler) can see team groups created by Admins
    queries.push(getDocs(query(groupsCollection, where('visibility', '==', 'team'), where('creatorRole', 'array-contains', 'Admin'))));

    // If they are an enabler, they also see team groups created by their guide
    if (appUser.role.includes('Folk Enabler') && appUser.reportsTo?.guideId) {
      queries.push(getDocs(query(groupsCollection, where('visibility', '==', 'team'), where('createdBy', '==', appUser.reportsTo.guideId))));
    }
  }

  const snapshots = await Promise.all(queries);

  snapshots.forEach(snap => {
    snap.forEach(doc => {
        if (!results.has(doc.id)) {
            results.set(doc.id, { id: doc.id, ...doc.data() } as Group);
        }
    });
  });
  
  return Array.from(results.values()).sort((a,b) => a.name.localeCompare(b.name));
};

export const getGroup = async (id: string): Promise<Group | null> => {
  const docRef = doc(db, 'groups', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Group;
  }
  return null;
};

export const createGroup = async (groupData: Omit<Group, 'id' | 'memberCount' | 'peopleIds' | 'createdBy' | 'creatorRole'>, appUser: AppUser): Promise<Group> => {
  const groupsCollection = collection(db, 'groups');
  const dataToSave = {
    ...groupData,
    createdBy: appUser.id,
    creatorRole: appUser.role,
    visibility: groupData.visibility || 'private',
    memberCount: 0,
    peopleIds: [],
  };
  const docRef = await addDoc(groupsCollection, dataToSave);
  return { id: docRef.id, ...dataToSave } as Group;
};

export const updateGroup = async (id: string, groupData: Partial<Omit<Group, 'id'>>): Promise<void> => {
  const docRef = doc(db, 'groups', id);
  await updateDoc(docRef, groupData);
};

export const deleteGroup = async (id: string): Promise<void> => {
  const docRef = doc(db, 'groups', id);
  await deleteDoc(docRef);
};

export const addPeopleToGroup = async (groupId: string, peopleIds: string[]): Promise<void> => {
  const groupRef = doc(db, 'groups', groupId);

  await runTransaction(db, async (transaction) => {
    const groupDoc = await transaction.get(groupRef);
    if (!groupDoc.exists()) {
      throw new Error("Group not found.");
    }

    const currentPeopleIds: string[] = groupDoc.data().peopleIds || [];
    const newPeopleIds = Array.from(new Set([...currentPeopleIds, ...peopleIds]));

    if (newPeopleIds.length > currentPeopleIds.length) {
      transaction.update(groupRef, { 
        peopleIds: newPeopleIds,
        memberCount: newPeopleIds.length
      });
    }
  });
};
