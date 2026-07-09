'use client';

import { db, persistenceReady } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, limit, doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { AppNotification, UserRole, AppUser } from '@/lib/types';
import { logAudit } from './audit-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export const addNotificationToHistory = async (userId: string, notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => {
  await persistenceReady;
  const historyRef = collection(db, 'users', userId, 'notifications');
  const data: any = {
    ...notification,
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  
  addDoc(historyRef, data).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: historyRef.path,
      operation: 'create',
      requestResourceData: data,
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
};

export const getNotificationHistory = async (userId: string): Promise<AppNotification[]> => {
  const historyRef = collection(db, 'users', userId, 'notifications');
  const q = query(historyRef, orderBy('timestamp', 'desc'), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
  await persistenceReady;
  const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
  const data = { isRead: true };
  
  updateDoc(notificationRef, data).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: notificationRef.path,
      operation: 'update',
      requestResourceData: data,
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
};

export const clearAllNotifications = async (userId: string) => {
  await persistenceReady;
  const historyRef = collection(db, 'users', userId, 'notifications');
  const snap = await getDocs(historyRef);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  
  batch.commit().catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: historyRef.path,
      operation: 'delete',
      } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
};

export const broadcastNotification = async (
  adminInfo: { id: string, name: string, role: UserRole[] },
  data: { title: string; message: string; targetRoles: UserRole[] }
) => {
  await persistenceReady;
  const usersRef = collection(db, 'users');
  const snap = await getDocs(query(usersRef));
  
  const now = new Date().toISOString();
  const chunks = [];
  const allTargetUsers = snap.docs.filter(userDoc => {
    const userData = userDoc.data() as AppUser;
    return data.targetRoles.length === 0 || data.targetRoles.some(r => userData.role.includes(r));
  });

  // Firestore batch limit is 500
  for (let i = 0; i < allTargetUsers.length; i += 500) {
    chunks.push(allTargetUsers.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach(userDoc => {
      const notifRef = doc(collection(db, 'users', userDoc.id, 'notifications'));
      batch.set(notifRef, {
        title: data.title,
        message: data.message,
        timestamp: now,
        isRead: false,
        type: 'info',
        senderId: adminInfo.id,
        senderName: adminInfo.name
      });
    });
    
    batch.commit().catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: 'users/{userId}/notifications',
        operation: 'write',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });
  }

  await logAudit(
    'Broadcast Notification',
    `Sent to ${allTargetUsers.length} users with roles: ${data.targetRoles.join(', ') || 'All'}`,
    adminInfo
  );
};
