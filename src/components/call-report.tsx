
'use client';

import * as React from 'react';
import { DateRange } from 'react-day-picker';
import { addDays, format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import type { Person, AppUser, CallStatus } from '@/lib/types';
import { callStatuses } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

// Define report data structures
type StatusCounts = { [key in CallStatus]?: number } & { total: number };
type EnablerReport = { name: string; counts: StatusCounts };
type GuideReport = { name: string; fgCode: string; counts: StatusCounts; enablers: EnablerReport[] };

type CallReportProps = {
  people: Person[];
  relatedUsers: AppUser[];
};

const initialCounts = (): StatusCounts => ({
    ...Object.fromEntries(callStatuses.map(s => [s, 0])) as { [key in CallStatus]: number },
    total: 0
});

export function CallReport({ people, relatedUsers }: CallReportProps) {
  const { appUser } = useAuth();
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [reportData, setReportData] = React.useState<any>(null);

  const generateReport = React.useCallback(() => {
    if (!date?.from || !date?.to || !appUser) return;
    setIsGenerating(true);
    
    const from = startOfDay(date.from);
    const to = endOfDay(date.to);
    
    // Filter call history for all people within the date range
    const callsInRange = people.flatMap(person => 
        (person.callHistory || [])
            .filter(call => {
                if (!call.calledAt) return false;
                const callDate = call.calledAt?.toDate ? call.calledAt.toDate() : new Date(call.calledAt);
                return isWithinInterval(callDate, { start: from, end: to });
            })
            .map(call => ({ ...call, enabler: person.enablerInTouchWith || 'Unassigned' }))
    );
    
    // Enabler Report
    if (appUser.role.includes('Folk Enabler') && !appUser.role.includes('Folk Guide') && !appUser.role.includes('Admin')) {
        const enablerCalls = callsInRange.filter(c => c.enabler === appUser.name);
        const counts = initialCounts();
        enablerCalls.forEach(call => {
            if(call.status) {
                counts[call.status] = (counts[call.status] || 0) + 1;
                counts.total++;
            }
        });
        setReportData({ type: 'enabler', summary: counts });
    }

    // Guide Report
    else if (appUser.role.includes('Folk Guide') && !appUser.role.includes('Admin')) {
        const guideEnablers = relatedUsers.map(u => u.name);
        const managedNames = new Set([appUser.name, ...guideEnablers]);
        const teamCalls = callsInRange.filter(c => managedNames.has(c.enabler));
        
        const teamSummary = initialCounts();
        const enablerReportsMap: Record<string, StatusCounts> = {};

        teamCalls.forEach(call => {
            if (!call.status) return;

            teamSummary[call.status] = (teamSummary[call.status] || 0) + 1;
            teamSummary.total++;

            if (!enablerReportsMap[call.enabler]) {
                enablerReportsMap[call.enabler] = initialCounts();
            }
            enablerReportsMap[call.enabler][call.status]!++;
            enablerReportsMap[call.enabler].total++;
        });

        const enablerReports: EnablerReport[] = Object.entries(enablerReportsMap)
            .map(([name, counts]) => ({ name, counts }))
            .sort((a,b) => b.counts.total - a.counts.total);
            
        setReportData({ type: 'guide', teamSummary, enablerReports });
    }

    // Admin Report
    else if (appUser.role.includes('Admin')) {
        const guides = relatedUsers.filter(u => u.role.includes('Folk Guide'));
        const enablers = relatedUsers.filter(u => u.role.includes('Folk Enabler'));
        
        const guideMap = new Map<string, string>(); // guideId -> guideName
        guides.forEach(g => guideMap.set(g.id, g.name));

        const enablerToGuideMap = new Map<string, string>(); // enablerName -> guideName
        enablers.forEach(e => {
            if(e.reportsTo?.guideId) {
                const guideName = guideMap.get(e.reportsTo.guideId);
                if (guideName) enablerToGuideMap.set(e.name, guideName);
            }
        });
        guides.forEach(g => enablerToGuideMap.set(g.name, g.name));

        const totalSummary = initialCounts();
        const guideReportsMap: Record<string, { counts: StatusCounts, enablers: Record<string, StatusCounts> }> = {};

        callsInRange.forEach(call => {
            if(!call.status) return;
            totalSummary[call.status]!++;
            totalSummary.total++;
            
            const guideName = enablerToGuideMap.get(call.enabler);
            if (guideName) {
                if (!guideReportsMap[guideName]) {
                    guideReportsMap[guideName] = { counts: initialCounts(), enablers: {} };
                }
                if (!guideReportsMap[guideName].enablers[call.enabler]) {
                    guideReportsMap[guideName].enablers[call.enabler] = initialCounts();
                }

                guideReportsMap[guideName].counts[call.status]!++;
                guideReportsMap[guideName].counts.total++;
                guideReportsMap[guideName].enablers[call.enabler][call.status]!++;
                guideReportsMap[guideName].enablers[call.enabler].total++;
            }
        });
        
        const guideReports: GuideReport[] = guides.map(guide => ({
            name: guide.name,
            fgCode: guide.fgCode || 'N/A',
            counts: guideReportsMap[guide.name]?.counts || initialCounts(),
            enablers: Object.entries(guideReportsMap[guide.name]?.enablers || {})
                .map(([name, counts]) => ({ name, counts }))
                .sort((a,b) => b.counts.total - a.counts.total),
        })).sort((a,b) => b.counts.total - a.counts.total);

        setReportData({ type: 'admin', totalSummary, guideReports });
    }

    setIsGenerating(false);
  }, [appUser, date, people, relatedUsers]);

  // Auto-generate report on first load
  React.useEffect(() => {
    generateReport();
  }, [generateReport]);

  const renderReport = () => {
    if (isGenerating) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }
    if (!reportData) {
        return <p className="text-muted-foreground text-center py-8">Click "Generate Report" to see the data.</p>;
    }

    const { type } = reportData;
    
    if (type === 'enabler') {
      const { summary } = reportData;
      if (summary.total === 0) return <p className="text-muted-foreground text-center py-8">No calls found in this date range.</p>;
      return (
        <Table>
          <TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
          <TableBody>
            {callStatuses.map(status => (
              <TableRow key={status}>
                <TableCell>{status}</TableCell>
                <TableCell className="text-right">{summary[status] || 0}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/50"><TableCell>Total Calls</TableCell><TableCell className="text-right">{summary.total}</TableCell></TableRow>
          </TableBody>
        </Table>
      );
    }
    
    if (type === 'guide') {
      const { teamSummary, enablerReports } = reportData;
      if (teamSummary.total === 0) return <p className="text-muted-foreground text-center py-8">No calls found for your team in this date range.</p>;
      return (
        <div className="space-y-4">
            <Card>
                <CardHeader><CardTitle>Team Summary</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        {callStatuses.slice(0, 7).map(status => <div key={status}><p className="text-2xl font-bold">{teamSummary[status] || 0}</p><p className="text-xs text-muted-foreground">{status}</p></div>)}
                        <div><p className="text-2xl font-bold">{teamSummary.total}</p><p className="text-xs text-muted-foreground">Total Calls</p></div>
                    </div>
                </CardContent>
            </Card>
            <Accordion type="single" collapsible className="w-full">
                {enablerReports.map((report: EnablerReport) => (
                    <AccordionItem value={report.name} key={report.name}>
                        <AccordionTrigger>{report.name} <span className="text-muted-foreground ml-auto pr-2">Total Calls: {report.counts.total}</span></AccordionTrigger>
                        <AccordionContent>
                           <Table>
                              <TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
                              <TableBody>
                                {callStatuses.map(status => (
                                  <TableRow key={status}><TableCell>{status}</TableCell><TableCell className="text-right">{report.counts[status] || 0}</TableCell></TableRow>
                                ))}
                                <TableRow className="font-bold bg-muted/50"><TableCell>Total</TableCell><TableCell className="text-right">{report.counts.total}</TableCell></TableRow>
                              </TableBody>
                           </Table>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
      );
    }

    if (type === 'admin') {
      const { totalSummary, guideReports } = reportData;
      if (totalSummary.total === 0) return <p className="text-muted-foreground text-center py-8">No calls found in this date range.</p>;
      return (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Overall Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                {callStatuses.slice(0, 7).map(status => <div key={status}><p className="text-2xl font-bold">{totalSummary[status] || 0}</p><p className="text-xs text-muted-foreground">{status}</p></div>)}
                <div><p className="text-2xl font-bold">{totalSummary.total}</p><p className="text-xs text-muted-foreground">Total Calls</p></div>
              </div>
            </CardContent>
          </Card>
          <Accordion type="single" collapsible className="w-full">
            {guideReports.map((report: GuideReport) => (
              <AccordionItem value={report.name} key={report.name}>
                <AccordionTrigger>{report.name} ({report.fgCode})<span className="text-muted-foreground ml-auto pr-2">Total Calls: {report.counts.total}</span></AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Enabler</TableHead><TableHead className="text-right">Total Calls</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {report.enablers.map(enabler => (
                        <TableRow key={enabler.name}>
                          <TableCell>{enabler.name}</TableCell>
                          <TableCell className="text-right">{enabler.counts.total}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/50"><TableCell>Guide Total</TableCell><TableCell className="text-right">{report.counts.total}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      );
    }
    return null;
  }

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader>
            <CardTitle>Calling Session Report</CardTitle>
            <CardDescription>Generate a report for calls made within a specific date range.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-full sm:w-[300px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                        date.to ? (
                            <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(date.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pick a date</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
                <Button onClick={generateReport} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Generate Report
                </Button>
            </div>

            <div className="mt-4">
                {renderReport()}
            </div>
        </CardContent>
    </Card>
  )
}
