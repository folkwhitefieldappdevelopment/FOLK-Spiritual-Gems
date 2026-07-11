
'use client';

/**
 * @fileOverview Optimized dashboard statistics generator.
 * Accurate counting for large datasets (10k limit) and Date-Wise Leaderboard.
 * Uses Shared Data Layer to minimize document reads.
 */

import {
    collection,
    query,
    getDocs,
    limit,
    getCountFromServer,
    where,
    or
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, DashboardData, CallingReport, Person, LeaderboardEntry } from '@/lib/types';
import { callStatuses, isAssignedToUser, ELIMINATED_STATUSES } from '@/lib/types';
import { safeDate } from '@/utils/date';
import { startOfDay, endOfDay, isWithinInterval, format } from 'date-fns';
import { getCachedPeople } from './people-service';
import { getAssignableUsersForAssignments } from './user-service';
import { computeEnablerStageBreakdown } from '@/lib/dynamic-groups';

/**
 * High-performance summary fetcher.
 * Uses Firestore server-side aggregation for instant card results.
 * This avoids triggering a full collection sync just to get basic counts.
 */
export async function getFastSummaryStats(appUser: AppUser) {
    const peopleRef = collection(db!, 'people');
    
    // We calculate active counts by subtracting eliminated contacts from the non-deleted pool.
    // This is more resilient than a 'not-in' filter which fails if the field is missing.
    
    // 1. Total Active Logic
    const notDeletedQuery = query(peopleRef, where('isDeleted', '==', false));
    const eliminatedQuery = query(
        peopleRef, 
        where('isDeleted', '==', false), 
        where('lastCallStatus', 'in', ELIMINATED_STATUSES)
    );
    
    // 2. My Active Logic
    const myCriteria = or(
        where('enablerId', '==', appUser.id),
        where('coEnablerId', '==', appUser.id)
    );
    
    const myNotDeletedQuery = query(peopleRef, where('isDeleted', '==', false), myCriteria);
    const myEliminatedQuery = query(
        peopleRef, 
        where('isDeleted', '==', false), 
        myCriteria,
        where('lastCallStatus', 'in', ELIMINATED_STATUSES)
    );

    const [
        totalNotDeletedSnap, 
        totalEliminatedSnap,
        myNotDeletedSnap,
        myEliminatedSnap
    ] = await Promise.all([
        getCountFromServer(notDeletedQuery),
        getCountFromServer(eliminatedQuery),
        getCountFromServer(myNotDeletedQuery),
        getCountFromServer(myEliminatedQuery)
    ]);

    const totalActive = totalNotDeletedSnap.data().count - totalEliminatedSnap.data().count;
    const myActive = myNotDeletedSnap.data().count - myEliminatedSnap.data().count;

    return {
        totalContactsCount: Math.max(0, totalActive),
        myContactsCount: Math.max(0, myActive)
    };
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

  // Use the cached people stream to reduce redundant Firestore reads
  const allPeople = await getCachedPeople();

  // Apply global exclusion rules for "Active" contacts
  const activePeople = allPeople.filter(p => 
    p.isDeleted !== true && 
    !ELIMINATED_STATUSES.includes(p.lastCallStatus || '')
  );

  let myContactsCount = 0;
  let allNewInRange = 0;
  let myNewInRange = 0;

  activePeople.forEach(p => {
      const created = safeDate(p.createdAt);
      const isMine = isAssignedToUser(p, appUser);
      const isInRange = created && isWithinInterval(created, { start, end });
      
      if (isMine) myContactsCount++;
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

  // Calculate Enabler Breakdown for the dashboard table
  let enablerRoster = await getAssignableUsersForAssignments(appUser);
  if (appUser.role.includes('Folk Enabler') && !enablerRoster.some(e => e.id === appUser.id)) {
    enablerRoster = [appUser, ...enablerRoster];
  }
  const enablerBreakdown = computeEnablerStageBreakdown(activePeople, enablerRoster);

  return {
    stats: { 
        myContactsCount: options.trustedTotalCounts?.myContactsCount ?? myContactsCount, 
        totalContactsCount: options.trustedTotalCounts?.totalContactsCount ?? activePeople.length, 
        myNewInRange, 
        allNewInRange, 
        byEnabler, 
        byYear, 
        byChantingCategory: byChanting,
        enablerBreakdown
    },
    callingReportAll: buildReport(activePeople),
    callingReportMy: buildReport(activePeople, appUser.id),
    leaderboard: Array.from(leaderboardMap.values()).sort((a, b) => b.totalCalls - a.totalCalls),
    isPrivileged: appUser.role.includes('Admin') || appUser.role.includes('Folk Guide'),
  };
}
