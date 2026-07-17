'use client';

import type { Person } from '@/lib/types';

/**
 * @fileOverview Local persistent cache for contact lookups.
 * Ensures the Caller ID overlay works instantly and fully offline.
 * Uses localStorage for robust cross-platform persistence without external dependencies.
 */

const CONTACT_CACHE_KEY = 'sg_contact_lookup_cache';

export type CachedContact = {
  fullName: string;
  photoUrl: string;
  occupation: string;
  enablerInTouchWith: string;
  folkGuide: string;
  currentFolkStage: string;
  lastCallRemark: string;
  lastCallStatus: string;
  attendanceHistory: string[]; // Formatted as ["Event Name · Date"]
};

/**
 * Updates the local persistent cache with provided people data.
 */
export async function updateContactCache(people: Person[]) {
  if (typeof window === 'undefined') return;

  try {
    const storedValue = localStorage.getItem(CONTACT_CACHE_KEY);
    const cache: Record<string, CachedContact> = storedValue ? JSON.parse(storedValue) : {};

    people.forEach(p => {
      if (p.phone) {
        // Use last 10 digits as normalized key
        const norm = p.phone.replace(/\D/g, '').slice(-10);
        
        const attendance = (p.attendanceHistory || [])
          .slice(0, 3)
          .map(a => `${a.eventName || a.groupName} · ${a.date}`);

        cache[norm] = {
          fullName: p.fullName,
          photoUrl: p.photoUrl,
          occupation: p.occupation || '',
          enablerInTouchWith: p.enablerInTouchWith || '',
          folkGuide: p.folkGuide || '',
          currentFolkStage: p.currentFolkStage || '',
          lastCallRemark: p.lastCallRemark || '',
          lastCallStatus: p.lastCallStatus || '',
          attendanceHistory: attendance
        };
      }
    });

    localStorage.setItem(CONTACT_CACHE_KEY, JSON.stringify(cache));
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
    const norm = phone.replace(/\D/g, '').slice(-10);
    const storedValue = localStorage.getItem(CONTACT_CACHE_KEY);
    if (!storedValue) return null;
    
    const cache = JSON.parse(storedValue);
    return cache[norm] || null;
  } catch (e) {
    return null;
  }
}
