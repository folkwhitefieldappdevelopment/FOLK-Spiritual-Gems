
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
  deleteField,
} from 'firebase/firestore';
import { sendSignInLinkToEmail, type AuthError } from 'firebase/auth';
import type { AppUser, UserRole } from '@/lib/types';
import { logAudit } from './audit-service';

type UserData = Omit<AppUser, 'id' | 'createdAt'>;

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

/**
 * Creates a user record in the 'users' Firestore collection.
 * The sign-in link is now sent from the client-side component.
 * @param userData - The user data to save.
 */
export const createUser = async (userData: UserData, actorInfo: UserInfo): Promise<void> => {
  const usersCollection = collection(db, 'users');
  
  const q = query(usersCollection, where("email", "==", userData.email));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error(`A user with the email ${userData.email} already exists.`);
  }

  if (userData.fgCode) {
    const fgCodeQuery = query(usersCollection, where("fgCode", "==", userData.fgCode));
    const fgCodeSnapshot = await getDocs(fgCodeQuery);
    if (!fgCodeSnapshot.empty) {
      throw new Error(`The FG Code "${userData.fgCode}" is already in use.`);
    }
  }

  const dataToSave = {
    ...userData,
    createdAt: serverTimestamp(),
  };

  try {
      const docRef = await addDoc(usersCollection, dataToSave);
      await logAudit('Create User', `Created new user: ${userData.name} (${userData.email})`, actorInfo);
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
export const updateUser = async (id: string, userData: { [key: string]: any }, actorInfo: UserInfo | null = null): Promise<void> => {
  const userDocRef = doc(db, 'users', id);
  if (userData.email) {
    const q = query(collection(db, 'users'), where("email", "==", userData.email));
    const querySnapshot = await getDocs(q);
    const conflictingUser = querySnapshot.docs.find(doc => doc.id !== id);
    if (conflictingUser) {
      throw new Error(`A user with the email ${userData.email} already exists.`);
    }
  }

  if (userData.fgCode && typeof userData.fgCode === 'string') {
    const fgCodeQuery = query(collection(db, 'users'), where("fgCode", "==", userData.fgCode));
    const fgCodeSnapshot = await getDocs(fgCodeQuery);
    const conflictingUser = fgCodeSnapshot.docs.find(d => d.id !== id);
    if (conflictingUser) {
        throw new Error(`The FG Code "${userData.fgCode}" is already in use.`);
    }
  }

  const dataToUpdate = { ...userData };
  if (dataToUpdate.pausedSession === null || dataToUpdate.pausedSession === undefined) {
    dataToUpdate.pausedSession = deleteField();
  }

  await updateDoc(userDocRef, dataToUpdate);
  
  if (actorInfo) {
    if (userData.pausedSession) {
        await logAudit('Pause Calling Session', `Paused session for event: ${userData.pausedSession.currentEvent}`, actorInfo);
    } else if (userData.hasOwnProperty('pausedSession')) {
        await logAudit('End Calling Session', `Ended/cleared paused session.`, actorInfo);
    } else {
        await logAudit('Update User', `Updated user: ${userData.name || id}`, actorInfo);
    }
  }
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
 * Retrieves all users with the "Folk Guide" role.
 * @returns A promise that resolves to an array of Folk Guide user objects.
 */
export const getFolkGuides = async (): Promise<AppUser[]> => {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('role', 'array-contains', 'Folk Guide'));
    const snapshot = await getDocs(q);
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

/**
 * Retrieves all enablers assigned to a specific Folk Guide.
 * @param guideId The ID of the Folk Guide.
 * @returns A promise that resolves to an array of enabler user objects.
 */
export const getEnablersForGuide = async (guideId: string): Promise<AppUser[]> => {
    const usersCollection = collection(db, 'users');
    const q = query(
        usersCollection,
        where('role', 'array-contains', 'Folk Enabler'),
        where('reportsTo.guideId', '==', guideId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
};
