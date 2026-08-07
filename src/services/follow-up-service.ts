'use client';

/**
 * @fileOverview Follow-Up Intelligence Service.
 * Identifies contacts needing attention based on Never Contacted, Overdue Callbacks, or Stale SLAs.
 */

import { getCachedPeople } from './people-service';
import type { Person, AppUser, FolkStage } from '@/lib/types';
import { FOLLOW_UP_SLA_DAYS, ELIMINATED_STATUSES, isAssignedToUser } from '@/lib/types';
import { differenceInDays, isPast } from 'date-fns';
import { safeDate } from '@/utils/date';
import { getAssignableUsersForAssignments } from './user-service';
import { getTeamsForGuide, getAllTeams } from './team-service';

export type FollowUpTier = 'never' | 'overdue' | 'stale';

export type FollowUpItem = {
  person: Person;
  tier: FollowUpTier;
  daysSince: number | null; // null for "never"
};

export type EnablerFollowUpSummary = {
  enablerId: string;
  enablerName: string;
  never: number;
  overdue: number;
  stale: number;
  total: number;
};

export type TeamFollowUpSummary = {
  teamId: string | null; // null = unassigned
  teamName: string;      // "Unassigned" when teamId is null
  enablers: EnablerFollowUpSummary[];
  never: number;
  overdue: number;
  stale: number;
  total: number;
};

/**
 * Core logic to determine if a contact needs attention.
 */
function getFollowUpTier(person: Person): { tier: FollowUpTier; daysSince: number | null } | null {
  if (person.isDeleted || ELIMINATED_STATUSES.includes(person.lastCallStatus || '')) {
    return null;
  }

  const now = new Date();

  // 1. Overdue Callback (Highest Priority)
  if (person.nextFollowUpAt) {
    const nextDate = safeDate(person.nextFollowUpAt);
    if (nextDate && isPast(nextDate)) {
      return { tier: 'overdue', daysSince: differenceInDays(now, nextDate) };
    }
  }

  // 2. Never Contacted
  const lastCall = safeDate(person.lastCallAt);
  if (!lastCall) {
    const created = safeDate(person.createdAt) || now;
    return { tier: 'never', daysSince: differenceInDays(now, created) };
  }

  // 3. Gone Stale
  const stage = person.currentFolkStage || 'Fresh Lead';
  const slaDays = FOLLOW_UP_SLA_DAYS[stage] || 7;
  const daysSinceLastCall = differenceInDays(now, lastCall);

  if (daysSinceLastCall > slaDays) {
    return { tier: 'stale', daysSince: daysSinceLastCall };
  }

  return null;
}

/**
 * Returns prioritized follow-up items for a specific user (Enabler).
 */
export async function getFollowUpItemsForCurrentUser(userInfo: AppUser): Promise<FollowUpItem[]> {
  const allPeople = await getCachedPeople();
  const myPeople = allPeople.filter(p => isAssignedToUser(p, userInfo));
  
  const items: FollowUpItem[] = [];
  
  myPeople.forEach(p => {
    const result = getFollowUpTier(p);
    if (result) {
      items.push({ person: p, ...result });
    }
  });

  // Sort: Overdue -> Never -> Stale, then by longest wait within tier
  return items.sort((a, b) => {
    const tierOrder = { overdue: 0, never: 1, stale: 2 };
    if (tierOrder[a.tier] !== tierOrder[b.tier]) {
      return tierOrder[a.tier] - tierOrder[b.tier];
    }
    return (b.daysSince || 0) - (a.daysSince || 0);
  });
}

/**
 * Returns a team-grouped roll-up of follow-up needs for all enablers under a guide.
 */
export async function getFollowUpSummaryForGuide(guideUserInfo: AppUser): Promise<TeamFollowUpSummary[]> {
  const allPeople = await getCachedPeople();
  const enablers = await getAssignableUsersForAssignments(guideUserInfo);
  
  // If the user is an enabler themselves, include them in the summary
  if (guideUserInfo.role.includes('Folk Enabler') && !enablers.find(e => e.id === guideUserInfo.id)) {
    enablers.push(guideUserInfo);
  }

  // Step 1: Calculate individual enabler summaries
  const enablerSummaries: EnablerFollowUpSummary[] = enablers.map(enabler => {
    const myPeople = allPeople.filter(p => isAssignedToUser(p, enabler));
    const summary: EnablerFollowUpSummary = {
      enablerId: enabler.id,
      enablerName: enabler.name,
      never: 0,
      overdue: 0,
      stale: 0,
      total: 0
    };

    myPeople.forEach(p => {
      const result = getFollowUpTier(p);
      if (result) {
        summary[result.tier]++;
        summary.total++;
      }
    });

    return summary;
  });

  // Step 2: Group enablers by team
  const teamsMap = new Map<string | null, TeamFollowUpSummary>();
  
  enablers.forEach(enabler => {
      const teamId = enabler.team?.teamId || null;
      const teamName = enabler.team?.teamName || "Unassigned";
      
      if (!teamsMap.has(teamId)) {
          teamsMap.set(teamId, {
              teamId,
              teamName,
              enablers: [],
              never: 0,
              overdue: 0,
              stale: 0,
              total: 0
          });
      }
      
      const teamSummary = teamsMap.get(teamId)!;
      const eSum = enablerSummaries.find(s => s.enablerId === enabler.id)!;
      
      teamSummary.enablers.push(eSum);
      teamSummary.never += eSum.never;
      teamSummary.overdue += eSum.overdue;
      teamSummary.stale += eSum.stale;
      teamSummary.total += eSum.total;
  });

  // Step 3: Sort and return
  return Array.from(teamsMap.values()).sort((a, b) => {
      if (a.teamId === null) return 1;
      if (b.teamId === null) return -1;
      return a.teamName.localeCompare(b.teamName);
  });
}

/**
 * Returns follow-up items for a specific enabler (used for Guide drill-down).
 * Now accepts a full enabler object to support both ID and name fallback matching.
 */
export async function getFollowUpItemsForEnabler(enabler: { id: string; name: string }): Promise<FollowUpItem[]> {
  const allPeople = await getCachedPeople();
  const items: FollowUpItem[] = [];
  
  allPeople.forEach(p => {
    if (isAssignedToUser(p, enabler)) {
      const result = getFollowUpTier(p);
      if (result) {
        items.push({ person: p, ...result });
      }
    }
  });

  return items.sort((a, b) => {
    const tierOrder = { overdue: 0, never: 1, stale: 2 };
    if (tierOrder[a.tier] !== tierOrder[b.tier]) return tierOrder[a.tier] - tierOrder[b.tier];
    return (b.daysSince || 0) - (a.daysSince || 0);
  });
}
