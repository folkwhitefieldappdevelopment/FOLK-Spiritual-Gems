import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

/**
 * Hourly scheduled function to delete expired co-enabler groups.
 * Ensures temporary assignments are automatically removed after their expiry window.
 */
export const cleanupExpiredAssignments = onSchedule({ 
  schedule: "every 1 hours",
  timeZone: "Asia/Kolkata", 
}, async () => {
  const db = admin.firestore();
  const now = new Date().toISOString();
  
  try {
    // Query for groups that have a task associated and have passed their expiry date
    // Note: This query requires a composite index on 'task' and 'expiresAt'
    const expiredGroupsSnap = await db.collection('groups')
      .where('task', '!=', null)
      .where('expiresAt', '<', now)
      .get();

    if (expiredGroupsSnap.empty) {
      console.log('[CleanupExpiredAssignments] No expired groups found.');
      return;
    }

    const batch = db.batch();
    expiredGroupsSnap.forEach(doc => {
      console.log(`[CleanupExpiredAssignments] Deleting expired group: ${doc.id} - ${doc.data().name}`);
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`[CleanupExpiredAssignments] Successfully processed ${expiredGroupsSnap.size} removals.`);
  } catch (error) {
    console.error('[CleanupExpiredAssignments] Error executing cleanup batch:', error);
  }
});
