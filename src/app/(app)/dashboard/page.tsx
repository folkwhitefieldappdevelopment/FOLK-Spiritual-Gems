
'use client';

import { useState, useEffect } from 'react';
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
    ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/auth-context';
import { getFolkGuides } from '@/services/user-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { callStatuses } from '@/lib/types';
import type { AppUser, EnablerStageBreakdown } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration } from '@/utils/format';

export default function DashboardPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ 
    from: startOfDay(new Date()), 
    to: endOfDay(new Date()) 
  });
  
  const [selectedFolkGuideId, setSelectedFolkGuideId] = useState<string>('all');
  const [folkGuides, setFGuides] = useState<AppUser[]>([]);
  
  const { data, syncStatus, isLoading } = useDashboardStats(dateRange, selectedFolkGuideId);

  useEffect(() => {
    if (appUser?.role.includes('Admin')) {
        getFolkGuides().then(setFGuides);
    }
  }, [appUser]);

  const stats = data?.stats;
  const reportAll = data?.callingReportAll;
  const leaderboard = data?.leaderboard || [];
  const enablerBreakdown = stats?.enablerBreakdown || [];

  const navigateToContacts = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
    });
    if (dateRange?.from) searchParams.append('callDateFrom', dateRange.from.toISOString());
    if (dateRange?.to) searchParams.append('callDateTo', dateRange.to.toISOString());
    router.push(`/contacts?${searchParams.toString()}`);
  };

  const isAdmin = appUser?.role.includes('Admin');
  const manualStatuses = callStatuses.filter(status => !status.startsWith('Device:'));
  const deviceStatuses = callStatuses.filter(status => status.startsWith('Device:'));

  const isSyncStable = syncStatus === 'synced' || syncStatus === 'cached';

  if (isLoading && (!stats || stats.totalContactsCount === undefined)) return <FullPageLoader />;

  return (
    <>
        <PageHeader 
            title="Dashboard"
            description={
                <div className="flex items-center gap-2">
                    {syncStatus === 'synced' ? (
                        <span className="flex items-center gap-1.5 text-green-500">
                           <Wifi className="h-3 w-3" /> Live & Synchronized
                        </span>
                    ) : syncStatus === 'syncing' ? (
                        <span className="flex items-center gap-1.5 text-orange-500 animate-pulse">
                           <RefreshCw className="h-3 w-3 animate-spin" /> Fetching updates...
                        </span>
                    ) : syncStatus === 'cached' ? (
                        <span className="flex items-center gap-1.5 text-blue-400">
                           <Activity className="h-3 w-3" /> Using Cached Records
                        </span>
                    ) : syncStatus === 'timeout' ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground italic">
                           Offline mode active
                        </span>
                    ) : "Initializing statistics..."}
                </div>
            }
        >
            <div className="flex items-center gap-2">
                {isAdmin && (
                    <Select value={selectedFolkGuideId} onValueChange={setSelectedFolkGuideId}>
                        <SelectTrigger className="w-[180px] h-9 rounded-xl border-border bg-muted/50 text-foreground font-black text-[10px] uppercase">
                            <UsersRound className="h-3 w-3 mr-2" />
                            <SelectValue placeholder="All Guides" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-foreground">
                            <SelectItem value="all">All Teams</SelectItem>
                            {folkGuides.map(guide => (
                                <SelectItem key={guide.id} value={guide.id}>{guide.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 rounded-xl border-border text-foreground bg-muted/50 font-black px-4 gap-2">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {dateRange?.from ? (
                                dateRange.to && !isSameDay(dateRange.from, dateRange.to) ? (
                                    <span className="text-[10px] uppercase">
                                        {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                                    </span>
                                ) : (
                                    <span className="text-[10px] uppercase">{format(dateRange.from, "MMM dd, yyyy")}</span>
                                )
                            ) : (
                                <span className="text-[10px] uppercase">Pick date</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-none bg-popover" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={1}
                        />
                    </PopoverContent>
                </Popover>
            </div>
        </PageHeader>

        <main className="flex-1 space-y-6 p-4 md:p-8 pt-0 pb-24">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <MiniStatCard 
                    title="ASSIGNED" 
                    value={(!isSyncStable && stats?.myContactsCount === 0) ? undefined : stats?.myContactsCount} 
                    icon={UserCircle} 
                    onClick={() => navigateToContacts({ scope: 'my' })}
                    barColor="bg-primary"
                />
                <MiniStatCard 
                    title="TOTAL" 
                    value={(!isSyncStable && stats?.totalContactsCount === 0) ? undefined : stats?.totalContactsCount} 
                    icon={Users} 
                    onClick={() => navigateToContacts({ scope: 'all' })}
                    barColor="bg-primary/40"
                />
                <MiniStatCard 
                    title="MY NEW" 
                    value={(!isSyncStable && stats?.myNewInRange === 0) ? undefined : stats?.myNewInRange} 
                    icon={UserPlus} 
                    isTrend
                    colorClass="text-orange-500"
                    onClick={() => navigateToContacts({ scope: 'my' })}
                    barColor="bg-orange-500"
                />
                <MiniStatCard 
                    title="ALL NEW" 
                    value={(!isSyncStable && stats?.allNewInRange === 0) ? undefined : stats?.allNewInRange} 
                    icon={Users} 
                    isTrend 
                    colorClass="text-orange-500"
                    onClick={() => navigateToContacts({ scope: 'all' })}
                    barColor="bg-orange-500"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card 
                    onClick={() => router.push('/pending-logs')}
                    className="md:col-span-1 bg-primary/10 border-2 border-primary/20 hover:bg-primary/20 transition-all cursor-pointer group rounded-[1.5rem] p-6 shadow-xl"
                >
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Interaction Pulse</p>
                            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Pending Logs</h3>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                            <ClipboardCheck className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors">
                        Clear Documentation Queue <ArrowRight className="ml-2 h-3 w-3" />
                    </div>
                </Card>
            </div>

            {/* Stage Breakdown Section */}
            <Card className="bg-popover border-none rounded-[2rem] shadow-2xl overflow-hidden">
                <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between bg-card border-b border-border">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
                            <UsersRound className="h-6 w-6 text-primary" />
                            Stage Breakdown by Enabler
                        </CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">
                            Live distribution of active contacts across key preaching stages
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground pl-8 h-12">Enabler</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center h-12">FRP</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center h-12">SG-S</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center h-12">SG-W</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center h-12">16+ Rounds</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right pr-8 h-12">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {enablerBreakdown.length > 0 ? enablerBreakdown.map((entry) => (
                                    <TableRow key={entry.enablerId} className="border-b border-border hover:bg-muted/50 transition-colors">
                                        <TableCell 
                                            className="pl-8 py-5 font-black text-foreground uppercase text-xs cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName })}
                                        >
                                            {entry.enablerName}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div 
                                                className="inline-block p-1 hover:bg-muted/80 rounded-lg cursor-pointer transition-all active:scale-95"
                                                onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName, stage: 'FRP' })}
                                            >
                                                <Badge variant="outline" className="font-black border-green-500/20 text-green-500 bg-green-500/5 h-7 px-3">
                                                    {entry.frp}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div 
                                                className="inline-block p-1 hover:bg-muted/80 rounded-lg cursor-pointer transition-all active:scale-95"
                                                onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName, stage: 'SG-S' })}
                                            >
                                                <Badge variant="outline" className="font-black border-yellow-500/20 text-yellow-600 bg-yellow-500/5 h-7 px-3">
                                                    {entry.sgS}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div 
                                                className="inline-block p-1 hover:bg-muted/80 rounded-lg cursor-pointer transition-all active:scale-95"
                                                onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName, stage: 'SG-W' })}
                                            >
                                                <Badge variant="outline" className="font-black border-yellow-500/20 text-yellow-600 bg-yellow-500/5 h-7 px-3">
                                                    {entry.sgW}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div 
                                                className="inline-block p-1 hover:bg-muted/80 rounded-lg cursor-pointer transition-all active:scale-95"
                                                onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName, chantingRoundsMin: '16' })}
                                            >
                                                <Badge variant="outline" className="font-black border-primary/20 text-primary bg-primary/5 h-7 px-3">
                                                    {entry.sixteenRounder}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell 
                                            className="text-right pr-8 font-black text-sm text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName })}
                                        >
                                            {entry.totalContacts}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center opacity-30 italic font-bold text-foreground">
                                            No breakdown data available.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="md:hidden p-6 space-y-4">
                        {enablerBreakdown.map((entry) => (
                            <Card key={entry.enablerId} className="bg-muted/10 border-border p-5 rounded-[1.5rem] shadow-sm">
                                <div 
                                    className="flex justify-between items-center mb-4 cursor-pointer group"
                                    onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName })}
                                >
                                    <span className="font-black text-xs uppercase text-foreground group-hover:text-primary transition-colors">{entry.enablerName}</span>
                                    <Badge variant="secondary" className="text-[9px] font-black uppercase bg-muted/50 text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">{entry.totalContacts} Contacts</Badge>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    <MobileBreakdownItem 
                                        label="FRP" 
                                        count={entry.frp} 
                                        color="text-green-500" 
                                        onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName, stage: 'FRP' })}
                                    />
                                    <MobileBreakdownItem 
                                        label="SG-S" 
                                        count={entry.sgS} 
                                        color="text-yellow-600" 
                                        onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName, stage: 'SG-S' })}
                                    />
                                    <MobileBreakdownItem 
                                        label="SG-W" 
                                        count={entry.sgW} 
                                        color="text-yellow-600" 
                                        onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName, stage: 'SG-W' })}
                                    />
                                    <MobileBreakdownItem 
                                        label="16+ R" 
                                        count={entry.sixteenRounder} 
                                        color="text-primary" 
                                        onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName, chantingRoundsMin: '16' })}
                                    />
                                </div>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-popover border-none rounded-[2rem] shadow-2xl overflow-hidden">
                <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between bg-card border-b border-border">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
                            <Trophy className="h-6 w-6 text-orange-500" />
                            Outreach Leaderboard
                        </CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">
                            Cumulative activity metrics for callers in the selected range
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground pl-8 h-12">Caller Profile</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center h-12">Total Interactions</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center h-12">Spoken Duration</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right pr-8 h-12">Daily Activity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leaderboard.length > 0 ? leaderboard.map((entry) => (
                                <TableRow key={entry.callerId} className="border-b border-border hover:bg-muted/50 transition-colors">
                                    <TableCell 
                                        className="pl-8 py-5 cursor-pointer group"
                                        onClick={() => navigateToContacts({ scope: 'all', callerName: entry.callerName })}
                                    >
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-lg group-hover:scale-110 transition-transform">
                                                <AvatarImage src={entry.photoUrl} />
                                                <AvatarFallback className="bg-muted text-foreground font-black">{entry.callerName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-black text-foreground uppercase truncate group-hover:text-primary transition-colors">{entry.callerName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div 
                                            className="inline-block cursor-pointer active:scale-95 transition-transform"
                                            onClick={() => navigateToContacts({ scope: 'all', callerName: entry.callerName })}
                                        >
                                            <Badge className="bg-orange-500/10 text-orange-500 border-none font-black text-lg h-9 px-4 hover:bg-orange-500/20">
                                                {entry.totalCalls}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-sm text-foreground">
                                        {formatDuration(entry.totalDuration)}
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex flex-col items-end gap-1.5">
                                            {Object.entries(entry.dailyStats).map(([dateKey, stat]) => (
                                                <div 
                                                    key={dateKey} 
                                                    className="flex items-center gap-3 cursor-pointer group/date hover:bg-muted p-1 px-2 rounded-lg transition-colors"
                                                    onClick={() => navigateToContacts({ 
                                                        scope: 'all', 
                                                        callerName: entry.callerName, 
                                                        callDateFrom: dateKey, 
                                                        callDateTo: dateKey 
                                                    })}
                                                >
                                                    <span className="text-[9px] font-black uppercase text-muted-foreground group-hover/date:text-foreground">{format(new Date(dateKey), 'MMM dd')}</span>
                                                    <Badge variant="outline" className="text-[9px] font-black border-border text-primary bg-muted/50 group-hover/date:bg-primary group-hover/date:text-white transition-all">
                                                        {stat.count} calls
                                                    </Badge>
                                                    <span className="text-[9px] font-mono text-muted-foreground">{formatDuration(stat.duration)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center opacity-30 italic font-bold text-foreground">
                                        {syncStatus === 'syncing' ? 'Analyzing interaction data...' : 'No interactions recorded for this period.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
                <Card className="lg:col-span-4 bg-popover border-none rounded-[2rem] shadow-2xl overflow-hidden">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Manual Log Breakdown</CardTitle>
                        <Activity className="h-4 w-4 text-primary opacity-20" />
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[440px]">
                            <div className="px-4 pb-6 space-y-1">
                                {manualStatuses.map(status => (
                                    <StatusAccordion 
                                        key={status} 
                                        label={status} 
                                        count={reportAll?.subCategories[status] || 0} 
                                        breakdown={reportAll?.detailedBreakdown[status] || {}}
                                        onEventClick={(item) => navigateToContacts({ 
                                            scope: 'all', 
                                            callStatus: status, 
                                            eventName: item.event,
                                            callerName: item.callerName
                                        })}
                                        onHeaderClick={() => navigateToContacts({ scope: 'all', callStatus: status })}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-4 bg-popover border-none rounded-[2rem] shadow-2xl overflow-hidden border-l-4 border-l-primary/10">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Native App Activity</CardTitle>
                        <Smartphone className="h-4 w-4 text-primary opacity-40" />
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[440px]">
                            <div className="px-4 pb-6 space-y-1">
                                {deviceStatuses.map(status => (
                                    <StatusAccordion 
                                        key={status} 
                                        label={status.replace('Device: ', '')} 
                                        count={reportAll?.subCategories[status] || 0} 
                                        breakdown={reportAll?.detailedBreakdown[status] || {}}
                                        onEventClick={(item) => navigateToContacts({ 
                                            scope: 'all', 
                                            callStatus: status, 
                                            eventName: item.event,
                                            callerName: item.callerName
                                        })}
                                        onHeaderClick={() => navigateToContacts({ scope: 'all', callStatus: status })}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <div className="lg:col-span-4 space-y-4">
                    <SummaryMetricCard 
                        title="TOTAL INTERACTIONS" 
                        value={reportAll?.totalCalls || 0} 
                        icon={PhoneIncoming}
                        className="bg-card"
                        onClick={() => navigateToContacts({ scope: 'all' })}
                    />
                    <SummaryMetricCard 
                        title="ANSWERED (A1/Z/A4)" 
                        value={reportAll?.picked || 0} 
                        percentage={reportAll?.percentages.picked || 0}
                        icon={CheckCircle2}
                        color="bg-green-500"
                        showProgress
                        onClick={() => navigateToContacts({ scope: 'all', callStatus: 'A1 - Coming' })}
                    />
                    <SummaryMetricCard 
                        title="UNANSWERED (B/D/E)" 
                        value={reportAll?.notPicked || 0} 
                        percentage={reportAll?.percentages.notPicked || 0}
                        icon={PhoneOff}
                        color="bg-orange-600"
                        showProgress
                        onClick={() => navigateToContacts({ scope: 'all', callStatus: 'B - Not Answering' })}
                    />
                </div>
            </div>
        </main>
    </>
  );
}

function MiniStatCard({ title, value, icon: Icon, isTrend, onClick, colorClass, barColor = "bg-primary/20" }: { title: string, value?: number, icon: any, isTrend?: boolean, onClick?: () => void, colorClass?: string, barColor?: string }) {
    return (
        <Card 
            onClick={onClick}
            className={cn(
                "bg-popover border-none rounded-[1.5rem] p-5 pl-7 shadow-xl relative overflow-hidden group transition-all",
                onClick && "cursor-pointer hover:bg-muted hover:scale-[1.02] active:scale-95"
            )}
        >
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

function StatusAccordion({ label, count, breakdown, onHeaderClick, onEventClick }: { label: string, count: number, breakdown: Record<string, any>, onHeaderClick: () => void, onEventClick: (item: any) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const hasData = count > 0;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
            <div className={cn(
                "flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-transparent hover:bg-muted/40 transition-all group",
                isOpen && "bg-muted/50 border-border"
            )}>
                <div className="flex-1 cursor-pointer flex items-center gap-2" onClick={onHeaderClick}>
                    <span className={cn("text-[11px] font-bold text-foreground/80 group-hover:text-foreground transition-colors", label.includes('Device') && "text-blue-400")}>{label}</span>
                </div>
                <div className="flex items-center gap-3">
                    <Badge className={cn("border-none font-black text-[10px] min-w-[32px] h-6 justify-center", hasData ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground")}>{count}</Badge>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 p-0 hover:bg-muted" disabled={!hasData}>
                            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
                        </Button>
                    </CollapsibleTrigger>
                </div>
            </div>
            <CollapsibleContent className="px-1 py-3 space-y-2 animate-in slide-in-from-top-1 duration-200">
                {Object.values(breakdown).map((item: any, idx) => (
                    <div key={idx} onClick={() => onEventClick(item)} className="p-4 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 cursor-pointer group/item space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase text-foreground truncate leading-none">{item.event}</span>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] font-black border-primary/20 text-primary">{item.count}</Badge>
                                <span className="text-[8px] font-mono text-muted-foreground">{formatDuration(item.totalDuration)}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <div className="flex items-center gap-1.5 opacity-60">
                                <UserCheck className="h-3 w-3 text-primary" />
                                <span className="text-[9px] font-bold text-foreground/70 uppercase tracking-wide">Caller: {item.callerName}</span>
                            </div>
                            {item.ownerName && (
                                <div className="flex items-center gap-1.5 opacity-60">
                                    <Contact className="h-3 w-3 text-orange-400" />
                                    <span className="text-[9px] font-bold text-foreground/70 uppercase tracking-wide">Event Owner: {item.ownerName}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}

function SummaryMetricCard({ title, value, percentage, icon: Icon, color = "bg-primary", showProgress = false, className, onClick }: { title: string, value: number, percentage?: number, icon: any, color?: string, showProgress?: boolean, className?: string, onClick?: () => void }) {
    return (
        <Card onClick={onClick} className={cn("bg-popover border-none rounded-3xl p-6 relative overflow-hidden transition-all", className, onClick && "cursor-pointer hover:bg-muted/20 active:scale-95")}>
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-foreground">{value}</h3>
                        {percentage !== undefined && <span className="text-xs font-bold text-muted-foreground">({percentage}%)</span>}
                    </div>
                </div>
                <div className={cn("p-2 rounded-xl bg-muted/50", !className && "text-primary")}><Icon className="h-5 w-5" /></div>
            </div>
            {showProgress && (
                <div className="mt-6 space-y-1.5">
                    <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${percentage}%` }} />
                    </div>
                </div>
            )}
        </Card>
    );
}

function MobileBreakdownItem({ label, count, color, onClick }: { label: string, count: number, color: string, onClick?: () => void }) {
    return (
        <div 
            className={cn(
                "flex flex-col items-center gap-1.5 p-2 transition-all rounded-xl",
                onClick && "cursor-pointer hover:bg-muted active:scale-95"
            )}
            onClick={onClick}
        >
            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest text-center leading-none h-4 flex items-center">{label}</span>
            <span className={cn("text-xl font-black leading-none", color)}>{count}</span>
        </div>
    );
}
