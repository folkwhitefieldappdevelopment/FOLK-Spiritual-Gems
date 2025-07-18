
'use server';

import { adminAuth } from '@/lib/firebase-admin';
import { doc, deleteDoc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logAudit } from './audit-service';
import type { AppUser, UserRole } from '@/lib/types';
import type { UserFormValues } from '@/components/create-user-dialog';

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

/**
 * Creates a user in Firebase Authentication and a corresponding record in Firestore.
 * @param userData The data for the new user from the form.
 * @param actorInfo Information about the user performing the action.
 * @returns The authentication link to be sent to the user.
 */
export async function createUserWithAuth(userData: UserFormValues, actorInfo: UserInfo): Promise<void> {
  if (!adminAuth) {
    throw new Error('Firebase Admin SDK is not initialized. User creation is disabled. Check server logs.');
  }

  const usersCollection = collection(db, 'users');

  const emailExistsQuery = query(usersCollection, where("email", "==", userData.email));
  const emailSnapshot = await getDocs(emailExistsQuery);
  if (!emailSnapshot.empty) {
    throw new Error(`A user with the email ${userData.email} already exists.`);
  }

  if (userData.role.includes('Folk Guide') && userData.fgCode) {
    const fgCodeQuery = query(usersCollection, where("fgCode", "==", userData.fgCode));
    const fgCodeSnapshot = await getDocs(fgCodeQuery);
    if (!fgCodeSnapshot.empty) {
        throw new Error(`The FG Code "${userData.fgCode}" is already in use.`);
    }
  }

  try {
    const userRecord = await adminAuth.createUser({
      email: userData.email,
      displayName: userData.name,
      emailVerified: true,
      disabled: false,
    });

    const uid = userRecord.uid;
    const dataToSave: Omit<AppUser, 'id' | 'createdAt'> = {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role as UserRole[],
    };

    if (userData.role.includes('Folk Guide') && userData.fgCode) {
        dataToSave.fgCode = userData.fgCode;
    }
    if (userData.role.includes('Folk Enabler') && userData.guideId) {
        const guideDoc = await getDoc(doc(db, 'users', userData.guideId));
        if (guideDoc.exists()) {
            const guide = guideDoc.data() as AppUser;
            dataToSave.reportsTo = {
                guideId: guide.id,
                guideName: guide.name,
                guideFgCode: guide.fgCode || '',
            };
        }
    }

    await setDoc(doc(db, 'users', uid), {
        ...dataToSave,
        createdAt: serverTimestamp(),
    });
    
    await logAudit('Create User', `Created user: ${userData.name} (${uid})`, actorInfo);
    
  } catch (error: any) {
    console.error("Error creating user with auth:", error);
    let message = 'Failed to create user. Please check server logs.';
    if (error.code === 'auth/email-already-exists') {
        message = 'A user with this email already exists in Firebase Authentication.';
    } else if (error.message) {
        message = error.message;
    }
    throw new Error(message);
  }
}

/**
 * Deletes a user from Firebase Authentication and their record from Firestore.
 * @param userId The UID of the user to delete.
 * @param actorInfo The user performing the action.
 */
export async function deleteUserAndAuth(userId: string, actorInfo: UserInfo) {
  if (!adminAuth) {
    throw new Error('Firebase Admin SDK is not initialized. User deletion is disabled. Check server logs.');
  }
  
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.data();

    // Delete from Firestore first
    await deleteDoc(userDocRef);
    // Then delete from Firebase Authentication
    await adminAuth.deleteUser(userId);
    
    if (userData) {
      await logAudit('Delete User', `Deleted user: ${userData.name} (${userId}) from Auth and Firestore.`, actorInfo);
    }
  } catch (error: any) {
    console.error('Error deleting user and auth record:', error);
    const message =
      error.message ||
      'An unexpected error occurred while deleting the user record.';
    throw new Error(message);
  }
}
