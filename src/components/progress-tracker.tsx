
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

const parseNumber = (str: string): number | null => {
  if (!str) return null;
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

const getCellClass = (
  currentValue: string,
  goalValue: string,
) => {
  const value = (currentValue || "").trim();

  // 1. Explicitly check for empty or placeholder values first.
  if (value === "" || value === "-") {
    return 'bg-gray-200/50 dark:bg-gray-800/50';
  }

  const goalNumber = parseNumber(goalValue);
  const currentNumber = parseNumber(value);

  // 2. Handle numeric goals (like Chanting)
  if (goalNumber !== null && goalNumber > 0) {
    if (currentNumber === null) {
      // Value is not a number, but it's not empty. Mark as invalid/red.
      return 'bg-red-100 dark:bg-red-900/50';
    }
    const ratio = currentNumber / goalNumber;
    if (ratio >= 1) return 'bg-green-100 dark:bg-green-900/50';
    if (ratio >= 0.75) return 'bg-yellow-100 dark:bg-yellow-800/50';
    if (ratio >= 0.5) return 'bg-orange-100 dark:bg-orange-800/50';
    return 'bg-red-100 dark:bg-red-900/50'; // For ratios < 0.5, including 0.
  }

  // 3. Handle "Yes/No" goals
  if (goalValue.toLowerCase() === 'yes') {
    if (value.toLowerCase() === 'yes') {
      return 'bg-green-100 dark:bg-green-900/50';
    }
    if (value.toLowerCase() === 'no') {
      return 'bg-red-100 dark:bg-red-900/50';
    }
     // If it's a Yes/No goal but has other text, treat as invalid/red
    return 'bg-red-100 dark:bg-red-900/50';
  }

  // 4. Handle other text-based goals that have been filled.
  // If the goal is not numeric, any text counts as progress.
  if (goalValue && !goalNumber) {
    if (value) {
      return 'bg-blue-100 dark:bg-blue-900/50';
    }
  }

  // 5. Fallback for any other case should be neutral gray.
  return 'bg-gray-200/50 dark:bg-gray-800/50';
};


type ProgressTrackerProps = {
  progress: ProgressCategoryAnswers[];
  onProgressChange: (
    catIndex: number,
    itemIndex: number,
    levelIndex: number,
    value: string,
    field: 'achieved' | 'remark'
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
    
    const goalNumber = parseNumber(goalValue);

    if (goalNumber !== null) {
      const options = Array.from({ length: goalNumber + 1 }, (_, i) => String(i));
      return (
        <Select
          value={currentValue}
          onValueChange={(value) =>
            onProgressChange(catIndex, itemIndex, levelIndex, value === '-' ? '' : value, 'achieved')
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
            onProgressChange(catIndex, itemIndex, levelIndex, value === '-' ? '' : value, 'achieved')
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
          onProgressChange(catIndex, itemIndex, levelIndex, e.target.value, 'achieved')
        }
        className="w-full h-full p-1 text-xs text-center bg-transparent border-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
      />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Checklist</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative h-[550px] w-full overflow-auto border">
            <table className="w-full caption-bottom text-sm border-collapse">
            <TableHeader className="sticky top-0 z-30 bg-muted">
                <TableRow>
                <TableHead rowSpan={2} className="w-[300px] font-bold text-foreground align-bottom sticky left-0 z-40 bg-muted py-2 pr-2 pl-9 border-b border-r">
                    Category
                </TableHead>
                <TableHead colSpan={3} className="text-center font-bold text-foreground border-l border-b p-2">
                    L-1
                    <p className="font-normal text-xs text-muted-foreground">
                    4 months
                    </p>
                </TableHead>
                <TableHead colSpan={3} className="text-center font-bold text-foreground border-l border-b p-2">
                    L-2
                    <p className="font-normal text-xs text-muted-foreground">
                    4 months
                    </p>
                </TableHead>
                <TableHead colSpan={3} className="text-center font-bold text-foreground border-l border-b p-2">
                    L-3
                    <p className="font-normal text-xs text-muted-foreground">
                    4 months
                    </p>
                </TableHead>
                </TableRow>
                <TableRow>
                <TableHead className="text-center text-xs font-semibold border-l border-b p-1">Goal</TableHead>
                <TableHead className="text-center text-xs font-semibold border-b p-1">Achieved</TableHead>
                <TableHead className="text-center text-xs font-semibold border-b p-1">Remarks</TableHead>

                <TableHead className="text-center text-xs font-semibold border-l border-b p-1">Goal</TableHead>
                <TableHead className="text-center text-xs font-semibold border-b p-1">Achieved</TableHead>
                <TableHead className="text-center text-xs font-semibold border-b p-1">Remarks</TableHead>
                
                <TableHead className="text-center text-xs font-semibold border-l border-b p-1">Goal</TableHead>
                <TableHead className="text-center text-xs font-semibold border-b p-1">Achieved</TableHead>
                <TableHead className="text-center text-xs font-semibold border-b p-1">Remarks</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {checklistData.map((category, catIndex) => (
                <React.Fragment key={category.category}>
                    <TableRow className="bg-secondary">
                    <TableCell colSpan={10} className="font-bold text-primary sticky left-0 z-20 bg-secondary py-2 pr-2 pl-9 border-b border-r">
                        {category.category}
                    </TableCell>
                    </TableRow>
                    {category.items.map((item, itemIndex) => (
                    <TableRow key={item.question}>
                        <TableCell className="font-medium text-sm text-muted-foreground align-top sticky left-0 z-20 bg-card py-2 pr-2 pl-9 border-b border-r">
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
                        {item.levels.map((goal, levelIndex) => {
                        const remarkKey = `l${levelIndex + 1}_remark` as keyof ProgressLevelAnswers;
                        const currentRemark = progress?.[catIndex]?.answers?.[itemIndex]?.[remarkKey] || '';
                        
                        return (
                            <React.Fragment key={levelIndex}>
                            <TableCell className="text-center text-xs p-1 border-l bg-muted/20 align-top border-b">
                                {goal || '-'}
                            </TableCell>
                            <TableCell
                                className={cn(
                                'text-center text-sm align-top p-0 border-b',
                                getCellClass(
                                    progress?.[catIndex]?.answers?.[itemIndex]?.[`l${levelIndex + 1}` as keyof ProgressLevelAnswers] || '',
                                    goal
                                )
                                )}
                            >
                                {renderCellContent(catIndex, itemIndex, levelIndex)}
                            </TableCell>
                            <TableCell className="text-center text-sm align-top p-0 border-b">
                                <Input
                                    type="text"
                                    value={currentRemark}
                                    placeholder="-"
                                    onChange={(e) =>
                                    onProgressChange(catIndex, itemIndex, levelIndex, e.target.value, 'remark')
                                    }
                                    className="w-full h-full p-1 text-xs text-center bg-transparent border-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
                                />
                            </TableCell>
                            </React.Fragment>
                        )
                        })}
                    </TableRow>
                    ))}
                </React.Fragment>
                ))}
            </TableBody>
            </table>
        </div>
      </CardContent>
    </Card>
  );
}
    