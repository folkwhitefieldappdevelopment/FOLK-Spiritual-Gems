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
import type { AppUser, DashboardData, CallingReport, Person, LeaderboardEntry, Goal } from '@/lib/types';
import { callStatuses, isAssignedToUser, ELIMINATED_STATUSES } from '@/lib/types';
import { safeDate } from '@/utils/date';
import { startOfDay, endOfDay, isWithinInterval, format } from 'date-fns';
import { getCachedPeople } from './people-service';
import { getAssignableUsersForAssignments } from './user-service';
import { computeEnablerStageBreakdown, computeEnablerChantingBreakdown } from '@/lib/dynamic-groups';
import { groupEnablersByTeam } from './team-service';
import { getGoals } from './goals-service';
import { getGoalCategories, getHiddenGoalColumns, getGoalColumnOrder } from './settings-service';

/**
 * High-performance summary fetcher.
 * Uses Firestore server-side aggregation for instant card results.
 */
export async function getFastSummaryStats(appUser: AppUser) {
    const peopleRef = collection(db!, 'people');
    
    try {
        const activeQuery = query(
            peopleRef, 
            where('isDeleted', '==', false), 
            where('lastCallStatus', 'not-in', ELIMINATED_STATUSES)
        );
        const totalActiveSnap = await getCountFromServer(activeQuery);
        return { totalContactsCount: totalActiveSnap.data().count };
    } catch (e) {
        const notDeletedQuery = query(peopleRef, where('isDeleted', '==', false));
        const totalNotDeletedSnap = await getCountFromServer(notDeletedQuery);
        return { totalContactsCount: totalNotDeletedSnap.data().count };
    }
}

export function buildCallingReport(
    peopleList: Person[], 
    start: Date, 
    end: Date, 
    filterEnablerIds?: string[]
): CallingReport {
    const report: CallingReport = {
      totalCalls: 0, picked: 0, notPicked: 0, eliminated: 0, totalDuration: 0,
      percentages: { picked: 0, notPicked: 0, eliminated: 0 },
      daily: {}, byEnabler: {}, subCategories: {}, detailedBreakdown: {}
    };
    
    callStatuses.forEach(status => { 
        report.subCategories[status] = 0; 
        report.detailedBreakdown[status] = {}; 
    });

    const enablerIdSet = filterEnablerIds ? new Set(filterEnablerIds) : null;

    peopleList.forEach(p => {
        const logsInRange = (p.callHistory || []).filter(log => {
            const date = safeDate(log.calledAt);
            const matchesUser = !enablerIdSet || enablerIdSet.has(log.callerId);
            return date && isWithinInterval(date, { start, end }) && matchesUser;
        });

        logsInRange.forEach(log => {
            const date = safeDate(log.calledAt)!;
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
        });
    });

    if (report.totalCalls > 0) {
      report.percentages.picked = Math.round((report.picked / report.totalCalls) * 100);
      report.percentages.notPicked = Math.round((report.notPicked / report.totalCalls) * 100);
    }
    return report;
}

export async function getDashboardStats(
  appUser: AppUser,
  options: { 
    from?: Date; 
    to?: Date; 
    timezoneOffset: number, 
    targetFolkGuideId?: string,
    trustedTotalCounts?: { totalContactsCount: number },
    sections?: string[] 
  },
): Promise<DashboardData & { goals?: Goal[], enablers?: AppUser[], categories?: string[], hiddenColumns?: string[], columnOrder?: string[] }> {
  const { from, to, sections = ['all'] } = options;
  const start = startOfDay(from || new Date());
  const end = endOfDay(to || from || new Date());

  const fullLoad = sections.includes('all');
  const loadGoals = fullLoad || sections.includes('team-goals');
  const loadStats = fullLoad || sections.includes('enabler-breakdown') || sections.includes('calling-report') || sections.includes('leaderboard') || sections.includes('goal-alerts');

  // Fetch cheap data first
  const [allPeople, enablers] = await Promise.all([
      loadStats ? getCachedPeople() : Promise.resolve([]),
      (loadStats || loadGoals) ? getAssignableUsersForAssignments(appUser) : Promise.resolve([])
  ]);

  const activePeople = allPeople.filter(p => 
    p.isDeleted !== true && 
    !ELIMINATED_STATUSES.includes(p.lastCallStatus || '')
  );

  let myContactsCount = 0;
  if (loadStats) {
      if (appUser.role.includes('Folk Guide') && !appUser.role.includes('Admin')) {
        const teamIds = new Set(enablers.map(u => u.id));
        const teamNames = new Set(enablers.map(u => (u.name || '').trim().toLowerCase()));
        myContactsCount = activePeople.filter(p =>
            isAssignedToUser(p, appUser) ||
            (p.enablerId && teamIds.has(p.enablerId)) ||
            (!p.enablerId && p.enablerInTouchWith && teamNames.has(p.enablerInTouchWith.split('::')[0].trim().toLowerCase()))
        ).length;
      } else {
        myContactsCount = activePeople.filter(p => isAssignedToUser(p, appUser)).length;
      }
  }

  const emptyReport: CallingReport = {
    totalCalls: 0, picked: 0, notPicked: 0, eliminated: 0, totalDuration: 0,
    percentages: { picked: 0, notPicked: 0, eliminated: 0 },
    daily: {}, byEnabler: {}, subCategories: {}, detailedBreakdown: {}
  };

  const dashboard: any = {
    stats: { 
        myContactsCount, 
        totalContactsCount: options.trustedTotalCounts?.totalContactsCount ?? activePeople.length, 
        myNewInRange: 0, 
        allNewInRange: 0, 
        byEnabler: {}, 
        byYear: {}, 
        byChantingCategory: {},
        enablerBreakdown: [],
        chantingBreakdown: []
    },
    callingReportAll: emptyReport,
    callingReportMy: emptyReport,
    teamCallingReports: {},
    leaderboard: [],
    isPrivileged: appUser.role.includes('Admin') || appUser.role.includes('Folk Guide'),
  };

  if (loadStats) {
      activePeople.forEach(p => {
          const created = safeDate(p.createdAt);
          const isInRange = created && isWithinInterval(created, { start, end });
          if (isInRange) { 
              dashboard.stats.allNewInRange++; 
              if (isAssignedToUser(p, appUser)) dashboard.stats.myNewInRange++; 
          }
          
          if (typeof p.folkId === 'string') {
            const yearMatch = p.folkId.match(/\d{2}$/);
            if (yearMatch) dashboard.stats.byYear[`20${yearMatch[0]}`] = (dashboard.stats.byYear[`20${yearMatch[0]}`] || 0) + 1;
          }

          const r = p.chantingStatus || 0;
          if (r >= 16) dashboard.stats.byChantingCategory['16+ R'] = (dashboard.stats.byChantingCategory['16+ R'] || 0) + 1;
          else if (r >= 8) dashboard.stats.byChantingCategory['8-15 R'] = (dashboard.stats.byChantingCategory['8-15 R'] || 0) + 1;
      });

      if (sections.includes('calling-report') || fullLoad) {
          dashboard.callingReportAll = buildCallingReport(activePeople, start, end);
          dashboard.callingReportMy = buildCallingReport(activePeople, start, end, [appUser.id]);
          
          const teamGroups = groupEnablersByTeam(enablers, enablers, e => e.id);
          teamGroups.forEach(group => {
              dashboard.teamCallingReports[group.teamId || "unassigned"] = buildCallingReport(activePeople, start, end, group.members.map(m => m.id));
          });
      }

      if (sections.includes('leaderboard') || fullLoad) {
          const lbMap = new Map<string, LeaderboardEntry>();
          activePeople.forEach(p => {
            (p.callHistory || []).forEach(log => {
              const date = safeDate(log.calledAt);
              if (date && isWithinInterval(date, { start, end })) {
                const cId = log.callerId || 'unknown';
                if (!lbMap.has(cId)) lbMap.set(cId, { callerId: cId, callerName: log.callerName || 'Unknown', totalCalls: 0, totalDuration: 0, dailyStats: {}, photoUrl: log.callerPhotoUrl || '' });
                const entry = lbMap.get(cId)!;
                entry.totalCalls++;
                entry.totalDuration += (log.duration || 0);
              }
            });
          });
          dashboard.leaderboard = Array.from(lbMap.values()).sort((a, b) => b.totalCalls - a.totalCalls);
      }

      if (sections.includes('enabler-breakdown') || fullLoad) {
          dashboard.stats.enablerBreakdown = computeEnablerStageBreakdown(activePeople, enablers);
          dashboard.stats.chantingBreakdown = computeEnablerChantingBreakdown(activePeople, enablers);
      }
  }

  if (loadGoals) {
      const [g, c, h, o] = await Promise.all([
          getGoals(appUser), getGoalCategories(), getHiddenGoalColumns(), getGoalColumnOrder()
      ]);
      dashboard.goals = g;
      dashboard.enablers = enablers;
      dashboard.categories = c;
      dashboard.hiddenColumns = h;
      dashboard.columnOrder = o;
  }

  return dashboard;
}

