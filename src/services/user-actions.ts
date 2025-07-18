
'use server';

import { doc, deleteDoc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, setDoc } from 'firebase/firestore';
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
 * Deletes a user record from Firestore.
 * This does NOT delete the user from Firebase Authentication due to environment limitations.
 * @param userId The Firestore document ID of the user.
 * @param actorInfo The user performing the action.
 */
export async function deleteUserAndAuth(userId: string, actorInfo: UserInfo) {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.data();

    // Deleting from Auth is disabled due to credential issues.
    // This function will only delete the Firestore record.
    await deleteDoc(userDocRef);
    
    if (userData) {
      await logAudit('Delete User Record', `Deleted Firestore record for user: ${userData.name} (${userId})`, actorInfo);
    }

  } catch (error: any) {
    console.error('Error deleting user record from Firestore:', error);
    const message =
      error.message ||
      'An unexpected error occurred while deleting the user record.';
    throw new Error(message);
  }
}
