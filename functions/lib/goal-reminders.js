"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.goalDeadlineReminders = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
/**
 * Scheduled function to monitor Goal deadlines and dispatch in-app notifications.
 * Runs daily at 08:00 AM IST.
 */
exports.goalDeadlineReminders = (0, scheduler_1.onSchedule)({
    schedule: "every day 08:00",
    timeZone: "Asia/Kolkata",
}, async () => {
    const db = admin.firestore();
    // 1. Fetch all goals (filter in-memory for achievedCount < targetCount as cross-field compare is complex in Firestore)
    const goalsSnap = await db.collection('goals').get();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const batch = db.batch();
    let notificationCount = 0;
    for (const goalDoc of goalsSnap.docs) {
        const goal = goalDoc.data();
        // Skip goals that are already achieved
        if (goal.achievedCount >= goal.targetCount)
            continue;
        if (!goal.deadlineDate)
            continue;
        const deadlineDate = goal.deadlineDate.toDate();
        const deadline = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
        // Calculate difference in days
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const lastStage = goal.lastReminderStage || 'none';
        let newStage = null;
        let notifyEnabler = false;
        let notifyGuide = false;
        let message = "";
        // Upcoming Reminder: 3 days or less, but not overdue yet, and not already reminded
        if (diffDays <= 3 && diffDays > 0 && lastStage === 'none') {
            newStage = 'upcoming';
            notifyEnabler = true;
            message = `Goal "${goal.title}" deadline is in ${diffDays} day${diffDays === 1 ? '' : 's'}. Currently at ${goal.achievedCount}/${goal.targetCount} ${goal.targetUnit || 'units'}.`;
        }
        // Overdue Reminder: Deadline reached or passed, and not already marked as overdue
        else if (diffDays <= 0 && lastStage !== 'overdue') {
            newStage = 'overdue';
            notifyEnabler = true;
            notifyGuide = true;
            message = `Goal "${goal.title}" is overdue! Final progress: ${goal.achievedCount}/${goal.targetCount} ${goal.targetUnit || 'units'}.`;
        }
        if (newStage) {
            // Update Goal state to ensure idempotency
            batch.update(goalDoc.ref, {
                lastReminderStage: newStage,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Prepare notification document shape for existing client-side NotificationCenter
            const notificationBase = {
                title: newStage === 'upcoming' ? 'Goal Deadline Approaching' : 'Goal Deadline Missed',
                message: message,
                timestamp: now.toISOString(),
                isRead: false,
                type: newStage === 'upcoming' ? 'warning' : 'alarm',
                senderId: 'system',
                senderName: 'System',
            };
            if (notifyEnabler && goal.enablerId) {
                const enablerNotifRef = db.collection('users').doc(goal.enablerId).collection('notifications').doc();
                batch.set(enablerNotifRef, { ...notificationBase, personId: null });
                notificationCount++;
            }
            if (notifyGuide && goal.folkGuideId) {
                const guideNotifRef = db.collection('users').doc(goal.folkGuideId).collection('notifications').doc();
                batch.set(guideNotifRef, { ...notificationBase, personId: null });
                notificationCount++;
            }
        }
    }
    if (notificationCount > 0) {
        await batch.commit();
        console.log(`[GoalReminders] Processed successfully. Dispatched ${notificationCount} notifications.`);
    }
    else {
        console.log(`[GoalReminders] Execution completed. No new reminders required.`);
    }
});
//# sourceMappingURL=goal-reminders.js.map