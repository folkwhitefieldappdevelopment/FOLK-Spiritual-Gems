'use client';

import { db, persistenceReady } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp,
  orderBy,
  runTransaction,
  increment
} from 'firebase/firestore';
import type { AttendanceEntry, Person, GroupEvent } from '@/lib/types';
import { createInitialProgress } from '@/lib/data';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Marks attendance and automatically updates the person's progress table if linked.
 * Also maintains an atomic attendeeCount on the event for N+1 performance optimization.
 */
export async function markAttendance(personId: string, groupId: string, groupName: string, eventId?: string, eventName?: string) {
  await persistenceReady;
  const personRef = doc(db, 'people', personId);
  const groupRef = doc(db, 'groups', groupId);
  
  try {
    return await runTransaction(db, async (transaction) => {
      // 1. ALL READS
      const personSnap = await transaction.get(personRef);
      const groupSnap = await transaction.get(groupRef);

      if (!personSnap.exists()) return { success: false, message: "Contact not found." };
      if (!groupSnap.exists()) return { success: false, message: "Group not found." };
      
      const personData = personSnap.data() as Person;
      const groupData = groupSnap.data();
      
      let attendanceDate = format(new Date(), 'yyyy-MM-dd');
      let finalEventName = eventName || groupName;
      let linkInfo = null;
      let eventRef = null;

      if (eventId) {
          eventRef = doc(db, 'groups', groupId, 'events', eventId);
          const eventSnap = await transaction.get(eventRef);
          if (eventSnap.exists()) {
              const eventData = eventSnap.data() as GroupEvent;
              attendanceDate = eventData.date;
              finalEventName = eventData.name;
              linkInfo = eventData.linkInfo;
          }
      }

      const recordPath = eventId 
        ? `groups/${groupId}/events/${eventId}/attendance/${personId}` 
        : `groups/${groupId}/attendance/${attendanceDate}_${personId}`;
        
      const attRecordRef = doc(db, recordPath);
      const recordSnap = await transaction.get(attRecordRef);
      
      if (recordSnap.exists()) {
          return { success: true, message: "Already submitted." };
      }

      // 2. LOGIC & WRITES
      
      // Atomic increment on the event doc for precomputed history list
      if (eventRef) {
          transaction.update(eventRef, { attendeeCount: increment(1) });
      }

      // Ensure Group Membership
      const existingPeopleIds = groupData.peopleIds || [];
      if (!existingPeopleIds.includes(personId)) {
          const newPeopleIds = [...existingPeopleIds, personId];
          transaction.update(groupRef, {
              peopleIds: newPeopleIds,
              memberCount: newPeopleIds.length
          });
      }

      const newEntry: AttendanceEntry = {
        groupId,
        eventId,
        groupName,
        eventName: finalEventName,
        date: attendanceDate,
        timestamp: new Date().toISOString()
      };

      const personUpdates: any = {
        attendanceHistory: arrayUnion(newEntry)
      };

      if (linkInfo) {
          const currentProgress = (personData.progress && personData.progress.length > 0) 
            ? personData.progress 
            : createInitialProgress();
            
          const newProgress = JSON.parse(JSON.stringify(currentProgress));
          const category = newProgress.find((c: any) => c.name === linkInfo.categoryName);
          
          if (category && category.items[linkInfo.statementIndex]) {
              const item = category.items[linkInfo.statementIndex];
              if (!item.answers) {
                  item.answers = { l1: '', l2: '', l3: '', l1_remark: '', l2_remark: '', l3_remark: '' };
              }

              const goal = item.levels[0] || "";
              const currentVal = item.answers?.l1 || "";
              const historyMark = `[${format(new Date(attendanceDate), 'dd/MM')}] ${finalEventName}`;
              const currentRemark = item.answers?.l1_remark || "";
              item.answers.l1_remark = currentRemark ? `${currentRemark}; ${historyMark}` : historyMark;

              const goalNum = parseInt(goal.match(/\d+/)?.[0] || "");
              if (!isNaN(goalNum)) {
                  const currentNum = parseInt(String(currentVal).match(/\d+/)?.[0] || "0");
                  item.answers.l1 = String(currentNum + 1);
              } else {
                  item.answers.l1 = 'Yes';
              }
              personUpdates.progress = newProgress;
          }
      }

      transaction.update(personRef, personUpdates);
      transaction.set(attRecordRef, {
        personId,
        markedAt: serverTimestamp(),
        date: attendanceDate
      });

      return { success: true, message: "Form submitted successfully!" };
    });
  } catch (e: any) {
    const permissionError = new FirestorePermissionError({
      path: `groups/${groupId}/attendance`,
      operation: 'write',
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
    return { success: false, message: "Failed to submit form." };
  }
}

export async function removeAttendance(personId: string, groupId: string, eventId: string) {
    await persistenceReady;
    const personRef = doc(db, 'people', personId);
    const attRef = doc(db, 'groups', groupId, 'events', eventId, 'attendance', personId);
    const eventRef = doc(db, 'groups', groupId, 'events', eventId);
    
    try {
        await runTransaction(db, async (transaction) => {
            const personSnap = await transaction.get(personRef);
            if (personSnap.exists()) {
                const personData = personSnap.data() as Person;
                const history = personData.attendanceHistory || [];
                const newHistory = history.filter(entry => 
                    !(entry.groupId === groupId && entry.eventId === eventId)
                );
                transaction.update(personRef, { attendanceHistory: newHistory });
            }
            transaction.delete(attRef);
            transaction.update(eventRef, { attendeeCount: increment(-1) });
        });
        return { success: true };
    } catch (e: any) {
        const permissionError = new FirestorePermissionError({
            path: attRef.path,
            operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        throw e;
    }
}

export async function getGroupEvents(groupId: string): Promise<GroupEvent[]> {
    const eventsRef = collection(db, 'groups', groupId, 'events');
    const q = query(eventsRef, orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as GroupEvent));
}

export async function createGroupEvent(groupId: string, eventData: Omit<GroupEvent, 'id' | 'createdAt'>) {
    await persistenceReady;
    const eventRef = doc(collection(db, 'groups', groupId, 'events'));
    const data = {
        ...eventData,
        attendeeCount: 0,
        createdAt: serverTimestamp()
    };
    
    try {
        await setDoc(eventRef, data);
        return eventRef.id;
    } catch (e: any) {
        const permissionError = new FirestorePermissionError({
            path: eventRef.path,
            operation: 'create',
            requestResourceData: data,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        throw e;
    }
}
