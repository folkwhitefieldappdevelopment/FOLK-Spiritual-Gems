
"use client";

import Link from 'next/link';
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

type PersonCardProps = {
  person: Person;
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

export function PersonCard({ person }: PersonCardProps) {
  const { isAdmin } = useAdmin();

  return (
    <Link href={`/contacts/${person.id}`} className="block transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg">
        <Card className="flex flex-col h-full">
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
            <Avatar className="h-16 w-16">
            <AvatarImage
                src={person.photoUrl}
                alt={`${person.firstName} ${person.lastName}`}
                data-ai-hint="person portrait"
            />
            <AvatarFallback>
                {person.firstName.charAt(0)}
                {person.lastName.charAt(0)}
            </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-xl">
                  {person.firstName} {person.lastName}
              </CardTitle>
              <CardDescription>{person.sgRating || 'No rating'}</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="flex-grow space-y-3">
            <div className="flex items-center text-sm text-muted-foreground">
              <User className="mr-2 h-4 w-4" />
              <span className="truncate">{person.age} years old</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
                <Briefcase className="mr-2 h-4 w-4" />
                <span className="truncate">{person.occupation || 'N/A'}</span>
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
        </Card>
    </Link>
  );
}
