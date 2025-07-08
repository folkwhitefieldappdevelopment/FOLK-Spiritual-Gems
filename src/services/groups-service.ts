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
} from 'firebase/firestore';
import type { Group } from '@/lib/types';

export const getGroups = async (): Promise<Group[]> => {
  const groupsCollection = collection(db, 'groups');
  const snapshot = await getDocs(groupsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
};

export const getGroup = async (id: string): Promise<Group | null> => {
  const docRef = doc(db, 'groups', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Group;
  }
  return null;
};

export const createGroup = async (groupData: Omit<Group, 'id'>): Promise<Group> => {
  const groupsCollection = collection(db, 'groups');
  const docRef = await addDoc(groupsCollection, groupData);
  return { id: docRef.id, ...groupData };
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
