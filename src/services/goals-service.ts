'use client';

import { db, persistenceReady } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  writeBatch,
  documentId,
  startAfter,
  limit
} from 'firebase/firestore';
import type { Goal, AppUser, TeamGoalsSummary } from '@/lib/types';
import { logAudit } from '@/services/audit-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { groupEnablersByTeam } from './team-service';
import { getUsers } from './user-service';

/**
 * Centralized goal aggregation logic for Roster displays.
 * Identifies unique goal columns, groups by team, and calculates all subtotals.
 */
export function getTeamGoalsSummary(
  goals: Goal[], 
  enablers: AppUser[], 
  categories: string[], 
  hiddenColumns: string[] = [],
  columnOrder: string[] = []
): {
  columns: string[];
  teams: TeamGoalsSummary[];
  grandTotals: Record<string, { achieved: number; target: number }>;
} {
  // 1. Determine all valid titles not hidden
  const allTitles = Array.from(new Set(
    goals.filter(g => !hiddenColumns.includes(g.title)).map(g => g.title)
  ));

  // 2. Sort columns based on saved order or defaults
  let columns: string[] = [];
  if (columnOrder && columnOrder.length > 0) {
    const ordered = columnOrder.filter(t => allTitles.includes(t));
    const remaining = allTitles.filter(t => !columnOrder.includes(t)).sort();
    columns = [...ordered, ...remaining];
  } else {
    categories.forEach(cat => {
      const titlesInRange = Array.from(new Set(
        goals.filter(g => g.category === cat && !hiddenColumns.includes(g.title)).map(g => g.title)
      )).sort();
      columns.push(...titlesInRange);
    });
  }

  // 3. Group enablers by team using shared helper
  const teamGroups = groupEnablersByTeam(enablers, enablers, e => e.id);

  // 4. Process each team and its members
  const grandTotals: Record<string, { achieved: number; target: number }> = {};
  columns.forEach(col => grandTotals[col] = { achieved: 0, target: 0 });

  const teams: TeamGoalsSummary[] = teamGroups.map(group => {
    const teamTotals: Record<string, { achieved: number; target: number }> = {};
    columns.forEach(col => teamTotals[col] = { achieved: 0, target: 0 });

    const members = group.members.sort((a, b) => a.name.localeCompare(b.name)).map(enabler => {
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

    return { 
        teamId: group.teamId, 
        teamName: group.teamName, 
        members, 
        teamTotals 
    };
  });

  return { columns, teams, grandTotals };
}

/**
 * Fetches goals based on user role and hierarchy.
 * Optimized for Enablers to fetch by both ID and Name to catch legacy records.
 */
export async function getGoals(user: AppUser): Promise<Goal[]> {
  const goalsRef = collection(db!, 'goals');
  const userRoles = user.role || [];
  
  try {
    if (userRoles.includes('Admin')) {
      const q = query(goalsRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Goal));
    } 
    
    if (userRoles.includes('Folk Guide')) {
      const q = query(goalsRef, where('folkGuideId', '==', user.id), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Goal));
    } 
    
    // Enabler Branch: merge by ID and Name to ensure visibility of legacy records
    const [byId, byName] = await Promise.all([
      getDocs(query(goalsRef, where('enablerId', '==', user.id), orderBy('createdAt', 'desc'))),
      getDocs(query(goalsRef, where('enablerName', '==', user.name), orderBy('createdAt', 'desc'))),
    ]);
    
    const merged = new Map<string, Goal>();
    [...byId.docs, ...byName.docs].forEach(d => {
        merged.set(d.id, { id: d.id, ...d.data() } as Goal);
    });

    // Re-sort because the merged arrays lose ordering
    return Array.from(merged.values()).sort((a, b) => {
        const da = safeDate(a.createdAt)?.getTime() || 0;
        const db = safeDate(b.createdAt)?.getTime() || 0;
        return db - da;
    });

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
  const goalRef = doc(collection(db!, 'goals'));
  
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
  const goalRef = doc(db!, 'goals', goalId);
  
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
  const goalRef = doc(db!, 'goals', goalId);
  
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
  const goalRef = doc(db!, 'goals', goalId);
  
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

/**
 * Deletes every Goal record with a specific title.
 */
export async function deleteGoalColumn(title: string, user: AppUser): Promise<number> {
    await persistenceReady;
    const goalsRef = collection(db!, 'goals');
    const q = query(goalsRef, where('title', '==', title));
    const snap = await getDocs(q);
    const count = snap.size;
    
    if (count === 0) return 0;

    const batch = writeBatch(db!);
    snap.docs.forEach(d => batch.delete(d.ref));
    
    try {
        await batch.commit();
        await logAudit('Delete Goal Column', `Permanently removed column "${title}" and ${count} matching records.`, user);
        return count;
    } catch (err: any) {
        const permissionError = new FirestorePermissionError({
            path: 'goals',
            operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        throw err;
    }
}

/**
 * Paginates through entire goals collection to link legacy enablerName strings to modern system IDs.
 */
export const backfillGoalEnablerIds = async (userInfo: AppUser) => {
  await persistenceReady;
  const allUsers = await getUsers(userInfo);
  const goalsRef = collection(db!, 'goals');
  
  const userMap = new Map<string, string>();
  allUsers.forEach(u => userMap.set(u.name.toLowerCase().trim(), u.id));

  let lastDoc: any = null;
  let totalScanned = 0;
  let totalFixed = 0;

  while (true) {
    let q = query(goalsRef, orderBy(documentId()), limit(500));
    if (lastDoc) q = query(q, startAfter(lastDoc));
    const snap = await getDocs(q);
    if (snap.empty) break;

    const batch = writeBatch(db!);
    let batchHasWrites = false;

    snap.docs.forEach(d => {
      const data = d.data();
      if (data.enablerName && !data.enablerId) {
        const name = data.enablerName.toLowerCase().trim();
        const id = userMap.get(name);
        if (id) {
          batch.update(d.ref, { enablerId: id });
          batchHasWrites = true;
          totalFixed++;
        }
      }
    });

    if (batchHasWrites) await batch.commit();

    totalScanned += snap.docs.length;
    lastDoc = snap.docs[snap.docs.length - 1];
  }

  await logAudit('Data Maintenance', `Linked Enabler IDs for ${totalFixed} goal records. Scanned ${totalScanned}.`, { id: userInfo.id, name: userInfo.name, role: userInfo.role });
  return { totalScanned, totalFixed };
};

function safeDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.toDate && typeof value.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
