import type { ProgressCategory, Goal, GoalStatus } from './types';
import { safeDate } from '@/utils/date';

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
      { question: 'Guru issue related', levels: ['SP Office Quote', 'Struggle for Truth', 'Final Order'] },
    ],
  },
  {
    category: 'Book Reading',
    items: [
        { question: 'Reading (mins per day)', levels: ['30 mins', '45 mins', '60 mins'] },
        { question: 'Perfect Questions and Perfect Answers', levels: ['Yes', 'Yes', 'Yes'] },
        { question: 'Beyond Birth and Death', levels: ['Yes', 'Yes', 'Yes'] },
        { question: 'Hare Krishna Challenge', levels: ['Yes', 'Yes', 'Yes'] },
        { question: 'Laws of Nature', levels: ['Yes', 'Yes', 'Yes'] },
        { question: 'Civilization and Transcendence', levels: ['Yes', 'Yes', 'Yes'] },
        { question: 'Life comes from Life', levels: ['Yes', 'Yes', 'Yes'] },
        { question: 'Second Chance', levels: ['Yes', 'Yes', 'Yes'] },
        { question: "Teaching's of Prahlada Maharaj", levels: ['Yes', 'Yes', 'Yes'] },
        { question: 'Nectar of Instructions', levels: ['Yes', 'Yes', 'Yes'] },
        { question: 'On the way to Krishna', levels: ['Yes', 'Yes', 'Yes'] },
        { question: 'SSR', levels: ['Yes', 'Yes', 'Yes'] },
        { question: 'Bhagavad Gita', levels: ['Yes', 'Yes', 'Yes'] },
        { question: 'Journey of Self Discovery', levels: ['Yes', 'Yes', 'Yes'] },
        { question: 'Prabhupada Messenger of the Supreme Lord', levels: ['Yes', 'Yes', 'Yes'] },
        { question: 'Krishna Book', levels: ['Yes', 'Yes', 'Yes'] },
        { question: 'Guru Issue', levels: ['Yes', 'Yes', 'Yes'], link: 'https://drive.google.com/drive/folders/1RpPVuzGPUXA5xAdi4nvD9-mlVM4k_Bdl?usp=share_link' },
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


export const createInitialProgress = (): ProgressCategory[] => {
  return checklistData.map((category) => ({
    name: category.category as any,
    items: category.items.map(item => ({
      question: item.question,
      levels: item.levels as [string, string, string],
      link: item.link || "",
      answers: { l1: '', l2: '', l3: '', l1_remark: '', l2_remark: '', l3_remark: '' }
    }))
  }));
};

/**
 * Computes the real-time status of a goal based on progress and deadline.
 */
export const computeGoalStatus = (goal: Goal): GoalStatus => {
  if (goal.achievedCount >= goal.targetCount) return 'achieved';
  
  const deadline = safeDate(goal.deadlineDate);
  if (deadline && deadline < new Date()) return 'overdue';
  
  if (goal.achievedCount > 0) return 'in-progress';
  
  return 'not-started';
};
