'use client';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, doc, or } from 'firebase/firestore';
import type { AppUser, Person, CallLog } from '@/lib/types';
import { safeDate } from '@/utils/date';
import { startOfDay } from 'date-fns';

/**
 * Fetches real-time status data for live sessions including the user's and their team's.
 */
export async function getLiveSessionsData(appUser: AppUser) {
  const usersRef = collection(db, 'users');
  
  // 1. Calculate my current session's A1 count
  let myComingCount = 0;
  if (appUser.pausedCallingSession) {
    const { peopleIds, event } = appUser.pausedCallingSession;
    const { people } = await fetchPeopleStatus(peopleIds);
    myComingCount = people.filter(p => 
      p.lastCallStatus === 'A1 - Coming' && 
      (p.callHistory || []).some(l => l.event === event && l.callerId === appUser.id)
    ).length;
  }

  // 2. Fetch team sessions
  const teamSessions: any[] = [];
  const isAdmin = appUser.role.includes('Admin');
  const isGuide = appUser.role.includes('Folk Guide');

  let teamQuery;
  if (isAdmin) {
    teamQuery = query(usersRef, where('pausedCallingSession', '!=', null));
  } else if (isGuide) {
    teamQuery = query(usersRef, 
        where('reportsTo.guideId', '==', appUser.id), 
        where('pausedCallingSession', '!=', null)
    );
  } else {
    // Enablers see sessions they assigned to co-enablers
    teamQuery = query(usersRef, 
        where('pausedCallingSession.assignedById', '==', appUser.id),
        where('pausedCallingSession', '!=', null)
    );
  }

  if (teamQuery) {
    const teamSnap = await getDocs(teamQuery);
    for (const userDoc of teamSnap.docs) {
      if (userDoc.id === appUser.id) continue;
      const userData = userDoc.data() as AppUser;
      const session = userData.pausedCallingSession;
      if (!session) continue;

      // Basic stats for the team session
      const { people } = await fetchPeopleStatus(session.peopleIds);
      const comingCount = people.filter(p => 
        p.lastCallStatus === 'A1 - Coming' && 
        (p.callHistory || []).some(l => l.event === session.event && l.callerId === userDoc.id)
      ).length;

      teamSessions.push({
        userId: userDoc.id,
        userName: userData.name,
        photoUrl: userData.photoUrl,
        event: session.event,
        comingCount,
        progress: Math.round((session.currentIndex / Math.max(1, session.peopleIds.length)) * 100),
      });
    }
  }

  // 3. Recently Completed Summary
  // For MVP, we'll return zeroed counts. 
  const recentSummary = {
    totalComing: 0,
    totalCalls: 0
  };

  return {
    myComingCount,
    teamSessions,
    recentSummary
  };
}

/**
 * Internal helper to fetch minimal person data for status checking
 */
async function fetchPeopleStatus(ids: string[]): Promise<{ people: Partial<Person>[] }> {
  if (ids.length === 0) return { people: [] };
  const peopleCollection = collection(db, 'people');
  const CHUNK_SIZE = 30;
  const results: Partial<Person>[] = [];

  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const q = query(peopleCollection, where('__name__', 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
      const data = d.data();
      results.push({
        id: d.id,
        lastCallStatus: data.lastCallStatus,
        callHistory: data.callHistory,
      });
    });
  }
  return { people: results };
}
