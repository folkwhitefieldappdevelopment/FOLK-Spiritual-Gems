'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Pencil, Trash2, Trophy } from 'lucide-react';
import type { Goal, AppUser } from '@/lib/types';
import { computeGoalStatus } from '@/lib/data';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { safeDate } from '@/utils/date';

type GoalsMatrixProps = {
  goals: Goal[];
  enablers: AppUser[];
  categories: string[];
  onUpdateProgress: (goal: Goal) => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goal: Goal) => void;
  isPrivileged: boolean;
};

export function GoalsMatrix({ goals, enablers, categories, onUpdateProgress, onEditGoal, onDeleteGoal, isPrivileged }: GoalsMatrixProps) {
  const rosterNames = enablers.map(e => e.name);
  const goalEnablerNames = goals.map(g => g.enablerName);
  const enablerNames = Array.from(new Set([...rosterNames, ...goalEnablerNames])).sort();
  
  const columnsByCat = categories.map(cat => ({
      name: cat,
      titles: Array.from(new Set(goals.filter(g => g.category === cat).map(g => g.title))).sort()
  }));

  if (goals.length === 0) {
      return (
          <div className="py-24 text-center bg-muted/20 border-2 border-dashed rounded-[3rem] space-y-2">
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No Goals Assigned</p>
              {enablerNames.length > 0 && (
                <p className="text-muted-foreground/60 text-[11px] font-semibold">Assign a goal to get started with this roster.</p>
              )}
          </div>
      );
  }

  return (
    <div className="bg-card border border-border rounded-[2.5rem] shadow-2xl">
      <div className="w-full overflow-x-auto scrollbar-hide">
        <div className="min-w-max">
            <Table className="border-separate border-spacing-0">
                <TableHeader className="sticky top-0 z-30">
                    <TableRow className="hover:bg-transparent border-none h-16">
                        <TableHead className="w-[240px] sticky top-0 left-0 z-40 bg-muted border-r border-b border-border font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground pl-8">
                            Enabler List
                        </TableHead>
                        {columnsByCat.map(cat => (
                            cat.titles.length > 0 && (
                                <TableHead 
                                    key={cat.name} 
                                    colSpan={cat.titles.length}
                                    className="text-center font-black text-[11px] uppercase tracking-[0.3em] text-primary border-r border-b border-border bg-muted/95 backdrop-blur"
                                >
                                    {cat.name}
                                </TableHead>
                            )
                        ))}
                    </TableRow>
                    
                    <TableRow className="hover:bg-transparent h-20">
                        <TableHead className="w-[240px] sticky left-0 z-30 bg-muted/95 backdrop-blur border-r border-b border-border pl-8"></TableHead>
                        {columnsByCat.map(cat => (
                            cat.titles.map(title => (
                                <TableHead key={`${cat.name}-${title}`} className="px-6 min-w-[180px] border-r border-b border-border/50 text-center bg-muted/90 backdrop-blur">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="font-black text-[10px] uppercase tracking-tight text-foreground leading-tight">{title}</span>
                                        <div className="h-0.5 w-8 bg-primary/20 rounded-full" />
                                    </div>
                                </TableHead>
                            ))
                        ))}
                    </TableRow>

                    <TableRow className="hover:bg-transparent bg-muted/30 h-14">
                      <TableHead className="sticky left-0 z-30 bg-muted/95 backdrop-blur border-r border-b-2 border-border pl-8 font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                        Total
                      </TableHead>
                      {columnsByCat.map(cat => (
                        cat.titles.map(title => {
                          const columnGoals = goals.filter(g => g.category === cat.name && g.title === title);
                          const totalAchieved = columnGoals.reduce((sum, g) => sum + (g.achievedCount || 0), 0);
                          const totalTarget = columnGoals.reduce((sum, g) => sum + (g.targetCount || 0), 0);
                          return (
                            <TableCell key={`total-${cat.name}-${title}`} className="text-center border-r border-b-2 border-border/50 bg-muted/80 backdrop-blur font-black text-sm">
                              {totalAchieved} / {totalTarget}
                            </TableCell>
                          );
                        })
                      ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {enablerNames.map(enablerName => (
                        <TableRow key={enablerName} className="hover:bg-muted/30 border-b border-border transition-colors">
                            <TableCell className="w-[240px] sticky left-0 z-10 bg-background font-black text-xs uppercase text-foreground/80 pl-8 border-r border-border py-6">
                                {enablerName}
                            </TableCell>
                            {columnsByCat.map(cat => (
                                cat.titles.map(title => {
                                    const goal = goals.find(g => g.enablerName === enablerName && g.title === title && g.category === cat.name);
                                    
                                    if (!goal) return (
                                        <TableCell key={`${enablerName}-${cat.name}-${title}`} className="text-center opacity-10 border-r border-border/30">—</TableCell>
                                    );

                                    const status = computeGoalStatus(goal);
                                    const deadline = safeDate(goal.deadlineDate);

                                    return (
                                        <TableCell 
                                            key={goal.id} 
                                            className="p-1 border-r border-border/30 cursor-pointer group relative"
                                            onClick={() => onUpdateProgress(goal)}
                                        >
                                            {isPrivileged && (
                                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                <Button 
                                                  variant="secondary" 
                                                  size="icon" 
                                                  className="h-6 w-6 rounded-md shadow-sm"
                                                  onClick={(e) => { e.stopPropagation(); onEditGoal(goal); }}
                                                >
                                                  <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button 
                                                  variant="destructive" 
                                                  size="icon" 
                                                  className="h-6 w-6 rounded-md shadow-sm"
                                                  onClick={(e) => { e.stopPropagation(); onDeleteGoal(goal); }}
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            )}

                                            <div className={cn(
                                                "flex h-full min-h-[90px] relative overflow-hidden transition-all hover:bg-muted/50 p-4",
                                                status === 'at-risk' && "bg-amber-500/5",
                                                status === 'overdue' && "bg-destructive/10 ring-1 ring-destructive/40",
                                                status === 'achieved' && "bg-green-500/10 ring-1 ring-green-500/30"
                                            )}>
                                                <div className={cn(
                                                    "absolute left-0 top-0 bottom-0 w-1",
                                                    status === 'achieved' ? 'bg-green-500' : 
                                                    status === 'at-risk' ? 'bg-amber-500 animate-pulse' :
                                                    status === 'in-progress' ? 'bg-orange-500' : 
                                                    status === 'overdue' ? 'bg-destructive' : 'bg-muted-foreground/30'
                                                )} />
                                                
                                                <div className="flex flex-col justify-between w-full space-y-2">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg font-black text-foreground tracking-tighter leading-none">
                                                                {goal.achievedCount} / {goal.targetCount}
                                                            </span>
                                                            {status === 'at-risk' && (
                                                                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                                            )}
                                                            {status === 'overdue' && (
                                                                <div className="h-2 w-2 rounded-full bg-destructive animate-[pulse_1s_ease-in-out_infinite] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                                            )}
                                                            {status === 'achieved' && (
                                                                <Trophy className="h-4 w-4 text-green-600" />
                                                            )}
                                                        </div>
                                                        <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest opacity-60">
                                                            {goal.targetUnit || 'SOULS'}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="space-y-1">
                                                        <p className={cn(
                                                            "text-[9px] font-bold uppercase truncate",
                                                            status === 'at-risk' && "text-amber-600 dark:text-amber-400",
                                                            status === 'overdue' && "text-destructive",
                                                            status === 'achieved' && "text-green-600",
                                                            (!['at-risk', 'overdue', 'achieved'].includes(status)) && "text-muted-foreground"
                                                        )}>
                                                            {goal.deadlineLabel || (deadline ? format(deadline, 'dd MMM') : 'No Deadline')}
                                                        </p>
                                                        {goal.remark && (
                                                            <p className="text-[8px] italic text-muted-foreground line-clamp-1 group-hover:line-clamp-none">
                                                                "{goal.remark}"
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                    );
                                })
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      </div>
    </div>
  );
}