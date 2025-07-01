import type { Person, Group, ProgressCategoryAnswers } from './types';

export const checklistData = [
  {
    category: 'Association',
    items: [
      {
        question: 'FR Staying (Or) FR Visiting',
        levels: ['Yes', 'Yes', 'Yes'],
      },
      {
        question: 'Special Association of Senior devotees',
        levels: ['1', '1', '1'],
      },
      {
        question: 'One-on-One Association (>20 min)',
        levels: ['6', '8', '12'],
      },
      {
        question: 'Weekly programs attended (No.s)',
        levels: ['Attended 6 classes', 'Attended 6 classes', 'Attended 8 classes'],
      },
      { question: 'Guru issue related', levels: ['SP office quotes', 'Final order', '-'] },
    ],
  },
  {
    category: 'Book Reading',
    items: [
      { question: 'Reading (mins per day)', levels: ['30 mins', '45 mins', '60 mins'] },
      { question: 'SP Biography: Messenger of Godhead', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'Small Books 4', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'Guru Issue', link: 'https://drive.google.com/drive/folders/1RpPVuzGPUXA5xAdi4nvD9-mlVM4k_Bdl?usp=share_link', levels: ['Yes', 'Yes', 'Yes'] },
      { question: '6 Goswamis', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'Vaishnava Saints', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'BG', levels: ['', 'Yes', 'Yes'] },
      { question: 'SSR', levels: ['', 'Yes', 'Yes'] },
      { question: 'JSD - Journey of Self Discovery', levels: ['', 'Yes', 'Yes'] },
      { question: 'Krishna Book', levels: ['', 'Yes', 'Yes'] },
      { question: 'Krishna Sharanam', levels: ['', '', 'Yes'] },
      { question: 'SB 7.6 Prahlad Maharaj Instructions', levels: ['', '', 'Yes'] },
      { question: 'SB 5.5.1 Rishabhadev Instructions', levels: ['', '', 'Yes'] },
      { question: 'SB 7.2.1 Yamraj in guise of small boy instructions', levels: ['', '', 'Yes'] },
      { question: 'SB 8.22: Bali Maharaj surrender', levels: ['', '', 'Yes'] },
      { question: 'SB 5.14: Material Enjoyment is like Forest Fire', levels: ['', '', 'Yes'] },
      { question: 'SB 3.28 & 29: Kapila Maharaj instructions', levels: ['', '', 'Yes'] },
      { question: 'SB 6.5: Narada cursed by Prajapati Daksha', levels: ['', '', 'Yes'] },
      { question: 'SB 9.18: King Yayati attains Liberation', levels: ['', '', 'Yes'] },
    ],
  },
  {
    category: 'Chanting',
    items: [{ question: 'Chanting (No of rounds)', levels: ['16', '16', '16'] }],
  },
  {
    category: 'Devotional Service (or) Deity Darshan (or) Diet',
    items: [
      { question: 'Book Distribution (Total in Hrs)', levels: ['8 Hrs', '12 Hrs', '16 Hrs'] },
      { question: 'Service (Total in Hrs)', levels: ['8 Hrs', '12 Hrs', '16 Hrs'] },
      { question: 'Festival Service / Organizing preaching programs (Total No of Days)', levels: ['1', '1', '1'] },
      { question: 'No of MA / Overnight stay in the temple', levels: ['8 Aratis (MA/DA/SA)', '8 Aratis (MA/DA/SA)', '8 Aratis (MA/DA/SA)'] },
      { question: 'Ekadashi & Spl day fasting', levels: ['Yes', 'Yes', 'Yes'] },
      { question: '4 regulative principles', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'Avoid Non - veg', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'Rise early', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'Avoid Onion & Garlic', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'Avoid Coffee/Tea', levels: ['Yes', 'Yes', 'Yes'] },
    ],
  },
  {
    category: 'Expedition',
    items: [{ question: 'Folk Trips', levels: ['1 long trip', '1 long trip', '1 long trip'] }],
  },
];


export const createInitialProgress = (): ProgressCategoryAnswers[] => {
  return checklistData.map((category) => ({
    name: category.category as any,
    answers: category.items.map(() => ['', '', '']),
  }));
};

export const mockPeople: Person[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    phone: '9876543210',
    photoUrl: 'https://placehold.co/100x100.png',
    age: 28,
    stayingWith: 'PG / Hostel',
    occupation: 'Software Engineer',
    rentDetails: '5000/month',
    nativePlace: 'New York, USA',
    sgRating: 'A+',
    contactSource: 'Friend',
    chantingStatus: '16 rounds daily',
    fromOtherCamp: false,
    progress: createInitialProgress(),
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '8765432109',
    photoUrl: 'https://placehold.co/100x100.png',
    age: 24,
    stayingWith: 'Flat',
    occupation: 'Graphic Designer',
    rentDetails: '12000/month',
    nativePlace: 'London, UK',
    sgRating: 'A',
    contactSource: 'Website',
    chantingStatus: '8 rounds daily',
    fromOtherCamp: false,
    progress: createInitialProgress(),
  },
  {
    id: '3',
    firstName: 'Sam',
    lastName: 'Wilson',
    phone: '7654321098',
    photoUrl: 'https://placehold.co/100x100.png',
    age: 32,
    stayingWith: 'Family',
    occupation: 'Project Manager',
    rentDetails: 'N/A',
    nativePlace: 'Sydney, Australia',
    sgRating: 'B+',
    contactSource: 'Event',
    chantingStatus: '4 rounds daily',
    fromOtherCamp: true,
    progress: createInitialProgress(),
  },
  {
    id: '4',
    firstName: 'Emily',
    lastName: 'Brown',
    phone: '6543210987',
    photoUrl: 'https://placehold.co/100x100.png',
    age: 21,
    stayingWith: 'PG / Hostel',
    occupation: 'Student',
    rentDetails: '4500/month',
    nativePlace: 'Toronto, Canada',
    sgRating: 'B',
    contactSource: 'Friend',
    chantingStatus: 'Trying to start',
    fromOtherCamp: false,
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
