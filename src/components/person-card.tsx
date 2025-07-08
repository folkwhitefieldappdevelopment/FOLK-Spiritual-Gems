
"use client";

import Link from 'next/link';
import * as React from 'react';
import { User, Briefcase } from "lucide-react";
import type { Person, ProgressCategoryAnswers, ProgressLevelAnswers } from "@/lib/types";
import { cn } from "@/lib/utils";
import { checklistData } from '@/lib/data';
import { useAdmin } from '@/contexts/admin-context';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from './ui/checkbox';

type PersonCardProps = {
  person: Person;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
};

const calculateScore = (categoryProgress: ProgressCategoryAnswers): number => {
  const categoryInfo = checklistData.find(c => c.category === categoryProgress.name);
  if (!categoryInfo || !categoryProgress.answers) return -Infinity; // Special value for no data

  const parseNumber = (str: string): number | null => {
    if (!str) return null;
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  };

  // Special handling for Chanting. Score from 0 to 100.
  if (categoryInfo.category === 'Chanting') {
    const chantingItemIndex = categoryInfo.items.findIndex(item => item.question.includes('Chanting'));
    if (chantingItemIndex !== -1) {
      const answerObj = categoryProgress.answers?.[chantingItemIndex];
       if (answerObj) {
          const rounds = Math.max(0, ...Object.values(answerObj).map(a => parseNumber(a) || 0));
          return (rounds / 16) * 100;
        }
    }
  }

  let totalGoals = 0;
  let score = 0;
  let hasAnyInput = false;

  categoryInfo.items.forEach((item, itemIndex) => {
    item.levels.forEach((goal, levelIndex) => {
      const goalStr = (goal || "").trim();
      if (goalStr && goalStr !== '-') {
        totalGoals++;
        
        const answerObj = categoryProgress.answers?.[itemIndex];
        const levelKey = `l${levelIndex + 1}` as keyof ProgressLevelAnswers;
        const answer = answerObj ? answerObj[levelKey] || '' : '';
        const normAnswer = answer.trim().toLowerCase();
        const normGoal = goalStr.toLowerCase();

        if (normAnswer && normAnswer !== '-') {
          hasAnyInput = true;
        }

        if (normGoal === 'yes') {
          if (normAnswer === 'yes') {
            score++;
          } else if (normAnswer === 'no') {
            score--; // Negative score for 'No'
          }
        } else {
          const goalNum = parseNumber(normGoal);
          const answerNum = parseNumber(normAnswer);

          if (goalNum !== null && answerNum !== null) {
            score += Math.min(1, answerNum / goalNum);
          } else if (normAnswer && normAnswer !== '-') {
            score++;
          }
        }
      }
    });
  });

  if (!hasAnyInput) return -Infinity;
  if (totalGoals === 0) return -Infinity;
  
  return (score / totalGoals) * 100;
};

const getProgressColor = (score: number): string => {
    if (score === -Infinity) return 'bg-gray-400';
    if (score >= 75) return 'bg-green-500';
    if (score >= 25) return 'bg-yellow-400';
    if (score > -25) return 'bg-orange-400';
    return 'bg-red-500';
};

export function PersonCard({ person, selectedIds, setSelectedIds }: PersonCardProps) {
  const { isAdmin } = useAdmin();
  const isSelected = selectedIds.has(person.id);

  let occupationDisplay = person.occupation;
  if ((person.occupation === 'Working' || person.occupation === 'Student') && person.organisation) {
    occupationDisplay = `${person.occupation} at ${person.organisation}`;
  }

  const fullName = person.fullName || '';
  const nameParts = fullName.split(' ');
  const fallback = (
    `${nameParts[0]?.charAt(0) || ''}${nameParts.length > 1 ? nameParts[nameParts.length - 1]?.charAt(0) || '' : ''}`
  ).toUpperCase();

  const handleSelectionChange = (checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(person.id);
      } else {
        newSet.delete(person.id);
      }
      return newSet;
    });
  };

  return (
      <Card className={cn("flex flex-col h-full relative group/card", isSelected && "ring-2 ring-primary border-primary")}>
        <div 
          className="absolute top-3 right-3 z-10"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => handleSelectionChange(!!checked)}
            aria-label={`Select ${fullName}`}
            className="h-5 w-5"
          />
        </div>
        <Link href={`/contacts/${person.id}`} className="block transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg h-full">
          <div className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-center gap-4 p-4">
                <Avatar className="h-16 w-16">
                <AvatarImage
                    src={person.photoUrl}
                    alt={fullName}
                    data-ai-hint="person portrait"
                />
                <AvatarFallback>
                    {fallback}
                </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <CardTitle className="text-lg">{fullName}</CardTitle>
                    <CardDescription>{person.sgRating ? `Rating: ${person.sgRating}/10` : 'No rating'}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3 pt-0 p-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="mr-2 h-4 w-4" />
                  <span className="truncate">{person.age} years old</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                    <Briefcase className="mr-2 h-4 w-4" />
                    <span className="truncate">{occupationDisplay || 'N/A'}</span>
                </div>
                {isAdmin && person.progress && person.progress.length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-2">
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                    Progress Overview
                    </h4>
                    <div className="space-y-1.5">
                        {person.progress.map((category) => {
                            const score = calculateScore(category);
                            const progressColor = getProgressColor(score);
                            const hasProgress = score > -Infinity;
                            
                            return (
                            <div key={category.name} className="flex items-center text-sm">
                                <span
                                className={cn(
                                    "h-2.5 w-2.5 rounded-full mr-2 shrink-0",
                                    progressColor
                                )}
                                />
                                <span
                                className={cn(
                                    "truncate",
                                    hasProgress
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                )}
                                >
                                {category.name}
                                </span>
                            </div>
                            );
                        })}
                    </div>
                </div>
                )}
            </CardContent>
          </div>
        </Link>
      </Card>
  );
}
