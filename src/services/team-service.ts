'use client';

import { db, persistenceReady } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  writeBatch,
  getDoc,
  deleteField
} from 'firebase/firestore';
import type { Team, AppUser } from '@/lib/types';
import { logAudit } from '@/services/audit-service';

export async function createTeam(name: string, guideId: string, userInfo: { id: string; name: string }) {
  await persistenceReady;
  const teamRef = collection(db!, 'teams');
  const data = {
    name: name.trim(),
    guideId,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(teamRef, data);
  await logAudit('Create Team', `Created team "${name}"`, userInfo);
  return docRef.id;
}

export async function renameTeam(teamId: string, newName: string, userInfo: { id: string; name: string }) {
  await persistenceReady;
  const teamRef = doc(db!, 'teams', teamId);
  await updateDoc(teamRef, { name: newName.trim() });
  
  // Update all members with the new team name (denormalized)
  const usersRef = collection(db!, 'users');
  const q = query(usersRef, where('team.teamId', '==', teamId));
  const snap = await getDocs(q);
  const batch = writeBatch(db!);
  snap.docs.forEach(d => {
    batch.update(d.ref, { 'team.teamName': newName.trim() });
  });
  await batch.commit();

  await logAudit('Rename Team', `Renamed team to "${newName}"`, userInfo);
}

export async function deleteTeam(teamId: string, userInfo: { id: string; name: string }) {
  await persistenceReady;
  const teamRef = doc(db!, 'teams', teamId);
  
  // Clear team field on all members
  const usersRef = collection(db!, 'users');
  const q = query(usersRef, where('team.teamId', '==', teamId));
  const snap = await getDocs(q);
  const batch = writeBatch(db!);
  snap.docs.forEach(d => {
    batch.update(d.ref, { team: deleteField() });
  });
  await batch.commit();

  await deleteDoc(teamRef);
  await logAudit('Delete Team', `Deleted team ID: ${teamId}`, userInfo);
}

export async function assignEnablerToTeam(enablerId: string, teamId: string, teamName: string, userInfo: { id: string; name: string }) {
  await persistenceReady;
  const userRef = doc(db!, 'users', enablerId);
  await updateDoc(userRef, {
    team: { teamId, teamName }
  });
}

export async function removeEnablerFromTeam(enablerId: string) {
  await persistenceReady;
  const userRef = doc(db!, 'users', enablerId);
  await updateDoc(userRef, {
    team: deleteField()
  });
}

export async function getTeamsForGuide(guideId: string): Promise<Team[]> {
  const teamRef = collection(db!, 'teams');
  const q = query(teamRef, where('guideId', '==', guideId), orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Team));
}

export async function getAllTeams(): Promise<Team[]> {
  const teamRef = collection(db!, 'teams');
  const q = query(teamRef, orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Team));
}

export type TeamGroup<T> = {
    teamId: string | null;
    teamName: string;
    members: AppUser[];
    items: T[];
};

/**
 * Shared helper to group any type of items by team membership of enablers.
 */
export function groupEnablersByTeam<T>(
    items: T[], 
    enablers: AppUser[], 
    getEnablerId: (item: T) => string,
    getEnablerNameFallback?: (item: T) => string
): TeamGroup<T>[] {
    const teamsMap = new Map<string | null, TeamGroup<T>>();

    enablers.forEach(enabler => {
        const teamId = enabler.team?.teamId || null;
        const teamName = enabler.team?.teamName || "Unassigned";

        if (!teamsMap.has(teamId)) {
            teamsMap.set(teamId, {
                teamId,
                teamName,
                members: [],
                items: []
            });
        }
        teamsMap.get(teamId)!.members.push(enabler);
    });

    items.forEach(item => {
        const id = getEnablerId(item);
        const fallbackName = getEnablerNameFallback?.(item);
        
        const enabler = enablers.find(e => e.id === id) || 
                       (fallbackName ? enablers.find(e => e.name.trim().toLowerCase() === fallbackName.trim().toLowerCase()) : null);
                       
        const teamId = enabler?.team?.teamId || null;
        if (teamsMap.has(teamId)) {
            teamsMap.get(teamId)!.items.push(item);
        } else if (teamId === null) {
            // Handle edge case where enabler list might be incomplete but grouping is needed
            if (!teamsMap.has(null)) {
                teamsMap.set(null, { teamId: null, teamName: "Unassigned", members: [], items: [] });
            }
            teamsMap.get(null)!.items.push(item);
        }
    });

    return Array.from(teamsMap.values()).sort((a, b) => {
        if (a.teamId === null) return 1;
        if (b.teamId === null) return -1;
        return a.teamName.localeCompare(b.teamName);
    });
}
