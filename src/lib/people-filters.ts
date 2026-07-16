'use client';

import type { Person, FilterState } from './types';
import { normalizePhone } from '@/services/people-service';
import { safeDate } from '@/utils/date';
import { startOfDay, endOfDay } from 'date-fns';

/**
 * Canonical filtering logic used for both client-side (Group Details)
 * and server-side (Contacts roster) data matching.
 */
export function matchesFilters(p: Person, filters: Partial<FilterState>): boolean {
  if (filters.stage && p.currentFolkStage !== filters.stage) return false;
  
  if (filters.enablerId) {
      if (filters.enablerId === '__UNASSIGNED__') {
          if (p.enablerId || p.enablerInTouchWith) return false;
      } else {
          // Robust Enabler ID + Name matching logic
          const parts = filters.enablerId.split('::');
          const id = parts.length > 1 ? parts[1] : parts[0];
          const nameFallback = parts.length > 1 ? parts[0] : filters.enablerName;

          const matchesId = p.enablerId === id;
          const matchesNameFallback = !p.enablerId && nameFallback && p.enablerInTouchWith?.split('::')[0].trim() === nameFallback.trim();
          
          if (!matchesId && !matchesNameFallback) return false;
      }
  }

  const rounds = p.chantingStatus || 0;
  if (filters.chantingRoundsMin || filters.chantingRoundsMax) {
      if (filters.chantingRoundsMin) {
          const min = parseInt(filters.chantingRoundsMin);
          if (rounds < min) return false;
      }
      if (filters.chantingRoundsMax) {
          const max = parseInt(filters.chantingRoundsMax);
          if (rounds > max) return false;
      }
  } else if (filters.chantingRounds) {
    const target = parseInt(filters.chantingRounds);
    if (rounds !== target) return false;
  }

  if (filters.name && !p.fullName?.toLowerCase().includes(filters.name.toLowerCase())) return false;
  if (filters.phone && !normalizePhone(p.phone).includes(normalizePhone(filters.phone))) return false;
  if (filters.location && !p.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;
  if (filters.stayingWith && p.stayingWith !== filters.stayingWith) return false;
  if (filters.callStatus && p.lastCallStatus !== filters.callStatus) return false;
  
  if (filters.contactSources && filters.contactSources.length > 0) {
    const pSources = p.contactSource || [];
    if (!filters.contactSources.some(s => pSources.includes(s))) return false;
  }

  if (filters.eventName || filters.callerName || filters.callDateFrom || filters.callDateTo) {
    const logs = p.callHistory || [];
    const match = logs.some(log => {
      const logDate = safeDate(log.calledAt);
      let dateMatch = true;
      if (filters.callDateFrom && logDate) dateMatch = dateMatch && logDate >= startOfDay(new Date(filters.callDateFrom));
      if (filters.callDateTo && logDate) dateMatch = dateMatch && logDate <= endOfDay(new Date(filters.callDateTo));
      const eventMatch = filters.eventName ? log.event?.toLowerCase().includes(filters.eventName.toLowerCase()) : true;
      const callerMatch = filters.callerName ? log.callerName?.toLowerCase().includes(filters.callerName.toLowerCase()) : true;
      return dateMatch && eventMatch && callerMatch;
    });
    if (!match) return false;
  }

  return true;
}
