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
    FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/auth-context';
import { getFolkGuides, getAssignableUsersForAssignments } from '@/services/user-service';
import { getFollowUpItemsForCurrentUser, getFollowUpSummaryForGuide } from '@/services/follow-up-service';
import { getGoals, getTeamGoalsSummary } from '@/services/goals-service';
import { getGoalCategories } from '@/services/settings-service';
import { groupEnablersByTeam } from '@/services/team-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { callStatuses } from '@/lib/types';
import type { AppUser, Goal } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { formatDuration } from '@/utils/format';
import { GoalAlerts } from '@/components/dashboard/goal-alerts';
import { TeamGoalsSummary as TeamGoalsTable } from '@/components/dashboard/team-goals-summary';
import { PrintableReport } from '@/components/dashboard/printable-report';

export default function DashboardPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ 
    from: startOfDay(new Date()), 
    to: endOfDay(new Date()) 
  });
  
  const [selectedFolkGuideId, setSelectedFolkGuideId] = useState<string>('all');
  const [folkGuides, setFGuides] = useState<AppUser[]>([]);
  const [followUpCount, setFollowUpCount] = useState<number | null>(null);
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [enablers, setEnablers] = useState<AppUser[]>([]);
  const [goalCategories, setGoalCategories] = useState<string[]>([]);
  
  const { data, syncStatus, isLoading, isRefetching } = useDashboardStats(dateRange, selectedFolkGuideId);

  useEffect(() => {
    if (!appUser) return;
    if (appUser.role.includes('Admin')) {
        getFolkGuides().then(setFGuides);
    }
    
    if (appUser.role.includes('Admin') || appUser.role.includes('Folk Guide')) {
        Promise.all([
            getGoals(appUser),
            getAssignableUsersForAssignments(appUser),
            getGoalCategories()
        ]).then(([g, e, c]) => {
            setGoals(g);
            setEnablers(e);
            setGoalCategories(c);
        });
    }
  }, [appUser]);

  useEffect(() => {
    if (!appUser) return;
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
  }, [appUser, syncStatus]);

  const stats = data?.stats;
  const reportAll = data?.callingReportAll;
  const leaderboard = data?.leaderboard || [];
  const enablerBreakdown = stats?.enablerBreakdown || [];

  const mergedBreakdown = useMemo(() => {
    return enablerBreakdown.map(stageEntry => {
        const chantingEntry = stats?.chantingBreakdown.find(c => c.enablerId === stageEntry.enablerId);
        return {
            ...stageEntry,
            rounds9to15: chantingEntry?.rounds9to15 || 0,
            rounds3to8: chantingEntry?.rounds3to8 || 0,
            rounds0to2: chantingEntry?.rounds0to2 || 0,
        };
    });
  }, [enablerBreakdown, stats?.chantingBreakdown]);

  const groupedBreakdown = useMemo(() => {
      return groupEnablersByTeam(mergedBreakdown, enablers, (item) => item.enablerId);
  }, [mergedBreakdown, enablers]);

  const groupedLeaderboard = useMemo(() => {
      return groupEnablersByTeam(leaderboard, enablers, (item) => item.callerId, (item) => item.callerName);
  }, [leaderboard, enablers]);

  const goalsSummary = useMemo(() => {
      return getTeamGoalsSummary(goals, enablers, goalCategories);
  }, [goals, enablers, goalCategories]);

  const grandTotals = useMemo(() => {
    return mergedBreakdown.reduce((acc, e) => ({
      frp: acc.frp + e.frp,
      sgW: acc.sgW + e.sgW,
      sgS: acc.sgS + e.sgS,
      sixteenRounder: acc.sixteenRounder + e.sixteenRounder,
      rounds9to15: acc.rounds9to15 + e.rounds9to15,
      rounds3to8: acc.rounds3to8 + e.rounds3to8,
      rounds0to2: acc.rounds0to2 + e.rounds0to2,
      totalContacts: acc.totalContacts + e.totalContacts,
    }), { frp: 0, sgW: 0, sgS: 0, sixteenRounder: 0, rounds9to15: 0, rounds3to8: 0, rounds0to2: 0, totalContacts: 0 });
  }, [mergedBreakdown]);

  const dateLabel = React.useMemo(() => {
      if (!dateRange?.from) return "All Time";
      if (dateRange.to && !isSameDay(dateRange.from, dateRange.to)) {
          return `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
      }
      return format(dateRange.from, "MMMM dd, yyyy");
  }, [dateRange]);

  const handlePrintAll = () => { window.print(); };

  const navigateToContacts = (params: Record<string, string>, includeDateRange: boolean = false) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
    });
    if (includeDateRange) {
      if (dateRange?.from) searchParams.append('callDateFrom', dateRange.from.toISOString());
      if (dateRange?.to) searchParams.append('callDateTo', dateRange.to.toISOString());
    }
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
                    ) : "Initializing statistics..."}
                </div>
            }
        >
            <div className="flex items-center gap-2">
                {(appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide')) && (
                    <Button onClick={handlePrintAll} className="h-9 px-4 font-black uppercase text-[10px] tracking-widest rounded-xl bg-orange-500 text-black hover:bg-orange-600 shadow-lg shadow-orange-500/20">
                        <Printer className="h-3.5 w-3.5 mr-2" />
                        Print Full Report
                    </Button>
                )}
                {isAdmin && (
                    <Select value={selectedFolkGuideId} onValueChange={setSelectedFolkGuideId}>
                        <SelectTrigger className="w-[180px] h-9 rounded-xl border-border bg-muted/50 text-foreground font-black text-[10px] uppercase">
                            <UsersRound className="h-3.5 w-3.5 mr-2" />
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
                            {isRefetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarIcon className="h-3.5 w-3.5" />}
                            {isRefetching ? (
                                <span className="text-[10px] uppercase">Updating...</span>
                            ) : dateRange?.from ? (
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

        <main className={cn(
            "flex-1 space-y-6 p-4 md:p-8 pt-0 pb-24 relative transition-opacity duration-300 print:hidden",
            isRefetching && "opacity-50 pointer-events-none"
        )}>
            {isRefetching && (
                <div className="absolute top-0 left-0 right-0 z-50">
                    <div className="h-0.5 w-full bg-primary animate-pulse" />
                </div>
            )}
            
            <GoalAlerts />

            <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
                <MiniStatCard 
                    title="ASSIGNED" 
                    value={(!isSyncStable && stats?.myContactsCount === 0) ? undefined : stats?.myContactsCount} 
                    icon={UserCircle} 
                    onClick={() => navigateToContacts({ scope: 'my' }, false)}
                    barColor="bg-primary"
                />
                <MiniStatCard 
                    title="TOTAL" 
                    value={(!isSyncStable && stats?.totalContactsCount === 0) ? undefined : stats?.totalContactsCount} 
                    icon={Users} 
                    onClick={() => navigateToContacts({ scope: 'all' }, false)}
                    barColor="bg-primary/40"
                />
                <MiniStatCard 
                    title="MY NEW" 
                    value={(!isSyncStable && stats?.myNewInRange === 0) ? undefined : stats?.myNewInRange} 
                    icon={UserPlus} 
                    isTrend
                    colorClass="text-orange-500"
                    onClick={() => navigateToContacts({ scope: 'my' }, true)}
                    barColor="bg-orange-500"
                />
                <MiniStatCard 
                    title="FOLLOW-UP" 
                    value={followUpCount ?? undefined} 
                    icon={AlertCircle} 
                    colorClass="text-red-500"
                    onClick={() => router.push('/follow-up')}
                    barColor="bg-red-500"
                />
                <MiniStatCard 
                    title="ALL NEW" 
                    value={(!isSyncStable && stats?.allNewInRange === 0) ? undefined : stats?.allNewInRange} 
                    icon={Users} 
                    isTrend 
                    colorClass="text-orange-500"
                    onClick={() => navigateToContacts({ scope: 'all' }, true)}
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

            {/* Unified Breakdown Section */}
            <Card className="bg-popover border-none rounded-[2rem] shadow-2xl overflow-hidden print:hidden">
                <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between bg-card border-b border-border">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
                            <UsersRound className="h-6 w-6 text-primary" />
                            Enabler Breakdown — Stage & Chanting
                        </CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">
                            Live distribution of active contacts across key preaching stages and chanting status
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="hidden lg:block overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="w-12 text-center font-black text-[9px] uppercase tracking-widest text-muted-foreground pl-8 h-12">#</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground h-12">Enabler</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center h-12">FRP</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center h-12">SG-W</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center h-12">SG-S</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center h-12">16+</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center h-12 border-l-2 border-border/50">9 – 15</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center h-12">3 – 8</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center h-12">0 – 2</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right pr-8 h-12">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mergedBreakdown.length > 0 && (
                                    <TableRow className="bg-primary/10 hover:bg-primary/10 border-b-2 border-primary/20 font-black">
                                        <TableCell className="text-center text-xs text-primary"><Sigma className="h-3 w-3 mx-auto" /></TableCell>
                                        <TableCell className="py-4 text-foreground uppercase text-xs">All Enablers</TableCell>
                                        <TableCell className="text-center">{grandTotals.frp}</TableCell>
                                        <TableCell className="text-center">{grandTotals.sgW}</TableCell>
                                        <TableCell className="text-center">{grandTotals.sgS}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge className="font-black bg-[#FF9800]/20 text-[#FF9800] border-none h-7 px-3">
                                                {grandTotals.sixteenRounder}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center border-l-2 border-border/50">{grandTotals.rounds9to15}</TableCell>
                                        <TableCell className="text-center">{grandTotals.rounds3to8}</TableCell>
                                        <TableCell className="text-center">{grandTotals.rounds0to2}</TableCell>
                                        <TableCell className="text-right pr-8 text-primary">{grandTotals.totalContacts}</TableCell>
                                    </TableRow>
                                )}

                                {groupedBreakdown.map((group) => {
                                    const teamTotals = group.items.reduce((acc, e) => ({
                                        frp: acc.frp + e.frp,
                                        sgW: acc.sgW + e.sgW,
                                        sgS: acc.sgS + e.sgS,
                                        sixteenRounder: acc.sixteenRounder + e.sixteenRounder,
                                        rounds9to15: acc.rounds9to15 + e.rounds9to15,
                                        rounds3to8: acc.rounds3to8 + e.rounds3to8,
                                        rounds0to2: acc.rounds0to2 + e.rounds0to2,
                                        totalContacts: acc.totalContacts + e.totalContacts,
                                    }), { frp: 0, sgW: 0, sgS: 0, sixteenRounder: 0, rounds9to15: 0, rounds3to8: 0, rounds0to2: 0, totalContacts: 0 });

                                    return (
                                        <React.Fragment key={group.teamId || 'unassigned'}>
                                            <TableRow className="bg-primary/5 hover:bg-primary/5 border-b border-primary/10 font-bold">
                                                <TableCell className="text-center"><Users className="h-3 w-3 mx-auto text-primary/60" /></TableCell>
                                                <TableCell className="py-2 text-[10px] uppercase text-primary tracking-wider">TEAM: {group.teamName}</TableCell>
                                                <TableCell className="text-center text-[10px]">{teamTotals.frp}</TableCell>
                                                <TableCell className="text-center text-[10px]">{teamTotals.sgW}</TableCell>
                                                <TableCell className="text-center text-[10px]">{teamTotals.sgS}</TableCell>
                                                <TableCell className="text-center text-[10px]">{teamTotals.sixteenRounder}</TableCell>
                                                <TableCell className="text-center border-l-2 border-border/50 text-[10px]">{teamTotals.rounds9to15}</TableCell>
                                                <TableCell className="text-center text-[10px]">{teamTotals.rounds3to8}</TableCell>
                                                <TableCell className="text-center text-[10px]">{teamTotals.rounds0to2}</TableCell>
                                                <TableCell className="text-right pr-8 text-[10px]">{teamTotals.totalContacts}</TableCell>
                                            </TableRow>

                                            {group.items.map((entry, index) => (
                                                <TableRow key={entry.enablerId} className="border-b border-border hover:bg-muted/50 transition-colors">
                                                    <TableCell className="pl-8 py-5 text-center font-black text-[10px] text-muted-foreground">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell 
                                                        className="py-5 font-black text-foreground uppercase text-xs cursor-pointer hover:text-primary transition-colors"
                                                        onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName }, false)}
                                                    >
                                                        {entry.enablerName}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div 
                                                            className="inline-block p-1 hover:bg-muted/80 rounded-lg cursor-pointer transition-all"
                                                            onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName, stage: 'FRP' }, false)}
                                                        >
                                                            <Badge variant="outline" className="font-black border-green-500/20 text-green-500 bg-green-500/5 h-7 px-3">
                                                                {entry.frp}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div 
                                                            className="inline-block p-1 hover:bg-muted/80 rounded-lg cursor-pointer transition-all"
                                                            onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName, stage: 'SG-W' }, false)}
                                                        >
                                                            <Badge variant="outline" className="font-black border-yellow-500/20 text-yellow-600 bg-yellow-500/5 h-7 px-3">
                                                                {entry.sgW}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div 
                                                            className="inline-block p-1 hover:bg-muted/80 rounded-lg cursor-pointer transition-all"
                                                            onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName, stage: 'SG-S' }, false)}
                                                        >
                                                            <Badge variant="outline" className="font-black border-yellow-500/20 text-yellow-600 bg-yellow-500/5 h-7 px-3">
                                                                {entry.sgS}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div 
                                                            className="inline-block p-1 hover:bg-muted/80 rounded-lg cursor-pointer transition-all"
                                                            onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName, chantingRoundsMin: '16' }, false)}
                                                        >
                                                            <Badge className="font-black bg-[#FF9800]/10 text-[#FF9800] border-none h-7 px-3">
                                                                {entry.sixteenRounder}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center border-l-2 border-border/50">
                                                        <div 
                                                            className="inline-block p-1 hover:bg-muted/80 rounded-lg cursor-pointer transition-all"
                                                            onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName, chantingRoundsMin: '9', chantingRoundsMax: '15' }, false)}
                                                        >
                                                            <Badge variant="outline" className="font-black border-primary/20 text-primary bg-primary/5 h-7 px-3">
                                                                {entry.rounds9to15}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div 
                                                            className="inline-block p-1 hover:bg-muted/80 rounded-lg cursor-pointer transition-all"
                                                            onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName, chantingRoundsMin: '3', chantingRoundsMax: '8' }, false)}
                                                        >
                                                            <Badge variant="outline" className="font-black border-muted-foreground/20 text-muted-foreground bg-muted/10 h-7 px-3">
                                                                {entry.rounds3to8}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div 
                                                            className="inline-block p-1 hover:bg-muted/80 rounded-lg cursor-pointer transition-all"
                                                            onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName, chantingRoundsMin: '0', chantingRoundsMax: '2' }, false)}
                                                        >
                                                            <Badge variant="outline" className="font-black border-muted-foreground/10 text-muted-foreground/60 h-7 px-3">
                                                                {entry.rounds0to2}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell 
                                                        className="text-right pr-8 font-black text-sm text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                                                        onClick={() => navigateToContacts({ scope: 'all', enablerId: entry.enablerId, enablerName: entry.enablerName }, false)}
                                                    >
                                                        {entry.totalContacts}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}

                                {mergedBreakdown.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-32 text-center opacity-30 italic font-bold text-foreground">
                                            No breakdown data available.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {(appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide')) && (
                <TeamGoalsTable 
                    goals={goals} 
                    enablers={enablers} 
                    categories={goalCategories} 
                />
            )}

            <Card className="bg-popover border-none rounded-[2rem] shadow-2xl overflow-hidden print:hidden">
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
                            {groupedLeaderboard.length > 0 ? groupedLeaderboard.map((group) => {
                                const teamTotals = group.items.reduce((acc, entry) => ({
                                    totalCalls: acc.totalCalls + entry.totalCalls,
                                    totalDuration: acc.totalDuration + entry.totalDuration
                                }), { totalCalls: 0, totalDuration: 0 });

                                return (
                                    <React.Fragment key={group.teamId || 'unassigned'}>
                                        <TableRow className="bg-orange-500/5 hover:bg-orange-500/10 border-b border-orange-500/10 font-bold">
                                            <TableCell className="pl-8 py-2 flex items-center gap-2">
                                                <Users className="h-3 w-3 text-orange-500/60" />
                                                <span className="text-[10px] uppercase text-orange-600 tracking-wider">TEAM: {group.teamName}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className="bg-orange-500/10 text-orange-600 border-none font-black text-[10px] h-6 px-3">{teamTotals.totalCalls} Calls</Badge>
                                            </TableCell>
                                            <TableCell className="text-center text-[10px] font-mono text-orange-600">
                                                {formatDuration(teamTotals.totalDuration)}
                                            </TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>

                                        {group.items.map((entry) => (
                                            <TableRow key={entry.callerId} className="border-b border-border hover:bg-muted/50 transition-colors">
                                                <TableCell 
                                                    className="pl-8 py-5 cursor-pointer group"
                                                    onClick={() => navigateToContacts({ scope: 'all', callerName: entry.callerName }, false)}
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
                                                        onClick={() => navigateToContacts({ scope: 'all', callerName: entry.callerName }, false)}
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
                                                                }, false)}
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
                                        ))}
                                    </React.Fragment>
                                );
                            }) : (
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

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 print:hidden">
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
                                        }, true)}
                                        onHeaderClick={() => navigateToContacts({ scope: 'all', callStatus: status }, true)}
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
                                        }, true)}
                                        onHeaderClick={() => navigateToContacts({ scope: 'all', callStatus: status }, true)}
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
                        onClick={() => navigateToContacts({ scope: 'all' }, true)}
                    />
                    <SummaryMetricCard 
                        title="ANSWERED (A1/Z/A4)" 
                        value={reportAll?.picked || 0} 
                        percentage={reportAll?.percentages.picked || 0}
                        icon={CheckCircle2}
                        color="bg-green-500"
                        showProgress
                        onClick={() => navigateToContacts({ scope: 'all', callStatus: 'A1 - Coming' }, true)}
                    />
                    <SummaryMetricCard 
                        title="UNANSWERED (B/D/E)" 
                        value={reportAll?.notPicked || 0} 
                        percentage={reportAll?.percentages.notPicked || 0}
                        icon={PhoneOff}
                        color="bg-orange-600"
                        showProgress
                        onClick={() => navigateToContacts({ scope: 'all', callStatus: 'B - Not Answering' }, true)}
                    />
                </div>
            </div>
        </main>

        {(appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide')) && data && (
            <PrintableReport 
                data={data} 
                goalsSummary={goalsSummary} 
                enablers={enablers} 
                dateLabel={dateLabel} 
            />
        )}
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
