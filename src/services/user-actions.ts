
'use server';

import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Deletes a user record from Firestore.
 * This does NOT delete the user from Firebase Authentication.
 * This is a server action and requires admin privileges.
 * @param userId The Firestore document ID of the user.
 */
export async function deleteUserAndAuth(userId: string) {
  try {
    // Delete from Firestore only
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
  } catch (error: any) {
    console.error('Error deleting user record from Firestore:', error);
    const message =
      error.message ||
      'An unexpected error occurred while deleting the user record.';
    throw new Error(message);
  }
}
