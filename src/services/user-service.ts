
import { db } from '@/lib/firebase';
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
  setDoc,
} from 'firebase/firestore';
import type { AppUser, UserRole, PausedSession } from '@/lib/types';
import { logAudit } from './audit-service';

type UserData = Omit<AppUser, 'id' | 'createdAt'>;

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
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
   if (dataToUpdate.reportsTo === null) {
    dataToUpdate.reportsTo = deleteField();
  }
  if (dataToUpdate.pausedSession === null) {
    dataToUpdate.pausedSession = deleteField();
  }


  await updateDoc(userDocRef, dataToUpdate);
  
  if (actorInfo) {
    await logAudit('Update User', `Updated user: ${userData.name || id}`, actorInfo);
  }
};

/**
 * Retrieves all user records from the 'users' collection.
 * @returns A promise that resolves to an array of AppUser objects.
 */
export const getUsers = async (): Promise<AppUser[]> => {
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
      } as AppUser;
    });
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
