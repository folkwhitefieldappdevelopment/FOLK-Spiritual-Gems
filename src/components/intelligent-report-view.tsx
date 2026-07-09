'use client';

import * as React from 'react';
import { 
  Zap, 
  AlertCircle, 
  Trophy, 
  Activity, 
  TrendingUp,
  CheckCircle2,
  Send,
  Loader2,
  Clock,
  Flame
} from 'lucide-react';
import type { Person, Group, GroupEvent } from '@/lib/types';
import { calculateGroupInsights, type IntelligenceInsights } from '@/services/intelligence-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useAppToast } from '@/contexts/toast-context';
import { queuePulseReport } from '@/services/mail-service';
import { StarRating } from './star-rating';
import { formatDistanceToNow } from 'date-fns';
import { safeDate } from '@/utils/date';
import { cn } from '@/lib/utils';
import { getGroupEvents } from '@/services/attendance-service';

export function IntelligentReportView({ group, people }: { group: Group, people: Person[] }) {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  
  const [insights, setInsights] = React.useState<IntelligenceInsights | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [email, setEmail] = React.useState(appUser?.email || '');
  const [isSending, setIsSending] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const evs = await getGroupEvents(group.id);
        const data = await calculateGroupInsights(people, evs);
        setInsights(data);
      } catch (e) {
        console.error("Pulse analysis error", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [people, group.id]);

  const handleSendEmail = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast({ variant: 'destructive', title: 'Invalid Email' });
      return;
    }
    if (!insights) return;

    setIsSending(true);
    try {
      await queuePulseReport(trimmedEmail, group, insights);
      toast({ title: 'Report Dispatched', description: `Full progress pulse sent to ${trimmedEmail}.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Dispatch Failed' });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading || !insights) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 opacity-50">
        <Activity className="h-10 w-10 animate-pulse text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Processing Statistical Pulse...</p>
      </div>
    );
  }

  const { summary, dangerZone, enablerLeaderboard, chantingBrackets, starPerformers } = insights;

  return (
    <div className="space-y-12 pb-32 animate-in fade-in duration-700">
      <div className="flex flex-col xl:flex-row items-center justify-between gap-8">
          <div className="space-y-1 text-center xl:text-left">
              <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tighter">Group Intelligence</h2>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em]">Statistical Pulse for {group.name}</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-stretch gap-4 w-full xl:w-auto">
              <div className="bg-[#1e1e2e] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex-1 md:min-w-[400px]">
                  <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1 mb-2 block">Email Performance Summary</Label>
                  <div className="flex gap-2">
                      <Input 
                        placeholder="Recipient email address..." 
                        value={email} 
                        onChange={e => setEmail(e.target.value)}
                        className="h-14 bg-[#161623] border-white/5 text-white font-black rounded-2xl focus-visible:ring-primary shadow-inner text-sm"
                      />
                      <Button 
                        size="icon" 
                        onClick={handleSendEmail} 
                        disabled={isSending || !email}
                        className="h-14 w-14 shrink-0 rounded-2xl bg-primary shadow-xl shadow-primary/20 transition-all active:scale-95"
                      >
                        {isSending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
                      </Button>
                  </div>
              </div>

              <div className="bg-[#1e1e2e] p-6 rounded-[2.5rem] border border-white/5 flex items-center gap-8 shadow-2xl justify-center shrink-0">
                  <div className="text-center">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Health Score</p>
                      <div className="flex items-center justify-center gap-2">
                        <span className={cn(
                            "text-3xl font-black",
                            summary.healthScore > 70 ? "text-green-500" : summary.healthScore > 40 ? "text-yellow-500" : "text-red-500"
                        )}>{summary.healthScore}%</span>
                        <TrendingUp className={cn("h-5 w-5", summary.healthScore > 50 ? "text-green-500" : "text-red-500")} />
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Chanting Progress Dashboard */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-lg">
                <Flame className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Chanting Progress</h3>
        </div>
        
        <ScrollArea className="w-full pb-4">
          <div className="flex gap-6 min-w-max pb-4">
            {Object.entries(chantingBrackets).map(([key, bracket]) => (
                <Card key={key} className="w-[300px] sm:w-[340px] bg-[#1e1e2e] border-none rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="bg-[#1b1d32] border-b border-white/5 py-5 px-8">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-black text-[#FF9800] uppercase tracking-widest">{bracket.label}</CardTitle>
                            <Badge className="bg-white/5 text-white/40 border-none font-black">{bracket.count} souls</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[320px]">
                            <div className="p-6 space-y-3">
                                {bracket.people.map(p => (
                                    <div key={p.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0">
                                            <AvatarImage src={p.photoUrl} className="object-cover" />
                                            <AvatarFallback className="bg-[#161623] text-white font-black">{p.fullName[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-black text-white uppercase truncate">{p.fullName}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <StarRating value={p.sgRating || 0} size={10} />
                                                <span className="text-[8px] font-black text-slate-500 uppercase truncate">By {p.enablerInTouchWith || 'Unassigned'}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[8px] font-bold text-slate-600 uppercase mt-1.5">
                                                <Clock className="h-2 w-2" />
                                                {p.lastCallAt ? formatDistanceToNow(safeDate(p.lastCallAt)!, { addSuffix: true }) : 'Never'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {bracket.people.length === 0 && (
                                    <div className="py-20 text-center opacity-20 italic text-[10px] font-black uppercase tracking-widest text-white">No entries found</div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="bg-white/5" />
        </ScrollArea>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Card className="lg:col-span-7 bg-[#1e1e2e] border-none rounded-[3rem] shadow-2xl overflow-hidden">
              <CardHeader className="p-10 pb-4 bg-[#1b1d32] border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <AlertCircle className="h-6 w-6 text-red-500" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Stagnant for 4+ days</CardDescription>
                    </div>
                    <Badge variant="destructive" className="font-black text-[10px] px-4 h-7 rounded-full bg-red-500/20 text-red-500 border-none">{dangerZone.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                    <div className="p-8 space-y-3">
                        {dangerZone.length > 0 ? dangerZone.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-5 rounded-[2rem] bg-white/[0.02] border border-white/5">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-14 w-14 border-2 border-red-500/20 rounded-2xl shrink-0"><AvatarImage src={p.photoUrl} className="object-cover" /><AvatarFallback>{p.fullName[0]}</AvatarFallback></Avatar>
                                    <div className="min-w-0">
                                        <p className="text-base font-black text-white uppercase truncate">{p.fullName}</p>
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Enabler: {p.enablerInTouchWith || 'Unassigned'}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">STAGNANT</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{p.lastCallAt ? formatDistanceToNow(safeDate(p.lastCallAt)!, { addSuffix: true }) : 'Forever'}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="py-24 text-center opacity-20 italic text-xs font-black uppercase tracking-[0.4em] text-white">Zone is Clear</div>
                        )}
                    </div>
                </ScrollArea>
              </CardContent>
          </Card>

          <div className="lg:col-span-5 space-y-8">
              <Card className="bg-[#1e1e2e] border-none rounded-[3rem] shadow-2xl overflow-hidden">
                <CardHeader className="p-10 pb-4 bg-[#1b1d32] border-b border-white/5">
                    <CardTitle className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <Trophy className="h-6 w-6 text-[#FF9800]" />
                        Active Souls (Top 6)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-4">
                    {starPerformers.length > 0 ? starPerformers.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-slate-700 w-4">{idx + 1}</span>
                                <Avatar className="h-10 w-10 border-2 border-primary/20"><AvatarImage src={p.photoUrl} className="object-cover"/><AvatarFallback>{p.fullName[0]}</AvatarFallback></Avatar>
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-white uppercase truncate">{p.fullName}</p>
                                    <p className="text-[9px] font-bold text-[#FF9800] uppercase">Active Participant</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <Badge className="bg-primary/20 text-primary border-none font-black text-lg h-10 px-4 rounded-xl">{p.attendanceHistory?.length || 0}</Badge>
                            </div>
                        </div>
                    )) : (
                        <div className="py-20 text-center opacity-20 italic text-xs font-black uppercase tracking-[0.4em] text-white">No activity yet</div>
                    )}
                </CardContent>
              </Card>

              <Card className="bg-[#1b1d32] border-none rounded-[3rem] shadow-2xl overflow-hidden">
                <CardHeader className="p-10 pb-4"><CardTitle className="text-lg font-black text-white uppercase tracking-tight">Team Reach Dashboard</CardTitle></CardHeader>
                <CardContent className="p-10 pt-0 space-y-8">
                    {enablerLeaderboard.length > 0 ? enablerLeaderboard.map((e, idx) => (
                        <div key={idx} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-white uppercase truncate">{e.name}</span>
                                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] h-6 px-3">{e.a1Count} Total Confirmed</Badge>
                            </div>
                        </div>
                    )) : (
                        <div className="py-10 text-center opacity-20 italic text-[10px] font-black uppercase tracking-[0.3em] text-white">No data</div>
                    )}
                </CardContent>
              </Card>
          </div>
      </div>
    </div>
  );
}