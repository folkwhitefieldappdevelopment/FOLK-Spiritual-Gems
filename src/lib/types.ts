export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photoUrl: string;
  location: string;
  status: 'Active' | 'Inactive' | 'Pending';
};

export type Group = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  peopleIds: string[];
};
