'use client';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { getCachedPeople } from './people-service';
import { safeDate } from '@/utils/date';
import type { AppUser, Person } from '@/lib/types';

/**
 * Service to identify device call logs that have not yet been manually documented.
 */
export async function getPendingCallLogs(appUser: AppUser) {
    if (!appUser || !appUser.id) return [];

    // 1. Fetch user's recent device call logs (limit to 100 most recent for performance)
    const logsRef = collection(db, 'call-logs');
    const q = query(
        logsRef, 
        where('userId', '==', appUser.id),
        orderBy('timestamp', 'desc'),
        limit(100)
    );
    
    const logSnap = await getDocs(q);
    const deviceLogs = logSnap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        duration: Number(d.data().duration || 0)
    }));

    if (deviceLogs.length === 0) return [];

    // 2. Get contacts from master cache
    const allPeople = await getCachedPeople();
    
    // Create a map for O(1) phone lookup
    const phoneToPersonMap = new Map<string, Person>();
    allPeople.forEach(p => {
        if (p.phone) {
            // Store only the last 10 digits for resilient matching
            const norm = p.phone.replace(/\D/g, '').slice(-10);
            phoneToPersonMap.set(norm, p);
        }
    });

    const pendingLogs: any[] = [];
    const TEN_MINS = 1000 * 60 * 10;

    for (const log of deviceLogs) {
        const normPhone = (log.phoneNumber || '').replace(/\D/g, '').slice(-10);
        const person = phoneToPersonMap.get(normPhone);
        
        // Only care about logs that match an actual contact
        if (!person) continue;

        // Logic check: Is there a manual interaction entry in the contact's history 
        // that falls within the same 10-minute window as this device log?
        const hasManualLog = (person.callHistory || []).some(manual => {
            // Ignore system/attendance logs for documentation matching
            if (manual.type === 'attendance') return false;
            
            const manualDate = safeDate(manual.calledAt);
            if (!manualDate) return false;
            
            // Check if timestamps are in the same 10-minute block (standard merge window)
            const logWindow = Math.floor(log.timestamp / TEN_MINS);
            const manualWindow = Math.floor(manualDate.getTime() / TEN_MINS);
            
            return logWindow === manualWindow;
        });

        if (!hasManualLog) {
            pendingLogs.push({
                ...log,
                person
            });
        }
    }

    return pendingLogs;
}
