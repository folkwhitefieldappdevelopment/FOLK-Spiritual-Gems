'use client';

import * as React from 'react';
import { Printer, Download, Users, Sigma } from 'lucide-react';
import type { Goal, AppUser } from '@/lib/types';
import { getTeamGoalsSummary } from '@/services/goals-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type TeamGoalsSummaryProps = {
  goals: Goal[];
  enablers: AppUser[];
  categories: string[];
};

export function TeamGoalsSummary({ goals, enablers, categories }: TeamGoalsSummaryProps) {
  const summary = React.useMemo(() => {
    return getTeamGoalsSummary(goals, enablers, categories);
  }, [goals, enablers, categories]);

  if (goals.length === 0) return null;

  return (
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
                  <TableHead key={title} className="text-center font-black text-[8px] uppercase tracking-tighter text-muted-foreground h-10 min-w-[80px] px-2">
                    {title}
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
  );
}
