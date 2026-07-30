'use client';

import * as React from 'react';
import { 
  AlertCircle, 
  Clock, 
  UserX, 
  RefreshCw, 
  Loader2, 
  PhoneCall, 
  ChevronRight, 
  Users,
  Search,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppToast } from '@/contexts/toast-context';
import { PageHeader } from '@/components/page-header';
import { 
  getFollowUpItemsForCurrentUser, 
  getFollowUpSummaryForGuide,
  getFollowUpItemsForEnabler,
  type FollowUpItem,
  type EnablerFollowUpSummary
} from '@/services/follow-up-service';
import { updatePerson } from '@/services/people-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DetailedLogCallDialog } from '@/components/detailed-log-call-dialog';
import { formatDistanceToNow } from 'date-fns';
import { safeDate } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { CallLog } from '@/lib/types';

export default function FollowUpPage() {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  
  const [items, setItems] = React.useState<FollowUpItem[]>([]);
  const [summaries, setSummaries] = React.useState<EnablerFollowUpSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [drillDownEnabler, setDrillDownEnabler] = React.useState<EnablerFollowUpSummary | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  const isPrivileged = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');

  const fetchData = React.useCallback(async () => {
    if (!appUser) return;
    setIsLoading(true);
    try {
      if (isPrivileged && !drillDownEnabler) {
        const summaryData = await getFollowUpSummaryForGuide(appUser);
        setSummaries(summaryData);
      } else {
        const itemData = drillDownEnabler 
            ? await getFollowUpItemsForEnabler(drillDownEnabler.enablerId)
            : await getFollowUpItemsForCurrentUser(appUser);
        setItems(itemData);
      }
    } catch (e) {
      toast({ variant: 'destructive', title: "Sync Failed" });
    } finally {
      setIsLoading(false);
    }
  }, [appUser, isPrivileged, drillDownEnabler, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogSave = async (personId: string, details: any) => {
    if (!appUser) return;
    try {
      const callLog: Partial<CallLog> = {
        calledAt: new Date().toISOString(),
        remark: details.notes || '',
        status: details.outcome as any,
        event: details.eventName,
        callerId: appUser.id,
        callerName: appUser.name,
      };

      await updatePerson(personId, { 
        lastCallStatus: details.outcome as any,
        lastCallRemark: details.notes,
        lastCallAt: '__now__',
        callHistory: [callLog as CallLog] 
      }, appUser);

      toast({ title: "Milestone Logged" });
      fetchData();
    } catch (e) {
      toast({ variant: 'destructive', title: "Save Failed" });
    }
  };

  const filteredItems = items.filter(i => 
    i.person.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.person.phone.includes(searchTerm)
  );

  return (
    <>
      <PageHeader 
        title={drillDownEnabler ? `Follow-Ups: ${drillDownEnabler.enablerName}` : "Needs Attention"} 
        description={drillDownEnabler ? "Reviewing neglected contacts for team member." : "Contacts who are slipping through the cracks."}
      >
        <div className="flex items-center gap-2">
            {drillDownEnabler && (
                <Button variant="outline" size="sm" onClick={() => setDrillDownEnabler(null)} className="h-9 rounded-xl font-bold">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Team List
                </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="h-9 rounded-xl font-bold">
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} /> Refresh
            </Button>
        </div>
      </PageHeader>

      <main className="flex-1 p-4 sm:p-6 sm:pt-0 space-y-8 pb-32">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-50 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Analyzing Stagnant Pulses...</p>
          </div>
        ) : isPrivileged && !drillDownEnabler ? (
          <div className="space-y-6">
            <Card className="rounded-[2rem] border-none shadow-2xl overflow-hidden bg-popover">
              <CardHeader className="p-8 pb-4 bg-card border-b border-border">
                <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  Team Neglect Roll-up
                </CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Attention gaps across the preaching roster.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-border">
                      <TableHead className="pl-8 text-[10px] font-black uppercase">Enabler</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center">Never</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center">Overdue</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center">Stale</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-right pr-8">Total Needs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaries.map((s) => (
                      <TableRow 
                        key={s.enablerId} 
                        className="border-border hover:bg-muted/50 cursor-pointer h-16 transition-colors"
                        onClick={() => setDrillDownEnabler(s)}
                      >
                        <TableCell className="pl-8">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs">{s.enablerName[0]}</div>
                                <span className="font-bold text-sm uppercase">{s.enablerName}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-muted-foreground">{s.never}</TableCell>
                        <TableCell className="text-center font-bold text-red-500">{s.overdue}</TableCell>
                        <TableCell className="text-center font-bold text-orange-500">{s.stale}</TableCell>
                        <TableCell className="text-right pr-8">
                            <Badge variant={s.total > 10 ? 'destructive' : 'secondary'} className="h-7 px-4 rounded-xl font-black text-xs">
                                {s.total} <ChevronRight className="ml-1 h-3 w-3" />
                            </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {summaries.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground opacity-30 italic">No enablers identified.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <SummaryMetricCard title="Never Reached" count={items.filter(i => i.tier === 'never').length} color="bg-blue-500" />
              <SummaryMetricCard title="Overdue Call" count={items.filter(i => i.tier === 'overdue').length} color="bg-red-500" />
              <SummaryMetricCard title="Stale Follow-up" count={items.filter(i => i.tier === 'stale').length} color="bg-orange-500" />
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search neglecting contacts..." 
                className="h-14 pl-12 rounded-2xl bg-card border-none text-foreground font-bold shadow-xl focus-visible:ring-primary"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              {filteredItems.map((item) => (
                <Card key={item.person.id} className="bg-popover border-none shadow-xl rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-4 min-w-0">
                        <Avatar className="h-14 w-14 border-2 border-primary/20 rounded-2xl shadow-lg">
                          <AvatarImage src={item.person.photoUrl} className="object-cover" />
                          <AvatarFallback className="bg-muted text-foreground font-black">{item.person.fullName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h3 className="font-black text-foreground uppercase truncate">{item.person.fullName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                             <Badge variant="outline" className="text-[8px] font-black uppercase bg-primary/5 text-primary border-primary/10">{item.person.currentFolkStage}</Badge>
                             <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.person.phone}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                             <TierBadge tier={item.tier} />
                             <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                                <Clock className="h-3 w-3" />
                                {item.tier === 'never' ? 'Waiting since registration' : `Last call ${formatDistanceToNow(safeDate(item.person.lastCallAt)!, { addSuffix: true })}`}
                             </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 shrink-0 justify-end">
                        <DetailedLogCallDialog 
                          onLogCall={(details) => handleLogSave(item.person.id, details)}
                          trigger={
                            <Button className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground shadow-xl shadow-primary/10">
                              <PhoneCall className="mr-2 h-4 w-4" /> Resolve Now
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredItems.length === 0 && (
                <div className="py-32 text-center space-y-6 bg-muted/20 border-2 border-dashed border-border rounded-[3rem]">
                   <CheckCircle2 className="h-16 w-16 mx-auto mb-2 text-green-500 opacity-20" />
                   <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.3em]">Queue is currently clear!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function SummaryMetricCard({ title, count, color }: { title: string, count: number, color: string }) {
    return (
        <Card className="bg-popover border-none shadow-lg rounded-[1.5rem] p-6 relative overflow-hidden">
            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", color)} />
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
            <h3 className="text-3xl font-black text-foreground leading-none">{count}</h3>
        </Card>
    );
}

function TierBadge({ tier }: { tier: FollowUpItem['tier'] }) {
    switch (tier) {
        case 'never': return <Badge className="bg-blue-500/10 text-blue-500 border-none font-black text-[8px] uppercase px-2 h-5">Never Contacted</Badge>;
        case 'overdue': return <Badge className="bg-red-500/10 text-red-500 border-none font-black text-[8px] uppercase px-2 h-5">Overdue Callback</Badge>;
        case 'stale': return <Badge className="bg-orange-500/10 text-orange-500 border-none font-black text-[8px] uppercase px-2 h-5">SLA Stale</Badge>;
    }
}
