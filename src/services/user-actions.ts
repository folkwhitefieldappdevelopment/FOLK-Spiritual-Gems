
'use server';

import { doc, deleteDoc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
// import { adminAuth } from '@/lib/firebase-admin';
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
    // STEP 1: Create user in Firebase Authentication (MANUAL STEP)
    // This part is disabled due to server environment limitations.
    // To create a user, you must first add them in the Firebase Console > Authentication.
    // Then, you can create their record here.
    
    // STEP 2: Create the user record in Firestore
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where("email", "==", userData.email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error(`A user with the email ${userData.email} already exists in Firestore.`);
    }

    // Since Auth user must be created manually, we don't have the UID here.
    // This flow is for creating the DB record only. For login, a user must exist in Auth.
    // We'll create a doc with an auto-generated ID.
    const newUserDocRef = doc(collection(db, "users"));

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
    
    await setDoc(newUserDocRef, dataToSave);

    await logAudit('Create User Record', `Created Firestore record for user: ${userData.name} (${userData.email})`, actorInfo);
    
  } catch (error: any) {
    console.error('Error in createUserWithAuth:', error);
    if (error.code && error.code.startsWith('auth/')) {
      throw new Error(error.message);
    }
    throw new Error('Failed to create user record. Check server logs for details.');
  }
}

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
