
'use server';

import { admin } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    setDoc,
    serverTimestamp,
    getDoc,
    deleteDoc,
} from 'firebase/firestore';
import { logAudit } from '@/services/audit-service';
import type { UserRole, AppUser } from '@/lib/types';
import type { UserFormValues } from '@/components/create-user-dialog';

export async function createUserAction(userData: UserFormValues, actorInfo: { id: string, name: string }): Promise<{ success: boolean; message: string }> {
    const usersCollection = collection(db, 'users');
    
    const emailQuery = query(usersCollection, where("email", "==", userData.email));
    const emailSnapshot = await getDocs(emailQuery);
    if (!emailSnapshot.empty) {
        return { success: false, message: `A user with email ${userData.email} already exists.` };
    }
    
    if (userData.fgCode) {
        const fgCodeQuery = query(usersCollection, where("fgCode", "==", userData.fgCode));
        const fgCodeSnapshot = await getDocs(fgCodeQuery);
        if (!fgCodeSnapshot.empty) {
            return { success: false, message: `The FG Code "${userData.fgCode}" is already in use.` };
        }
    }

    try {
        const userRecord = await admin.auth().createUser({
            email: userData.email,
            emailVerified: true, // Assuming admin creation implies verification
            password: userData.password,
            phoneNumber: `+91${userData.phone}`,
            displayName: userData.name,
            disabled: false,
        });

        const { uid } = userRecord;

        const dataToSave: Omit<AppUser, 'id'> = {
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            role: userData.role as UserRole[],
            createdAt: serverTimestamp(),
        };

        if (userData.role.includes('Folk Guide') && userData.fgCode) {
            dataToSave.fgCode = userData.fgCode;
        }

        if (userData.role.includes('Folk Enabler') && userData.guideId) {
            const guideDoc = await getDoc(doc(db, 'users', userData.guideId));
            if (guideDoc.exists()) {
                const guide = guideDoc.data() as AppUser;
                dataToSave.reportsTo = {
                    guideId: guideDoc.id,
                    guideName: guide.name,
                    guideFgCode: guide.fgCode || '',
                };
            } else {
                 return { success: false, message: `Could not find the assigned Folk Guide.` };
            }
        }
        
        await setDoc(doc(db, 'users', uid), dataToSave);

        await logAudit(`Create User Record by ${actorInfo.name}`, `Created Auth & Firestore record for ${userData.name} (${userData.email}).`, actorInfo);
        
        return { 
            success: true, 
            message: `User ${userData.name} created successfully.`
        };

    } catch (error: any) {
        console.error("Error creating user and document in Firestore:", error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

export async function deleteUserAction(userId: string, actorInfo: { id: string, name: string }): Promise<{ success: boolean; message: string }> {
  const userDocRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userDocRef);
  const userData = userSnap.data();

  // It's safer to just delete from Firestore first to revoke app-level access immediately.
  await deleteDoc(userDocRef);
  
  // Then try to delete from Auth. This might fail if the service account permissions are not set,
  // but it won't block the primary goal of revoking access.
  try {
    await admin.auth().deleteUser(userId);
    if (userData) {
      await logAudit(`Delete User by ${actorInfo.name}`, `Deleted user: ${userData.name} (${userId}) from Auth and Firestore.`, actorInfo);
    }
    return { success: true, message: 'User deleted successfully from both app and authentication system.' };
  } catch (authError: any) {
    console.error(`Failed to delete user ${userId} from Firebase Auth:`, authError);
    if (userData) {
      await logAudit(`Delete User (Firestore only) by ${actorInfo.name}`, `Deleted user: ${userData.name} (${userId}) from Firestore. Auth deletion failed.`, actorInfo);
    }
    return { 
      success: true, 
      message: 'User deleted from app. You should manually delete them from the Firebase Authentication console to fully remove their account.'
    };
  }
}
