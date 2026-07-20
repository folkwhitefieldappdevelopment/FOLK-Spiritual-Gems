'use client';

import { CallLog } from '@/lib/call-log';
import { Capacitor } from '@capacitor/core';
import type { Person } from '@/lib/types';

/**
 * @fileOverview Local persistent cache for contact lookups.
 * Ensures the Caller ID overlay works instantly and fully offline.
 * Uses IndexedDB for large-scale persistent storage and syncs to a native-readable file.
 */

const DB_NAME = 'sg-contact-cache';
const STORE_NAME = 'contacts';
const DB_VERSION = 1;

export type CachedContact = {
  id: string;
  fullName: string;
  photoUrl: string;
  occupation: string;
  enablerInTouchWith: string;
  folkGuide: string;
  currentFolkStage: string;
  lastCallRemark: string;
  lastCallStatus: string;
  chantingStatus: number;
  attendanceHistory: string[]; // Formatted as ["Event Name · Date"]
};

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Opens the IndexedDB instance and creates the object store if it doesn't exist.
 */
function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported or window is undefined'));
      return;
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  return dbPromise;
}

/**
 * Internal helper to fetch all items for native synchronization.
 */
async function getAllFromStore(): Promise<Record<string, CachedContact>> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();
    const result: Record<string, CachedContact> = {};

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        result[cursor.key as string] = cursor.value;
        cursor.continue();
      } else {
        resolve(result);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Updates the local persistent cache with provided people data.
 */
export async function updateContactCache(people: Person[]) {
  if (typeof window === 'undefined') return;

  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    people.forEach(p => {
      if (p.phone) {
        const phoneStr = String(p.phone).trim();
        if (!phoneStr) return;
        const norm = phoneStr.replace(/\D/g, '').slice(-10);
        if (!norm) return;
        
        const attendance = (p.attendanceHistory || [])
          .slice(0, 3)
          .map(a => `${a.eventName || a.groupName} · ${a.date}`);

        const entry: CachedContact = {
          id: p.id,
          fullName: p.fullName,
          photoUrl: p.photoUrl,
          occupation: p.occupation || '',
          enablerInTouchWith: p.enablerInTouchWith || '',
          folkGuide: p.folkGuide || '',
          currentFolkStage: p.currentFolkStage || '',
          lastCallRemark: p.lastCallRemark || '',
          lastCallStatus: p.lastCallStatus || '',
          chantingStatus: p.chantingStatus || 0,
          attendanceHistory: attendance
        };
        // store.put acts as an upsert (update if exists, create if not)
        store.put(entry, norm);
      }
    });

    // Wait for the transaction to complete
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Sync to native file system for zero-latency lookup outside WebView
    if (Capacitor.isNativePlatform()) {
        const fullCache = await getAllFromStore();
        const json = JSON.stringify(fullCache);
        CallLog.syncNativeContactCache({ json }).catch(e => {
            console.warn('[Cache] Native sync failed', e);
        });
    }
  } catch (e) {
    console.error('[Cache] Update failed', e);
  }
}

/**
 * Retrieves a contact from local cache by phone number.
 */
export async function getCachedContact(phone: string): Promise<CachedContact | null> {
  if (typeof window === 'undefined') return null;

  try {
    if (!phone) return null;
    const norm = String(phone).replace(/\D/g, '').slice(-10);
    if (!norm) return null;

    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(norm);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return null;
  }
}