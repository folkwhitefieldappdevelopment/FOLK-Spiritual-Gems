import type { Person, Group, ProgressCategory } from './types';
import { progressCategories } from './types';

const createInitialProgress = (): ProgressCategory[] => {
  return progressCategories.map(name => ({
    name,
    items: []
  }));
};

const johnsProgress = createInitialProgress();
johnsProgress.find(c => c.name === 'Association')!.items.push({ id: 'a1', question: 'Who did you associate with this week?', answer: 'Attended the weekly program.' });
johnsProgress.find(c => c.name === 'Book Reading')!.items.push({ id: 'b1', question: 'Which book are you reading?', answer: 'Bhagavad-gita As It Is' });
johnsProgress.find(c => c.name === 'Chanting')!.items.push({ id: 'c1', question: 'How many rounds did you chant today?', answer: '16' });


export const mockPeople: Person[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    photoUrl: 'https://placehold.co/100x100.png',
    location: 'New York, USA',
    status: 'Active',
    progress: johnsProgress,
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '234-567-8901',
    photoUrl: 'https://placehold.co/100x100.png',
    location: 'London, UK',
    status: 'Active',
    progress: createInitialProgress(),
  },
  {
    id: '3',
    firstName: 'Sam',
    lastName: 'Wilson',
    email: 'sam.wilson@example.com',
    phone: '345-678-9012',
    photoUrl: 'https://placehold.co/100x100.png',
    location: 'Sydney, Australia',
    status: 'Inactive',
    progress: createInitialProgress(),
  },
  {
    id: '4',
    firstName: 'Emily',
    lastName: 'Brown',
    email: 'emily.brown@example.com',
    phone: '456-789-0123',
    photoUrl: 'https://placehold.co/100x100.png',
    location: 'Toronto, Canada',
    status: 'Pending',
    progress: createInitialProgress(),
  },
  {
    id: '5',
    firstName: 'Michael',
    lastName: 'Jones',
    email: 'michael.jones@example.com',
    phone: '567-890-1234',
    photoUrl: 'https://placehold.co/100x100.png',
    location: 'Paris, France',
    status: 'Active',
    progress: createInitialProgress(),
  },
  {
    id: '6',
    firstName: 'Sarah',
    lastName: 'Davis',
    email: 'sarah.davis@example.com',
    phone: '678-901-2345',
    photoUrl: 'https://placehold.co/100x100.png',
    location: 'Berlin, Germany',
    status: 'Active',
    progress: createInitialProgress(),
  },
    {
    id: '7',
    firstName: 'Chris',
    lastName: 'Miller',
    email: 'chris.miller@example.com',
    phone: '789-012-3456',
    photoUrl: 'https://placehold.co/100x100.png',
    location: 'Tokyo, Japan',
    status: 'Inactive',
    progress: createInitialProgress(),
  },
  {
    id: '8',
    firstName: 'Laura',
    lastName: 'Garcia',
    email: 'laura.garcia@example.com',
    phone: '890-123-4567',
    photoUrl: 'https://placehold.co/100x100.png',
    location: 'Madrid, Spain',
    status: 'Pending',
    progress: createInitialProgress(),
  },
];

export const mockGroups: Group[] = [
    {
        id: 'group-1',
        name: 'Marketing Team',
        description: 'All members of the marketing department.',
        memberCount: 3,
        peopleIds: ['1', '2', '5']
    },
    {
        id: 'group-2',
        name: 'VIP Clients',
        description: 'High-value clients for special offers.',
        memberCount: 2,
        peopleIds: ['4', '6']
    },
    {
        id: 'group-3',
        name: 'Inactive Users',
        description: 'Users who have not logged in for 6 months.',
        memberCount: 2,
        peopleIds: ['3', '7']
    },
    {
        id: 'group-4',
        name: 'Development Team',
        description: 'All software developers and engineers.',
        memberCount: 0,
        peopleIds: []
    }
]
