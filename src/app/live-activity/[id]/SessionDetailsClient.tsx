'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Loader2, 
  ArrowLeft, 
  PhoneCall, 
  CheckCircle2, 
  Clock, 
  Users, 
  User,
  ExternalLink,
  PlayCircle,
  MessageSquare,
  BadgeCheck,
  Zap,
  Activity,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getSessionById, type CallingSessionRecord } from '@/services/session-history-service';
import { getPeople } from '@/services/people-service';
import type { Person, CallLog } from '@/lib/types';
import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, formatDistanceToNow } from 'date-fns';
import { safeDate } from '@/utils/date';
import { updateUser } from '@/services/user-service';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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
        historyId: session.id
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
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || error) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <AppSidebar />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <PageHeader title={error ? "Error" : "Session Not Found"} description={error || "The requested activity record could not be located."} />
          <main className="p-6">
            <Button variant="outline" onClick={() => router.push('/live-activity')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          </main>
        </div>
      </div>
    );
  }

  const progress = session.peopleIds.length > 0 
    ? Math.round((session.currentIndex / session.peopleIds.length) * 100) 
    : 0;
    
  const isOwner = session.createdBy === appUser?.id;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <PageHeader 
          title="Session Details" 
          description={session.name}
        >
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/live-activity')} className="h-9 font-bold">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {isOwner && session.status !== 'completed' && (
              <Button size="sm" onClick={handleResume} disabled={isResuming} className="h-9 font-black uppercase tracking-tight">
                {isResuming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Resume Session
              </Button>
            )}
          </div>
        </PageHeader>

        <main className="flex-1 p-4 sm:p-6 sm:pt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-black uppercase tracking-tight">{session.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      Started by {session.creatorName}
                    </CardDescription>
                  </div>
                  <Badge variant={session.status === 'completed' ? 'secondary' : 'default'} className="uppercase font-black text-[9px] tracking-widest px-3 h-6">
                    {session.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-muted-foreground">Overall Progress</span>
                    <span className="text-primary">{session.currentIndex} / {session.peopleIds.length} ({progress}%)</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="border-b bg-muted/30 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest">Calling List Details</CardTitle>
                <Badge variant="outline" className="font-bold border-primary/20 text-primary">
                  {contacts.length} Contacts
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                    <TableHead className="w-[50px] text-center font-black text-[10px] uppercase">#</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Contact</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Session Status</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((person, idx) => {
                    const sessionLog = sessionLogsMap.get(person.id);
                    const isProcessed = idx < session.currentIndex;
                    const isCurrent = idx === session.currentIndex;

                    return (
                      <TableRow key={person.id} className={cn(isCurrent && "bg-primary/5")}>
                        <TableCell className="text-center font-mono text-[10px] text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border shadow-sm">
                              <AvatarImage src={person.photoUrl} />
                              <AvatarFallback>{person.fullName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="font-bold text-sm truncate">{person.fullName}</p>
                                {person.verifiedByFg === 'Yes' && <BadgeCheck className="h-3 w-3 text-blue-500" />}
                              </div>
                              <p className="text-[10px] text-muted-foreground">{person.phone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {sessionLog ? (
                            <Badge variant={sessionLog.status === 'A1 - Coming' ? 'default' : 'secondary'} className="text-[10px] font-bold">
                              {sessionLog.status}
                            </Badge>
                          ) : (
                            <span className={cn(
                                "text-[10px] font-bold italic",
                                isProcessed ? "text-muted-foreground" : "text-primary animate-pulse"
                            )}>
                              {isProcessed ? "Skipped/Pending" : isCurrent ? "Next in Queue" : "Waiting"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px] font-black uppercase" onClick={() => router.push(`/contacts/profile?id=${person.id}&scope=all`)}>
                            Profile <ExternalLink className="ml-1.5 h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
