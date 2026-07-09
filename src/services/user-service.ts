'use client';

import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  type QueryConstraint,
} from 'firebase/firestore';
import type { AppUser, UserRole } from '@/lib/types';
import { logAudit } from '@/services/audit-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Fetches a user document directly by its ID (preferred method).
 */
export const getUserById = async (id: string): Promise<AppUser | null> => {
  if (!id) return null;
  const docRef = doc(db, 'users', id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  return { 
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
  } as AppUser;
};

export const createUser = async (userData: Omit<AppUser, 'id' | 'createdAt'>, uid?: string): Promise<AppUser> => {
  const usersCollection = collection(db, 'users');
  
  const q = query(usersCollection, where("email", "==", userData.email));
  const existingUserSnapshot = await getDocs(q);
  
  if (!existingUserSnapshot.empty) {
    const existingDoc = existingUserSnapshot.docs[0];
    const existingData = existingDoc.data();
    return { 
      id: existingDoc.id, 
      ...existingData,
      createdAt: existingData.createdAt?.toDate ? existingData.createdAt.toDate().toISOString() : new Date().toISOString()
    } as AppUser;
  }

  const dataToSave: any = { ...userData, createdAt: serverTimestamp() };
  
  if (uid) {
    const docRef = doc(db, 'users', uid);
    setDoc(docRef, dataToSave)
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: dataToSave,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
    return { id: uid, ...userData, createdAt: new Date().toISOString() } as AppUser;
  } else {
    const docRef = await addDoc(usersCollection, dataToSave);
    return { id: docRef.id, ...userData, createdAt: new Date().toISOString() } as AppUser;
  }
};

export const updateUser = async (id: string, userData: { [key: string]: any }): Promise<void> => {
  if (id === 'anonymous-user') return;
  
  const userDocRef = doc(db, 'users', id);
  const dataToUpdate = { ...userData };
  if (dataToUpdate.reportsTo === null) dataToUpdate.reportsTo = deleteField();
  if (dataToUpdate.pausedCallingSession === null) dataToUpdate.pausedCallingSession = deleteField();
  
  updateDoc(userDocRef, dataToUpdate)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });
  
  logAudit('Update User', `Updated user: ${id}`, { id, name: userData.name || 'User', role: userData.role });
};

export const getUsers = async (userInfo?: AppUser): Promise<AppUser[]> => {
    const usersCollection = collection(db, 'users');
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
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
            } as AppUser;
        }));
    } else {
        const snapshot = await getDocs(query(usersCollection));
        rawUsers = snapshot.docs.map(doc => {
          const data = doc.data();
          return { 
            id: doc.id, 
            ...data,
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
        const existing = uniqueUsersMap.get(email);
        if (!existing || (user.id.length > existing.id.length)) {
            uniqueUsersMap.set(email, user);
        }
    });

    return Array.from(uniqueUsersMap.values());
};

export const getFolkGuides = async (): Promise<AppUser[]> => {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('role', 'array-contains', 'Folk Guide'));
    const snapshot = await getDocs(q);
    const rawUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data, 
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString() 
        } as AppUser;
    });

    const uniqueUsersMap = new Map<string, AppUser>();
    rawUsers.forEach(u => {
        const email = (u.email || '').toLowerCase();
        if (!email) {
            uniqueUsersMap.set(u.id, u);
            return;
        }
        const existing = uniqueUsersMap.get(email);
        if (!existing || u.id.length > existing.id.length) {
            uniqueUsersMap.set(email, u);
        }
    });

    return Array.from(uniqueUsersMap.values());
}

export const getAssignableUsersForAssignments = async(userInfo: AppUser): Promise<AppUser[]> => {
    const usersCollection = collection(db, 'users');
    const constraints: QueryConstraint[] = [];
    if (userInfo.role.includes('Admin')) {
        constraints.push(where('role', 'array-contains', 'Folk Enabler'));
    } else if (userInfo.role.includes('Folk Guide')) {
        constraints.push(where('reportsTo.guideId', '==', userInfo.id));
    } else return [];
    
    const snapshot = await getDocs(query(usersCollection, ...constraints));
    const rawUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString() } as AppUser;
    });

    const uniqueUsersMap = new Map<string, AppUser>();
    rawUsers.forEach(u => {
        const email = (u.email || '').toLowerCase();
        if (!email) {
            uniqueUsersMap.set(u.id, u);
            return;
        }
        const existing = uniqueUsersMap.get(email);
        if (!existing || u.id.length > existing.id.length) {
            uniqueUsersMap.set(email, u);
        }
    });

    return Array.from(uniqueUsersMap.values());
};