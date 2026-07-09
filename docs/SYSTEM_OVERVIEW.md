# FOLK Spiritual Gems CRM - System Overview

This document summarizes the architecture and custom features of the FOLK CRM to assist with further development in external IDEs (Project IDX, Cursor, etc.).

## 1. Core Architecture
- **Framework**: Next.js 15 (App Router), React 19, Tailwind CSS.
- **UI Components**: Shadcn UI (Radix-based).
- **Icons**: Lucide React.
- **Backend**: Firebase (Firestore, Auth, Storage).

## 2. Key Data Entities
### People (Contacts)
- **Soft Delete**: Uses `isDeleted` flag. Soft-deleted records go to the `Recycle Bin` (Smart Group).
- **Metadata**: Tracks `enablerInTouchWith`, `folkGuideId`, `verifiedByFg`, and `chantingStatus`.
- **Attendance**: Stored as an array of `AttendanceEntry` in the person document, mirrored in `groups/{groupId}/attendance/{dateId}`.

### Groups
- **Static Groups**: Manually created by users.
- **Dynamic (Smart) Groups**: Generated in real-time in `src/lib/dynamic-groups.ts` based on `folkStage` and status.
- **Privacy**: Uses `sharedWithUserIds` array for private delegation to Enablers.

## 3. Custom Business Logic
### Outreach Sessions
- **Firestore-First Tracking**: Sessions are initialized in the `calling_sessions` collection via `trackSessionStart` before being saved to the user profile. This ensures immediate visibility in the "Live Activity" dashboard.
- **Co-Enabler Support**: Sessions track a `coEnablerIds` array, allowing volunteers to see delegated tasks in their "Team Progress" tab.

### Hierarchy & Permissions
- **Admin**: Full system access.
- **Folk Guide**: Manually manages Enablers. Can see all contacts belonging to their team.
- **Folk Enabler**: Sees only their assigned contacts and tasks shared with them.

## 4. Maintenance Tools
- **Backfill Utility**: Located in `groups-service.ts`, used to restore missing owner/assignee names (`createdByName`, `assignedToName`) for legacy records.
- **Deduplication**: Services use email-based deduplication to resolve issues where users might have multiple database records from different migration phases.

## 5. Development Tips
- **Firestore Query Guard**: Always wrap composite filters (OR + WHERE) in a parent `and()` statement to comply with SDK requirements.
- **Component Guards**: The `SessionPage` uses a `hasInitialized` ref to prevent redundant loading spinners during real-time Firestore updates.
