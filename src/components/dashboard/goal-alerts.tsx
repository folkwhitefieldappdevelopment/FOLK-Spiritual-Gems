'use client';

import * as React from 'react';
import { getGoals } from '@/services/goals-service';
import { computeGoalStatus } from '@/lib/data';
import { useAuth } from '@/contexts/auth-context';
import type { Goal } from '@/lib/types';
import { Trophy, AlertTriangle, ChevronRight, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export function GoalAlerts() {
  const { appUser } = useAuth();
  const [alerts, setAlerts] = React.useState<Goal[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!appUser) return;
    const fetchAlerts = async () => {
      try {
        const goals = await getGoals(appUser);
        const filtered = goals.filter(g => {
          const status = computeGoalStatus(g);
          return status === 'achieved' || status === 'overdue';
        });
        setAlerts(filtered);
      } catch (e) {
        console.error("Failed to fetch goal alerts", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAlerts();
  }, [appUser]);

  if (isLoading || alerts.length === 0 || !appUser) return null;

  const isOnlyEnabler = appUser.role.includes('Folk Enabler') && !appUser.role.includes('Folk Guide') && !appUser.role.includes('Admin');

  return (
    <div className={cn(
      "space-y-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-700",
      isOnlyEnabler && "bg-primary/5 p-6 rounded-[2.5rem] border-2 border-dashed border-primary/20 shadow-inner"
    )}>
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
            {isOnlyEnabler ? (
                <>
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Your Personal Targets</span>
                </>
            ) : (
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Mission Critical Updates</span>
            )}
        </div>
        {isOnlyEnabler && (
            <Badge variant="outline" className="bg-background border-primary/20 text-primary font-black text-[9px] uppercase tracking-widest px-3 h-6">
                Action Required
            </Badge>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide flex-nowrap">
        {alerts.map(goal => {
          const status = computeGoalStatus(goal);
          const isAchieved = status === 'achieved';
          
          return (
            <Link key={goal.id} href="/goals" className="shrink-0">
                <div className={cn(
                  "group flex items-center justify-between p-3 rounded-2xl border-l-4 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm bg-card min-w-[320px] max-w-[320px] h-full",
                  isAchieved 
                    ? "border-l-green-500 hover:bg-green-500/5" 
                    : "border-l-red-500 hover:bg-red-500/5"
                )}>
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                        isAchieved ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                    )}>
                      {isAchieved ? <Trophy className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">
                        <span className={cn(
                          "font-black uppercase tracking-tight mr-2 block text-[10px]",
                          isAchieved ? "text-green-700 dark:text-green-500" : "text-red-700 dark:text-red-500"
                        )}>
                          {isAchieved ? 'Target Achieved' : 'Deadline Missed'}
                        </span>
                        <span className="text-foreground block truncate">"{goal.title}"</span>
                        <span className="text-muted-foreground font-medium block truncate text-[9px] mt-0.5">{goal.enablerName} {isAchieved ? 'reached goal' : 'missed deadline'}</span>
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
                </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
