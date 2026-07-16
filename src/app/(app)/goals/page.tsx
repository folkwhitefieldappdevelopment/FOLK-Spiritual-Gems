'use client';

import * as React from 'react';
import { 
  Target, 
  Plus, 
  Loader2, 
  Trophy, 
  Clock, 
  Activity, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppToast } from '@/contexts/toast-context';
import { getGoals, deleteGoal, updateGoalProgress, createGoal, updateGoal } from '@/services/goals-service';
import { getAssignableUsersForAssignments } from '@/services/user-service';
import { getGoalCategories } from '@/services/settings-service';
import type { Goal, GoalStatus, AppUser } from '@/lib/types';
import { computeGoalStatus } from '@/lib/data';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GoalsMatrix } from '@/components/goals/goals-matrix';
import { GoalsMobileList } from '@/components/goals/goals-mobile-list';
import { CreateGoalDialog } from '@/components/goals/create-goal-dialog';
import { EditGoalDialog } from '@/components/goals/edit-goal-dialog';
import { UpdateGoalProgressDialog } from '@/components/goals/update-goal-progress-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export default function GoalsPage() {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [enablers, setEnablers] = React.useState<AppUser[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  
  const [selectedGoal, setSelectedGoal] = React.useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = React.useState<Goal | null>(null);

  const isPrivileged = React.useMemo(() => {
    return appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');
  }, [appUser]);

  const fetchData = React.useCallback(async (silent = false) => {
    if (!appUser) return;
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const [goalsData, enablersData, categoriesData] = await Promise.all([
        getGoals(appUser),
        getAssignableUsersForAssignments(appUser),
        getGoalCategories()
      ]);
      setGoals(goalsData);
      setEnablers(enablersData);
      setCategories(categoriesData);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: "Sync Failed" });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [appUser, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateProgress = (goal: Goal) => {
    const canEdit = appUser?.id === goal.enablerId || isPrivileged;
    if (!canEdit) {
        toast({ variant: 'destructive', title: 'Restricted', description: 'You can only update your own goals.' });
        return;
    }
    setSelectedGoal(goal);
    setIsUpdateDialogOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsEditDialogOpen(true);
  };

  const handleDeletePrompt = (goal: Goal) => {
    setGoalToDelete(goal);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveProgress = async (achievedCount: number, remark?: string) => {
    if (!selectedGoal || !appUser) return;
    try {
        await updateGoalProgress(selectedGoal.id, { achievedCount, remark }, appUser);
        toast({ title: 'Progress Updated' });
        fetchData(true);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Update Failed' });
    }
  };

  const handleSaveGoalEdit = async (goalId: string, data: any) => {
    if (!appUser) return;
    try {
        await updateGoal(goalId, data, appUser);
        toast({ title: 'Goal Updated' });
        fetchData(true);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Update Failed' });
    }
  };

  const handleCreateGoal = async (data: any) => {
    if (!appUser) return;
    try {
        await createGoal(data, appUser);
        toast({ title: 'Goal Created' });
        fetchData(true);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Creation Failed' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!goalToDelete || !appUser) return;
    try {
        await deleteGoal(goalToDelete.id, appUser);
        toast({ title: 'Goal Removed' });
        fetchData(true);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Delete Failed' });
    } finally {
        setGoalToDelete(null);
        setIsDeleteDialogOpen(false);
    }
  };

  const stats = React.useMemo(() => {
    const statuses = goals.map(g => computeGoalStatus(g));
    
    return {
        total: goals.length,
        achieved: statuses.filter(s => s === 'achieved').length,
        overdue: statuses.filter(s => s === 'overdue').length,
        inProgress: statuses.filter(s => s === 'in-progress').length,
    };
  }, [goals]);

  if (isLoading && goals.length === 0) {
      return (
          <div className="flex h-[80vh] w-full items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
          </div>
      );
  }

  return (
    <>
      <PageHeader 
        title="Goals & Targets" 
        description="Monitor outreach milestones and mission progress."
      >
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={isRefreshing} className="h-9 font-bold px-3 rounded-xl border-border bg-muted/50 text-foreground">
                <RefreshCw className={cn("h-4 w-4 sm:mr-2", isRefreshing && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
            </Button>
            {isPrivileged && (
                <Button size="sm" onClick={() => setIsCreateDialogOpen(true)} className="h-9 font-black uppercase tracking-widest text-[10px] rounded-xl px-4">
                    <Plus className="mr-2 h-4 w-4" /> Add Goal
                </Button>
            )}
        </div>
      </PageHeader>

      <main className="flex-1 p-4 sm:p-6 sm:pt-0 space-y-8 pb-32">
        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <SummaryCard title="Total Goals" value={stats.total} icon={Target} color="bg-primary" />
            <SummaryCard title="Achieved" value={stats.achieved} icon={Trophy} color="bg-green-500" />
            <SummaryCard title="In Progress" value={stats.inProgress} icon={Activity} color="bg-orange-500" />
            <SummaryCard title="Overdue" value={stats.overdue} icon={AlertCircle} color="bg-destructive" />
        </div>

        {/* Desktop Matrix View */}
        <div className="hidden md:block">
            <GoalsMatrix 
              goals={goals} 
              enablers={enablers}
              categories={categories}
              onUpdateProgress={handleUpdateProgress}
              onEditGoal={handleEditGoal}
              onDeleteGoal={handleDeletePrompt}
              isPrivileged={isPrivileged}
            />
        </div>

        {/* Mobile List View */}
        <div className="md:hidden">
            <GoalsMobileList 
              goals={goals} 
              onUpdateProgress={handleUpdateProgress}
              onEditGoal={handleEditGoal}
              onDeleteGoal={handleDeletePrompt}
              isPrivileged={isPrivileged}
              currentUserId={appUser?.id}
            />
        </div>
      </main>

      <CreateGoalDialog 
        isOpen={isCreateDialogOpen} 
        setIsOpen={setIsCreateDialogOpen} 
        enablers={enablers}
        onSave={handleCreateGoal}
      />

      <EditGoalDialog 
        isOpen={isEditDialogOpen} 
        setIsOpen={setIsEditDialogOpen} 
        goal={selectedGoal}
        enablers={enablers}
        onSave={handleSaveGoalEdit}
      />

      <UpdateGoalProgressDialog 
        isOpen={isUpdateDialogOpen} 
        setIsOpen={setIsUpdateDialogOpen} 
        goal={selectedGoal}
        onSave={handleSaveProgress}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-popover border-none rounded-[2.5rem] shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black uppercase tracking-tight">Delete Goal Target?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-bold">
                Are you sure you want to remove <span className="text-primary">"{goalToDelete?.title}"</span> for {goalToDelete?.enablerName}? This will permanently remove the record from all dashboards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black uppercase tracking-widest">Delete Goal</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SummaryCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
    return (
        <Card className="bg-popover border-none shadow-xl rounded-2xl overflow-hidden group">
            <CardContent className="p-6 relative">
                <div className={cn("absolute left-0 top-4 bottom-4 w-1 rounded-r-full", color)} />
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{title}</p>
                        <h3 className="text-3xl font-black text-foreground">{value}</h3>
                    </div>
                    <Icon className="h-6 w-6 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" />
                </div>
            </CardContent>
        </Card>
    );
}
