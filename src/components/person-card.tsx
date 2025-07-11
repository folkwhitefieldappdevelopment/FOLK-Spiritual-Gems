
"use client";

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { User, Briefcase, Tag } from "lucide-react";
import type { Person, Group, ProgressCategory as TProgressCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
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

const getCategoryStatus = (category: TProgressCategory): 'completed' | 'in-progress' | 'not-started' => {
  if (!category || !Array.isArray(category.items)) {
    return 'not-started';
  }

  let totalGoals = 0;
  let completedGoals = 0;
  let hasAnyProgress = false;

  category.items.forEach(item => {
    const goalValue = (item.levels?.[0] || "").trim(); // L1 Goal
    const achievedValue = (item.answers?.l1 || "").trim();

    if (goalValue && goalValue !== '-') {
      totalGoals++;

      if (achievedValue && achievedValue !== '-') {
        hasAnyProgress = true;
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
        } else { // Any other text goal counts if something is entered
            completedGoals++;
        }
      }
    }
  });

  if (totalGoals === 0) return 'not-started';
  if (completedGoals === totalGoals) return 'completed';
  if (completedGoals > 0 || hasAnyProgress) return 'in-progress';
  
  return 'not-started';
}


const PersonCardComponent = ({ person, isSelected, onSelectionChange, groups, isSelectionActive }: PersonCardProps) => {
  const router = useRouter();

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

  const progressStatuses = React.useMemo(() => {
    if (!person.progress || !Array.isArray(person.progress)) return [];
    return person.progress.map(category => ({
        name: category.name,
        status: getCategoryStatus(category)
    }));
  }, [person.progress]);

  const statusColorMap = {
    'completed': 'bg-green-500',
    'in-progress': 'bg-orange-500',
    'not-started': 'bg-gray-400'
  };
  
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
            <div className="flex flex-col items-center mb-2 w-full">
                <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage
                        src={person.photoUrl}
                        alt={fullName}
                        data-ai-hint="person portrait"
                    />
                    <AvatarFallback>
                        {fallback}
                    </AvatarFallback>
                </Avatar>
                <StarRating value={person.sgRating || 0} size={16} />
            </div>
            
             <CardHeader className="p-0 pt-2">
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
                 {groups.length > 0 && (
                    <div className="flex items-start text-sm text-muted-foreground">
                        <Tag className="mr-2 h-4 w-4 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                            {groups.map(g => (
                                <span key={g.id} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{g.name}</span>
                            ))}
                        </div>
                    </div>
                )}
                
                {person.progress && (
                    <>
                        <Separator className="my-4" />
                        <div className="space-y-2">
                           <h4 className="font-semibold text-sm text-foreground">Progress Overview</h4>
                           <div className="space-y-1.5 text-sm text-muted-foreground">
                               {progressStatuses.map(p => (
                                   <div key={p.name} className="flex items-center gap-2">
                                       <div className={cn("h-2.5 w-2.5 rounded-full", statusColorMap[p.status])} />
                                       <span>{p.name}</span>
                                   </div>
                               ))}
                           </div>
                        </div>
                    </>
                )}
            </CardContent>
          </div>
      </Card>
  );
}

export const PersonCard = React.memo(PersonCardComponent);
