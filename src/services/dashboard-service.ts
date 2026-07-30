'use client';

/**
 * @fileOverview Optimized dashboard statistics generator.
 * Accurate counting for large datasets (50k limit) and Date-Wise Leaderboard.
 * Uses Shared Data Layer to minimize document reads.
 */

import {
    collection,
    query,
    getDocs,
    limit,
    getCountFromServer,
    where,
    or,
    and
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, DashboardData, CallingReport, Person, LeaderboardEntry } from '@/lib/types';
import { callStatuses, isAssignedToUser, ELIMINATED_STATUSES } from '@/lib/types';
import { safeDate } from '@/utils/date';
import { startOfDay, endOfDay, isWithinInterval, format } from 'date-fns';
import { getCachedPeople } from './people-service';
import { getAssignableUsersForAssignments } from './user-service';
import { computeEnablerStageBreakdown, computeEnablerChantingBreakdown } from '@/lib/dynamic-groups';

/**
 * High-performance summary fetcher.
 * Uses Firestore server-side aggregation for instant card results.
 * This avoids triggering a full collection sync just to get basic counts.
 */
export async function getFastSummaryStats(appUser: AppUser) {
    const peopleRef = collection(db!, 'people');
    
    // Canonical definition of "Active": not deleted and not in eliminated categories.
    // 1. Total Active Logic
    const activeQuery = query(
        peopleRef, 
        where('isDeleted', '==', false), 
        where('lastCallStatus', 'not-in', ELIMINATED_STATUSES)
    );
    
    // 2. My Active Logic
    const myCriteria = or(
        where('enablerId', '==', appUser.id),
        where('coEnablerId', '==', appUser.id)
    );
    
    const myActiveQuery = query(
        peopleRef, 
        and(where('isDeleted', '==', false), where('lastCallStatus', 'not-in', ELIMINATED_STATUSES)),
        myCriteria
    );

    try {
        const [totalActiveSnap, myActiveSnap] = await Promise.all([
            getCountFromServer(activeQuery),
            getCountFromServer(myActiveQuery)
        ]);

        return {
            totalContactsCount: totalActiveSnap.data().count,
            myContactsCount: myActiveSnap.data().count
        };
    } catch (e) {
        // Fallback for missing indices
        const notDeletedQuery = query(peopleRef, where('isDeleted', '==', false));
        const totalNotDeletedSnap = await getCountFromServer(notDeletedQuery);
        return {
            totalContactsCount: totalNotDeletedSnap.data().count,
            myContactsCount: 0
        };
    }
}

export async function getDashboardStats(
  appUser: AppUser,
  options: { 
    from?: Date; 
    to?: Date; 
    timezoneOffset: number, 
    targetFolkGuideId?: string,
    trustedTotalCounts?: { totalContactsCount: number; myContactsCount: number }
  },
): Promise<DashboardData> {
  const { from, to } = options;
  const start = startOfDay(from || new Date());
  const end = endOfDay(to || from || new Date());

  const allPeople = await getCachedPeople();

  const activePeople = allPeople.filter(p => 
    p.isDeleted !== true && 
    !ELIMINATED_STATUSES.includes(p.lastCallStatus || '')
  );

  let allNewInRange = 0;
  let myNewInRange = 0;

  activePeople.forEach(p => {
      const created = safeDate(p.createdAt);
      const isMine = isAssignedToUser(p, appUser);
      const isInRange = created && isWithinInterval(created, { start, end });
      
      if (isInRange) { 
          allNewInRange++; 
          if (isMine) myNewInRange++; 
      }
  });

  const leaderboardMap = new Map<string, LeaderboardEntry>();

  const buildReport = (peopleList: Person[], userIdFilter?: string): CallingReport => {
    const report: CallingReport = {
      totalCalls: 0, picked: 0, notPicked: 0, eliminated: 0, totalDuration: 0,
      percentages: { picked: 0, notPicked: 0, eliminated: 0 },
      daily: {}, byEnabler: {}, subCategories: {}, detailedBreakdown: {}
    };
    
    callStatuses.forEach(status => { 
        report.subCategories[status] = 0; 
        report.detailedBreakdown[status] = {}; 
    });

    peopleList.forEach(p => {
        const logsInRange = (p.callHistory || []).filter(log => {
            const date = safeDate(log.calledAt);
            const matchesUser = !userIdFilter || log.callerId === userIdFilter;
            return date && isWithinInterval(date, { start, end }) && matchesUser;
        });

        logsInRange.forEach(log => {
            const date = safeDate(log.calledAt)!;
            const dateKey = format(date, 'yyyy-MM-dd');
            const status = log.status || 'B - Not Answering';
            const isPicked = ['A1 - Coming', 'Z - Already Attended', 'A4 - Tentative'].includes(status);
            const duration = log.duration !== undefined ? Number(log.duration) : (isPicked ? 60 : 10);
            
            report.totalCalls++;
            report.totalDuration += duration;
            if (isPicked) report.picked++; else report.notPicked++;
            
            if (report.subCategories.hasOwnProperty(status)) {
                report.subCategories[status]++;
                const owner = p.enablerInTouchWith || 'System';
                const key = `${log.event}_${log.callerName}_${owner}`;
                
                if (!report.detailedBreakdown[status][key]) {
                    report.detailedBreakdown[status][key] = { 
                        count: 0, 
                        totalDuration: 0, 
                        event: log.event, 
                        callerName: log.callerName, 
                        ownerName: owner
                    };
                }
                report.detailedBreakdown[status][key].count++;
                report.detailedBreakdown[status][key].totalDuration += duration;
            }

            const cId = log.callerId || 'unknown';
            if (!leaderboardMap.has(cId)) {
                leaderboardMap.set(cId, { 
                    callerId: cId, 
                    callerName: log.callerName || 'Unknown', 
                    totalCalls: 0, 
                    totalDuration: 0, 
                    dailyStats: {},
                    photoUrl: log.callerPhotoUrl || ''
                });
            }
            const entry = leaderboardMap.get(cId)!;
            entry.totalCalls++;
            entry.totalDuration += duration;
            if (!entry.dailyStats[dateKey]) entry.dailyStats[dateKey] = { count: 0, duration: 0 };
            entry.dailyStats[dateKey].count++;
            entry.dailyStats[dateKey].duration += duration;
        });
    });

    if (report.totalCalls > 0) {
      report.percentages.picked = Math.round((report.picked / report.totalCalls) * 100);
      report.percentages.notPicked = Math.round((report.notPicked / report.totalCalls) * 100);
    }
    return report;
  };

  const byEnabler: Record<string, number> = {};
  const byYear: Record<string, number> = {};
  const byChanting: Record<string, number> = { '0-1 R': 0, '2-3 R': 0, '4-7 R': 0, '8-15 R': 0, '16+ R': 0 };
  
  activePeople.forEach(p => {
      const e = p.enablerInTouchWith || 'Unassigned';
      byEnabler[e] = (byEnabler[e] || 0) + 1;
      const yearMatch = p.folkId?.match(/\d{2}$/);
      if (yearMatch) byYear[`20${yearMatch[0]}`] = (byYear[`20${yearMatch[0]}`] || 0) + 1;
      const r = p.chantingStatus || 0;
      if (r >= 16) byChanting['16+ R']++; 
      else if (r >= 8) byChanting['8-15 R']++; 
      else if (r >= 4) byChanting['4-7 R']++; 
      else if (r >= 2) byChanting['2-3 R']++; 
      else byChanting['0-1 R']++;
  });

  let enablerRoster = await getAssignableUsersForAssignments(appUser);
  if (appUser.role.includes('Folk Enabler') && !enablerRoster.some(e => e.id === appUser.id)) {
    enablerRoster = [appUser, ...enablerRoster];
  }
  
  const enablerBreakdown = computeEnablerStageBreakdown(activePeople, enablerRoster);
  const chantingBreakdown = computeEnablerChantingBreakdown(activePeople, enablerRoster);

  return {
    stats: { 
        myContactsCount: options.trustedTotalCounts?.myContactsCount ?? 0, 
        totalContactsCount: options.trustedTotalCounts?.totalContactsCount ?? activePeople.length, 
        myNewInRange, 
        allNewInRange, 
        byEnabler, 
        byYear, 
        byChantingCategory: byChanting,
        enablerBreakdown,
        chantingBreakdown
    },
    callingReportAll: buildReport(activePeople),
    callingReportMy: buildReport(activePeople, appUser.id),
    leaderboard: Array.from(leaderboardMap.values()).sort((a, b) => b.totalCalls - a.totalCalls),
    isPrivileged: appUser.role.includes('Admin') || appUser.role.includes('Folk Guide'),
  };
}
