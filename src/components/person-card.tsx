"use client";

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { User, Briefcase, Tag, MapPin, BadgeCheck } from "lucide-react";
import type { Person, Group, ProgressCategory as TProgressCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { StarRating } from './star-rating';
import { Badge } from './ui/badge';
import { FolkStageDisplay } from './editable-person-details-form';
import { TierBadge } from './tier-badge';
import type { FollowUpTier } from '@/services/follow-up-service';


type PersonCardProps = {
  person: Person;
  isSelected: boolean;
  onSelectionChange: (personId: string, checked: boolean) => void;
  groups: Group[];
  isSelectionActive: boolean;
  navigationContext?: { groupId?: string; scope?: string };
  tier?: FollowUpTier;
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


const PersonCardComponent = ({ person, isSelected, onSelectionChange, groups = [], isSelectionActive, navigationContext, tier }: PersonCardProps) => {
  const router = useRouter();

  const personGroups = React.useMemo(() => {
    return groups.filter(g => g.peopleIds?.includes(person.id));
  }, [groups, person.id]);

  const fullName = person.fullName || '';
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  const navigationQuery = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set('id', person.id);
    if (navigationContext?.groupId) params.set('groupId', navigationContext.groupId);
    if (navigationContext?.scope) params.set('scope', navigationContext.scope);
    return `?${params.toString()}`;
  }, [navigationContext, person.id]);

  const handleClick = React.useCallback(() => {
    if (isSelectionActive) {
      onSelectionChange(person.id, !isSelected);
    } else {
      router.push(`/contacts/profile${navigationQuery}`);
    }
  }, [isSelectionActive, onSelectionChange, person.id, isSelected, router, navigationQuery]);

  const handleCheckChange = React.useCallback((checked: boolean) => {
    onSelectionChange(person.id, checked);
  }, [onSelectionChange, person.id]);

  const progressStatuses = React.useMemo(() => {
    if (!person.progress || !Array.isArray(person.progress)) return [];
    return person.progress.slice(0, 5).map(category => ({
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
        className={cn(
          "flex flex-col h-full relative group/card transition-all hover:shadow-md cursor-pointer rounded-lg bg-card border-primary/5",
          isSelected && "ring-2 ring-primary border-primary"
        )}
      >
        <div 
            className="absolute top-3 right-3 z-10" 
            onClick={(e) => e.stopPropagation()}
        >
             <Checkbox
               checked={isSelected}
               onCheckedChange={handleCheckChange}
               className="h-5 w-5 bg-background shadow-sm"
             />
        </div>
        
        <div className="flex flex-col h-full items-center text-center p-4 pt-8">
            <div className="flex flex-col items-center mb-2 w-full">
                <div className="relative mb-2">
                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24 shadow-md border-2 border-primary/10">
                        <AvatarImage
                            src={person.photoUrl}
                            alt={fullName}
                            className="object-cover"
                        />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                </div>
                 <StarRating value={person.sgRating || 0} size={16} />
            </div>
            
             <CardHeader className="p-0 pt-2 w-full">
                <div className="flex flex-col items-center gap-1.5 px-2">
                    <div className="flex items-center gap-1.5 justify-center">
                        <CardTitle className={cn("text-base sm:text-lg line-clamp-1", !isSelectionActive && "group-hover:underline")}>{fullName}</CardTitle>
                        {person.verifiedByFg === 'Yes' && <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />}
                    </div>
                    {tier && <TierBadge tier={tier} />}
                </div>
                <div className="mt-2 flex justify-center">
                    <FolkStageDisplay stage={person.currentFolkStage} />
                </div>
            </CardHeader>

            <CardContent className="flex-grow space-y-3 pt-4 px-0 pb-0 w-full text-left">
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <User className="mr-2 h-3.5 w-3.5 text-primary/60 shrink-0" />
                    <span className="truncate">{person.age} years • {person.relationshipStatus || 'Single'}</span>
                  </div>
                  {person.location && (
                      <div className="flex items-center text-xs text-muted-foreground">
                          <MapPin className="mr-2 h-3.5 w-3.5 text-primary/60 shrink-0" />
                          <span className="truncate">{person.location}</span>
                      </div>
                  )}
                </div>

                {progressStatuses.length > 0 && (
                    <div className="pt-2">
                        <Separator className="mb-3 opacity-50" />
                        <div className="space-y-1.5">
                           <h4 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">SG Status</h4>
                           <div className="grid grid-cols-1 gap-1">
                               {progressStatuses.map(p => (
                                   <div key={p.name} className="flex items-center justify-between text-[10px] font-medium">
                                       <span className="truncate text-muted-foreground max-w-[80%]">{p.name}</span>
                                       <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusColorMap[p.status])} />
                                   </div>
                               ))}
                           </div>
                        </div>
                    </div>
                )}
            </CardContent>
          </div>
      </Card>
  );
}

export const PersonCard = React.memo(PersonCardComponent, (prev, next) => {
    return (
        prev.isSelected === next.isSelected &&
        prev.person.id === next.person.id &&
        prev.isSelectionActive === next.isSelectionActive &&
        prev.tier === next.tier
    );
});
