export type ProgressItem = {
  id: string;
  question: string;
  answer: string;
};

export const progressCategories = [
  'Association',
  'Book Reading',
  'Chanting',
  'Devotional Service',
  'Expedition',
] as const;

export type ProgressCategoryName = (typeof progressCategories)[number];

export type ProgressCategory = {
  name: ProgressCategoryName;
  items: ProgressItem[];
};

export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photoUrl: string;
  location: string;
  status: 'Active' | 'Inactive' | 'Pending';
  progress: ProgressCategory[];
};

export type Group = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  peopleIds: string[];
};
