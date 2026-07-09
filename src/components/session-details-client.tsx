'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Loader2, 
  ArrowLeft, 
  Users, 
  Clock, 
  ExternalLink,
  PlayCircle,
  BadgeCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getSessionById, type CallingSessionRecord } from '@/services/session-history-service';
import { getPeople } from '@/services/people-service';
import type { Person, CallLog } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { safeDate } from '@/utils/date';
import { updateUser } from '@/services/user-service';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SessionDetailsClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { appUser, setAppUser } = useAuth();

  const [session, setSession] = React.useState<CallingSessionRecord | null>(null);
  const [contacts, setContacts] = React.useState<Person[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isResuming, setIsResuming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!sessionId || !appUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const sessionData = await getSessionById(sessionId);
      if (!sessionData) {
        setIsLoading(false);
        return;
      }
      setSession(sessionData);

      const { people } = await getPeople(appUser, { personIds: sessionData.peopleIds, ignoreLimit: true });
      setContacts(people);
    } catch (e) {
      console.error("Failed to fetch session details", e);
      setError("Failed to load session details. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, appUser]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResume = async () => {
    if (!appUser || !session || isResuming) return;
    
    setIsResuming(true);
    try {
      const pausedSession = {
        event: session.name,
        peopleIds: session.peopleIds,
        currentIndex: session.currentIndex,
        assignedById: session.assignedById,
        assignedByName: session.assignedByName,
        historyId: session.id,
        coEnablerIds: session.coEnablerIds || []
      };

      await updateUser(appUser.id, { pausedCallingSession: pausedSession });
      setAppUser(prev => prev ? { ...prev, pausedCallingSession: pausedSession } : null);
      router.push('/session');
    } catch (e) {
      setError("Failed to resume session. Please try again.");
    } finally {
      setIsResuming(false);
    }
  };

  const sessionLogsMap = React.useMemo(() => {
    const map = new Map<string, CallLog>();
    if (!session) return map;
    
    contacts.forEach(p => {
      const log = [...(p.callHistory || [])]
        .filter(l => l.event === session.name)
        .sort((a,b) => (safeDate(b.calledAt)?.getTime() || 0) - (safeDate(a.calledAt)?.getTime() || 0))[0];
      if (log) map.set(p.id, log);
    });
    return map;
  }, [contacts, session?.name]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || error) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Session Not Found</AlertTitle>
          <AlertDescription>{error || "The requested activity record could not be located."}</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4 rounded-xl font-bold" onClick={() => router.push('/live-activity')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const progress = session.peopleIds.length > 0 
    ? Math.round((session.currentIndex / session.peopleIds.length) * 100) 
    : 0;
    
  const isOwner = session.createdBy === appUser?.id;

  return (
    <>
      <PageHeader 
        title="Session Hub" 
        description={`Analyzing pulse for: ${session.name}`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/live-activity')} className="h-9 px-4 font-bold border-border text-foreground bg-muted/50 rounded-xl shadow-lg">
            <ArrowLeft className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Back</span>
          </Button>
          {isOwner && (
            <Button size="sm" onClick={handleResume} disabled={isResuming} className="h-9 px-6 font-black uppercase text-[10px] tracking-widest bg-primary text-primary-foreground rounded-xl shadow-xl shadow-primary/20">
              {isResuming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              RESUME
            </Button>
          )}
        </div>
      </PageHeader>

      <main className="flex-1 p-4 sm:p-6 sm:pt-0 space-y-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="md:col-span-2 bg-popover border-none rounded-[2.5rem] shadow-2xl overflow-hidden">
            <CardHeader className="p-10 pb-6 bg-card border-b border-border">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Session Context</p>
                  <CardTitle className="text-2xl font-black text-foreground uppercase tracking-tight leading-none">{session.name}</CardTitle>
                </div>
                <Badge variant={session.status === 'completed' ? 'secondary' : 'default'} className="uppercase font-black text-[10px] tracking-widest px-4 h-7 rounded-full bg-primary/10 text-primary border-none">
                  {session.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
              <div className="flex flex-wrap gap-12">
                  <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Initialized By</p>
                      <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-border shadow-md"><AvatarFallback className="bg-muted text-foreground font-black">{session.creatorName[0]}</AvatarFallback></Avatar>
                          <span className="text-base font-bold text-foreground uppercase">{session.creatorName}</span>
                      </div>
                  </div>
                  <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Last Activity</p>
                      <div className="flex items-center gap-2 text-foreground font-bold">
                          <Clock className="h-4 w-4 text-primary" />
                          {formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}
                      </div>
                  </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.2em]">
                  <span className="text-muted-foreground">Live Outreach Progress</span>
                  <span className="text-primary">{session.currentIndex} / {session.peopleIds.length} souls ({progress}%)</span>
                </div>
                <div className="h-4 w-full bg-muted rounded-full overflow-hidden shadow-inner border border-border p-1">
                  <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-lg" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-none rounded-[2.5rem] shadow-2xl p-10 flex flex-col justify-center items-center text-center gap-6 relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />
             <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner group-hover:scale-110 transition-transform">
                <Users className="h-10 w-10 text-primary" />
             </div>
             <div className="space-y-1">
                <h3 className="text-3xl font-black text-foreground leading-none">{contacts.length}</h3>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Contacts in Flow</p>
             </div>
          </Card>
        </div>

        <Card className="bg-popover border-none rounded-[2.5rem] shadow-2xl overflow-hidden">
          <CardHeader className="p-10 pb-4 bg-card border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-black text-foreground uppercase tracking-tight">Interaction Journal</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border h-14">
                    <TableHead className="w-[80px] text-center font-black text-[10px] uppercase text-muted-foreground pl-10">Queue</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-muted-foreground">Contact</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-muted-foreground">Milestone Status</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase text-muted-foreground pr-10">Context</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((person, idx) => {
                    const sessionLog = sessionLogsMap.get(person.id);
                    const isProcessed = idx < session.currentIndex;
                    const isCurrent = idx === session.currentIndex;

                    return (
                      <TableRow key={person.id} className={cn("border-border hover:bg-muted/30", isCurrent && "bg-primary/5")}>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground pl-10">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-4 py-5">
                            <Avatar className="h-12 w-12 border-2 border-border shadow-xl rounded-2xl">
                              <AvatarImage src={person.photoUrl} className="object-cover" />
                              <AvatarFallback className="bg-muted text-foreground font-black">{person.fullName[0]}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-black text-base text-foreground uppercase truncate">{person.fullName}</p>
                                  {person.verifiedByFg === 'Yes' && <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />}
                                </div>
                                <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">{person.phone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {sessionLog ? (
                            <Badge className={cn(
                                "text-[10px] font-black uppercase h-7 px-4 rounded-full border-none",
                                sessionLog.status === 'A1 - Coming' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-muted/50 text-muted-foreground'
                            )}>
                              {sessionLog.status}
                            </Badge>
                          ) : (
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                isProcessed ? "text-muted-foreground/40" : isCurrent ? "text-primary animate-pulse" : "text-muted-foreground/60"
                            )}>
                              {isProcessed ? "Skipped" : isCurrent ? "Next in Queue" : "Waiting"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-10">
                          <Button variant="ghost" size="sm" className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-foreground bg-muted/50 border border-border hover:bg-primary hover:text-primary-foreground transition-all" onClick={() => router.push(`/contacts/profile?id=${person.id}&scope=all`)}>
                            Analyze Profile <ExternalLink className="ml-2 h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
