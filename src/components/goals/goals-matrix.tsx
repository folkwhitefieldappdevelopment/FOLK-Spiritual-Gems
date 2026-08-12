// @ts-nocheck
'use client';

import * as React from 'react';
import { Pencil, Trash2, Trophy, Users, Sigma, MoreVertical, EyeOff, AlertTriangle, Loader2, GripVertical } from 'lucide-react';
import type { Goal, AppUser } from '@/lib/types';
import { getTeamGoalsSummary, deleteGoalColumn } from '@/services/goals-service';
import { hideGoalColumn, saveGoalColumnOrder } from '@/services/settings-service';
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
import { format } from 'date-fns';
import { computeGoalStatus } from '@/lib/data';
import { useAuth } from '@/contexts/auth-context';
import { useAppToast } from '@/contexts/toast-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type GoalsMatrixProps = {
  goals: Goal[];
  enablers: AppUser[];
  categories: string[];
  hiddenColumns: string[];
  columnOrder: string[];
  onUpdateProgress: (goal: Goal) => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goal: Goal) => void;
  onColumnsChanged: () => void;
  isPrivileged: boolean;
};

interface SortableHeaderProps {
  id: string;
  isPrivileged: boolean;
  onHide: (id: string) => void;
  onDelete: (id: string) => void;
}

function SortableHeader({ id, isPrivileged, onHide, onDelete }: SortableHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : undefined,
  };

  return (
    <TableHead 
        ref={setNodeRef} 
        style={style} 
        className={cn(
            "px-6 min-w-[180px] sticky top-[64px] z-30 border-r border-b border-border/50 text-center bg-muted/90 backdrop-blur group",
            isDragging && "opacity-50"
        )}
    >
        <div className="flex flex-col items-center gap-1 relative">
            <div className="flex items-center gap-2">
                {isPrivileged && (
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing opacity-30 hover:opacity-100 transition-opacity">
                        <GripVertical className="h-3 w-3" />
                    </div>
                )}
                <span className="font-black text-[10px] uppercase tracking-tight text-foreground leading-tight">{id}</span>
            </div>
            <div className="h-0.5 w-8 bg-primary/20 rounded-full" />
            
            {isPrivileged && (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 absolute -right-6 -top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-3 w-3" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
                      <DropdownMenuItem onSelect={() => onHide(id)} className="p-3 font-bold cursor-pointer">
                          <EyeOff className="mr-2 h-4 w-4" /> Hide Column
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onDelete(id)} className="p-3 font-black text-destructive focus:text-destructive cursor-pointer">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Column
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
            )}
        </div>
    </TableHead>
  );
}

export function GoalsMatrix({ 
  goals, 
  enablers, 
  categories, 
  hiddenColumns,
  columnOrder,
  onUpdateProgress, 
  onEditGoal, 
  onDeleteGoal, 
  onColumnsChanged,
  isPrivileged 
}: GoalsMatrixProps) {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  const [columnToDelete, setColumnToDelete] = React.useState<string | null>(null);
  const [isDeletingColumn, setIsDeletingColumn] = React.useState(false);

  const summary = React.useMemo(() => {
    return getTeamGoalsSummary(goals, enablers, categories, hiddenColumns, columnOrder);
  }, [goals, enablers, categories, hiddenColumns, columnOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleHideColumn = async (title: string) => {
    if (!appUser) return;
    try {
        await hideGoalColumn(title, appUser);
        toast({ title: 'Column Hidden', description: 'Restore it from Manage Columns menu.' });
        onColumnsChanged();
    } catch (e) {
        toast({ variant: 'destructive', title: 'Action Failed' });
    }
  };

  const handleConfirmDeleteColumn = async () => {
    if (!columnToDelete || !appUser) return;
    setIsDeletingColumn(true);
    try {
        const count = await deleteGoalColumn(columnToDelete, appUser);
        toast({ title: 'Column Deleted', description: `Successfully removed ${count} goal records.` });
        setColumnToDelete(null);
        onColumnsChanged();
    } catch (e) {
        toast({ variant: 'destructive', title: 'Deletion Failed' });
    } finally {
        setIsDeletingColumn(false);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = summary.columns.indexOf(active.id);
      const newIndex = summary.columns.indexOf(over.id);
      const newOrder = arrayMove(summary.columns, oldIndex, newIndex);
      
      if (appUser) {
          await saveGoalColumnOrder(newOrder, appUser);
          onColumnsChanged();
      }
    }
  };

  if (goals.length === 0) {
      return (
          <div className="py-24 text-center bg-muted/20 border-2 border-dashed rounded-[3rem] space-y-2">
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No Goals Assigned</p>
          </div>
      );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-[2.5rem] shadow-2xl">
        <div className="w-full overflow-x-auto overflow-y-visible scrollbar-hide">
          <div className="min-w-max">
              <Table className="border-separate border-spacing-0">
                  <TableHeader>
                      {/* Row 1: Categories */}
                      <TableRow className="hover:bg-transparent border-none h-16">
                          <TableHead className="w-[240px] sticky top-0 left-0 z-[60] bg-muted border-r border-b border-border font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground pl-8">
                              Outreach Roster
                          </TableHead>
                          {categories.map(cat => {
                              const titlesInRange = summary.columns.filter(col => 
                                  goals.some(g => g.category === cat && g.title === col)
                              );
                              if (titlesInRange.length === 0) return null;
                              return (
                                  <TableHead 
                                      key={cat} 
                                      colSpan={titlesInRange.length}
                                      className="sticky top-0 z-30 text-center font-black text-[11px] uppercase tracking-[0.3em] text-primary border-r border-b border-border bg-muted/95 backdrop-blur"
                                  >
                                      {cat}
                                  </TableHead>
                              );
                          })}
                      </TableRow>
                      
                      {/* Row 2: Titles */}
                      <TableRow className="hover:bg-transparent h-20">
                          <TableHead className="w-[240px] sticky top-[64px] left-0 z-[60] bg-muted/95 backdrop-blur border-r border-b border-border pl-8"></TableHead>
                          <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext 
                                items={summary.columns}
                                strategy={horizontalListSortingStrategy}
                            >
                                {summary.columns.map(title => (
                                    <SortableHeader 
                                        key={title} 
                                        id={title} 
                                        isPrivileged={isPrivileged}
                                        onHide={handleHideColumn}
                                        onDelete={setColumnToDelete}
                                    />
                                ))}
                            </SortableContext>
                          </DndContext>
                      </TableRow>

                      {/* Row 3: Grand Totals */}
                      <TableRow className="hover:bg-transparent bg-muted/30 h-14">
                        <TableHead className="sticky top-[144px] left-0 z-[60] bg-muted/95 backdrop-blur border-r border-b-2 border-border pl-8 font-black text-[10px] uppercase tracking-widest text-primary">
                          Global Sum
                        </TableHead>
                        {summary.columns.map(title => {
                            const totals = summary.grandTotals[title];
                            return (
                              <TableCell key={`total-${title}`} className="sticky top-[144px] z-30 text-center border-r border-b-2 border-border/50 bg-muted/80 backdrop-blur font-black text-sm">
                                {totals.achieved} / {totals.target}
                              </TableCell>
                            );
                        })}
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {summary.teams.map((team) => (
                          <React.Fragment key={team.teamId || 'unassigned'}>
                              {/* Team Subtotal Row */}
                              <TableRow className="bg-primary/5 hover:bg-primary/5 h-12 font-black border-b border-border">
                                  <TableCell className="sticky left-0 z-10 bg-primary/10 border-r border-border pl-8 py-3 flex items-center gap-2">
                                      <Users className="h-3 w-3 text-primary" />
                                      <span className="text-[10px] uppercase tracking-wider text-primary">{team.teamName}</span>
                                  </TableCell>
                                  {summary.columns.map(title => {
                                      const totals = team.teamTotals[title];
                                      return (
                                          <TableCell key={`team-${team.teamId}-${title}`} className="text-center border-r border-border/20 text-xs text-primary/70">
                                              {totals.target > 0 ? `${totals.achieved} / ${totals.target}` : '—'}
                                          </TableCell>
                                      );
                                  })}
                              </TableRow>

                              {/* Enabler Rows */}
                              {team.members.map(member => {
                                  return (
                                      <TableRow key={member.enablerId} className="hover:bg-muted/30 border-b border-border transition-colors group/row">
                                          <TableCell className="w-[240px] sticky left-0 z-10 bg-background font-black text-xs uppercase text-foreground/80 pl-12 border-r border-border py-5">
                                              {member.enablerName}
                                          </TableCell>
                                          {summary.columns.map(title => {
                                              const goal = goals.find(g => 
                                                  (g.enablerId === member.enablerId || g.enablerName === member.enablerName) && 
                                                  g.title === title
                                              );
                                              
                                              if (!goal) return (
                                                  <TableCell key={`${member.enablerId}-${title}`} className="text-center opacity-10 border-r border-border/30">—</TableCell>
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
                                                          <button 
                                                            className="h-6 w-6 rounded-md bg-secondary flex items-center justify-center shadow-sm hover:bg-muted transition-colors"
                                                            onClick={(e) => { e.stopPropagation(); onEditGoal(goal); }}
                                                          >
                                                            <Pencil className="h-3 w-3" />
                                                          </button>
                                                          <button 
                                                            className="h-6 w-6 rounded-md bg-destructive text-white flex items-center justify-center shadow-sm hover:bg-destructive/90 transition-colors"
                                                            onClick={(e) => { e.stopPropagation(); onDeleteGoal(goal); }}
                                                          >
                                                            <Trash2 className="h-3 w-3" />
                                                          </button>
                                                        </div>
                                                      )}

                                                      <div className={cn(
                                                          "flex h-full min-h-[80px] relative overflow-hidden transition-all hover:bg-muted/50 p-4",
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
                                                                      <span className="text-base font-black text-foreground tracking-tighter leading-none">
                                                                          {goal.achievedCount} / {goal.targetCount}
                                                                      </span>
                                                                      {status === 'achieved' && <Trophy className="h-3.5 w-3.5 text-green-600" />}
                                                                  </div>
                                                                  <span className="text-[7px] font-black uppercase text-muted-foreground tracking-widest opacity-60">
                                                                      {goal.targetUnit || 'SOULS'}
                                                                  </span>
                                                              </div>
                                                              <p className={cn(
                                                                  "text-[8px] font-bold uppercase truncate",
                                                                  status === 'at-risk' && "text-amber-600",
                                                                  status === 'overdue' && "text-destructive",
                                                                  status === 'achieved' && "text-green-600",
                                                                  (!['at-risk', 'overdue', 'achieved'].includes(status)) && "text-muted-foreground"
                                                              )}>
                                                                  {goal.deadlineLabel || (deadline ? format(deadline, 'dd MMM') : 'No Deadline')}
                                                              </p>
                                                          </div>
                                                      </div>
                                                  </TableCell>
                                              );
                                          })}
                                      </TableRow>
                                  );
                              })}
                          </React.Fragment>
                      ))}
                  </TableBody>
              </Table>
          </div>
        </div>
      </div>

      <AlertDialog open={!!columnToDelete} onOpenChange={(o) => !o && setColumnToDelete(null)}>
        <AlertDialogContent className="bg-popover border-none rounded-[2.5rem] shadow-2xl">
          <AlertDialogHeader>
            <div className="bg-red-500/10 p-4 rounded-3xl w-fit mx-auto mb-4 border border-red-500/20">
                <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <AlertDialogTitle className="font-black uppercase tracking-tight text-center">Delete entire column?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-bold text-center px-4 leading-relaxed">
                This will permanently remove the <span className="text-foreground">"{columnToDelete}"</span> column and every associated goal record across all enablers and teams. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 pt-6">
            <AlertDialogCancel className="bg-muted border-border text-foreground rounded-xl font-bold flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteColumn} disabled={isDeletingColumn} className="bg-red-600 hover:bg-red-700 rounded-xl h-12 font-black uppercase tracking-widest text-[10px] flex-2 shadow-xl shadow-red-500/20">
                {isDeletingColumn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
