
'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { checklistData } from '@/lib/data';
import type { ProgressCategoryAnswers, ProgressLevelAnswers } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const getCellClass = (
  currentValue: string,
  goalValue: string,
  categoryName: string
) => {
  if (categoryName === 'Chanting') {
    const rounds = parseInt(currentValue, 10);
    if (isNaN(rounds) || currentValue.trim() === '' || currentValue.trim() === '-') {
      return 'bg-gray-200/50 dark:bg-gray-800/50';
    }
    if (rounds >= 16) return 'bg-green-100 dark:bg-green-900/50';
    if (rounds >= 12) return 'bg-yellow-100 dark:bg-yellow-800/50';
    if (rounds >= 8) return 'bg-orange-100 dark:bg-orange-800/50';
    return 'bg-red-100 dark:bg-red-900/50';
  }

  const goalIsYesNo = goalValue.toLowerCase() === 'yes';

  if (currentValue.toLowerCase() === 'yes') {
    return 'bg-green-100 dark:bg-green-900/50';
  }
  if (currentValue.toLowerCase() === 'no') {
    return 'bg-red-100 dark:bg-red-900/50';
  }
  if (!currentValue || currentValue.trim() === '-') {
    return 'bg-gray-200/50 dark:bg-gray-800/50';
  }
  // if it's not a yes/no goal, and has a number, make it blue
  if (!goalIsYesNo && /\d/.test(currentValue)) {
    return 'bg-blue-100 dark:bg-blue-900/50';
  }

  return 'bg-gray-100 dark:bg-gray-800/50';
};

type ProgressTrackerProps = {
  progress: ProgressCategoryAnswers[];
  onProgressChange: (
    catIndex: number,
    itemIndex: number,
    levelIndex: number,
    value: string
  ) => void;
};

export function ProgressTracker({
  progress,
  onProgressChange,
}: ProgressTrackerProps) {
  if (!progress || progress.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progress Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading progress data...</p>
        </CardContent>
      </Card>
    );
  }
  
  const renderCellContent = (
    catIndex: number,
    itemIndex: number,
    levelIndex: number
  ) => {
    const category = checklistData[catIndex];
    const item = category.items[itemIndex];
    const goalValue = item.levels[levelIndex];
    const levelKey = `l${levelIndex + 1}` as keyof ProgressLevelAnswers;
    const currentValue = progress?.[catIndex]?.answers?.[itemIndex]?.[levelKey] || '';

    if (category.category === 'Chanting') {
      const options = Array.from({ length: 17 }, (_, i) => String(i));
      return (
        <Select
          value={currentValue}
          onValueChange={(value) =>
            onProgressChange(catIndex, itemIndex, levelIndex, value === '-' ? '' : value)
          }
        >
          <SelectTrigger className="w-full h-auto p-1 text-xs bg-transparent border-none focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-">-</SelectItem>
            {options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    if (goalValue.toLowerCase() === 'yes' || category.category === 'Expedition') {
      return (
        <Select
          value={currentValue}
          onValueChange={(value) =>
            onProgressChange(catIndex, itemIndex, levelIndex, value === '-' ? '' : value)
          }
        >
          <SelectTrigger className="w-full h-auto p-1 text-xs bg-transparent border-none focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Yes">Yes</SelectItem>
            <SelectItem value="No">No</SelectItem>
            <SelectItem value="-">-</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        type="text"
        value={currentValue}
        placeholder={goalValue || '-'}
        onChange={(e) =>
          onProgressChange(catIndex, itemIndex, levelIndex, e.target.value)
        }
        className="w-full h-auto p-1 text-xs text-center bg-transparent border-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
      />
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Progress Checklist</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto rounded-lg border p-0">
        <table className="relative w-full caption-bottom text-sm border-collapse">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead rowSpan={2} className="w-[300px] font-bold text-foreground align-bottom">
                Category
              </TableHead>
              <TableHead colSpan={2} className="text-center font-bold text-foreground border-l">
                L-1
                <p className="font-normal text-xs text-muted-foreground">
                  4 months
                </p>
              </TableHead>
              <TableHead colSpan={2} className="text-center font-bold text-foreground border-l">
                L-2
                <p className="font-normal text-xs text-muted-foreground">
                  4 months
                </p>
              </TableHead>
              <TableHead colSpan={2} className="text-center font-bold text-foreground border-l">
                L-3
                <p className="font-normal text-xs text-muted-foreground">
                  4 months
                </p>
              </TableHead>
            </TableRow>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-center text-xs font-semibold border-l">Goal</TableHead>
              <TableHead className="text-center text-xs font-semibold">Achieved</TableHead>
              <TableHead className="text-center text-xs font-semibold border-l">Goal</TableHead>
              <TableHead className="text-center text-xs font-semibold">Achieved</TableHead>
              <TableHead className="text-center text-xs font-semibold border-l">Goal</TableHead>
              <TableHead className="text-center text-xs font-semibold">Achieved</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checklistData.map((category, catIndex) => (
              <React.Fragment key={category.category}>
                <TableRow className="bg-secondary/50">
                  <TableCell colSpan={7} className="font-bold text-primary">
                    {category.category}
                  </TableCell>
                </TableRow>
                {category.items.map((item, itemIndex) => (
                  <TableRow key={item.question}>
                    <TableCell className="font-medium text-sm text-muted-foreground align-top">
                      {item.link ? (
                        <Link
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-blue-600 hover:text-blue-800"
                        >
                          {item.question}
                        </Link>
                      ) : (
                        item.question
                      )}
                    </TableCell>
                    {item.levels.map((goal, levelIndex) => (
                      <React.Fragment key={levelIndex}>
                         <TableCell className="text-center text-xs p-1 border-l bg-muted/20 align-top">
                           {goal || '-'}
                         </TableCell>
                         <TableCell
                          className={cn(
                            'text-center text-sm align-top p-0',
                            getCellClass(
                               progress?.[catIndex]?.answers?.[itemIndex]?.[`l${levelIndex + 1}` as keyof ProgressLevelAnswers] || '',
                               goal,
                               category.category
                            )
                          )}
                        >
                          {renderCellContent(catIndex, itemIndex, levelIndex)}
                        </TableCell>
                      </React.Fragment>
                    ))}
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </table>
      </CardContent>
    </Card>
  );
}
