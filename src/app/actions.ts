'use server';

import { admin } from '@/lib/firebase-admin';
import { doc, setDoc, deleteDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logAudit } from '@/services/audit-service';
import type { AppUser, UserRole } from '@/lib/types';
import type { UserFormValues } from '@/components/create-user-dialog';

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

export async function createUserAction(userData: UserFormValues, actorInfo: UserInfo): Promise<{ success: boolean; message: string }> {
  // This feature is disabled as the Admin SDK is not correctly initialized in the environment.
  return { 
    success: false, 
    message: 'User creation from the UI is disabled due to server environment configuration. Please use the Firebase Console to create new users.' 
  };
}

export async function deleteUserAction(userId: string, actorInfo: UserInfo): Promise<{ success: boolean; message: string }> {
  // This feature is disabled as the Admin SDK is not correctly initialized in the environment.
  const userDocRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userDocRef);
  const userData = userSnap.data();

  // We can still delete from Firestore, but not from Auth.
  await deleteDoc(userDocRef);
  
  if (userData) {
    await logAudit('Delete User', `Deleted user: ${userData.name} (${userId}) from Firestore. Auth record was not deleted.`, actorInfo);
  }

  return { 
    success: true, 
    message: 'User deleted from Firestore. You must delete the user from the Firebase Authentication console manually.'
  };
}
