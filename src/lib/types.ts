export type ChecklistItem = {
  id: string;
  statement: string;
  isChecked: boolean;
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
  checklist: ChecklistItem[];
};

export type Group = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  peopleIds: string[];
};
