export type UserRole = 'Admin' | 'Folk Guide' | 'Folk Enabler';

export const userRoles: UserRole[] = ['Admin', 'Folk Guide', 'Folk Enabler'];

export type FolkStage = 
  | 'Diamond-club 16'
  | 'FRJ'
  | 'FRP'
  | 'SG-W'
  | 'SG-S'
  | '21 Days Challenge'
  | 'Interested (Visited Residency or Temple)'
  | 'Fresh Lead'
  | 'Club 16 - Inactive';

export const folkStages: FolkStage[] = [
  'Diamond-club 16',
  'FRJ',
  'FRP',
  'SG-W',
  'SG-S',
  '21 Days Challenge',
  'Interested (Visited Residency or Temple)',
  'Fresh Lead',
  'Club 16 - Inactive'
];

/**
 * SLA thresholds for follow-ups based on the contact's current stage.
 */
export const FOLLOW_UP_SLA_DAYS: Record<FolkStage, number> = {
  'Fresh Lead': 3,
  'Interested (Visited Residency or Temple)': 4,
  '21 Days Challenge': 2,
  'FRJ': 7,
  'FRP': 7,
  'SG-W': 10,
  'SG-S': 10,
  'Diamond-club 16': 14,
  'Club 16 - Inactive': 30,
};

export const ELIMINATED_STATUSES = ['A2 - Not Interested', 'A3 - Wrong Number', 'G - Completely Shifted to Another city'];

export type CallStatus = 
  | 'A1 - Coming'
  | 'A2 - Not Interested'
  | 'A3 - Wrong Number'
  | 'A4 - Tentative'
  | 'B - Not Answering'
  | 'C - Out of Station'
  | 'D - Switch Off'
  | 'E - Not Reachable'
  | 'F - Callback'
  | 'G - Completely Shifted to Another city'
  | 'Z - Already Attended'
  | 'Device: Incoming'
  | 'Device: Outgoing'
  | 'Device: Missed';

export const callStatuses: CallStatus[] = [
  'A1 - Coming',
  'A2 - Not Interested',
  'A3 - Wrong Number',
  'A4 - Tentative',
  'B - Not Answering',
  'C - Out of Station',
  'D - Switch Off',
  'E - Not Reachable',
  'F - Callback',
  'G - Completely Shifted to Another city',
  'Z - Already Attended',
  'Device: Incoming',
  'Device: Outgoing',
  'Device: Missed'
];

export type ProgressLevelAnswers = {
  l1: string;
  l2: string;
  l3: string;
  l1_remark: string;
  l2_remark: string;
  l3_remark: string;
};

export type ProgressItem = {
  question: string;
  levels: [string, string, string];
  answers: ProgressLevelAnswers;
  link?: string;
};

export type ProgressCategoryName = 
  | 'Association' 
  | 'Book Reading' 
  | 'Chanting' 
  | 'Devotional Service (or) Deity Darshan (or) Diet' 
  | 'Expedition';

export const progressCategories: ProgressCategoryName[] = [
  'Association',
  'Book Reading',
  'Chanting',
  'Devotional Service (or) Deity Darshan (or) Diet',
  'Expedition'
];

export type ProgressCategory = {
  name: ProgressCategoryName;
  items: ProgressItem[];
};

export type AttendanceEntry = {
  groupId: string;
  groupName: string;
  eventId?: string;
  eventName?: string;
  date: string;
  timestamp: string;
};

export type CallLog = {
  calledAt: any;
  remark: string;
  status: CallStatus;
  event: string;
  callerId: string;
  callerName: string;
  callerPhotoUrl?: string;
  sessionCreatorId?: string;
  type?: 'call' | 'attendance' | 'device';
  duration?: number;
  phoneNumber?: string;
};

export type FilterState = {
  name: string;
  phone: string;
  location: string;
  eventName: string;
  callerName: string;
  callDateFrom: string;
  callDateTo: string;
  stayingWith: string;
  chantingRounds: string;
  enablerId: string;
  enablerName: string;
  callStatus: string;
  contactSources: string[];
  stage: string;
  chantingRoundsMin: string;
  chantingRoundsMax?: string;
};

export type Person = {
  id: string;
  fullName: string;
  fullName_lowercase?: string;
  phone: string;
  photoUrl: string;
  age: number;
  currentFolkStage: FolkStage;
  location: string;
  stayingWith: string;
  occupation: string;
  organisation: string;
  rentDetails: number;
  nativePlace: string;
  sgRating: number;
  contactSource: string[];
  chantingStatus: number;
  fromOtherCamp: boolean;
  enablerInTouchWith: string;
  enablerId?: string;
  folkGuide: string;
  folkGuideId: string;
  folkId: string;
  createdAt: any;
  progress: ProgressCategory[];
  generalRemarks: string;
  callHistory: CallLog[];
  attendanceHistory?: AttendanceEntry[];
  relationshipStatus: 'Single' | 'Married';
  verifiedByFg: 'Yes' | 'No';
  isDeleted?: boolean;
  deletedAt?: any;
  lastCallAt?: any;
  lastCallStatus?: CallStatus;
  lastCallRemark?: string;
  lastSyncTimestamp?: number;
  lastSg?: string;
  lastMa?: string;
  lastFrp?: string;
  nextFollowUpAt?: string;
  reminderSetName?: string;
  activeCoEnablerSessionId?: string;
  coEnablerId?: string;
  coEnablerName?: string;
  coEnablerExpiry?: string;
  customData?: Record<string, any>;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole[];
  photoUrl: string;
  createdAt: any;
  fgCode?: string;
  reportsTo?: {
    guideId: string;
    guideName: string;
    guideFgCode: string;
  } | null;
  team?: {
    teamId: string;
    teamName: string;
  } | null;
  pausedCallingSession?: {
    event: string;
    peopleIds: string[];
    currentIndex: number;
    assignedById: string;
    assignedByName: string;
    historyId: string;
    coEnablerIds?: string[];
  } | null;
  whatsAppTemplate?: string;
};

export type Team = {
  id: string;
  name: string;
  guideId: string;
  createdAt: any;
};

export type SavedWhatsappQuestion = {
  id: string;
  text: string;
  usageCount: number;
  lastUsedAt: any;
  createdBy: string;
};

export type BackgroundJob = {
  id: string;
  type: 'import' | 'export';
  fileName: string;
  current: number;
  total: number;
  status: 'running' | 'success' | 'error';
  errors: { name: string; phone: string; error: string }[];
  startedAt: number;
};

/**
 * Robust strict check for assignment.
 * Ensures enablers only see their own contacts.
 * Tasks assigned via shared groups are accessed through the Groups tab only.
 */
export const isAssignedToUser = (p: Person, userInfo: { id: string; name: string }) => {
  if (!p || !userInfo) return false;
  const myId = userInfo.id;
  const myName = (userInfo.name || '').trim();

  // 1. Strict ID Match (Primary Enabler Only)
  if (p.enablerId && p.enablerId === myId) return true;

  // 2. Fallback Name Match (Only if ID is missing on record)
  if (!p.enablerId && p.enablerInTouchWith) {
      const enablerOnRecord = p.enablerInTouchWith.split('::')[0].trim();
      if (enablerOnRecord === myName) return true;
  }

  return false;
};

export type CustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'dropdown' | 'textarea';
export const customFieldTypes: CustomFieldType[] = ['text', 'number', 'date', 'boolean', 'dropdown', 'textarea'];

export type CustomField = {
  id: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
};

export type ActivityFieldLabels = {
  sg: string;
  ma: string;
  frp: string;
};

export type CallingReportDetail = {
  count: number;
  totalDuration: number;
  event: string;
  callerName: string;
  ownerName?: string;
  enablerName?: string;
  coEnablerName?: string;
  fgName?: string;
  isDevice?: boolean;
};

export type CallingReport = {
  totalCalls: number;
  picked: number;
  notPicked: number;
  eliminated: number;
  totalDuration: number;
  percentages: {
    picked: number;
    notPicked: number;
    eliminated: number;
  };
  daily: Record<string, { total: number; picked: number; duration: number }>;
  byEnabler: Record<string, { total: number; picked: number; duration: number }>;
  subCategories: Record<string, number>;
  detailedBreakdown: Record<string, Record<string, CallingReportDetail>>;
};

export type LeaderboardEntry = {
  callerId: string;
  callerName: string;
  photoUrl?: string;
  totalCalls: number;
  totalDuration: number;
  dailyStats: Record<string, { count: number; duration: number }>;
};

export type EnablerStageBreakdown = {
  enablerId: string;
  enablerName: string;
  frp: number;
  sgS: number;
  sgW: number;
  sixteenRounder: number;
  totalContacts: number;
};

export type EnablerChantingBreakdown = {
  enablerId: string;
  enablerName: string;
  rounds16Plus: number;
  rounds9to15: number;
  rounds3to8: number;
  rounds0to2: number;
  totalContacts: number;
};

export type DashboardData = {
  stats: {
    myContactsCount: number;
    totalContactsCount: number;
    myNewInRange: number;
    allNewInRange: number;
    byEnabler: Record<string, number>;
    byYear: Record<string, number>;
    byChantingCategory: Record<string, number>;
    enablerBreakdown: EnablerStageBreakdown[];
    chantingBreakdown: EnablerChantingBreakdown[];
  };
  callingReportAll: CallingReport;
  callingReportMy: CallingReport;
  teamCallingReports: Record<string, CallingReport>;
  leaderboard: LeaderboardEntry[];
  isPrivileged: boolean;
};

export type Group = {
  id: string;
  name: string;
  description: string;
  photoUrl?: string;
  createdBy: string;
  createdByName: string;
  creatorRole: UserRole[];
  sharedWithUserIds: string[];
  visibility: UserRole[];
  peopleIds: string[];
  memberCount: number;
  isDynamic?: boolean;
  color?: string;
  expiresAt?: string | null;
  task?: string | null;
  assignedBy?: string | null;
  assignedByName?: string | null;
  assignedToName?: string | null;
  reportingEnabled?: boolean;
  reportTime?: string;
  reportRecipients?: string[];
};

export type GroupEvent = {
    id: string;
    name: string;
    date: string;
    createdAt: any;
    linkInfo?: {
        categoryName: ProgressCategoryName;
        statementIndex: number;
    };
    attendeeCount?: number;
};

export type CallingSessionRecord = {
  id: string;
  name: string;
  peopleIds: string[];
  currentIndex: number;
  status: 'active' | 'completed';
  createdBy: string;
  creatorName: string;
  assignedById: string;
  assignedByName: string;
  folkGuideId: string;
  lastActivity: string;
  createdAt: string;
  coEnablerIds?: string[];
};

export type CoEnablerSession = {
    id: string;
    name: string;
    task: string;
    type: 'external' | 'internal';
    expiresAt: string;
    peopleIds: string[];
    creatorId: string;
    creatorName: string;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'info' | 'alarm' | 'success' | 'warning';
  senderId?: string;
  senderName?: string;
  personId?: string;
};

// Goals Tracking types
export type GoalStatus = 'not-started' | 'in-progress' | 'achieved' | 'overdue' | 'at-risk';
export type GoalCategory = string;

export type Goal = {
  id: string;
  title: string;
  category: GoalCategory;
  enablerId: string;
  enablerName: string;
  folkGuideId: string;
  targetCount: number;
  targetUnit?: string;
  deadlineDate: any; // Firestore Timestamp
  deadlineLabel?: string;
  achievedCount: number;
  remark?: string;
  createdBy: string;
  createdByName: string;
  createdAt: any;
  updatedAt: any;
  lastReminderStage?: 'none' | 'upcoming' | 'overdue';
};

export type TeamGoalsSummary = {
  teamId: string | null;
  teamName: string;
  members: { 
    enablerId: string; 
    enablerName: string; 
    columns: Record<string, { achieved: number; target: number }> 
  }[];
  teamTotals: Record<string, { achieved: number; target: number }>;
};

export type ExternalCoEnabler = {
  id: string;
  name: string;
  email: string;
  createdBy: string;
  createdByName: string;
  createdAt: any;
};