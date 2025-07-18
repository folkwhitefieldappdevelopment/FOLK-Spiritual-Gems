
'use server';

import { doc, deleteDoc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';
import { logAudit } from './audit-service';
import type { AppUser, UserRole } from '@/lib/types';
import type { UserFormValues } from '@/components/create-user-dialog';

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

export async function createUserWithAuth(userData: UserFormValues, actorInfo: UserInfo) {
  try {
    // 1. Create user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email: userData.email,
      emailVerified: false,
      displayName: userData.name,
    });

    // 2. Generate a password reset link (which acts as the sign-up link)
    const actionLink = await adminAuth.generatePasswordResetLink(userData.email);

    // This is a simplified version. For production, you'd use a transactional email service.
    console.log(`Password reset/sign-up link for ${userData.email}: ${actionLink}`);
    
    // 3. Create the user record in Firestore
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where("email", "==", userData.email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error(`A user with the email ${userData.email} already exists in Firestore.`);
    }

    const dataToSave: Omit<AppUser, 'id'> = {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role as UserRole[],
        createdAt: serverTimestamp(),
    };
    if (userData.fgCode) dataToSave.fgCode = userData.fgCode;
    if (userData.guideId) {
        const guideDoc = await getDoc(doc(db, 'users', userData.guideId));
        if (guideDoc.exists()) {
            const guide = guideDoc.data() as AppUser;
            dataToSave.reportsTo = {
                guideId: guide.id,
                guideName: guide.name,
                guideFgCode: guide.fgCode || '',
            }
        }
    }
    
    await setDoc(doc(db, "users", userRecord.uid), dataToSave);

    await logAudit('Create User', `Created new user in Auth and DB: ${userData.name} (${userData.email})`, actorInfo);
    
    // This is where you would ideally trigger an email send with the actionLink
    
  } catch (error: any) {
    console.error('Error in createUserWithAuth:', error);
    // Potentially delete the auth user if the DB write fails to keep things consistent
    if (error.code && error.code.startsWith('auth/')) {
      throw new Error(error.message);
    }
    throw new Error('Failed to create user. Check server logs for details.');
  }
}

/**
 * Deletes a user record from Firestore and Firebase Authentication.
 * This is a server action and requires admin privileges.
 * @param userId The Firestore document ID of the user.
 * @param actorInfo The user performing the action.
 */
export async function deleteUserAndAuth(userId: string, actorInfo: UserInfo) {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.data();

    // Delete from Auth first
    await adminAuth.deleteUser(userId);

    // Then delete from Firestore
    await deleteDoc(userDocRef);
    
    if (userData) {
      await logAudit('Delete User', `Deleted user from Auth & DB: ${userData.name} (${userId})`, actorInfo);
    }

  } catch (error: any) {
    console.error('Error deleting user record and auth:', error);
    const message =
      error.message ||
      'An unexpected error occurred while deleting the user record.';
    throw new Error(message);
  }
}
