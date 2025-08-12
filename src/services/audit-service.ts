
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import type { AppUser, UserRole } from '@/lib/types';

export type AuditLog = {
    id: string;
    timestamp: any; // Firestore Timestamp
    userId: string;
    userName: string;
    action: string;
    details: string;
};

type AuditLogData = Omit<AuditLog, 'id' | 'timestamp'>;

export const logAudit = async (action: string, details: string) => {
    const auditData: AuditLogData = {
        userId: "system",
        userName: "System",
        action,
        details,
    };

    try {
        const auditCollection = collection(db, 'audits');
        await addDoc(auditCollection, {
            ...auditData,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Failed to write audit log:", error);
        // Fail silently to not disrupt user experience
    }
};

export const getAudits = async (): Promise<AuditLog[]> => {
    const auditCollection = collection(db, 'audits');
    const q = query(auditCollection, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id,
             ...data,
             timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString()
        } as AuditLog
    });
};
