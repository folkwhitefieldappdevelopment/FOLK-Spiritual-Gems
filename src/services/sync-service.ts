'use client';

import { getPeople } from './people-service';
import { CallLog } from '@/lib/call-log';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser } from '@/lib/types';
import { Capacitor } from '@capacitor/core';

let syncInterval: any = null;
let lastSyncTimestamp = 0;
const MIN_SYNC_COOLDOWN = 1000 * 60 * 5; // 5 minutes

async function syncAllCallLogs(appUser: AppUser, isForegroundTrigger = false) {
  if (!appUser || !appUser.id) return;
  
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Throttle foreground triggers
  const now = Date.now();
  if (isForegroundTrigger && (now - lastSyncTimestamp < MIN_SYNC_COOLDOWN)) {
    return;
  }
  
  lastSyncTimestamp = now;
  
  try {
    const { people } = await getPeople(appUser, { scope: 'my', ignoreLimit: true });
    if (people.length === 0) return;

    const callLogCollection = collection(db!, 'call-logs');
    const batch = writeBatch(db!);
    let totalSynced = 0;

    for (const person of people) {
      if (!person.phone) continue;

      const lastSync = person.lastSyncTimestamp || 0;
      
      const { callLog: nativeLogs } = await CallLog.getCallLog({
        contactPhoneNumber: person.phone,
        lastSyncTimestamp: lastSync,
      });

      if (nativeLogs && nativeLogs.length > 0) {
        nativeLogs.forEach(log => {
          const logRef = doc(callLogCollection, log.id);
          
          batch.set(logRef, {
            ...log,
            phoneNumber: person.phone,
            userId: appUser.id,
            userName: appUser.name,
            userPhotoUrl: appUser.photoUrl || '',
            syncedAt: new Date().toISOString(),
            isExternal: true,
          }, { merge: true });
          
          totalSynced++;
        });

        const personRef = doc(db!, 'people', person.id);
        const latestTimestamp = Math.max(...nativeLogs.map(l => l.timestamp));
        batch.update(personRef, { lastSyncTimestamp: latestTimestamp });
      }
    }

    if (totalSynced > 0) {
        await batch.commit();
    }
  } catch (error) {
    console.error('[Sync] Error:', error);
  }
}

export function startBackgroundSync(appUser: AppUser) {
  if (syncInterval) clearInterval(syncInterval);

  setTimeout(() => syncAllCallLogs(appUser), 10000);
  
  if (Capacitor.isNativePlatform()) {
    import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', (state) => {
            if (state.isActive) {
                syncAllCallLogs(appUser, true);
            }
        });
    }).catch(err => console.warn("Capacitor App plugin load failed", err));
  }

  syncInterval = setInterval(() => {
    syncAllCallLogs(appUser);
  }, 15 * 60 * 1000);
}

export function stopBackgroundSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
