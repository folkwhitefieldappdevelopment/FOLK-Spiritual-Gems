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
    
    // Check for duplicate email in Firestore (and by extension, Auth)
    const emailQuery = query(usersCollection, where("email", "==", userData.email));
    const emailSnapshot = await getDocs(emailQuery);
    if (!emailSnapshot.empty) {
        return { success: false, message: `A user with email ${userData.email} already exists.` };
    }
    
    // Check for duplicate FG code
    if (userData.fgCode) {
        const fgCodeQuery = query(usersCollection, where("fgCode", "==", userData.fgCode));
        const fgCodeSnapshot = await getDocs(fgCodeQuery);
        if (!fgCodeSnapshot.empty) {
            return { success: false, message: `The FG Code "${userData.fgCode}" is already in use.` };
        }
    }

    try {
        // 1. Create user in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: userData.email,
            emailVerified: false, // User will verify by signing in
            phoneNumber: `+91${userData.phone}`,
            displayName: userData.name,
            disabled: false,
        });

        const { uid } = userRecord;

        // 2. Prepare data for Firestore, using the UID as the document ID
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
        
        // 3. Save user data to Firestore with the UID from Auth
        await setDoc(doc(db, 'users', uid), dataToSave);

        await logAudit('Create User Record', `Created Auth & Firestore record for ${userData.name} (${userData.email}).`, actorInfo);
        
        // 4. Generate the sign-in link
        const link = await admin.auth().generateSignInWithEmailLink(userData.email, {
             url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/login`,
             handleCodeInApp: true,
        });
        
        return { 
            success: true, 
            message: `User ${userData.name} created successfully. Please send them this sign-in link: ${link}`
        };

    } catch (error: any) {
        console.error("Error creating user and document in Firestore:", error);
        // Clean up Auth user if Firestore write fails? Could be complex.
        // For now, returning a clear error is most important.
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
