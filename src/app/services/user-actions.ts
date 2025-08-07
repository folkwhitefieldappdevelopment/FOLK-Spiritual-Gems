
'use server';

import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logAudit } from './audit-service';
import type { AppUser, UserRole } from '@/lib/types';
import { admin } from '@/lib/firebase-admin';

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

/**
 * Deletes a user record from Firestore AND from Firebase Authentication.
 * @param userId The Firestore document ID (which is the same as the Auth UID).
 * @param actorInfo The user performing the action.
 */
export async function deleteUserAndAuth(userId: string, actorInfo: UserInfo) {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.data();

    // 1. Delete from Firestore
    await deleteDoc(userDocRef);
    
    // 2. Delete from Firebase Auth
    await admin.auth().deleteUser(userId);
    
    if (userData) {
      await logAudit('Delete User', `Deleted user from Auth & Firestore: ${userData.name} (${userId})`, actorInfo);
    }

  } catch (error: any) {
    console.error('Error deleting user and auth record:', error);
    
    let message = 'An unexpected error occurred while deleting the user.';
    if (error.code === 'auth/user-not-found') {
        message = "User was not found in Firebase Authentication, but was deleted from the app's database.";
    } else if (error.message) {
        message = error.message;
    }
    
    throw new Error(message);
  }
}
