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
  const adminAuth = admin.auth();
  if (!adminAuth) {
    return { success: false, message: 'Firebase Admin SDK is not initialized. User creation is disabled. Check server logs.' };
  }

  const usersCollection = collection(db, 'users');

  const emailExistsQuery = query(usersCollection, where("email", "==", userData.email));
  const emailSnapshot = await getDocs(emailExistsQuery);
  if (!emailSnapshot.empty) {
    return { success: false, message: `A user with the email ${userData.email} already exists.` };
  }

  if (userData.role.includes('Folk Guide') && userData.fgCode) {
    const fgCodeQuery = query(usersCollection, where("fgCode", "==", userData.fgCode));
    const fgCodeSnapshot = await getDocs(fgCodeQuery);
    if (!fgCodeSnapshot.empty) {
      return { success: false, message: `The FG Code "${userData.fgCode}" is already in use.` };
    }
  }

  try {
    const userRecord = await adminAuth.createUser({
      email: userData.email,
      displayName: userData.name,
      emailVerified: true,
      disabled: false,
    });
    
    await adminAuth.generatePasswordResetLink(userData.email);

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
    return { success: true, message: 'User created successfully.' };

  } catch (error: any) {
    console.error("Error creating user with auth:", error);
    let message = 'Failed to create user. Please check server logs.';
    if (error.code === 'auth/email-already-exists') {
        message = 'A user with this email already exists in Firebase Authentication.';
    } else if (error.message) {
        message = error.message;
    }
    return { success: false, message: message };
  }
}

export async function deleteUserAction(userId: string, actorInfo: UserInfo): Promise<{ success: boolean; message: string }> {
  const adminAuth = admin.auth();
  if (!adminAuth) {
    return { success: false, message: 'Firebase Admin SDK is not initialized. User deletion is disabled. Check server logs.' };
  }
  
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.data();

    await adminAuth.deleteUser(userId);
    await deleteDoc(userDocRef);
    
    if (userData) {
      await logAudit('Delete User', `Deleted user: ${userData.name} (${userId}) from Auth and Firestore.`, actorInfo);
    }
    return { success: true, message: 'User deleted successfully.' };

  } catch (error: any) {
    console.error('Error deleting user and auth record:', error);
    const message =
      error.message ||
      'An unexpected error occurred while deleting the user record.';
    return { success: false, message: message };
  }
}
