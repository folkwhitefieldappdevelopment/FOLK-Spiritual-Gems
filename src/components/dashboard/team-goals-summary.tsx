'use client';

import * as React from 'react';
import { Printer, Download, Users, Sigma, MoreVertical, EyeOff, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import type { Goal, AppUser } from '@/lib/types';
import { getTeamGoalsSummary, deleteGoalColumn } from '@/services/goals-service';
import { hideGoalColumn } from '@/services/settings-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useAppToast } from '@/contexts/toast-context';

type TeamGoalsSummaryProps = {
  goals: Goal[];
  enablers: AppUser[];
  categories: string[];
  hiddenColumns: string[];
};

export function TeamGoalsSummary({ goals, enablers, categories, hiddenColumns }: TeamGoalsSummaryProps) {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  const [columnToDelete, setColumnToDelete] = React.useState<string | null>(null);
  const [isDeletingColumn, setIsDeletingColumn] = React.useState(false);

  const summary = React.useMemo(() => {
    return getTeamGoalsSummary(goals, enablers, categories, hiddenColumns);
  }, [goals, enablers, categories, hiddenColumns]);

  const isPrivileged = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');

  const handleHide = async (title: string) => {
    if (!appUser) return;
    try {
        await hideGoalColumn(title, appUser);
        toast({ title: 'Column Hidden' });
        window.location.reload(); // Quick refresh to update data flow
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!columnToDelete || !appUser) return;
    setIsDeletingColumn(true);
    try {
        const count = await deleteGoalColumn(columnToDelete, appUser);
        toast({ title: 'Deleted', description: `${count} records removed.` });
        setColumnToDelete(null);
        window.location.reload();
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error' });
    } finally {
        setIsDeletingColumn(false);
    }
  };

  if (goals.length === 0) return null;

  return (
    <>
      <Card className="bg-popover border-none rounded-[2rem] shadow-2xl overflow-hidden mt-8">
        <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between bg-card border-b border-border print:hidden">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              Team Goals Dashboard
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">
              Consolidated spreadsheet view of mission targets and achievements
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="border-collapse">
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="w-12 text-center font-black text-[9px] uppercase tracking-widest text-muted-foreground h-10 px-2">#</TableHead>
                  <TableHead className="font-black text-[9px] uppercase tracking-widest text-muted-foreground h-10 px-4">Enabler</TableHead>
                  {summary.columns.map(title => (
                    <TableHead key={title} className="text-center font-black text-[8px] uppercase tracking-tighter text-muted-foreground h-10 min-w-[80px] px-2 group">
                      <div className="flex flex-col items-center gap-0.5 relative">
                          {title}
                          {isPrivileged && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-4 w-4 absolute -right-3 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-popover border-border">
                                    <DropdownMenuItem onSelect={() => handleHide(title)} className="font-bold text-xs p-3">
                                        <EyeOff className="mr-2 h-3 w-3" /> Hide Column
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => setColumnToDelete(title)} className="text-destructive font-black text-xs p-3">
                                        <Trash2 className="mr-2 h-3 w-3" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.teams.map((team, tIdx) => (
                  <React.Fragment key={team.teamId || 'unassigned'}>
                    {/* Team Header Row */}
                    <TableRow className="bg-[#FF9800]/10 hover:bg-[#FF9800]/20 border-b border-border">
                      <TableCell colSpan={2 + summary.columns.length} className="py-2 px-6 font-black text-[10px] uppercase text-[#F57C00] tracking-widest">
                        TEAM: {team.teamName}
                      </TableCell>
                    </TableRow>

                    {/* Member Rows */}
                    {team.members.map((member, mIdx) => (
                      <TableRow key={member.enablerId} className="hover:bg-muted/50 border-b border-border h-8">
                        <TableCell className="text-center text-[10px] font-mono text-muted-foreground px-2">{mIdx + 1}</TableCell>
                        <TableCell className="font-bold text-[10px] uppercase text-foreground/80 px-4 truncate max-w-[140px]">{member.enablerName}</TableCell>
                        {summary.columns.map(title => {
                          const val = member.columns[title];
                          return (
                            <TableCell key={title} className="text-center text-[10px] font-medium p-0">
                              {val.target > 0 ? (
                                  <div className={cn(
                                      "h-full w-full flex items-center justify-center py-2",
                                      val.achieved >= val.target ? "text-green-600 font-black" : "text-foreground/60"
                                  )}>
                                      {val.achieved} / {val.target}
                                  </div>
                              ) : '—'}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}

                    {/* Team Total Row */}
                    <TableRow className="bg-muted/30 font-black border-b-2 border-border h-10">
                      <TableCell className="text-center"><Sigma className="h-3 w-3 mx-auto text-primary" /></TableCell>
                      <TableCell className="text-[10px] uppercase text-primary">TEAM TOTAL</TableCell>
                      {summary.columns.map(title => {
                        const totals = team.teamTotals[title];
                        return (
                          <TableCell key={title} className="text-center text-[10px] text-primary">
                            {totals.target > 0 ? `${totals.achieved} / ${totals.target}` : '—'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </React.Fragment>
                ))}

                {/* Grand Total Row */}
                <TableRow className="bg-primary/10 hover:bg-primary/10 font-black h-12 border-t-2 border-primary">
                  <TableCell className="text-center"><Sigma className="h-4 w-4 mx-auto text-primary" /></TableCell>
                  <TableCell className="text-xs uppercase text-primary tracking-widest">GRAND TOTAL</TableCell>
                  {summary.columns.map(title => {
                    const totals = summary.grandTotals[title];
                    return (
                      <TableCell key={title} className="text-center text-xs text-primary">
                        {totals.achieved} / {totals.target}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!columnToDelete} onOpenChange={(o) => !o && setColumnToDelete(null)}>
        <AlertDialogContent className="bg-popover border-none rounded-[2rem] shadow-2xl">
          <AlertDialogHeader>
            <div className="bg-red-500/10 p-4 rounded-3xl w-fit mx-auto mb-4 border border-red-500/20">
                <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <AlertDialogTitle className="font-black uppercase tracking-tight text-center">Permanent Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-bold text-center leading-relaxed">
                You are about to delete the column <span className="text-foreground">"{columnToDelete}"</span> and all historical data associated with it. This is a bulk destructive operation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 pt-6">
            <AlertDialogCancel className="rounded-xl font-bold flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeletingColumn} className="bg-red-600 hover:bg-red-700 rounded-xl h-12 font-black uppercase tracking-widest text-[10px] flex-2 shadow-xl shadow-red-500/20">
                {isDeletingColumn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete Column
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
