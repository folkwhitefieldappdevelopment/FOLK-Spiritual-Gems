# Project Specification: FOLK Spiritual Gems CRM (Cross-Platform)

## Goal
Build a cross-platform CRM application (iOS, Android, Windows, macOS) for managing contacts, tracking spiritual progress, and logging outreach calls.

## Technology Stack Recommendation
- **Framework**: Flutter (Highly recommended for native performance on both Mobile and Desktop) or React Native with Expo (for Mobile) + Electron (for Desktop).
- **Backend**: Firebase (Firestore, Authentication, Storage).
- **State Management**: Provider/Riverpod (Flutter) or Redux/Zustand (React).

## 1. User Roles & Access Control (RBAC)
- **Admin**: Full access to all contacts, users, audit logs, and global settings.
- **Folk Guide (FG)**: Can see their own contacts and all contacts assigned to their managed Enablers. Can create users (Enablers).
- **Folk Enabler**: Can only see contacts assigned directly to them or where they are marked as "Co-Enabler".

## 2. Core Entities (Data Model)
### Person (Contact)
- **Basic Info**: Full Name, Phone (Unique), Age (16-40), Photo (URL), Location, Native Place.
- **Background**: Staying With (Dropdown), Occupation Status (Dropdown), Organisation, Rent Details (Numeric).
- **CRM Fields**: Current Folk Stage (Dynamic enum), SG Rating (0-5 Stars), Contact Source (Dropdown), Chanting Rounds (0-16).
- **Tracking**: `progress` (Matrix of categories like Association, Book Reading, etc., with 3 levels each), `generalRemarks` (Long text).
- **History**: `callHistory` (Array of logs: Timestamp, Status, Remark, Duration, Event, Activity Scores).
- **Metadata**: CreatedAt, Assigned Enabler, Assigned Folk Guide.

### User
- Name, Email, Role (Admin/Guide/Enabler), FG Code (for Guides), ReportsTo (for Enablers).

## 3. Key Feature Modules
### A. Dashboard
- Statistics cards: Total Contacts, My Contacts, New Contacts (7 days).
- Calling Performance: Answered vs. Unanswered (Pie/Bar charts).
- Breakdown: Contacts by Enabler, Contacts by Call Status.

### B. Contact Management
- **List View**: Search by name/phone, Advanced filters (Location, Source, Enabler, Status).
- **Calling Session (Queue Mode)**: 
    - Start a session for a selected group.
    - UI displays one contact at a time with a prominent "Call" button.
    - After call, user logs status, remark, and scores (SG, MA, FRP).
    - "Save & Next" pattern to cycle through the list.
- **Profile View**: Interactive checklist for spiritual levels, star ratings, and editable details.

### C. Smart Groups (Automatic Process Flow)
Dynamic categories based on "Current Folk Stage" in this exact order:
1. Diamond-club 16
2. FRJ
3. FRP
4. SG-W
5. SG-S
6. 21 Days Challenge
7. Interested (Visited residency or temple)
8. Fresh Lead (Default)
9. Club 16 - Inactive

### D. Utility Features
- **Excel Import/Export**: Batch upload contacts and download reports.
- **WhatsApp Integration**: Deep link to WhatsApp with customizable message templates.
- **Audit Logging**: Track every contact creation, update, and deletion.

## 4. UI/UX Design Requirements
- **Theme**: Primary (#3F51B5 Deep Blue), Background (#E8EAF6 Light Blue), Accent (#FF9800 Orange).
- **Style**: Modern, clean, "Shadcn-like" rounded corners and subtle shadows.
- **Mobile Specifics**: Bottom navigation bar, floating action button for "Add Contact", swipe-to-call gestures.
- **Desktop Specifics**: Sidebar navigation, data tables with fixed headers, keyboard shortcuts for the Calling Session.

## 5. Implementation Logic (CRITICAL)
- **Offline Mode**: Local caching of contacts for read access without internet.
- **Permissions**: Every query must filter by `folkGuideId` or `enablerInTouchWith` based on user role to ensure data privacy.
- **Unassigned Leads**: A specific "Assignments" page for Admins/Guides to distribute new "Fresh Leads" to Enablers.
