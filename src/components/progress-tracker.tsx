
'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ProgressCategory, ProgressLevelAnswers } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Button } from './ui/button';
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react';
import { createInitialProgress } from '@/lib/data';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  if (value === "" || value === "-") {
    return 'bg-muted/30';
  }

  const goalNumber = parseNumber(goalValue);
  const currentNumber = parseNumber(value);

  if (goalNumber !== null && goalNumber > 0) {
    if (currentNumber === null) {
      return 'bg-red-100 dark:bg-red-900/30';
    }
    const ratio = currentNumber / goalNumber;
    if (ratio >= 1) return 'bg-green-100 dark:bg-green-900/30';
    if (ratio >= 0.75) return 'bg-yellow-100 dark:bg-yellow-800/30';
    if (ratio >= 0.5) return 'bg-orange-100 dark:bg-orange-800/30';
    return 'bg-red-100 dark:bg-red-900/30';
  }

  if (goalValue.toLowerCase() === 'yes') {
    if (value.toLowerCase() === 'yes') return 'bg-green-100 dark:bg-green-900/30';
    if (value.toLowerCase() === 'no') return 'bg-red-100 dark:bg-red-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  }

  if (goalValue && !goalNumber) {
    if (value) return 'bg-blue-100 dark:bg-blue-900/30';
  }

  return 'bg-muted/30';
};


type ProgressTrackerProps = {
  progress?: ProgressCategory[];
  onProgressChange: (
    catIndex: number,
    itemIndex: number,
    levelIndex: number,
    value: string,
    field: 'achieved' | 'remark' | 'goal'
  ) => void;
  isEditable: boolean;
  isHidden?: boolean;
};

export function ProgressTracker({
  progress,
  onProgressChange,
  isEditable,
  isHidden = false,
}: ProgressTrackerProps) {
  const [currentLevel, setCurrentLevel] = React.useState(1);
  const displayProgress = progress && progress.length > 0 ? progress : createInitialProgress();

  if (isHidden) {
    return (
      <Card className="bg-muted/10 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="bg-background p-3 rounded-full shadow-sm">
                <Lock className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <div className="space-y-1">
                <h3 className="font-bold text-lg">Progress Table Restricted</h3>
                <p className="text-sm text-muted-foreground max-w-xs">Detailed spiritual progress tracking is only available to registered Folk Guides and Enablers.</p>
            </div>
        </CardContent>
      </Card>
    );
  }

  if (!displayProgress || displayProgress.length === 0) {
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
  
  const renderAchievedCellContent = (
    catIndex: number,
    itemIndex: number,
    levelIndex: number
  ) => {
    const category = displayProgress[catIndex];
    const item = category.items[itemIndex];
    const goalValue = item.levels[levelIndex];
    const levelKey = `l${levelIndex + 1}` as keyof ProgressLevelAnswers;
    const currentValue = item.answers?.[levelKey] || '';
    
    const goalNumber = parseNumber(goalValue);

    if (goalNumber !== null) {
      const options = Array.from({ length: goalNumber + 1 }, (_, i) => String(i));
      return (
        <Select
          value={currentValue || '-'}
          onValueChange={(value) =>
            onProgressChange(catIndex, itemIndex, levelIndex, value === '-' ? '' : value, 'achieved')
          }
        >
          <SelectTrigger className="w-full h-8 text-[10px] sm:text-xs bg-transparent border-none focus:ring-0 focus:ring-offset-0 px-1">
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-">-</SelectItem>
            {options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    if (goalValue.toLowerCase() === 'yes' || category.name === 'Expedition' || item.question === 'Guru issue related') {
      return (
        <Select
          value={currentValue || '-'}
          onValueChange={(value) =>
            onProgressChange(catIndex, itemIndex, levelIndex, value === '-' ? '' : value, 'achieved')
          }
        >
          <SelectTrigger className="w-full h-8 text-[10px] sm:text-xs bg-transparent border-none focus:ring-0 focus:ring-offset-0 px-1">
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
        className="w-full h-8 text-[10px] sm:text-xs text-center bg-transparent border-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 px-1"
      />
    );
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden border-none sm:border shadow-none sm:shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between flex-shrink-0 px-4 sm:px-6">
        <CardTitle className="text-base sm:text-xl">Progress Checklist</CardTitle>
        <div className="flex items-center gap-2 sm:gap-4">
            <Button 
                variant="outline" 
                size="icon" 
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={() => setCurrentLevel(l => Math.max(1, l - 1))}
                disabled={currentLevel === 1}
            >
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <div className="text-center font-bold text-sm sm:text-lg w-16 sm:w-24">
                Level {currentLevel}
            </div>
            <Button 
                variant="outline" 
                size="icon" 
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={() => setCurrentLevel(l => Math.min(3, l + 1))}
                disabled={currentLevel === 3}
            >
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="grid grid-cols-4 bg-muted border-y text-[9px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider flex-shrink-0">
            <div className="p-2 sm:p-3 pl-4 border-r truncate">Category</div>
            <div className="p-2 sm:p-3 text-center border-r truncate">Goal</div>
            <div className="p-2 sm:p-3 text-center border-r truncate">Done</div>
            <div className="p-2 sm:p-3 text-center truncate">Note</div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <Accordion type="multiple" defaultValue={[]} className="w-full">
                {displayProgress.map((category, catIndex) => (
                    <AccordionItem key={category.name} value={category.name} className="border-b last:border-b-0">
                        <AccordionTrigger className="hover:no-underline bg-secondary/10 px-4 py-2 text-[11px] sm:text-sm">
                            <span className="font-bold text-primary">{category.name}</span>
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                            {category.items.map((item, itemIndex) => {
                                const levelIndex = currentLevel - 1;
                                const goal = item.levels[levelIndex];
                                const levelKey = `l${levelIndex + 1}` as keyof ProgressLevelAnswers;
                                const remarkKey = `l${levelIndex + 1}_remark` as keyof ProgressLevelAnswers;
                                const currentValue = item.answers?.[levelKey] || '';
                                const currentRemark = item.answers?.[remarkKey] || '';
                                
                                return (
                                    <div key={item.question} className="grid grid-cols-4 border-b last:border-b-0 hover:bg-muted/5 transition-colors">
                                        <div className="p-2 sm:p-3 pl-4 border-r text-[10px] sm:text-xs font-medium text-muted-foreground leading-tight flex items-center min-w-0">
                                            {item.link ? (
                                                <Link
                                                    href={item.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="underline text-blue-600 hover:text-blue-800 break-words"
                                                >
                                                    {item.question}
                                                </Link>
                                            ) : (
                                                <span className="break-words">{item.question}</span>
                                            )}
                                        </div>
                                        <div className="p-2 sm:p-3 border-r bg-muted/5 flex items-center justify-center text-[10px] sm:text-xs text-center">
                                            {isEditable ? (
                                                <Input
                                                    type="text"
                                                    value={goal}
                                                    placeholder="-"
                                                    onChange={(e) => onProgressChange(catIndex, itemIndex, levelIndex, e.target.value, 'goal')}
                                                    className="w-full h-7 sm:h-8 text-[10px] sm:text-xs text-center bg-transparent border-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 px-1"
                                                />
                                                ) : (
                                                <span className="font-medium truncate">{goal || '-'}</span>
                                            )}
                                        </div>
                                        <div className={cn(
                                            'p-0 border-r flex items-center justify-center',
                                            getCellClass(currentValue, goal)
                                        )}>
                                            {renderAchievedCellContent(catIndex, itemIndex, levelIndex)}
                                        </div>
                                        <div className="p-0 flex items-center">
                                            <Input
                                                type="text"
                                                value={currentRemark}
                                                placeholder="-"
                                                onChange={(e) =>
                                                    onProgressChange(catIndex, itemIndex, levelIndex, e.target.value, 'remark')
                                                }
                                                className="w-full h-7 sm:h-8 text-[10px] sm:text-xs text-center bg-transparent border-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 px-1"
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}
