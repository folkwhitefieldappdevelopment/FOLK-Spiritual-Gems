'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay, format, isSameDay } from 'date-fns';
import { useRouter } from 'next/navigation';
import { FullPageLoader } from '@/components/loader';
import { PageHeader } from '@/components/page-header';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    Users, 
    CheckCircle2, 
    Calendar as CalendarIcon,
    UsersRound,
    UserCircle,
    ChevronDown,
    PhoneIncoming,
    PhoneOff,
    Activity,
    Smartphone,
    Trophy,
    UserCheck,
    Contact,
    UserPlus,
    RefreshCw,
    Wifi,
    ClipboardCheck,
    ArrowRight,
    Flame,
    Loader2,
    Sigma,
    AlertCircle,
    Printer,
    FileText,
    LayoutDashboard,
    FileBarChart,
    Download
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/auth-context';
import { getFolkGuides } from '@/services/user-service';
import { getFollowUpSummaryForGuide, getFollowUpItemsForCurrentUser } from '@/services/follow-up-service';
import { getTeamGoalsSummary } from '@/services/goals-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { callStatuses } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration } from '@/utils/format';
import { GoalAlerts } from '@/components/dashboard/goal-alerts';
import { TeamGoalsSummary as TeamGoalsTable } from '@/components/dashboard/team-goals-summary';
import { PrintableReport } from '@/components/dashboard/printable-report';

const REPORT_SECTIONS = [
    { id: 'enabler-breakdown', label: 'Enabler Breakdown', icon: UsersRound },
    { id: 'calling-report', label: 'Calling Report', icon: PhoneIncoming },
    { id: 'team-goals', label: 'Team Goals Summary', icon: Trophy },
    { id: 'leaderboard', label: 'Outreach Leaderboard', icon: FileBarChart },
    { id: 'goal-alerts', label: 'Goal Alerts & Status', icon: AlertCircle },
];

export default function DashboardPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ 
    from: startOfDay(new Date()), 
    to: endOfDay(new Date()) 
  });
  
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedFolkGuideId, setSelectedFolkGuideId] = useState<string>('all');
  const [folkGuides, setFGuides] = useState<any[]>([]);
  const [followUpCount, setFollowUpCount] = useState<number | null>(null);
  const [isAssemblingReport, setIsAssemblingReport] = useState(false);

  const { data, syncStatus, isLoading, isRefetching, recomputeStats } = useDashboardStats(dateRange, selectedFolkGuideId, selectedSection);

  useEffect(() => {
    if (!appUser) return;
    if (appUser.role.includes('Admin')) {
        getFolkGuides().then(setFGuides);
    }
  }, [appUser]);

  useEffect(() => {
    if (!appUser || !selectedSection) return;
    const fetchFollowUp = async () => {
        if (appUser.role.includes('Admin') || appUser.role.includes('Folk Guide')) {
            const summaries = await getFollowUpSummaryForGuide(appUser);
            setFollowUpCount(summaries.reduce((acc, s) => acc + s.total, 0));
        } else {
            const items = await getFollowUpItemsForCurrentUser(appUser);
            setFollowUpCount(items.length);
        }
    };
    fetchFollowUp();
  }, [appUser, selectedSection]);

  const stats = data?.stats;
  const reportAll = data?.callingReportAll;
  const leaderboard = data?.leaderboard || [];
  
  const goalsSummary = useMemo(() => {
      if (!data?.goals) return null;
      return getTeamGoalsSummary(data.goals, data.enablers || [], data.categories || [], data.hiddenColumns, data.columnOrder);
  }, [data]);

  const handleDownloadAll = async () => {
      setIsAssemblingReport(true);
      try {
          await recomputeStats(['all']);
          // Small timeout to ensure the printable report DOM has rendered with the new data
          setTimeout(() => {
            window.print();
            setIsAssemblingReport(false);
          }, 1000);
      } catch (e) {
          setIsAssemblingReport(false);
      }
  };

  const navigateToContacts = (params: Record<string, string>, includeDateRange: boolean = false) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value) searchParams.append(key, value); });
    if (includeDateRange && dateRange?.from) {
      searchParams.append('callDateFrom', dateRange.from.toISOString());
      if (dateRange?.to) searchParams.append('callDateTo', dateRange.to.toISOString());
    }
    router.push(`/contacts?${searchParams.toString()}`);
  };

  if (isLoading && (!stats || stats.totalContactsCount === undefined)) return <FullPageLoader />;

  return (
    <>
        <PageHeader title="Dashboard" description="Mission oversight & pulse.">
            <div className="flex items-center gap-2 flex-wrap">
                <Button 
                    onClick={handleDownloadAll} 
                    disabled={isAssemblingReport}
                    className="h-9 sm:px-4 px-2.5 font-black uppercase text-[10px] tracking-widest rounded-xl bg-primary text-primary-foreground shadow-lg"
                >
                    {isAssemblingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline ml-2">Download All (PDF)</span>
                </Button>

                <Select value={selectedSection || ""} onValueChange={setSelectedSection}>
                    <SelectTrigger className="w-10 sm:w-[220px] h-9 rounded-xl border-border bg-muted/50 font-black text-[10px] uppercase px-0 sm:px-3">
                        <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                        <span className="hidden sm:inline"><SelectValue placeholder="Select Report..." /></span>
                    </SelectTrigger>
                    <SelectContent>
                        {REPORT_SECTIONS.map(s => (
                            <SelectItem key={s.id} value={s.id} className="font-bold text-xs">
                                <div className="flex items-center gap-2">
                                    <s.icon className="h-3.5 w-3.5" /> {s.label}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {appUser?.role.includes('Admin') && (
                    <Select value={selectedFolkGuideId} onValueChange={setSelectedFolkGuideId}>
                        <SelectTrigger className="w-10 sm:w-[160px] h-9 rounded-xl border-border bg-muted/50 text-foreground font-black text-[10px] uppercase px-0 sm:px-3">
                            <UsersRound className="h-3.5 w-3.5 shrink-0" />
                            <span className="hidden sm:inline"><SelectValue placeholder="All Guides" /></span>
                        </SelectTrigger>
                        <SelectContent>{folkGuides.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                    </Select>
                )}
                
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 rounded-xl border-border text-foreground bg-muted/50 font-black px-2.5 sm:px-4 gap-2">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline text-[10px] uppercase">
                                {dateRange?.from ? format(dateRange.from, "MMM dd") : "Pick date"}
                            </span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-none bg-popover" align="end">
                        <Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus />
                    </PopoverContent>
                </Popover>
            </div>
        </PageHeader>

        <main className={cn("flex-1 space-y-6 p-4 md:p-8 pt-0 pb-24 print:hidden", isRefetching && "opacity-50 pointer-events-none")}>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
                <MiniStatCard title="ASSIGNED" value={stats?.myContactsCount} icon={UserCircle} onClick={() => navigateToContacts({ scope: 'my' })} barColor="bg-primary" />
                <MiniStatCard title="TOTAL" value={stats?.totalContactsCount} icon={Users} onClick={() => navigateToContacts({ scope: 'all' })} barColor="bg-primary/40" />
                <MiniStatCard title="MY NEW" value={stats?.myNewInRange} icon={UserPlus} isTrend colorClass="text-orange-500" onClick={() => navigateToContacts({ scope: 'my' }, true)} barColor="bg-orange-500" />
                <MiniStatCard title="FOLLOW-UP" value={followUpCount ?? undefined} icon={AlertCircle} colorClass="text-red-500" onClick={() => router.push('/follow-up')} barColor="bg-red-500" />
                <MiniStatCard title="ALL NEW" value={stats?.allNewInRange} icon={Users} isTrend colorClass="text-orange-500" onClick={() => navigateToContacts({ scope: 'all' }, true)} barColor="bg-orange-500" />
            </div>

            {!selectedSection && (
                <div className="py-24 text-center bg-muted/20 rounded-[3rem] border-2 border-dashed space-y-4">
                    <FileBarChart className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                    <div className="space-y-1">
                        <p className="text-muted-foreground font-black text-xs uppercase tracking-widest">No Report Selected</p>
                        <p className="text-[10px] text-muted-foreground/60 font-bold uppercase">Choose a category above to load statistical data</p>
                    </div>
                </div>
            )}

            {isRefetching && (
                <div className="flex flex-col items-center justify-center py-12 gap-4 animate-pulse">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Synchronizing report data...</p>
                </div>
            )}

            {selectedSection === 'goal-alerts' && <GoalAlerts />}

            {selectedSection === 'enabler-breakdown' && data?.stats.enablerBreakdown && (
                <Card className="bg-popover border-none rounded-[2rem] shadow-2xl overflow-hidden">
                    <CardHeader className="p-8 pb-4 bg-card border-b border-border">
                        <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3"><UsersRound className="h-6 w-6 text-primary" /> Enabler Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow><TableHead className="pl-8 text-[9px] font-black uppercase">Enabler</TableHead><TableHead className="text-center text-[9px] font-black uppercase">FRP</TableHead><TableHead className="text-center text-[9px] font-black uppercase">SG-W</TableHead><TableHead className="text-center text-[9px] font-black uppercase">16+ R</TableHead><TableHead className="text-right pr-8 text-[9px] font-black uppercase">Total</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.stats.enablerBreakdown.map(e => (
                                    <TableRow key={e.enablerId} className="hover:bg-muted/50">
                                        <TableCell className="pl-8 py-5 font-black uppercase text-xs">{e.enablerName}</TableCell>
                                        <TableCell className="text-center"><Badge variant="outline" className="font-black text-green-500 bg-green-500/5">{e.frp}</Badge></TableCell>
                                        <TableCell className="text-center"><Badge variant="outline" className="font-black text-yellow-600 bg-yellow-500/5">{e.sgW}</Badge></TableCell>
                                        <TableCell className="text-center"><Badge className="bg-[#FF9800]/10 text-[#FF9800]">{e.sixteenRounder}</Badge></TableCell>
                                        <TableCell className="text-right pr-8 font-black text-sm text-muted-foreground">{e.totalContacts}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {selectedSection === 'team-goals' && data?.goals && (
                <TeamGoalsTable goals={data.goals} enablers={data.enablers || []} categories={data.categories || []} hiddenColumns={data.hiddenColumns || []} />
            )}

            {selectedSection === 'leaderboard' && leaderboard.length > 0 && (
                <Card className="bg-popover border-none rounded-[2rem] shadow-2xl overflow-hidden">
                    <CardHeader className="p-8 pb-4 bg-card border-b border-border">
                        <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3"><Trophy className="h-6 w-6 text-orange-500" /> Outreach Leaderboard</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow><TableHead className="pl-8 text-[9px] font-black uppercase">Caller</TableHead><TableHead className="text-center text-[9px] font-black uppercase">Total Calls</TableHead><TableHead className="text-right pr-8 text-[9px] font-black uppercase">Duration</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                {leaderboard.map(e => (
                                    <TableRow key={e.callerId} className="hover:bg-muted/50">
                                        <TableCell className="pl-8 py-5"><div className="flex items-center gap-4"><Avatar className="h-10 w-10"><AvatarImage src={e.photoUrl}/><AvatarFallback>{e.callerName[0]}</AvatarFallback></Avatar><span className="text-sm font-black uppercase">{e.callerName}</span></div></TableCell>
                                        <TableCell className="text-center"><Badge className="bg-orange-500/10 text-orange-500 text-lg h-9 px-4">{e.totalCalls}</Badge></TableCell>
                                        <TableCell className="text-right pr-8 font-mono text-sm">{formatDuration(e.totalDuration)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {selectedSection === 'calling-report' && reportAll && (
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                    <SummaryMetricCard title="TOTAL INTERACTIONS" value={reportAll.totalCalls} icon={PhoneIncoming} onClick={() => navigateToContacts({ scope: 'all' }, true)} />
                    <SummaryMetricCard title="ANSWERED" value={reportAll.picked} percentage={reportAll.percentages.picked} icon={CheckCircle2} color="bg-green-500" showProgress onClick={() => navigateToContacts({ scope: 'all', callStatus: 'A1 - Coming' }, true)} />
                    <SummaryMetricCard title="UNANSWERED" value={reportAll.notPicked} percentage={reportAll.percentages.notPicked} icon={PhoneOff} color="bg-orange-600" showProgress onClick={() => navigateToContacts({ scope: 'all', callStatus: 'B - Not Answering' }, true)} />
                </div>
            )}
        </main>

        {isAssemblingReport && (
            <div className="fixed inset-0 z-[1000] bg-background/90 backdrop-blur-md flex flex-col items-center justify-center gap-6 print:hidden">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black uppercase tracking-tight">Assembling Mission Pulse</h2>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Capturing all teams and targets for export...</p>
                </div>
            </div>
        )}

        {data && <PrintableReport data={data} goalsSummary={goalsSummary!} enablers={data.enablers || []} dateLabel={format(dateRange?.from || new Date(), 'PPP')} />}
    </>
  );
}

function MiniStatCard({ title, value, icon: Icon, isTrend, onClick, colorClass, barColor = "bg-primary/20" }: { title: string, value?: number, icon: any, isTrend?: boolean, onClick?: () => void, colorClass?: string, barColor?: string }) {
    return (
        <Card onClick={onClick} className={cn("bg-popover border-none rounded-[1.5rem] p-5 pl-7 shadow-xl relative overflow-hidden group transition-all", onClick && "cursor-pointer hover:bg-muted hover:scale-[1.02] active:scale-95")}>
            <div className={cn("absolute left-0 top-4 bottom-4 w-1 rounded-r-full transition-colors", barColor)} />
            <div className="relative z-10 space-y-1">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
                <h3 className={cn("text-3xl font-black text-foreground tracking-tighter truncate", colorClass)}>
                    {value === undefined ? <span className="opacity-20">...</span> : (isTrend ? `+${value}` : value)}
                </h3>
            </div>
            <Icon className="absolute top-4 right-4 h-5 w-5 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" />
        </Card>
    );
}

function SummaryMetricCard({ title, value, percentage, icon: Icon, color = "bg-primary", showProgress = false, className, onClick }: { title: string, value: number, percentage?: number, icon: any, color?: string, showProgress?: boolean, className?: string, onClick?: () => void }) {
    return (
        <Card onClick={onClick} className={cn("bg-popover border-none rounded-3xl p-6 relative overflow-hidden transition-all", className, onClick && "cursor-pointer hover:bg-muted/20 active:scale-95")}>
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
                    <div className="flex items-baseline gap-2"><h3 className="text-3xl font-black text-foreground">{value}</h3>{percentage !== undefined && <span className="text-xs font-bold text-muted-foreground">({percentage}%)</span>}</div>
                </div>
                <div className={cn("p-2 rounded-xl bg-muted/50", !className && "text-primary")}><Icon className="h-5 w-5" /></div>
            </div>
            {showProgress && (<div className="mt-6 space-y-1.5"><div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden"><div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${percentage}%` }} /></div></div>)}
        </Card>
    );
}

