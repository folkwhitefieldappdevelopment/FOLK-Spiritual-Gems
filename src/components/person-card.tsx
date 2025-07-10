
"use client";

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { User, Briefcase, Tags } from "lucide-react";
import type { Person, ProgressCategory, ProgressLevelAnswers, Group } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/auth-context';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { StarRating } from './star-rating';

type PersonCardProps = {
  person: Person;
  isSelected: boolean;
  onSelectionChange: (personId: string, checked: boolean) => void;
  groups: Group[];
  isSelectionActive: boolean;
};

const parseNumber = (str: string): number | null => {
  if (!str) return null;
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

const calculateScore = (categoryProgress: ProgressCategory): number => {
  if (!categoryProgress || !categoryProgress.items) return -Infinity;

  const parseNumber = (str: string): number | null => {
    if (!str) return null;
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  };

  // Special handling for Chanting. Score from 0 to 100.
  if (categoryProgress.name === 'Chanting') {
    const chantingItem = categoryProgress.items.find(item => item.question.includes('Chanting'));
    if (chantingItem) {
        const answerObj = chantingItem.answers;
        if (answerObj) {
            const rounds = Math.max(0, ...Object.values(answerObj).map(a => parseNumber(a) || 0));
            return (rounds / 16) * 100;
        }
    }
  }

  let totalGoals = 0;
  let score = 0;
  let hasAnyInput = false;

  categoryProgress.items.forEach((item) => {
    item.levels.forEach((goal, levelIndex) => {
      const goalStr = (goal || "").trim();
      if (goalStr && goalStr !== '-') {
        totalGoals++;
        
        const answerObj = item.answers;
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

const PersonCardComponent = ({ person, isSelected, onSelectionChange, groups, isSelectionActive }: PersonCardProps) => {
  const { appUser } = useAuth();
  const router = useRouter();

  const isAdmin = appUser?.role.includes('Admin');

  let occupationDisplay = person.occupation;
  if ((person.occupation === 'Working' || person.occupation === 'Student') && person.organisation) {
    occupationDisplay = `${person.occupation} at ${person.organisation}`;
  }

  const fullName = person.fullName || '';
  const nameParts = fullName.split(' ');
  const fallback = (
    `${nameParts[0]?.charAt(0) || ''}${nameParts.length > 1 ? nameParts[nameParts.length - 1]?.charAt(0) || '' : ''}`
  ).toUpperCase();
  
  const handleClick = React.useCallback(() => {
    if (isSelectionActive) {
      onSelectionChange(person.id, !isSelected);
    } else {
      router.push(`/contacts/${person.id}`);
    }
  }, [isSelectionActive, onSelectionChange, person.id, isSelected, router]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
    }
  }, [handleClick]);


  return (
      <Card
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`View or select ${fullName}`}
        className={cn(
          "flex flex-col h-full relative group/card transition-all hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg",
          isSelected && "ring-2 ring-primary border-primary"
        )}
      >
        <div 
            className="absolute top-3 right-3 z-10" 
            onClick={(e) => {
                // This stops the click on the checkbox area from triggering the card's main onClick handler.
                e.stopPropagation();
            }}
        >
             <Checkbox
               checked={isSelected}
               onCheckedChange={(checked) =>
                 onSelectionChange(person.id, !!checked)
               }
               aria-label={`Select ${fullName}`}
               className="h-5 w-5"
             />
        </div>
        
        <div className="flex flex-col h-full">
             <div className="relative w-full flex justify-center pt-8 pb-4">
                <div className="relative h-20 w-20">
                    <Avatar className="h-20 w-20">
                        <AvatarImage
                            src={person.photoUrl}
                            alt={fullName}
                            data-ai-hint="person portrait"
                        />
                        <AvatarFallback>
                            {fallback}
                        </AvatarFallback>
                    </Avatar>
                    <StarRating value={person.sgRating || 0} avatarSizeClass='h-20 w-20' />
                </div>
            </div>
            <CardHeader className="text-center p-4 pt-0">
                <CardTitle className={cn("text-lg", !isSelectionActive && "group-hover:underline")}>{fullName}</CardTitle>
                <CardDescription className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <span>{person.phone}</span>
                </CardDescription>
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
                
                {groups.length > 0 && (
                    <div className="flex items-start text-sm text-muted-foreground">
                        <Tags className="mr-2 h-4 w-4 mt-0.5 shrink-0" />
                        <div className="flex flex-wrap gap-1">
                            {groups.map(group => (
                                <Badge key={group.id} variant="secondary" className="font-normal">{group.name}</Badge>
                            ))}
                        </div>
                    </div>
                )}
                
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
      </Card>
  );
}

export const PersonCard = React.memo(PersonCardComponent);
