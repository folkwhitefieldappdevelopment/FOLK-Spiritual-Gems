'use client';

import * as React from 'react';
import { format } from 'date-fns';
import type { Goal } from '@/lib/types';
import { computeGoalStatus } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { safeDate } from '@/utils/date';
import { User, Clock, ArrowRight } from 'lucide-react';

type GoalsMobileListProps = {
  goals: Goal[];
  onUpdateProgress: (goal: Goal) => void;
  currentUserId?: string;
};

export function GoalsMobileList({ goals, onUpdateProgress, currentUserId }: GoalsMobileListProps) {
  // Group goals by enabler
  const grouped = React.useMemo(() => {
    const map = new Map<string, Goal[]>();
    goals.forEach(g => {
        if (!map.has(g.enablerName)) map.set(g.enablerName, []);
        map.get(g.enablerName)!.push(g);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [goals]);

  if (goals.length === 0) {
    return (
        <div className="py-20 text-center bg-muted/20 border-2 border-dashed rounded-3xl mx-4">
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">No goals assigned</p>
        </div>
    );
  }

  return (
    <div className="space-y-10 px-1">
      {grouped.map(([enablerName, enablerGoals]) => {
        const isMe = enablerGoals.some(g => g.enablerId === currentUserId);
        
        return (
            <div key={enablerName} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3 w-3 text-primary" />
                        </div>
                        <h3 className="font-black text-sm uppercase tracking-tight text-foreground">
                            {enablerName} {isMe && <span className="text-primary ml-1">(Me)</span>}
                        </h3>
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black opacity-40 uppercase">
                        {enablerGoals.length} Targets
                    </Badge>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {enablerGoals.map(goal => {
                        const status = computeGoalStatus(goal);
                        const deadline = safeDate(goal.deadlineDate);

                        return (
                            <Card 
                                key={goal.id} 
                                className="bg-popover border-none shadow-lg rounded-2xl overflow-hidden active:scale-[0.98] transition-all cursor-pointer"
                                onClick={() => onUpdateProgress(goal)}
                            >
                                <CardContent className="p-5 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={cn(
                                            "h-10 w-1 bg-muted-foreground/20 rounded-full shrink-0",
                                            status === 'achieved' ? 'bg-green-500' : 
                                            status === 'in-progress' ? 'bg-orange-500' : 
                                            status === 'overdue' ? 'bg-destructive' : ''
                                        )} />
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60 leading-none mb-1">
                                                {goal.category} • {goal.title}
                                            </p>
                                            <h4 className="text-lg font-black text-foreground uppercase tracking-tight leading-none truncate">
                                                {goal.achievedCount} / {goal.targetCount}
                                            </h4>
                                            <div className="flex items-center gap-1.5 mt-2 text-[9px] font-bold text-muted-foreground uppercase">
                                                <Clock className="h-2.5 w-2.5" />
                                                {goal.deadlineLabel || (deadline ? format(deadline, 'dd MMM yyyy') : 'No Deadline')}
                                            </div>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        );
      })}
    </div>
  );
}
