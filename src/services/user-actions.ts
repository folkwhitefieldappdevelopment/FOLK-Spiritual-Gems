'use server';

import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Deletes a user from Firebase Authentication and their record from Firestore.
 * This is a server action and requires admin privileges.
 * @param userId The Firestore document ID of the user.
 * @param email The email of the user to delete.
 */
export async function deleteUserAndAuth(userId: string, email: string) {
  try {
    // Get user from Auth to get their UID
    const userRecord = await adminAuth.getUserByEmail(email);
    
    // Delete from Auth
    await adminAuth.deleteUser(userRecord.uid);
    
    // Delete from Firestore
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
    
  } catch (error: any) {
    // Handle case where user is not in Auth but might be in Firestore
    if (error.code === 'auth/user-not-found') {
      console.warn(`User with email ${email} not found in Firebase Auth, but attempting to delete from Firestore.`);
      const userDocRef = doc(db, 'users', userId);
      await deleteDoc(userDocRef);
      // Don't re-throw, as the end result (user is gone) is achieved for the client.
      return;
    }
    console.error('Error deleting user account:', error);
    
    if (error.code === 'auth/insufficient-permission') {
        throw new Error('Server has insufficient permissions. Please ensure the App Hosting service account has the "Firebase Authentication Admin" IAM role in Google Cloud.');
    }

    // Rethrow a more informative error to the client
    const message = error.message || 'An unexpected error occurred while deleting the user.';
    throw new Error(message);
  }
}
