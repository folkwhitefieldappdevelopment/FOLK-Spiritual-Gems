'use client';

import { db, persistenceReady } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import type { Goal, AppUser, TeamGoalsSummary } from '@/lib/types';
import { logAudit } from '@/services/audit-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Centralized goal aggregation logic for Roster displays.
 * Identifies unique goal columns, groups by team, and calculates all subtotals.
 */
export function getTeamGoalsSummary(goals: Goal[], enablers: AppUser[], categories: string[]): {
  columns: string[];
  teams: TeamGoalsSummary[];
  grandTotals: Record<string, { achieved: number; target: number }>;
} {
  // 1. Determine stable column order (grouped by category)
  const columns: string[] = [];
  categories.forEach(cat => {
    const titlesInRange = Array.from(new Set(
      goals.filter(g => g.category === cat).map(g => g.title)
    )).sort();
    columns.push(...titlesInRange);
  });

  // 2. Group enablers by team
  const teamsMap = new Map<string | null, { name: string, members: AppUser[] }>();
  enablers.forEach(e => {
    const teamId = e.team?.teamId || null;
    const teamName = e.team?.teamName || "Unassigned";
    if (!teamsMap.has(teamId)) teamsMap.set(teamId, { name: teamName, members: [] });
    teamsMap.get(teamId)!.members.push(e);
  });

  // 3. Process each team and its members
  const grandTotals: Record<string, { achieved: number; target: number }> = {};
  columns.forEach(col => grandTotals[col] = { achieved: 0, target: 0 });

  const sortedTeams = Array.from(teamsMap.entries()).sort((a, b) => {
    if (a[0] === null) return 1;
    if (b[0] === null) return -1;
    return a[1].name.localeCompare(b[1].name);
  });

  const teams: TeamGoalsSummary[] = sortedTeams.map(([teamId, info]) => {
    const teamTotals: Record<string, { achieved: number; target: number }> = {};
    columns.forEach(col => teamTotals[col] = { achieved: 0, target: 0 });

    const members = info.members.sort((a, b) => a.name.localeCompare(b.name)).map(enabler => {
      const enablerCols: Record<string, { achieved: number; target: number }> = {};
      columns.forEach(title => {
        const goal = goals.find(g => 
          (g.enablerId === enabler.id || g.enablerName === enabler.name) && 
          g.title === title
        );
        const achieved = goal?.achievedCount || 0;
        const target = goal?.targetCount || 0;
        
        enablerCols[title] = { achieved, target };
        teamTotals[title].achieved += achieved;
        teamTotals[title].target += target;
        grandTotals[title].achieved += achieved;
        grandTotals[title].target += target;
      });
      return { enablerId: enabler.id, enablerName: enabler.name, columns: enablerCols };
    });

    return { teamId, teamName: info.name, members, teamTotals };
  });

  return { columns, teams, grandTotals };
}

/**
 * Fetches goals based on user role and hierarchy.
 */
export async function getGoals(user: AppUser): Promise<Goal[]> {
  const goalsRef = collection(db, 'goals');
  const userRoles = user.role || [];
  
  let q;
  if (userRoles.includes('Admin')) {
    q = query(goalsRef, orderBy('createdAt', 'desc'));
  } else if (userRoles.includes('Folk Guide')) {
    q = query(goalsRef, where('folkGuideId', '==', user.id), orderBy('createdAt', 'desc'));
  } else {
    q = query(goalsRef, where('enablerId', '==', user.id), orderBy('createdAt', 'desc'));
  }

  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    } as Goal));
  } catch (err: any) {
    const permissionError = new FirestorePermissionError({
      path: goalsRef.path,
      operation: 'list',
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  }
}

/**
 * Creates a new goal. restricted to Admin/Folk Guide.
 */
export async function createGoal(
  data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>,
  user: AppUser
): Promise<string> {
  await persistenceReady;
  const goalRef = doc(collection(db, 'goals'));
  
  const finalData = {
    ...data,
    lastReminderStage: 'none' as const,
    createdBy: user.id,
    createdByName: user.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(goalRef, finalData);
    await logAudit('Create Goal', `Created goal "${data.title}" for ${data.enablerName}`, user);
    return goalRef.id;
  } catch (err: any) {
    const permissionError = new FirestorePermissionError({
      path: goalRef.path,
      operation: 'create',
      requestResourceData: finalData,
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  }
}

/**
 * Updates achievedCount and remark for a goal. Accessible to Enablers for self-reporting.
 */
export async function updateGoalProgress(
  goalId: string,
  progress: { achievedCount: number; remark?: string },
  user: AppUser
): Promise<void> {
  await persistenceReady;
  const goalRef = doc(db, 'goals', goalId);
  
  const updates = {
    ...progress,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(goalRef, updates);
    await logAudit('Update Goal Progress', `Goal ${goalId} updated to ${progress.achievedCount}`, user);
  } catch (err: any) {
    const permissionError = new FirestorePermissionError({
      path: goalRef.path,
      operation: 'update',
      requestResourceData: updates,
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  }
}

/**
 * Full update for goal metadata. restricted to Admin/Folk Guide.
 */
export async function updateGoal(
  goalId: string,
  data: Partial<Goal>,
  user: AppUser
): Promise<void> {
  await persistenceReady;
  const goalRef = doc(db, 'goals', goalId);
  
  const updates = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(goalRef, updates);
    await logAudit('Update Goal', `Metadata updated for goal: ${goalId}`, user);
  } catch (err: any) {
    const permissionError = new FirestorePermissionError({
      path: goalRef.path,
      operation: 'update',
      requestResourceData: updates,
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  }
}

/**
 * Deletes a goal. restricted to Admin/Folk Guide.
 */
export async function deleteGoal(goalId: string, user: AppUser): Promise<void> {
  await persistenceReady;
  const goalRef = doc(db, 'goals', goalId);
  
  try {
    await deleteDoc(goalRef);
    await logAudit('Delete Goal', `Deleted goal: ${goalId}`, user);
  } catch (err: any) {
    const permissionError = new FirestorePermissionError({
      path: goalRef.path,
      operation: 'delete',
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  }
}
