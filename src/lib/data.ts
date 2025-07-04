
import type { ProgressCategoryAnswers } from './types';

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
        levels: ['4', '4', '4'],
      },
      {
        question: 'Weekly program goal met?',
        levels: ['Yes', 'Yes', 'Yes'],
      },
      { question: 'Guru issue related', levels: ['Yes', 'Yes', 'Yes'] },
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
      { question: 'BG', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'SSR', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'JSD - Journey of Self Discovery', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'Krishna Book', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'Krishna Sharanam', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'SB 7.6 Prahlad Maharaj Instructions', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'SB 5.5.1 Rishabhadev Instructions', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'SB 7.2.1 Yamraj in guise of small boy instructions', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'SB 8.22: Bali Maharaj surrender', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'SB 5.14: Material Enjoyment is like Forest Fire', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'SB 3.28 & 29: Kapila Maharaj instructions', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'SB 6.5: Narada cursed by Prajapati Daksha', levels: ['Yes', 'Yes', 'Yes'] },
      { question: 'SB 9.18: King Yayati attains Liberation', levels: ['Yes', 'Yes', 'Yes'] },
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
    items: [
      { question: 'Long Trip', levels: ['1', '1', '1'] },
      { question: 'Short Trip', levels: ['1', '1', '1'] },
      { question: '1 Day Trip', levels: ['2', '2', '2'] },
    ],
  },
];


export const createInitialProgress = (): ProgressCategoryAnswers[] => {
  return checklistData.map((category) => ({
    name: category.category as any,
    answers: category.items.map(() => ({ l1: '', l2: '', l3: '' })),
  }));
};
