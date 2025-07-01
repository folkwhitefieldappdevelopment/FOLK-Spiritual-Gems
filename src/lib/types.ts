export const progressCategories = [
  'Association',
  'Book Reading',
  'Chanting',
  'Devotional Service (or) Deity Darshan (or) Diet',
  'Expedition',
] as const;

export type ProgressCategoryName = (typeof progressCategories)[number];

export type ProgressCategoryAnswers = {
  name: ProgressCategoryName;
  answers: [string, string, string][];
};

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
  progress: ProgressCategoryAnswers[];
};

export type Group = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  peopleIds: string[];
};
