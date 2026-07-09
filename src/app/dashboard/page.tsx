'use client';

import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay, format, isSameDay } from 'date-fns';
import { useRouter } from 'next/navigation';
import { FullPageLoader } from '@/components/loader';
import { PageHeader } from '@/components/page-header';
import { AppSidebar } from '@/components/app-sidebar';
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
    Timer,
    UserCheck,
    Contact,
    UserPlus
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
import type { AppUser } from '@/lib/types';
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
  
  const { data, isLoading, isRefetching } = useDashboardStats(dateRange, selectedFolkGuideId);

  useEffect(() => {
    if (appUser?.role.includes('Admin')) {
        getFolkGuides().then(setFGuides);
    }
  }, [appUser]);

  const stats = data?.stats;
  const reportAll = data?.callingReportAll;
  const leaderboard = data?.leaderboard || [];

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

  if (isLoading && !data) return <FullPageLoader />;

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#11121d]">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <PageHeader 
            title="Dashboard"
            description={isRefetching ? "Syncing metrics..." : "Real-time analytics for your spiritual outreach batches."}
        >
            <div className="flex items-center gap-2">
                {isAdmin && (
                    <Select value={selectedFolkGuideId} onValueChange={setSelectedFolkGuideId}>
                        <SelectTrigger className="w-[180px] h-9 rounded-xl border-white/10 bg-white/5 text-white font-black text-[10px] uppercase">
                            <UsersRound className="h-3 w-3 mr-2" />
                            <SelectValue placeholder="All Guides" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e1e2e] border-white/10 text-white">
                            <SelectItem value="all">All Teams</SelectItem>
                            {folkGuides.map(guide => (
                                <SelectItem key={guide.id} value={guide.id}>{guide.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 rounded-xl border-white/10 text-white bg-white/5 font-black px-4 gap-2">
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
                    <PopoverContent className="w-auto p-0 border-none bg-[#1e1e2e]" align="end">
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
                    value={stats?.myContactsCount || 0} 
                    icon={UserCircle} 
                    onClick={() => navigateToContacts({ scope: 'my' })}
                    barColor="bg-[#3F51B5]"
                />
                <MiniStatCard 
                    title="TOTAL" 
                    value={stats?.totalContactsCount || 0} 
                    icon={Users} 
                    onClick={() => navigateToContacts({ scope: 'all' })}
                    barColor="bg-[#929DD8]"
                />
                <MiniStatCard 
                    title="MY NEW" 
                    value={stats?.myNewInRange || 0} 
                    icon={UserPlus} 
                    isTrend
                    colorClass="text-[#FF9800]"
                    onClick={() => navigateToContacts({ scope: 'my' })}
                    barColor="bg-[#FF9800]"
                />
                <MiniStatCard 
                    title="ALL NEW" 
                    value={stats?.allNewInRange || 0} 
                    icon={Users} 
                    isTrend 
                    colorClass="text-[#FF9800]"
                    onClick={() => navigateToContacts({ scope: 'all' })}
                    barColor="bg-[#FF9800]"
                />
            </div>

            {/* Performance Leaderboard */}
            <Card className="bg-[#1e1e2e] border-none rounded-[2rem] shadow-2xl overflow-hidden">
                <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between bg-[#1b1d32] border-b border-white/5">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <Trophy className="h-6 w-6 text-[#FF9800]" />
                            Outreach Leaderboard
                        </CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                            Cumulative activity metrics for callers in the selected range
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-8 h-12">Caller Profile</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-center h-12">Total Interactions</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-center h-12">Spoken Duration</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-right pr-8 h-12">Daily Activity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leaderboard.length > 0 ? leaderboard.map((entry) => (
                                <TableRow key={entry.callerId} className="border-b border-white/5 hover:bg-white/[0.02]">
                                    <TableCell className="pl-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-lg">
                                                <AvatarImage src={entry.photoUrl} />
                                                <AvatarFallback className="bg-[#161623] text-white font-black">{entry.callerName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-black text-white uppercase truncate">{entry.callerName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className="bg-[#FF9800]/10 text-[#FF9800] border-none font-black text-lg h-9 px-4">
                                            {entry.totalCalls}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-sm text-slate-300">
                                        {formatDuration(entry.totalDuration)}
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex flex-col items-end gap-1.5">
                                            {Object.entries(entry.dailyStats).map(([dateKey, stat]) => (
                                                <div key={dateKey} className="flex items-center gap-3">
                                                    <span className="text-[9px] font-black uppercase text-slate-500">{format(new Date(dateKey), 'MMM dd')}</span>
                                                    <Badge variant="outline" className="text-[9px] font-black border-white/10 text-primary bg-white/5">
                                                        {stat.count} calls
                                                    </Badge>
                                                    <span className="text-[9px] font-mono text-slate-400">{formatDuration(stat.duration)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center opacity-30 italic font-bold text-white">
                                        No interactions recorded for this period.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
                <Card className="lg:col-span-4 bg-[#1e1e2e] border-none rounded-[2rem] shadow-2xl overflow-hidden">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Manual Log Breakdown</CardTitle>
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

                <Card className="lg:col-span-4 bg-[#1e1e2e] border-none rounded-[2rem] shadow-2xl overflow-hidden border-l-4 border-l-primary/10">
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
                        className="bg-[#1b1d32]"
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
                        color="bg-yellow-600"
                        showProgress
                        onClick={() => navigateToContacts({ scope: 'all', callStatus: 'B - Not Answering' })}
                    />
                </div>
            </div>
        </main>
      </div>
    </div>
  );
}

function MiniStatCard({ title, value, icon: Icon, isTrend, onClick, colorClass, barColor = "bg-primary/20" }: { title: string, value?: number, icon: any, isTrend?: boolean, onClick?: () => void, colorClass?: string, barColor?: string }) {
    return (
        <Card 
            onClick={onClick}
            className={cn(
                "bg-[#1e1e2e] border-none rounded-[1.5rem] p-5 pl-7 shadow-xl relative overflow-hidden group transition-all",
                onClick && "cursor-pointer hover:bg-[#252538] hover:scale-[1.02] active:scale-95"
            )}
        >
            <div className={cn("absolute left-0 top-4 bottom-4 w-1 rounded-r-full transition-colors", barColor)} />
            <div className="relative z-10 space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{title}</p>
                <h3 className={cn("text-3xl font-black text-white tracking-tighter truncate", colorClass)}>
                    {isTrend && '+'} {value || 0}
                </h3>
            </div>
            <Icon className="absolute top-4 right-4 h-5 w-5 text-slate-500/20 group-hover:text-primary/40 transition-colors" />
        </Card>
    );
}

function StatusAccordion({ label, count, breakdown, onHeaderClick, onEventClick }: { label: string, count: number, breakdown: Record<string, any>, onHeaderClick: () => void, onEventClick: (item: any) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const hasData = count > 0;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
            <div className={cn(
                "flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-transparent hover:bg-white/[0.04] transition-all group",
                isOpen && "bg-white/[0.05] border-white/5"
            )}>
                <div className="flex-1 cursor-pointer flex items-center gap-2" onClick={onHeaderClick}>
                    <span className={cn("text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors", label.includes('Device') && "text-blue-400")}>{label}</span>
                </div>
                <div className="flex items-center gap-3">
                    <Badge className={cn("border-none font-black text-[10px] min-w-[32px] h-6 justify-center", hasData ? "bg-primary/20 text-primary" : "bg-white/5 text-slate-600")}>{count}</Badge>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 p-0 hover:bg-white/10" disabled={!hasData}>
                            <ChevronDown className={cn("h-3.5 w-3.5 text-slate-600 transition-transform duration-200", isOpen && "rotate-180")} />
                        </Button>
                    </CollapsibleTrigger>
                </div>
            </div>
            <CollapsibleContent className="px-1 py-3 space-y-2 animate-in slide-in-from-top-1 duration-200">
                {Object.values(breakdown).map((item: any, idx) => (
                    <div key={idx} onClick={() => onEventClick(item)} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/5 cursor-pointer group/item space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase text-white truncate leading-none">{item.event}</span>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] font-black border-primary/20 text-primary">{item.count}</Badge>
                                <span className="text-[8px] font-mono text-slate-500">{formatDuration(item.totalDuration)}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <div className="flex items-center gap-1.5 opacity-60">
                                <UserCheck className="h-3 w-3 text-primary" />
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide">Caller: {item.callerName}</span>
                            </div>
                            {item.ownerName && (
                                <div className="flex items-center gap-1.5 opacity-60">
                                    <Contact className="h-3 w-3 text-orange-400" />
                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide">Event Owner: {item.ownerName}</span>
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
        <Card onClick={onClick} className={cn("bg-[#1e1e2e] border-none rounded-3xl p-6 relative overflow-hidden transition-all", className, onClick && "cursor-pointer hover:bg-white/[0.02] active:scale-95")}>
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-white">{value}</h3>
                        {percentage !== undefined && <span className="text-xs font-bold text-slate-500">({percentage}%)</span>}
                    </div>
                </div>
                <div className={cn("p-2 rounded-xl bg-white/5", !className && "text-primary")}><Icon className="h-5 w-5" /></div>
            </div>
            {showProgress && (
                <div className="mt-6 space-y-1.5">
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${percentage}%` }} />
                    </div>
                </div>
            )}
        </Card>
    );
}
