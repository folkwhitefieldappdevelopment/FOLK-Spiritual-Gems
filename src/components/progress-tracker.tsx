
'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

const checklistData = [
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

const getCellClass = (value: string) => {
  if (!value || value.trim() === '-') return 'bg-gray-200/50 dark:bg-gray-800/50';
  if (value.toLowerCase() === 'yes')
    return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 font-medium';
  if (/\d/.test(value)) return 'bg-blue-100 dark:bg-blue-900/50';
  return 'bg-gray-100 dark:bg-gray-800/50';
};

export function ProgressTracker() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Checklist</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[350px] font-bold text-foreground">
                  Category
                </TableHead>
                <TableHead className="text-center font-bold text-foreground">
                  L-1
                  <p className="font-normal text-xs text-muted-foreground">
                    4 months
                  </p>
                </TableHead>
                <TableHead className="text-center font-bold text-foreground">
                  L-2
                  <p className="font-normal text-xs text-muted-foreground">
                    4 months
                  </p>
                </TableHead>
                <TableHead className="text-center font-bold text-foreground">
                  L-3
                  <p className="font-normal text-xs text-muted-foreground">
                    4 months
                  </p>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checklistData.map((category) => (
                <React.Fragment key={category.category}>
                  <TableRow className="bg-secondary/50">
                    <TableCell
                      colSpan={4}
                      className="font-bold text-primary"
                    >
                      {category.category}
                    </TableCell>
                  </TableRow>
                  {category.items.map((item) => (
                    <TableRow key={item.question}>
                      <TableCell className="font-medium text-sm text-muted-foreground align-top">
                        {item.link ? (
                           <Link href={item.link} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">
                             {item.question}
                           </Link>
                        ) : (
                            item.question
                        )}
                      </TableCell>
                      {item.levels.map((level, index) => (
                        <TableCell
                          key={index}
                          className={cn('text-center text-sm align-top', getCellClass(level))}
                        >
                          {level || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
