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
