'use client';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import type { UserRole } from '@/lib/types';

export type AuditLog = {
    id: string;
    timestamp: any;
    userId: string;
    userName: string;
    action: string;
    details: string;
};

export const logAudit = async (action: string, details: string, userInfo?: { id: string, name: string, role?: UserRole[] }) => {
    const auditData = {
        userId: userInfo?.id || "system",
        userName: userInfo?.name || "System",
        action,
        details,
        timestamp: serverTimestamp(),
    };

    addDoc(collection(db, 'audits'), auditData).catch(err => console.warn("Audit logging failed", err));
};

export const getAudits = async (): Promise<AuditLog[]> => {
    const auditCollection = collection(db, 'audits');
    const q = query(auditCollection, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString();
        return { id: doc.id, ...data, timestamp } as AuditLog;
    });
};
