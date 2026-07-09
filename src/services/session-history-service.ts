'use client';

import { db, persistenceReady } from '@/lib/firebase';
import { 
  collection, 
  setDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  serverTimestamp, 
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import type { AppUser, CallingSessionRecord } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export type { CallingSessionRecord };

/**
 * Fetches a single calling session by its unique ID.
 */
export async function getSessionById(sessionId: string): Promise<CallingSessionRecord | null> {
  if (!sessionId) return null;
  
  const docRef = doc(db, 'calling_sessions', sessionId);
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) return null;
  
  const data = snap.data();
  return { 
    id: snap.id, 
    ...data,
    lastActivity: data.lastActivity?.toDate?.()?.toISOString() || new Date().toISOString(),
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
  } as CallingSessionRecord;
}

/**
 * Creates a new persistent session record or updates an existing active one.
 */
export async function trackSessionStart(
  sessionData: { 
    name: string; 
    peopleIds: string[]; 
    assignedById?: string;
    assignedByName?: string;
    callerId?: string;
    callerName?: string;
    coEnablerIds?: string[];
  },
  user: AppUser
): Promise<string> {
  await persistenceReady;
  const callerId = sessionData.callerId || user.id;
  const callerName = sessionData.callerName || user.name;
  const userRoles = user.role || [];
  
  const nameSlug = sessionData.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
  const deterministicId = `active_${callerId}_${nameSlug}`;
  
  const sessionsRef = collection(db, 'calling_sessions');
  const sessionDocRef = doc(sessionsRef, deterministicId);
  
  const existingSnap = await getDoc(sessionDocRef);
  
  let finalDocRef = sessionDocRef;
  if (existingSnap.exists() && existingSnap.data()?.status === 'completed') {
      finalDocRef = doc(sessionsRef); 
  }

  const data = {
    name: sessionData.name.trim(),
    peopleIds: sessionData.peopleIds,
    currentIndex: (existingSnap.exists() && existingSnap.data()?.status !== 'completed') 
        ? (existingSnap.data()?.currentIndex || 0) 
        : 0,
    status: 'active',
    createdBy: callerId,
    creatorName: callerName,
    assignedById: sessionData.assignedById || user.id,
    assignedByName: sessionData.assignedByName || user.name,
    folkGuideId: userRoles.includes('Folk Guide') ? user.id : (user.reportsTo?.guideId || ''),
    lastActivity: serverTimestamp(),
    createdAt: (existingSnap.exists() && existingSnap.data()?.status !== 'completed') 
        ? existingSnap.data()?.createdAt 
        : serverTimestamp(),
    coEnablerIds: sessionData.coEnablerIds || [],
  };

  setDoc(finalDocRef, data, { merge: true })
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: finalDocRef.path,
            operation: 'write',
            requestResourceData: data,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });

  return finalDocRef.id;
}

/**
 * Updates progress for a persistent session.
 * If shouldRemove is true, the session record is DELETED to keep Live Activity clean.
 */
export async function updateSessionHistory(
  sessionId: string, 
  currentIndex: number, 
  shouldRemove: boolean = false
) {
  if (!sessionId) return;
  await persistenceReady;
  const docRef = doc(db, 'calling_sessions', sessionId);
  
  if (shouldRemove) {
    return deleteDoc(docRef)
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
  }

  const data = {
    currentIndex,
    status: 'active',
    lastActivity: serverTimestamp(),
  };

  return updateDoc(docRef, data)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: data,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });
}

/**
 * Fetches sessions based on role and requested scope.
 */
export async function fetchActivitySessions(
  user: AppUser, 
  scope: 'mine' | 'team' | 'all'
): Promise<CallingSessionRecord[]> {
  const sessionsRef = collection(db, 'calling_sessions');
  const userRoles = user.role || [];
  
  const q = query(
    sessionsRef, 
    where('status', '==', 'active'),
    orderBy('lastActivity', 'desc'), 
    limit(500)
  );
  
  const snap = await getDocs(q);
  const allSessions: CallingSessionRecord[] = snap.docs.map(d => {
    const data = d.data();
    return { 
      id: d.id, 
      ...data,
      lastActivity: data.lastActivity?.toDate?.()?.toISOString() || new Date().toISOString(),
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
    } as CallingSessionRecord;
  });

  const sortSessions = (list: CallingSessionRecord[]) => {
    return [...list].sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  };

  if (scope === 'mine') {
    return sortSessions(allSessions.filter(s => s.createdBy === user.id));
  } else if (scope === 'team') {
    if (userRoles.includes('Folk Guide')) {
      return sortSessions(allSessions.filter(s => s.folkGuideId === user.id && s.createdBy !== user.id));
    }
    return sortSessions(allSessions.filter(s => 
        s.createdBy !== user.id && (
            s.assignedById === user.id || 
            (s.coEnablerIds || []).includes(user.id)
        )
    ));
  } else {
    return sortSessions(allSessions.filter(s => {
        const isMyOwn = s.createdBy === user.id;
        const isMyDelegatedTask = s.assignedById === user.id && s.createdBy !== user.id;
        const isMyTeamAsGuide = userRoles.includes('Folk Guide') && s.folkGuideId === user.id;
        const isMyCoEnablerTask = (s.coEnablerIds || []).includes(user.id);
        return !isMyOwn && !isMyDelegatedTask && !isMyTeamAsGuide && !isMyCoEnablerTask;
    }));
  }
}

/**
 * Synchronizes a locally paused session to the persistent history collection.
 * Used for legacy sessions that don't have a historyId yet.
 */
export async function syncActiveSessionToHistory(user: AppUser): Promise<string | null> {
    if (!user.pausedCallingSession || user.pausedCallingSession.historyId) return null;
    
    return trackSessionStart({
        name: user.pausedCallingSession.event,
        peopleIds: user.pausedCallingSession.peopleIds,
        assignedById: user.pausedCallingSession.assignedById,
        assignedByName: user.pausedCallingSession.assignedByName,
        coEnablerIds: user.pausedCallingSession.coEnablerIds
    }, user);
}

/**
 * Fetches sessions that a contact has been involved in.
 */
export async function getSessionsForContact(personId: string, userId: string): Promise<CallingSessionRecord[]> {
    const sessionsRef = collection(db, 'calling_sessions');
    const q = query(
        sessionsRef, 
        where('peopleIds', 'array-contains', personId),
        where('status', '==', 'active'),
        limit(10)
    );
    
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        lastActivity: d.data().lastActivity?.toDate?.()?.toISOString() || new Date().toISOString()
    } as CallingSessionRecord));
}
