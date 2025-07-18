
'use server';

import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';
import { doc, deleteDoc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logAudit } from './audit-service';
import type { AppUser, UserRole } from '@/lib/types';
import type { UserFormValues } from '@/components/create-user-dialog';

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp();
}

/**
 * Creates a user in Firebase Authentication and a corresponding record in Firestore.
 * @param userData The data for the new user from the form.
 * @param actorInfo Information about the user performing the action.
 * @returns The authentication link to be sent to the user.
 */
export async function createUserWithAuth(userData: UserFormValues, actorInfo: UserInfo): Promise<string> {
  const adminAuth = getAuth();
  const usersCollection = collection(db, 'users');

  // Check for existing user by email
  const emailExistsQuery = query(usersCollection, where("email", "==", userData.email));
  const emailSnapshot = await getDocs(emailExistsQuery);
  if (!emailSnapshot.empty) {
    throw new Error(`A user with the email ${userData.email} already exists in the database.`);
  }

  // Check for existing user by FG Code if provided
  if (userData.role.includes('Folk Guide') && userData.fgCode) {
    const fgCodeQuery = query(usersCollection, where("fgCode", "==", userData.fgCode));
    const fgCodeSnapshot = await getDocs(fgCodeQuery);
    if (!fgCodeSnapshot.empty) {
      throw new Error(`The FG Code "${userData.fgCode}" is already in use.`);
    }
  }

  try {
    // 1. Create user in Firebase Authentication (this doesn't require a password)
    const userRecord = await adminAuth.createUser({
      email: userData.email,
      displayName: userData.name,
      emailVerified: false, // User will verify by clicking the link
    });

    const uid = userRecord.uid;

    // 2. Prepare user data for Firestore
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

    // 3. Create user record in Firestore using the UID from Auth as the document ID
    await setDoc(doc(db, 'users', uid), {
        ...dataToSave,
        createdAt: new Date(),
    });
    
    // 4. Generate the sign-in link
    const actionCodeSettings = {
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002/login',
      handleCodeInApp: true,
    };
    const link = await adminAuth.generateSignInWithEmailLink(userData.email, actionCodeSettings);
    
    await logAudit('Create User', `Created user: ${userData.name} (${uid}) and sent sign-up link.`, actorInfo);
    
    return link;

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
  const adminAuth = getAuth();
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
