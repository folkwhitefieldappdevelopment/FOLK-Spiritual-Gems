
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

export const customFieldTypes = ['text', 'number', 'date', 'boolean'] as const;
export type CustomFieldType = (typeof customFieldTypes)[number];

export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  photoUrl: string;
  age: number;
  stayingWith: 'PG / Hostel' | 'Flat' | 'Family';
  occupation: string;
  rentDetails: string;
  nativePlace: string;
  sgRating: string;
  contactSource: string;
  chantingStatus: string;
  fromOtherCamp: boolean;
  enablerInTouchWith: string;
  progress: ProgressCategoryAnswers[];
  customData?: { [key: string]: any };
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
