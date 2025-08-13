
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, runTransaction, where, query, getDocs } from 'firebase/firestore';
import type { AppUser, UserRole } from '@/lib/types';
import { logAudit } from './audit-service';

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

export const addPeopleToGroupByPhone = async (
  groupId: string,
  phoneNumbers: string[],
  userInfo: UserInfo
): Promise<{ addedCount: number; existingCount: number; notFoundCount: number }> => {
  const peopleCollection = collection(db, 'people');
  const groupRef = doc(db, 'groups', groupId);
  
  let addedCount = 0;
  let existingCount = 0;
  let notFoundCount = 0;

  // Firestore 'in' query can take up to 30 elements
  const CHUNK_SIZE = 30;
  const newMemberIds = new Set<string>();
  const phoneSet = new Set(phoneNumbers);

  for (let i = 0; i < phoneNumbers.length; i += CHUNK_SIZE) {
    const chunk = phoneNumbers.slice(i, i + CHUNK_SIZE);
    const q = query(peopleCollection, where('phone', 'in', chunk));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(doc => {
      newMemberIds.add(doc.id);
      phoneSet.delete(doc.data().phone);
    });
  }
  
  notFoundCount = phoneSet.size;

  if (newMemberIds.size > 0) {
    await runTransaction(db, async (transaction) => {
      const groupDoc = await transaction.get(groupRef);
      if (!groupDoc.exists()) {
        throw new Error("Group not found.");
      }
      
      const currentPeopleIds = new Set(groupDoc.data().peopleIds || []);
      const memberIdsToAdd = Array.from(newMemberIds).filter(id => !currentPeopleIds.has(id));

      addedCount = memberIdsToAdd.length;
      existingCount = newMemberIds.size - addedCount;
      
      if (addedCount > 0) {
        const newPeopleIds = Array.from(new Set([...currentPeopleIds, ...memberIdsToAdd]));
        transaction.update(groupRef, {
          peopleIds: newPeopleIds,
          memberCount: newPeopleIds.length
        });
      }
    });

    const groupName = (await getDoc(groupRef)).data()?.name || 'Unknown Group';
    await logAudit('Import Group Members', `Imported ${addedCount} new members to group: ${groupName}`, userInfo);
  }

  return { addedCount, existingCount, notFoundCount };
};
