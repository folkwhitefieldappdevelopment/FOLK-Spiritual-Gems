'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clock, 
  PlayCircle, 
  Loader2, 
  Activity,
  UserCheck,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { fetchActivitySessions, syncActiveSessionToHistory, type CallingSessionRecord } from '@/services/session-history-service';
import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { updateUser } from '@/services/user-service';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function LiveActivityPage() {
  const { appUser, setAppUser } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = React.useState<CallingSessionRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isResuming, setIsResuming] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'mine' | 'team' | 'all'>('mine');
  const hasSyncedRef = React.useRef(false);

  const isPrivileged = React.useMemo(() => {
    return appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');
  }, [appUser]);

  const loadSessions = React.useCallback(async () => {
    if (!appUser) return;
    setIsLoading(true);
    setError(null);
    try {
      if (appUser.pausedCallingSession && !appUser.pausedCallingSession.historyId && !hasSyncedRef.current) {
          const historyId = await syncActiveSessionToHistory(appUser);
          if (historyId) {
              hasSyncedRef.current = true;
              const updatedSession = { ...appUser.pausedCallingSession, historyId };
              await updateUser(appUser.id, { pausedCallingSession: updatedSession });
              setAppUser(prev => prev ? { ...prev, pausedCallingSession: updatedSession } : null);
          }
      }

      const activeSessions = await fetchActivitySessions(appUser, activeTab);
      setSessions(activeSessions);
    } catch (e) {
      console.error("Failed to load activity", e);
      setError("Failed to sync live activity. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, [appUser, activeTab, setAppUser]);

  React.useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleResume = async (session: CallingSessionRecord) => {
    if (!appUser || isResuming) return;
    
    setIsResuming(session.id);
    try {
      const pausedSession = {
        event: session.name,
        peopleIds: session.peopleIds,
        currentIndex: session.currentIndex,
        assignedById: session.assignedById,
        assignedByName: session.assignedByName,
        historyId: session.id
      };
      await updateUser(appUser.id, { pausedCallingSession: pausedSession });
      setAppUser(prev => prev ? { ...prev, pausedCallingSession: pausedSession } : null);
      router.push('/session');
    } catch (e) {
      setError("Failed to resume session. Please try again.");
    } finally {
      setIsResuming(null);
    }
  };

  const renderSessionCard = (session: CallingSessionRecord) => {
    const totalCount = Math.max(1, session.peopleIds.length);
    const progress = Math.min(100, Math.round((session.currentIndex / totalCount) * 100));
    const isMine = session.createdBy === appUser?.id;
    const isBeingResumed = isResuming === session.id;

    return (
      <Card key={session.id} className="overflow-hidden border-primary/10 hover:shadow-md transition-all bg-card/50">
        <CardHeader className="p-4 pb-2 space-y-1">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Live Now</span>
              </div>
              <h3 className="font-black text-sm uppercase tracking-tight truncate">{session.name}</h3>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3 w-3 shrink-0" />
                Last active {formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserCheck className="h-3 w-3 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase text-muted-foreground opacity-60 leading-none mb-0.5">Caller</p>
                <p className="text-[10px] font-bold text-foreground truncate">{session.creatorName}</p>
              </div>
            </div>
            {session.assignedById && session.assignedById !== session.createdBy && (
                <div className="flex items-center gap-2">
                    <div className="h-5 w-5 flex items-center justify-center shrink-0">
                        <ChevronRight className="h-2.5 w-2.5 text-muted-foreground opacity-40 rotate-90" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[8px] font-black uppercase text-muted-foreground italic leading-none mb-0.5">Delegated By</p>
                        <p className="text-[9px] font-bold text-muted-foreground/80 truncate">{session.assignedByName || 'System'}</p>
                    </div>
                </div>
            )}
          </div>
          
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-70">
              <span>Progress: {session.currentIndex} / {session.peopleIds.length}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </CardContent>
        <CardFooter className="p-3 bg-muted/30 border-t flex justify-end gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase" onClick={() => router.push(`/live-activity/details?id=${session.id}`)}>
            View Progress
          </Button>
          {isMine && (
            <Button 
              size="sm" 
              className="h-8 text-[10px] font-black uppercase bg-primary text-white hover:bg-primary/90" 
              onClick={() => handleResume(session)}
              disabled={!!isResuming}
            >
              {isBeingResumed ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <PlayCircle className="h-3 w-3 mr-1.5" />}
              Resume
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <PageHeader 
          title="Live Activity" 
          description="Monitor real-time outreach progress across teams."
        />
        
        <main className="flex-1 p-4 sm:p-6 sm:pt-0">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Update Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className={cn("grid w-full h-auto p-1 bg-muted/50 rounded-2xl gap-1 mb-6", isPrivileged ? "grid-cols-3" : "grid-cols-2")}>
              <TabsTrigger value="mine" className="py-2.5 font-black uppercase tracking-widest text-[10px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                My Session
              </TabsTrigger>
              <TabsTrigger value="team" className="py-2.5 font-black uppercase tracking-widest text-[10px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                Team Progress
              </TabsTrigger>
              {isPrivileged && (
                <TabsTrigger value="all" className="py-2.5 font-black uppercase tracking-widest text-[10px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                  System Wide
                </TabsTrigger>
              )}
            </TabsList>

            <div>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Checking active sessions...</p>
                </div>
              ) : sessions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 pb-20">
                  {sessions.map(renderSessionCard)}
                </div>
              ) : (
                <div className="text-center py-24 bg-muted/20 rounded-[2rem] border-2 border-dashed mx-4">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <h3 className="font-black text-lg uppercase tracking-tight">No Active Sessions</h3>
                  <p className="text-[10px] text-muted-foreground mt-1 max-w-xs mx-auto uppercase font-bold">
                    {activeTab === 'team' 
                        ? "No one from your team is calling right now." 
                        : activeTab === 'mine'
                        ? "You don't have any sessions in progress."
                        : "No outreach sessions found in the system currently."}
                  </p>
                </div>
              )}
            </div>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
