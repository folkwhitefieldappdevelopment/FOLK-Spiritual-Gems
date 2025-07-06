import { db, auth } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { sendSignInLinkToEmail } from 'firebase/auth';
import type { AppUser } from '@/lib/types';

type UserData = Omit<AppUser, 'id' | 'createdAt'>;

// This service manages user records in Firestore, not Firebase Authentication.
// Creating auth users requires the Admin SDK, which cannot be run from the client.

/**
 * Creates a user record in the 'users' Firestore collection and sends a sign-in link.
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
  
  // Now, send the sign-in link.
  const actionCodeSettings = {
    // The URL to redirect to after sign-in.
    // The user will be redirected to the login page to complete the sign-in.
    url: window.location.origin + '/login', 
    handleCodeInApp: true,
  };

  await sendSignInLinkToEmail(auth, userData.email, actionCodeSettings);

  // Store the email locally so the login page can retrieve it to complete sign-in.
  window.localStorage.setItem('emailForSignIn', userData.email);
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

/**
 * Retrieves a user record from the 'users' collection by email.
 * @param email The user's email address.
 * @returns A promise that resolves to the AppUser object or null if not found.
 */
export const getUserByEmail = async (email: string): Promise<AppUser | null> => {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }

    const userDoc = querySnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as AppUser;
};
