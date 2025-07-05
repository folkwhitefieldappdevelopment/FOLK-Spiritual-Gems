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
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import type { Person } from '@/lib/types';

export const getPeople = async (): Promise<Person[]> => {
  const peopleCollection = collection(db, 'people');
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

export const createPerson = async (personData: Omit<Person, 'id' | 'createdAt'>): Promise<Person> => {
  const peopleCollection = collection(db, 'people');
  const q = query(peopleCollection, where("phone", "==", personData.phone));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error(`A contact with phone number ${personData.phone} already exists.`);
  }

  const dataToSave = {
    ...personData,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(peopleCollection, dataToSave);
  // For optimistic update, return a client-side date
  const newPerson: Person = {
    ...personData,
    id: docRef.id,
    createdAt: new Date(),
  };
  return newPerson;
};

export const updatePerson = async (id: string, personData: Partial<Omit<Person, 'id'>>): Promise<void> => {
  if (personData.phone) {
    const peopleCollection = collection(db, 'people');
    const q = query(peopleCollection, where("phone", "==", personData.phone));
    const querySnapshot = await getDocs(q);
    const conflictingPerson = querySnapshot.docs.find(doc => doc.id !== id);
    if (conflictingPerson) {
        throw new Error(`A contact with phone number ${personData.phone} already exists.`);
    }
  }
  const docRef = doc(db, 'people', id);
  await updateDoc(docRef, personData);
};

export const deletePerson = async (id: string): Promise<void> => {
  const docRef = doc(db, 'people', id);
  await deleteDoc(docRef);
};

export const importPeople = async (people: Omit<Person, 'id' | 'createdAt'>[]): Promise<void> => {
    if (people.length === 0) return;
    
    const batch = writeBatch(db);
    people.forEach((person) => {
        const docRef = doc(collection(db, 'people'));
        const dataWithTimestamp = {
            ...person,
            createdAt: serverTimestamp()
        };
        batch.set(docRef, dataWithTimestamp);
    });
    await batch.commit();
}
