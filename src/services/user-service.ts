import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import type { AppUser } from '@/lib/types';

type UserData = Omit<AppUser, 'id' | 'createdAt'>;

// This service manages user records in Firestore, not Firebase Authentication.
// Creating auth users requires the Admin SDK, which cannot be run from the client.

/**
 * Creates a user record in the 'users' Firestore collection.
 * @param userData - The user data to save.
 * @throws Will throw an error if a user with the same email already exists.
 */
export const createUser = async (userData: UserData): Promise<void> => {
  const usersCollection = collection(db, 'users');
  
  // Check if a user with this email already exists
  const q = query(usersCollection, where("email", "==", userData.email));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error(`A user with the email ${userData.email} already exists.`);
  }

  const dataToSave = {
    ...userData,
    createdAt: serverTimestamp(),
  };

  await addDoc(usersCollection, dataToSave);
};

/**
 * Retrieves all user records from the 'users' collection.
 * @returns A promise that resolves to an array of AppUser objects.
 */
export const getUsers = async (): Promise<AppUser[]> => {
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
}
