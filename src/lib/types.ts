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
  email: string;
  phone: string;
  photoUrl: string;
  location: string;
  status: 'Active' | 'Inactive' | 'Pending';
  progress: ProgressCategoryAnswers[];
};

export type Group = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  peopleIds: string[];
};
