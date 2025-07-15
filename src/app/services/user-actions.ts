
'use server';

import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logAudit } from './audit-service';
import type { AppUser, UserRole } from '@/lib/types';
import { getDoc } from 'firebase/firestore';

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

/**
 * Deletes a user record from Firestore.
 * This does NOT delete the user from Firebase Authentication.
 * This is a server action and requires admin privileges.
 * @param userId The Firestore document ID of the user.
 * @param actorInfo The user performing the action.
 */
export async function deleteUserAndAuth(userId: string, actorInfo: UserInfo) {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.data();

    await deleteDoc(userDocRef);
    
    if (userData) {
      await logAudit('Delete User', `Deleted user: ${userData.name} (${userId})`, actorInfo);
    }

  } catch (error: any) {
    console.error('Error deleting user record from Firestore:', error);
    const message =
      error.message ||
      'An unexpected error occurred while deleting the user record.';
    throw new Error(message);
  }
}
