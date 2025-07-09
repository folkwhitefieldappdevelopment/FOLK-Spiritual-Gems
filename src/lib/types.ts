
import type { callStatuses } from './data';

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

export type ProgressCategoryAnswers = {
  name: ProgressCategoryName;
  answers: ProgressLevelAnswers[];
};

export const customFieldTypes = ['text', 'textarea', 'number', 'date', 'boolean'] as const;
export type CustomFieldType = (typeof customFieldTypes)[number];

export const occupationStatuses = ['Working', 'Student', 'Searching for job'] as const;
export type OccupationStatus = (typeof occupationStatuses)[number];

export type CallStatus = (typeof callStatuses)[number];

export type Person = {
  id: string;
  fullName: string;
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
  chantingStatus: string;
  fromOtherCamp: boolean;
  enablerInTouchWith: string;
  folkGuide?: string;
  folkGuideId?: string;
  progress: ProgressCategoryAnswers[];
  customData?: { [key: string]: any };
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
  }[];
  lastSg?: boolean;
  lastMa?: boolean;
  lastFrp?: boolean;
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
};

export type Group = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  peopleIds: string[];
};

export type CustomField = {
  id: string;
  label: string;
  type: CustomFieldType;
};
