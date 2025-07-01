import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp, // Not used, but good for future
} from 'firebase/firestore';
import type { Person } from '@/lib/types';

const peopleCollection = collection(db, 'people');

export const getPeople = async (): Promise<Person[]> => {
  const snapshot = await getDocs(peopleCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person));
};

export const getPerson = async (id: string): Promise<Person | null> => {
  const docRef = doc(db, 'people', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Person;
  }
  return null;
};

export const createPerson = async (personData: Omit<Person, 'id'>): Promise<Person> => {
  const docRef = await addDoc(peopleCollection, personData);
  return { id: docRef.id, ...personData };
};

export const updatePerson = async (id: string, personData: Partial<Omit<Person, 'id'>>): Promise<void> => {
  const docRef = doc(db, 'people', id);
  await updateDoc(docRef, personData);
};

export const deletePerson = async (id: string): Promise<void> => {
  const docRef = doc(db, 'people', id);
  await deleteDoc(docRef);
};

export const importPeople = async (people: Omit<Person, 'id'>[]): Promise<void> => {
    const batch = writeBatch(db);
    people.forEach((person) => {
        const docRef = doc(collection(db, 'people'));
        batch.set(docRef, person);
    });
    await batch.commit();
}
