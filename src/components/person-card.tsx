
"use client";

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { User, Briefcase, Tags, Zap } from "lucide-react";
import type { Person, Group } from "@/lib/types";
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
import { Progress } from './ui/progress';

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
  
  const progressPercentage = React.useMemo(() => {
    if (!person.progress || person.progress.length === 0) return 0;

    let totalGoals = 0;
    let completedGoals = 0;

    person.progress.forEach(category => {
      category.items.forEach(item => {
        const goalValue = (item.levels?.[0] || "").trim(); // L1 Goal
        const achievedValue = (item.answers?.l1 || "").trim();

        if (goalValue && goalValue !== '-') {
          totalGoals++;
          
          if (achievedValue && achievedValue !== '-') {
            const goalNumber = parseNumber(goalValue);
            if (goalNumber !== null) { // Numeric goal
              const achievedNumber = parseNumber(achievedValue);
              if (achievedNumber !== null && achievedNumber >= goalNumber) {
                completedGoals++;
              }
            } else if (goalValue.toLowerCase() === 'yes') { // Yes/No goal
              if (achievedValue.toLowerCase() === 'yes') {
                completedGoals++;
              }
            } else { // Text goal
                completedGoals++;
            }
          }
        }
      });
    });

    return totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
  }, [person.progress]);


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
        
        <div className="flex flex-col h-full items-center text-center p-4 pt-8">
            <div className="flex flex-col items-center mb-4 pb-4">
              <Avatar className="h-24 w-24 mb-2">
                  <AvatarImage
                      src={person.photoUrl}
                      alt={fullName}
                      data-ai-hint="person portrait"
                  />
                  <AvatarFallback>
                      {fallback}
                  </AvatarFallback>
              </Avatar>
              <StarRating value={Number(person.sgRating) || 0} />
            </div>
            
             <CardHeader className="p-0">
                <CardTitle className={cn("text-lg", !isSelectionActive && "group-hover:underline")}>{fullName}</CardTitle>
                <CardDescription className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <span>{person.phone}</span>
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-grow space-y-3 pt-4 px-0 pb-0 w-full text-left">
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="mr-2 h-4 w-4" />
                  <span className="truncate">{person.age} years old</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                    <Briefcase className="mr-2 h-4 w-4" />
                    <span className="truncate">{occupationDisplay || 'N/A'}</span>
                </div>

                {person.progress && (
                  <div className="flex items-start text-sm text-muted-foreground pt-1">
                    <Zap className="mr-2 h-4 w-4 mt-0.5 shrink-0" />
                    <div className="w-full">
                      <div className="flex justify-between items-center mb-1">
                          <span>L1 Progress</span>
                          <span className="font-semibold">{progressPercentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                  </div>
                )}
                
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
            </CardContent>
          </div>
      </Card>
  );
}

export const PersonCard = React.memo(PersonCardComponent);
