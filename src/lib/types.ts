

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
  firstName: string;
  lastName: string;
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
  progress: ProgressCategoryAnswers[];
  customData?: { [key: string]: any };
  createdAt?: any; // Firestore Timestamp
  lastCallRemark?: string;
  lastCallAt?: any; // Firestore Timestamp
  lastCallStatus?: CallStatus;
  lastCallEvent?: string;
  callHistory?: { 
    remark: string; 
    calledAt: any; 
    duration?: string;
    status?: CallStatus;
    event?: string;
  }[];
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
