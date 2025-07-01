
"use client";

import Link from 'next/link';
import { User, Briefcase } from "lucide-react";
import type { Person, ProgressCategoryAnswers } from "@/lib/types";
import { cn } from "@/lib/utils";
import { checklistData } from '@/lib/data';
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

const calculateCategoryProgress = (categoryProgress: ProgressCategoryAnswers): number => {
    const categoryInfo = checklistData.find(c => c.category === categoryProgress.name);
    if (!categoryInfo || !categoryProgress.answers) return 0;

    let totalGoals = 0;
    let achievedGoals = 0;

    const parseNumber = (str: string): number | null => {
        if (!str) return null;
        const match = str.match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
    }
    
    const isAchieved = (answer: string, goal: string): boolean => {
        const normAnswer = (answer || "").trim().toLowerCase();
        const normGoal = (goal || "").trim().toLowerCase();

        if (!normAnswer) return false;
        if (normGoal === 'yes') return normAnswer === 'yes';
        
        const goalNum = parseNumber(normGoal);
        const answerNum = parseNumber(normAnswer);

        if (goalNum !== null && answerNum !== null) {
            return answerNum >= goalNum;
        }

        if (normGoal !== 'yes' && goalNum === null) {
            return true;
        }

        return false;
    };

    categoryInfo.items.forEach((item, itemIndex) => {
        item.levels.forEach((goal, levelIndex) => {
            if (goal && goal.trim() !== '-') {
                totalGoals++;
                const answer = categoryProgress.answers[itemIndex]?.[levelIndex] || '';
                if (isAchieved(answer, goal)) {
                    achievedGoals++;
                }
            }
        });
    });

    if (totalGoals === 0) return 0;
    return (achievedGoals / totalGoals) * 100;
};

const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-400';
    if (percentage > 0) return 'bg-orange-400';
    return 'bg-red-500';
};

export function PersonCard({ person }: PersonCardProps) {
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
            {person.progress && person.progress.length > 0 && (
            <div className="mt-4 pt-4 border-t space-y-2">
                <h4 className="text-sm font-semibold text-foreground mb-2">
                Progress Overview
                </h4>
                <div className="space-y-1.5">
                    {person.progress.map((category) => {
                        const progressPercentage = calculateCategoryProgress(category);
                        const progressColor = getProgressColor(progressPercentage);
                        const hasProgress = progressPercentage > 0;
                        
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
