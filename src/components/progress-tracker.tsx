
'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { checklistData } from '@/lib/data';
import type { ProgressCategoryAnswers } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Table,
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

const getCellClass = (currentValue: string, goalValue: string) => {
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
    const goalValue = checklistData[catIndex].items[itemIndex].levels[levelIndex];
    const currentValue = progress[catIndex].answers[itemIndex][levelIndex];

    if (goalValue.toLowerCase() === 'yes') {
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
              {checklistData.map((category, catIndex) => (
                <React.Fragment key={category.category}>
                  <TableRow className="bg-secondary/50">
                    <TableCell colSpan={4} className="font-bold text-primary">
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
                        <TableCell
                          key={levelIndex}
                          className={cn(
                            'text-center text-sm align-top p-0',
                            getCellClass(
                              progress[catIndex].answers[itemIndex][levelIndex],
                              goal
                            )
                          )}
                        >
                          {renderCellContent(catIndex, itemIndex, levelIndex)}
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
