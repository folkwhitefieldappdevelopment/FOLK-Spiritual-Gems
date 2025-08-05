
'use client';

import * as React from 'react';
import { DateRange } from 'react-day-picker';
import { addDays, format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import type { Person, AppUser, CallStatus } from '@/lib/types';
import { callStatuses } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

// Define report data structures
type ReportCounts = {
  callPicked: number;
  callNotPicked: number;
  contactEliminated: number;
  confirmations: number;
  sg: number;
  ma: number;
  frp: number;
  total: number;
};
type EnablerReport = { name: string; counts: ReportCounts };
type GuideReport = { name: string; fgCode: string; counts: ReportCounts; enablers: EnablerReport[] };

type CallReportProps = {
  people: Person[];
  relatedUsers: AppUser[];
};

const initialCounts = (): ReportCounts => ({
  callPicked: 0,
  callNotPicked: 0,
  contactEliminated: 0,
  confirmations: 0,
  sg: 0,
  ma: 0,
  frp: 0,
  total: 0,
});

const callPickedStatuses: CallStatus[] = ['A1 - Coming', 'A2 - Not Interested', 'A3 - Next Week/Upcoming week', 'A4 - Tentative', 'Y2 - Call me later', 'Y3 - Next Month', 'Z - Already Attended'];
const callNotPickedStatuses: CallStatus[] = ['B - Not Answering', 'C - Busy', 'E - Switched Off', 'F - Not Reachable'];
const contactEliminatedStatuses: CallStatus[] = ['D - Wrong Number', 'G - Completely Shifted to Another city'];

const safeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp; // Already a Date object
    if (typeof timestamp === 'string') {
        const d = new Date(timestamp);
        return isNaN(d.getTime()) ? null : d;
    }
    // Handle Firestore Timestamp objects
    if (typeof timestamp === 'object' && timestamp.toDate) {
        return timestamp.toDate();
    }
    return null;
}

export function CallReport({ people, relatedUsers }: CallReportProps) {
  const { appUser } = useAuth();
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [reportData, setReportData] = React.useState<any>(null);

  const generateReport = React.useCallback(() => {
    if (!date?.from || !appUser) return;
    setIsGenerating(true);
    
    const from = startOfDay(date.from);
    const to = endOfDay(date.to || date.from);
    
    const callsInRange = people.flatMap(person => 
        (person.callHistory || [])
            .filter(call => {
                if (!call.calledAt) return false;
                const callDate = safeDate(call.calledAt);
                return callDate && isWithinInterval(callDate, { start: from, end: to });
            })
            .map(call => ({ 
                ...call, 
                enabler: person.enablerInTouchWith || 'Unassigned',
                guideId: person.folkGuideId || 'Unassigned',
            }))
    );
    
    const updateCounts = (summary: ReportCounts, call: typeof callsInRange[0]) => {
        if (!call.status) return;
        summary.total++;
        if (callPickedStatuses.includes(call.status)) summary.callPicked++;
        if (callNotPickedStatuses.includes(call.status)) summary.callNotPicked++;
        if (contactEliminatedStatuses.includes(call.status)) summary.contactEliminated++;
        if (call.status === 'A1 - Coming') summary.confirmations++;
        if (call.sg) summary.sg++;
        if (call.ma) summary.ma++;
        if (call.frp) summary.frp++;
    };

    if (appUser.role.includes('Folk Enabler') && !appUser.role.includes('Folk Guide') && !appUser.role.includes('Admin')) {
        const enablerCalls = callsInRange.filter(c => c.callerName === appUser.name);
        const counts = initialCounts();
        enablerCalls.forEach(call => updateCounts(counts, call));
        setReportData({ type: 'enabler', summary: counts });
    }
    else if (appUser.role.includes('Folk Guide') && !appUser.role.includes('Admin')) {
        const managedEnablers = relatedUsers;
        const teamMemberNames = new Set([appUser.name, ...managedEnablers.map(u => u.name)]);
        
        const teamCalls = callsInRange.filter(c => teamMemberNames.has(c.callerName));
        
        const teamSummary = initialCounts();
        const enablerReportsMap: Record<string, ReportCounts> = {};

        teamCalls.forEach(call => {
            updateCounts(teamSummary, call);
            if (!enablerReportsMap[call.callerName]) {
                enablerReportsMap[call.callerName] = initialCounts();
            }
            updateCounts(enablerReportsMap[call.callerName], call);
        });

        const enablerReports: EnablerReport[] = Object.entries(enablerReportsMap)
            .map(([name, counts]) => ({ name, counts }))
            .sort((a,b) => b.counts.total - a.counts.total);
            
        setReportData({ type: 'guide', teamSummary, enablerReports });
    }
    else if (appUser.role.includes('Admin')) {
        const guides = relatedUsers.filter(u => u.role.includes('Folk Guide'));
        const enablers = relatedUsers.filter(u => u.role.includes('Folk Enabler'));

        const guideMap = new Map<string, AppUser>(guides.map(g => [g.id, g]));
        const enablerToGuideMap = new Map<string, string>(); // Map enabler name to guide ID
        enablers.forEach(e => {
            if (e.reportsTo?.guideId) {
                enablerToGuideMap.set(e.name, e.reportsTo.guideId);
            }
        });
        
        const totalSummary = initialCounts();
        const guideReportsMap: Record<string, { counts: ReportCounts, enablers: Record<string, ReportCounts> }> = {};

        callsInRange.forEach(call => {
            updateCounts(totalSummary, call);

            let guideId: string | undefined;

            // Check if the caller is a guide
            const callerAsGuide = guides.find(g => g.name === call.callerName);
            if (callerAsGuide) {
                guideId = callerAsGuide.id;
            } else {
                // Otherwise, check if they are an enabler under a guide
                guideId = enablerToGuideMap.get(call.callerName);
            }

            if (guideId) {
                const guide = guideMap.get(guideId);
                if (guide) {
                    if (!guideReportsMap[guide.id]) {
                        guideReportsMap[guide.id] = { counts: initialCounts(), enablers: {} };
                    }
                    if (!guideReportsMap[guide.id].enablers[call.callerName]) {
                        guideReportsMap[guide.id].enablers[call.callerName] = initialCounts();
                    }
                    updateCounts(guideReportsMap[guide.id].counts, call);
                    updateCounts(guideReportsMap[guide.id].enablers[call.callerName], call);
                }
            }
        });
        
        const guideReports: GuideReport[] = guides.map(guide => ({
            name: guide.name,
            fgCode: guide.fgCode || 'N/A',
            counts: guideReportsMap[guide.id]?.counts || initialCounts(),
            enablers: Object.entries(guideReportsMap[guide.id]?.enablers || {})
                .map(([name, counts]) => ({ name, counts }))
                .sort((a,b) => b.counts.total - a.counts.total),
        })).sort((a,b) => b.counts.total - a.counts.total);

        setReportData({ type: 'admin', totalSummary, guideReports });
    }

    setIsGenerating(false);
  }, [appUser, date, people, relatedUsers]);

  React.useEffect(() => {
    generateReport();
  }, [generateReport]);

  const renderSummaryCard = (title: string, counts: ReportCounts) => (
      <Card>
          <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
          <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div><p className="text-2xl font-bold">{counts.total}</p><p className="text-xs text-muted-foreground">Total Calls</p></div>
                  <div><p className="text-2xl font-bold">{counts.callPicked}</p><p className="text-xs text-muted-foreground">Calls Picked</p></div>
                  <div><p className="text-2xl font-bold">{counts.callNotPicked}</p><p className="text-xs text-muted-foreground">Not Picked</p></div>
                  <div><p className="text-2xl font-bold">{counts.contactEliminated}</p><p className="text-xs text-muted-foreground">Eliminated</p></div>
                  <div className="text-green-600 dark:text-green-400"><p className="text-2xl font-bold">{counts.confirmations}</p><p className="text-xs">Confirmations (A1)</p></div>
                  <div><p className="text-2xl font-bold">{counts.sg}</p><p className="text-xs text-muted-foreground">SG</p></div>
                  <div><p className="text-2xl font-bold">{counts.ma}</p><p className="text-xs text-muted-foreground">MA</p></div>
                  <div><p className="text-2xl font-bold">{counts.frp}</p><p className="text-xs text-muted-foreground">FRP</p></div>
              </div>
          </CardContent>
      </Card>
  );
  
  const renderCountsTable = (counts: ReportCounts) => (
      <Table>
          <TableBody>
              <TableRow><TableCell>Total Calls</TableCell><TableCell className="text-right">{counts.total}</TableCell></TableRow>
              <TableRow><TableCell>Calls Picked</TableCell><TableCell className="text-right">{counts.callPicked}</TableCell></TableRow>
              <TableRow><TableCell>Calls Not Picked</TableCell><TableCell className="text-right">{counts.callNotPicked}</TableCell></TableRow>
              <TableRow><TableCell>Contacts Eliminated</TableCell><TableCell className="text-right">{counts.contactEliminated}</TableCell></TableRow>
              <TableRow className="font-bold text-green-600 dark:text-green-400"><TableCell>Confirmations (A1)</TableCell><TableCell className="text-right">{counts.confirmations}</TableCell></TableRow>
              <TableRow><TableCell>SG Attended</TableCell><TableCell className="text-right">{counts.sg}</TableCell></TableRow>
              <TableRow><TableCell>MA Attended</TableCell><TableCell className="text-right">{counts.ma}</TableCell></TableRow>
              <TableRow><TableCell>FRP Attended</TableCell><TableCell className="text-right">{counts.frp}</TableCell></TableRow>
          </TableBody>
      </Table>
  );

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
      return renderCountsTable(summary);
    }
    
    if (type === 'guide') {
      const { teamSummary, enablerReports } = reportData;
      if (teamSummary.total === 0) return <p className="text-muted-foreground text-center py-8">No calls found for your team in this date range.</p>;
      return (
        <div className="space-y-4">
            {renderSummaryCard('Team Summary', teamSummary)}
            <Accordion type="single" collapsible className="w-full">
                {enablerReports.map((report: EnablerReport) => (
                    <AccordionItem value={report.name} key={report.name}>
                        <AccordionTrigger>{report.name} <span className="text-muted-foreground ml-auto pr-2">Total Calls: {report.counts.total}</span></AccordionTrigger>
                        <AccordionContent>
                           {renderCountsTable(report.counts)}
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
          {renderSummaryCard('Overall Summary', totalSummary)}
          <Accordion type="single" collapsible className="w-full">
            {guideReports.map((report: GuideReport) => (
              <AccordionItem value={report.name} key={report.name}>
                <AccordionTrigger>{report.name} ({report.fgCode})<span className="text-muted-foreground ml-auto pr-2">Total Calls: {report.counts.total}</span></AccordionTrigger>
                <AccordionContent className="space-y-4">
                    {renderSummaryCard('Guide Summary', report.counts)}
                    <Accordion type="single" collapsible className="w-full pl-4">
                        {report.enablers.map((enablerReport: EnablerReport) => (
                             <AccordionItem value={enablerReport.name} key={enablerReport.name}>
                                <AccordionTrigger>{enablerReport.name}<span className="text-muted-foreground ml-auto pr-2">Total Calls: {enablerReport.counts.total}</span></AccordionTrigger>
                                <AccordionContent>
                                    {renderCountsTable(enablerReport.counts)}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
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
