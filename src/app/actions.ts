'use server';

import { admin } from '@/lib/firebase-admin';
import { doc, setDoc, deleteDoc, getDoc, collection, query, where, getDocs, serverTimestamp, addDoc } from 'firebase/firestore';
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
                    guideId: guideDoc.id, // Use guideDoc.id to ensure it's not undefined
                    guideName: guide.name,
                    guideFgCode: guide.fgCode || '',
                };
            } else {
                 return { success: false, message: `Could not find the assigned Folk Guide.` };
            }
        }
        
        await addDoc(usersCollection, dataToSave);

        await logAudit('Create User Record', `Created Firestore record for ${userData.name} (${userData.email}).`, actorInfo);
        
        return { 
            success: true, 
            message: `User record for ${userData.name} created. Send them the sign-up link.` 
        };

    } catch (error: any) {
        console.error("Error creating user document in Firestore:", error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

export async function deleteUserAction(userId: string, actorInfo: UserInfo): Promise<{ success: boolean; message: string }> {
  const userDocRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userDocRef);
  const userData = userSnap.data();

  // Delete from Firestore, which will deny them access on next login
  await deleteDoc(userDocRef);
  
  if (userData) {
    await logAudit('Delete User', `Deleted user: ${userData.name} (${userId}) from Firestore.`, actorInfo);
  }

  return { 
    success: true, 
    message: 'User deleted from app. You should also delete them from Firebase Authentication console to fully remove their access.'
  };
}
