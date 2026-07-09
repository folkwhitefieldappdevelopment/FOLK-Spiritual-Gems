'use client';

import * as React from 'react';
import { Loader2, Activity, Clock, ArrowRight } from 'lucide-react';
import { fetchActivitySessions, type CallingSessionRecord } from '@/services/session-history-service';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function LiveActivityPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<'mine' | 'team' | 'all'>('mine');
  const [sessions, setSessions] = React.useState<CallingSessionRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    if (!appUser) return;
    setIsLoading(true);
    try {
      const data = await fetchActivitySessions(appUser, activeTab);
      setSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [appUser, activeTab]);

  React.useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <>
      <PageHeader 
        title="Live Tracker" 
        description="Real-time monitoring of active outreach sessions."
      />
      <main className="flex-1 p-4 sm:p-6 sm:pt-0 space-y-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
           <TabsList className="bg-card border-none rounded-2xl h-14 p-1.5 gap-1.5 mb-10 max-w-md">
              <TabsTrigger value="mine" className="flex-1 py-2.5 font-black uppercase tracking-widest text-[10px] rounded-xl data-[state=active]:bg-primary">MY FLOWS</TabsTrigger>
              <TabsTrigger value="team" className="flex-1 py-2.5 font-black uppercase tracking-widest text-[10px] rounded-xl data-[state=active]:bg-primary">TEAM PULSE</TabsTrigger>
              <TabsTrigger value="all" className="flex-1 py-2.5 font-black uppercase tracking-widest text-[10px] rounded-xl data-[state=active]:bg-primary">ALL ACTIVITY</TabsTrigger>
           </TabsList>

           <TabsContent value={activeTab} className="mt-0">
             {isLoading ? (
               <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Connecting to Live Feed...</p>
               </div>
             ) : sessions.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sessions.map((session) => (
                    <SessionCard key={session.id} session={session} onClick={() => router.push(`/live-activity/details?id=${session.id}`)} />
                  ))}
               </div>
             ) : (
               <div className="py-32 text-center space-y-6 bg-muted/20 border-2 border-dashed border-border rounded-[3rem] mx-4">
                  <Activity className="h-16 w-16 mx-auto mb-2 text-muted-foreground opacity-20" />
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.3em]">No active sessions found in this scope</p>
               </div>
             )}
           </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

function SessionCard({ session, onClick }: { session: CallingSessionRecord, onClick: () => void }) {
  const progress = session.peopleIds.length > 0 
    ? Math.round((session.currentIndex / session.peopleIds.length) * 100) 
    : 0;

  return (
    <Card 
        onClick={onClick}
        className="bg-popover border-none rounded-[2.5rem] overflow-hidden group cursor-pointer hover:shadow-2xl transition-all"
    >
      <div className="bg-card border-b border-border p-8 pb-6">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-black text-[9px] uppercase tracking-widest px-3 h-6">
            ACTIVE NOW
          </Badge>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">
             <Clock className="h-3 w-3" />
             {formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}
          </div>
        </div>
        <CardTitle className="text-xl font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors truncate">
            {session.name}
        </CardTitle>
      </div>
      <CardContent className="p-8 space-y-8">
        <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10 border-2 border-border shadow-md">
               <AvatarFallback className="bg-muted text-foreground font-black text-[10px]">{session.creatorName[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Caller</p>
               <p className="text-sm font-bold text-foreground uppercase truncate">{session.creatorName}</p>
            </div>
        </div>

        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <div className="space-y-1">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Progress Pulse</p>
                    <p className="text-lg font-black text-foreground leading-none">{session.currentIndex} / {session.peopleIds.length}</p>
                </div>
                <span className="text-2xl font-black text-primary leading-none">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-muted/30" />
        </div>

        <Button variant="ghost" className="w-full h-12 rounded-xl bg-muted/50 border border-border text-foreground font-black uppercase text-[10px] tracking-widest group-hover:bg-primary group-hover:text-primary-foreground transition-all">
           Analyze Details <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
