
'use client';

/**
 * @fileOverview Data-Driven Outreach Intelligence Service.
 * Refined logic: Intro bracket strictly 1 round. 
 * ALL statistical scores (Health, Leaderboards) ignore 0-rounders to provide a focused pulse of active practitioners.
 */

import type { Person, Group, GroupEvent } from '@/lib/types';
import { differenceInDays, subDays } from 'date-fns';
import { safeDate } from '@/utils/date';

export type ChantingBracket = {
  label: string;
  count: number;
  people: Person[];
};

export type EnablerPerformance = {
  name: string;
  totalCalls: number;
  a1Count: number;
  totalDuration: number;
  eventAttendance: Record<string, number>;
};

export type IntelligenceInsights = {
  dangerZone: Person[];
  starPerformers: Person[];
  chantingBrackets: Record<string, ChantingBracket>;
  enablerLeaderboard: EnablerPerformance[];
  summary: {
    totalMembers: number;
    activeCount: number;
    dangerCount: number;
    successRate: number;
    totalDuration: number;
    healthScore: number;
  };
};

export async function calculateGroupInsights(people: Person[], events: GroupEvent[] = []): Promise<IntelligenceInsights> {
  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  
  // 1. FILTER: pulse metrics strictly focus on practitioners (chanting status > 0)
  // 0-rounders are inactive leads and should not dilute statistical percentages.
  const practitioners = people.filter(p => !p.isDeleted && Number(p.chantingStatus || 0) > 0);
  
  const dangerZone: Person[] = [];
  const starPerformers: Person[] = [];
  
  const chantingBrackets: Record<string, ChantingBracket> = {
    'intro': { label: 'Intro (Exactly 1 Round)', count: 0, people: [] },
    'prelims': { label: 'Prelims (2-3)', count: 0, people: [] },
    'enhanced': { label: 'Enhanced (4-7)', count: 0, people: [] },
    'graduate': { label: 'Graduate (8-15)', count: 0, people: [] },
    'advanced': { label: 'Advanced (16+)', count: 0, people: [] },
  };

  const enablerStats: Record<string, EnablerPerformance> = {};
  
  let practitionersActiveLast7Days = 0;
  let practitionerA1s = 0;
  let globalDuration = 0;

  // Analysis Loop
  people.forEach(p => {
    const rounds = Number(p.chantingStatus || 0);
    const isPractitioner = rounds > 0;
    const isDeleted = p.isDeleted === true;

    // Attendance analysis (counts all non-deleted members, including 0-rounders if they attend)
    if (!isDeleted && p.attendanceHistory && p.attendanceHistory.length > 0) {
      starPerformers.push(p);
    }

    // Skip all engagement tallies if not a practitioner
    if (!isPractitioner || isDeleted) return;

    // Assign to chanting brackets
    let bracketKey = '';
    if (rounds >= 16) bracketKey = 'advanced';
    else if (rounds >= 8) bracketKey = 'graduate';
    else if (rounds >= 4) bracketKey = 'enhanced';
    else if (rounds >= 2) bracketKey = 'prelims';
    else if (rounds === 1) bracketKey = 'intro'; // Strictly 1 round only

    if (bracketKey) {
      chantingBrackets[bracketKey].count++;
      chantingBrackets[bracketKey].people.push(p);
    }

    const lastCall = safeDate(p.lastCallAt);
    const daysSince = lastCall ? differenceInDays(now, lastCall) : 999;
    const isEliminated = ['A2 - Not Interested', 'A3 - Wrong Number', 'G - Completely Shifted to Another city'].includes(p.lastCallStatus || '');
    
    // Danger Zone (Practitioners stagnant for 4+ days)
    if (daysSince >= 4 && !isEliminated) {
      dangerZone.push(p);
    }

    // Tally engagement metrics for practitioners only
    if (lastCall && lastCall >= sevenDaysAgo) {
        practitionersActiveLast7Days++;
    }
    
    if (p.lastCallStatus === 'A1 - Coming') {
        practitionerA1s++;
    }

    // Enabler Performance tracking
    const enablerName = p.enablerInTouchWith || 'Unassigned';
    if (!enablerStats[enablerName]) {
        enablerStats[enablerName] = { 
            name: enablerName, 
            totalCalls: 0, 
            a1Count: 0, 
            totalDuration: 0, 
            eventAttendance: {} 
        };
    }
    const eStat = enablerStats[enablerName];

    if (p.callHistory && Array.isArray(p.callHistory)) {
        p.callHistory.forEach(log => {
            const logDate = safeDate(log.calledAt);
            if (logDate && logDate >= sevenDaysAgo) {
                eStat.totalCalls++;
                const isPicked = ['A1 - Coming', 'Z - Already Attended', 'A4 - Tentative'].includes(log.status);
                const dur = log.duration !== undefined ? Number(log.duration) : (isPicked ? 60 : 10);
                eStat.totalDuration += dur;
                globalDuration += dur;
                if (log.status === 'A1 - Coming') eStat.a1Count++;
            }
        });
    }
  });

  const leaderboard = Object.values(enablerStats).sort((a, b) => b.a1Count - a.a1Count);
  const topActive = [...starPerformers].sort((a, b) => (b.attendanceHistory?.length || 0) - (a.attendanceHistory?.length || 0)).slice(0, 6);

  // Health score denominator strictly uses practitioners (souls chanting > 0)
  const healthScore = practitioners.length > 0 
    ? Math.round(((practitionersActiveLast7Days / practitioners.length) * 50) + ((practitionerA1s / practitioners.length) * 50)) 
    : 0;

  return {
    dangerZone: dangerZone.sort((a, b) => {
        const da = safeDate(a.lastCallAt)?.getTime() || 0;
        const db = safeDate(b.lastCallAt)?.getTime() || 0;
        return da - db;
    }),
    starPerformers: topActive,
    chantingBrackets,
    enablerLeaderboard: leaderboard,
    summary: {
      totalMembers: practitioners.length, 
      activeCount: practitionersActiveLast7Days,
      dangerCount: dangerZone.length,
      successRate: practitioners.length > 0 ? Math.round((practitionerA1s / practitioners.length) * 100) : 0,
      totalDuration: globalDuration,
      healthScore
    }
  };
}
