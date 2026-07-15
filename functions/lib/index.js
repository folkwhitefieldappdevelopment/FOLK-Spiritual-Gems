"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredAssignments = exports.goalDeadlineReminders = void 0;
const admin = require("firebase-admin");
admin.initializeApp();
var goal_reminders_1 = require("./goal-reminders");
Object.defineProperty(exports, "goalDeadlineReminders", { enumerable: true, get: function () { return goal_reminders_1.goalDeadlineReminders; } });
var co_enabler_expiry_1 = require("./co-enabler-expiry");
Object.defineProperty(exports, "cleanupExpiredAssignments", { enumerable: true, get: function () { return co_enabler_expiry_1.cleanupExpiredAssignments; } });
//# sourceMappingURL=index.js.map