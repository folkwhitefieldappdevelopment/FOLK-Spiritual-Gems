import { db, auth } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { sendSignInLinkToEmail, type AuthError } from 'firebase/auth';
import type { AppUser } from '@/lib/types';

type UserData = Omit<AppUser, 'id' | 'createdAt'>;

/**
 * Creates a user record in the 'users' Firestore collection and sends a sign-in link.
 * @param userData - The user data to save.
 * @throws Will throw an error if a user with the same email already exists.
 */
export const createUser = async (userData: UserData): Promise<void> => {
  const usersCollection = collection(db, 'users');
  
  const q = query(usersCollection, where("email", "==", userData.email));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error(`A user with the email ${userData.email} already exists.`);
  }

  const actionCodeSettings = {
    url: window.location.origin + '/login', 
    handleCodeInApp: true,
  };

  try {
    await sendSignInLinkToEmail(auth, userData.email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', userData.email);
  } catch (error) {
    console.error("Failed to send sign-in link:", error);
    const authError = error as AuthError;
    if (authError.code === 'auth/operation-not-allowed') {
      throw new Error('Email link sign-in is disabled. Please enable it in the Firebase Console: Authentication > Sign-in method.');
    }
    throw new Error('Failed to send sign-up email. The user was not created.');
  }

  const dataToSave = {
    ...userData,
    createdAt: serverTimestamp(),
  };

  try {
      await addDoc(usersCollection, dataToSave);
  } catch (dbError) {
      console.error("Failed to create user in Firestore after sending email:", dbError);
      throw new Error("Sign-up email was sent, but failed to save user to the database. Please check Firestore permissions or try again.");
  }
};

/**
 * Updates a user record in the 'users' Firestore collection.
 * @param id The ID of the user to update.
 * @param userData The data to update.
 */
export const updateUser = async (id: string, userData: Partial<UserData>): Promise<void> => {
  const userDocRef = doc(db, 'users', id);
  if (userData.email) {
    const q = query(collection(db, 'users'), where("email", "==", userData.email));
    const querySnapshot = await getDocs(q);
    const conflictingUser = querySnapshot.docs.find(doc => doc.id !== id);
    if (conflictingUser) {
      throw new Error(`A user with the email ${userData.email} already exists.`);
    }
  }
  await updateDoc(userDocRef, userData);
};

/**
 * Deletes a user record from Firestore.
 * This does NOT delete the user from Firebase Authentication.
 * @param id The ID of the user to delete.
 */
export const deleteUser = async (id: string): Promise<void> => {
    const userDocRef = doc(db, 'users', id);
    await deleteDoc(userDocRef);
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
