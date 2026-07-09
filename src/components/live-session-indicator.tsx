'use client';

import * as React from 'react';
import { 
  PhoneCall, 
  Users, 
  ArrowRight, 
  X,
  Zap,
  Activity
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getLiveSessionsData } from '@/services/session-service';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export function LiveSessionIndicator() {
  const { appUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [sessionData, setSessionData] = React.useState<any>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!appUser || pathname === '/session') return;
    
    setIsLoading(true);
    try {
      const data = await getLiveSessionsData(appUser);
      setSessionData(data);
    } catch (e) {
      console.warn("Live session sync failed", e);
    } finally {
      setIsLoading(false);
    }
  }, [appUser, pathname]);

  React.useEffect(() => {
    if (!appUser || pathname === '/session') return;
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [appUser, pathname, fetchData]);

  if (pathname === '/session' || !appUser) return null;

  const hasMySession = !!appUser?.pausedCallingSession;
  const teamSessions = sessionData?.teamSessions || [];
  const hasTeamSessions = teamSessions.length > 0;
  
  if (!hasMySession && !hasTeamSessions) return null;

  const mySession = appUser?.pausedCallingSession;
  const myComingCount = sessionData?.myComingCount || 0;
  const myProgress = mySession ? Math.round(((mySession.currentIndex) / Math.max(1, mySession.peopleIds.length)) * 100) : 0;

  return (
    <div className="fixed bottom-6 right-6 z-[100] group">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            {hasMySession && (
                <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-20" />
            )}
            <Button 
              size="icon" 
              className={cn(
                "h-14 w-14 rounded-full shadow-2xl relative z-10 transition-transform hover:scale-110 active:scale-95",
                hasMySession ? "bg-[#929DD8] text-[#1a237e]" : "bg-slate-800 text-white"
              )}
            >
              <PhoneCall className={cn("h-6 w-6 transition-all", isOpen && "scale-90 opacity-50")} />
              {(hasTeamSessions || hasMySession) && (
                <Badge className="absolute -top-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center p-0 border-2 border-background animate-in zoom-in bg-accent text-accent-foreground">
                  {teamSessions.length + (hasMySession ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent 
          align="end" 
          side="top" 
          sideOffset={16} 
          className="w-80 p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl flex flex-col max-h-[85vh] bg-[#929DD8]"
        >
          <div className="p-5 text-[#1a237e] shrink-0 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#1a237e] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Activity</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#1a237e] hover:bg-black/5 rounded-full" onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {hasMySession && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-[8px] font-black uppercase opacity-60 tracking-widest mb-0.5">Resume Active Session</p>
                    <h4 className="font-black text-lg tracking-tight truncate">{mySession!.event}</h4>
                  </div>
                  <Badge variant="secondary" className="bg-[#1a237e]/10 text-[#1a237e] border-none font-black text-[10px] px-2.5 rounded-full h-6 shrink-0">
                    {myComingCount} A1
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-70">
                    <span>PROGRESS: {mySession!.currentIndex + 1} / {mySession!.peopleIds.length}</span>
                    <span>{myProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/30 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-[#1a237e] transition-all duration-500" 
                        style={{ width: `${myProgress}%` }}
                    />
                  </div>
                </div>
                <Button 
                  className="w-full bg-[#1a237e] text-white hover:bg-[#1a237e]/90 font-black text-[10px] uppercase tracking-widest h-10 rounded-xl shadow-lg"
                  onClick={() => { router.push('/session'); setIsOpen(false); }}
                >
                  GO TO CALL SCREEN <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {(hasTeamSessions || (sessionData?.recentSummary?.totalCalls > 0)) && (
            <ScrollArea 
                className="flex-1 min-h-0 bg-[#1b1d32]"
                onWheel={(e) => e.stopPropagation()}
            >
                <div className="p-4 space-y-4">
                {hasTeamSessions && (
                    <div className="space-y-3">
                    <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2 px-1">
                        <Users className="h-3 w-3" /> Team Calling Now
                    </h5>
                    <div className="space-y-1.5">
                        {teamSessions.map((s: any) => {
                        const initials = s.userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                        return (
                            <div key={s.userId} className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                            <Avatar className="h-9 w-9 border-2 border-white/5 shadow-md shrink-0">
                                <AvatarImage src={s.photoUrl} />
                                <AvatarFallback className="bg-slate-700 text-white font-black text-[10px]">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-white truncate leading-none">{s.userName}</p>
                                <p className="text-[8px] text-white/40 font-bold truncate mt-1 uppercase tracking-wide">{s.event}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="flex items-center justify-end gap-1 text-[9px] font-black text-white/80">
                                <Zap className="h-2 w-2 fill-white/40 text-white/40" />
                                {s.comingCount} A1
                                </div>
                                <p className="text-[9px] text-white/40 font-black mt-0.5">{s.progress}%</p>
                            </div>
                            </div>
                        );
                        })}
                    </div>
                    </div>
                )}

                <div className="space-y-3 pt-1 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                        <p className="text-xl font-black text-green-400 leading-none">{sessionData?.recentSummary?.totalComing || 0}</p>
                        <p className="text-[7px] font-black uppercase tracking-widest text-white/40 mt-1.5">Total A1</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                        <p className="text-xl font-black text-white leading-none">{sessionData?.recentSummary?.totalCalls || 0}</p>
                        <p className="text-[7px] font-black uppercase tracking-widest text-white/40 mt-1.5">Calls Logged</p>
                    </div>
                    </div>
                </div>
                </div>
            </ScrollArea>
          )}
          
          <div className="p-3 bg-[#1b1d32] border-t border-white/5 shrink-0">
            <Button 
                variant="ghost" 
                className="w-full h-10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white hover:bg-white/5" 
                onClick={() => { router.push('/live-activity'); setIsOpen(false); }}
            >
              System Wide Reports
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
