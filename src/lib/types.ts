
import type { callStatuses as allCallStatuses } from './data';

export const progressCategories = [
  'Association',
  'Book Reading',
  'Chanting',
  'Devotional Service (or) Deity Darshan (or) Diet',
  'Expedition',
] as const;

export type ProgressCategoryName = (typeof progressCategories)[number];

export type ProgressLevelAnswers = {
  l1: string;
  l2: string;
  l3: string;
  l1_remark?: string;
  l2_remark?: string;
  l3_remark?: string;
};

export type ChecklistItem = {
  question: string;
  levels: [string, string, string]; // Goals for L1, L2, L3
  link?: string;
  answers: ProgressLevelAnswers;
};

export type ProgressCategory = {
  name: ProgressCategoryName;
  items: ChecklistItem[];
};

export const customFieldTypes = ['text', 'textarea', 'number', 'date', 'boolean'] as const;
export type CustomFieldType = (typeof customFieldTypes)[number];

export const occupationStatuses = ['Working', 'Student', 'Searching for job'] as const;
export type OccupationStatus = (typeof occupationStatuses)[number];

export const callStatuses = [
    'A1 - Coming',
    'A2 - Not Interested',
    'A3 - Next Week/Upcoming week',
    'A4 - Tentative',
    'B - Not Answering',
    'C - Busy',
    'D - Wrong Number',
    'E - Switched Off',
    'F - Not Reachable',
    'G - Completely Shifted to Another city',
    'Y2 - Call me later',
    'Y3 - Next Month',
    'Z - Already Attended',
] as const;
export type CallStatus = (typeof callStatuses)[number];

export type PausedSession = {
  eventName: string;
  peopleIds: string[];
  currentIndex: number;
};

export type Person = {
  id: string;
  fullName: string;
  fullName_lowercase: string;
  phone: string;
  photoUrl: string;
  age: number;
  stayingWith: 'PG / Hostel' | 'Flat' | 'Family';
  occupation: OccupationStatus;
  organisation: string;
  rentDetails: string;
  nativePlace: string;
  sgRating: number;
  contactSource: string;
  chantingStatus: number;
  fromOtherCamp: boolean;
  enablerInTouchWith: string;
  folkGuide?: string;
  folkGuideId?: string;
  progress: ProgressCategory[];
  customData?: { [key: string]: any };
  generalRemarks?: string;
  createdAt?: any; // Firestore Timestamp
  lastCallRemark?: string;
  lastCallAt?: any; // Firestore Timestamp
  lastCallStatus?: CallStatus;
  callHistory?: { 
    remark: string; 
    calledAt: any; 
    status?: CallStatus;
    event?: string;
    sg?: boolean;
    ma?: boolean;
    frp?: boolean;
    callerId: string;
    callerName: string;
    callerPhotoUrl: string;
  }[];
  lastSg?: boolean;
  lastMa?: boolean;
  lastFrp?: boolean;
  coEnablerId?: string;
  coEnablerName?: string;
};

export const userRoles = ['Admin', 'Folk Guide', 'Folk Enabler'] as const;
export type UserRole = (typeof userRoles)[number];

export type AppUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole[];
  createdAt: any; // Firestore Timestamp
  fgCode?: string; // Unique code for Folk Guides
  reportsTo?: { // For Folk Enablers, stores info about their guide
    guideId: string;
    guideName: string;
    guideFgCode: string;
  };
  lastAssignedEnablerIndex?: number;
  currentCallingEvent?: string;
  pausedSession?: PausedSession | null;
  photoUrl?: string;
};

export type Group = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  peopleIds: string[];
  createdBy?: string;
  creatorRole?: UserRole[];
  visibility: UserRole[];
  isDynamic?: boolean; // Flag for dynamic groups
  filteredMemberCount?: number; // Used for client-side filtering
};

export type CustomField = {
  id: string;
  label: string;
  type: CustomFieldType;
};

export type AuditLog = {
    id: string;
    timestamp: any; // Firestore Timestamp
    userId: string;
    userName: string;
    action: string;
    details: string;
};
