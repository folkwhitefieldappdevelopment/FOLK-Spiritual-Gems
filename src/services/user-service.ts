'use client';

import { db, persistenceReady, functions } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteField,
  type QueryConstraint,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { AppUser, UserRole } from '@/lib/types';
import { logAudit } from '@/services/audit-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Provisions a new user using server-side Cloud Function.
 */
export const provisionUserOnServer = async (data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole[];
  fgCode?: string;
  guideId?: string;
}) => {
  if (!functions) throw new Error("Functions not initialized");
  const createAppUser = httpsCallable(functions, 'createAppUser');
  const result = await createAppUser(data);
  return result.data;
};

/**
 * Deletes a user using server-side Cloud Function.
 */
export const deleteUserOnServer = async (targetUid: string) => {
  if (!functions) throw new Error("Functions not initialized");
  const deleteAppUser = httpsCallable(functions, 'deleteAppUser');
  const result = await deleteAppUser({ targetUid });
  return result.data;
};

/**
 * Fetches a user document directly by its ID.
 */
export const getUserById = async (id: string): Promise<AppUser | null> => {
  if (!id) return null;
  const docRef = doc(db!, 'users', id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  const role = data.role;
  return { 
    id: docSnap.id,
    ...data,
    role: Array.isArray(role) ? role : (role ? [role] : []),
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
  } as AppUser;
};

/**
 * Updates an existing user record with strict error handling and awaited writes.
 */
export const updateUser = async (
  id: string, 
  userData: { [key: string]: any }, 
  operatorInfo: { id: string; name: string; role: UserRole[] }
): Promise<void> => {
  if (id === 'anonymous-user') return;
  await persistenceReady;
  
  const userDocRef = doc(db!, 'users', id);
  const dataToUpdate = { ...userData };
  
  // Cleanup optional fields
  if (dataToUpdate.reportsTo === null) dataToUpdate.reportsTo = deleteField();
  if (dataToUpdate.pausedCallingSession === null) dataToUpdate.pausedCallingSession = deleteField();
  
  try {
    await updateDoc(userDocRef, dataToUpdate);
    // Move audit log to after successful await
    await logAudit('Update User', `Updated user record: ${userData.name || id}`, operatorInfo);
  } catch (err: any) {
    const permissionError = new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'update',
        requestResourceData: dataToUpdate,
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
    throw err; // Re-throw so UI can handle the error toast
  }
};

/**
 * Fetches users with robust deduplication logic.
 */
export const getUsers = async (userInfo?: AppUser): Promise<AppUser[]> => {
    const usersCollection = collection(db!, 'users');
    let rawUsers: AppUser[] = [];

    if (userInfo && !userInfo.role.includes('Admin')) {
        const queries: QueryConstraint[][] = [];
        if (userInfo.role.includes('Folk Guide')) {
            queries.push([where('reportsTo.guideId', '==', userInfo.id)]);
        }
        queries.push([where('__name__', '==', userInfo.id)]);
        
        const snapshots = await Promise.all(queries.map(qGroup => getDocs(query(usersCollection, ...qGroup))));
        rawUsers = snapshots.flatMap(snap => snap.docs.map(doc => {
            const data = doc.data();
            const role = data.role;
            return {
                id: doc.id,
                ...data,
                role: Array.isArray(role) ? role : (role ? [role] : []),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
            } as AppUser;
        }));
    } else {
        const snapshot = await getDocs(query(usersCollection));
        rawUsers = snapshot.docs.map(doc => {
          const data = doc.data();
          const role = data.role;
          return { 
            id: doc.id, 
            ...data, 
            role: Array.isArray(role) ? role : (role ? [role] : []),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
          } as AppUser;
        });
    }

    const uniqueUsersMap = new Map<string, AppUser>();
    rawUsers.forEach(user => {
        const email = (user.email || '').toLowerCase();
        if (!email) {
            uniqueUsersMap.set(user.id, user);
            return;
        }
        if (uniqueUsersMap.has(email)) {
            console.warn(`[Duplicate Entry] Hiding redundant user record ${user.id} with email ${email}`);
            return;
        }
        uniqueUsersMap.set(email, user);
    });

    return Array.from(uniqueUsersMap.values());
};

export const getFolkGuides = async (): Promise<AppUser[]> => {
    const usersCollection = collection(db!, 'users');
    const snapshot = await getDocs(query(usersCollection));
    
    const rawUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        const role = data.role;
        const isFolkGuide = Array.isArray(role) ? role.includes('Folk Guide') : role === 'Folk Guide';
        if (!isFolkGuide) return null;

        return { 
          id: doc.id, 
          ...data,
          role: Array.isArray(role) ? role : [role],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString() 
        } as AppUser;
    }).filter((u): u is AppUser => u !== null);

    const uniqueUsersMap = new Map<string, AppUser>();
    rawUsers.forEach(u => {
        const email = (u.email || '').toLowerCase();
        if (!email) {
            uniqueUsersMap.set(u.id, u);
            return;
        }
        if (uniqueUsersMap.has(email)) return;
        uniqueUsersMap.set(email, u);
    });

    return Array.from(uniqueUsersMap.values());
}

export const getAssignableUsersForAssignments = async(userInfo: AppUser): Promise<AppUser[]> => {
    const usersCollection = collection(db!, 'users');
    let snapshot;
    if (userInfo.role.includes('Admin')) {
        snapshot = await getDocs(query(usersCollection));
    } else if (userInfo.role.includes('Folk Guide')) {
        snapshot = await getDocs(query(usersCollection, where('reportsTo.guideId', '==', userInfo.id)));
    } else return [];
    
    const rawUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        const role = data.role;
        if (userInfo.role.includes('Admin')) {
            const isEnabler = Array.isArray(role) ? role.includes('Folk Enabler') : role === 'Folk Enabler';
            if (!isEnabler) return null;
        }
        return { 
          id: doc.id, 
          ...data, 
          role: Array.isArray(role) ? role : [role],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString() 
        } as AppUser;
    }).filter((u): u is AppUser => u !== null);

    const uniqueUsersMap = new Map<string, AppUser>();
    rawUsers.forEach(u => {
        const email = (u.email || '').toLowerCase();
        if (!email) {
            uniqueUsersMap.set(u.id, u);
            return;
        }
        if (uniqueUsersMap.has(email)) return;
        uniqueUsersMap.set(email, u);
    });

    return Array.from(uniqueUsersMap.values());
};
