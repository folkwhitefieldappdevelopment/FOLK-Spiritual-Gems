'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Loader2, 
  Phone, 
  ChevronLeft, 
  ChevronRight, 
  CalendarCheck, 
  Clock, 
  BadgeCheck, 
  PlayCircle, 
  PlusCircle, 
  AlertCircle,
  Save,
  ArrowLeft,
  Edit,
  PhoneCall
} from 'lucide-react';
import type { Person, Group } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { getPerson, updatePerson, getPeople } from '@/services/people-service';
import { getStaticGroups } from '@/services/groups-service';
import { getSessionsForContact, trackSessionStart, type CallingSessionRecord } from '@/services/session-history-service';
import { createInitialProgress } from '@/lib/data';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { updateUser } from '@/services/user-service';
import { CallLog } from '@/lib/call-log';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProgressTracker } from '@/components/progress-tracker';
import { CallHistory } from '@/components/call-history';
import { GeneralRemarksCard } from '@/components/general-remarks-card';
import { Badge } from '@/components/ui/badge';
import { EditablePersonDetailsForm, type EditablePersonDetailsFormRef } from '@/components/editable-person-details-form';
import { format, isValid } from 'date-fns';
import { ConfirmSessionDialog } from '@/components/confirm-session-dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const AttendanceHistoryCard = ({ person }: { person: Person }) => {
    const history = person.attendanceHistory || [];
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-primary" />
                    Attendance History
                </CardTitle>
                <CardDescription className="text-[10px]">Log of event check-ins.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {history.length > 0 ? (
                        history.slice().reverse().map((entry, i) => {
                            const dateObj = entry.date ? new Date(entry.date) : null;
                            const timestampObj = entry.timestamp ? new Date(entry.timestamp) : null;
                            
                            return (
                                <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-black text-primary uppercase tracking-tight">
                                            {entry.groupName}
                                            {entry.eventName && entry.eventName !== entry.groupName && (
                                                <span className="ml-1 opacity-70 font-bold lowercase text-muted-foreground">({entry.eventName})</span>
                                            )}
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                                            <Clock className="h-2.5 w-2.5" />
                                            {timestampObj && isValid(timestampObj) ? format(timestampObj, 'p') : 'N/A'}
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="bg-muted text-[10px] font-black">
                                        {dateObj && isValid(dateObj) ? format(dateObj, 'dd MMM yyyy') : 'N/A'}
                                    </Badge>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <p className="text-xs italic">No attendance records found.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default function PersonDetailClient({ personId }: { personId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { appUser, setAppUser } = useAuth();

  const [person, setPerson] = React.useState<Person | null>(null);
  const [personGroups, setPersonGroups] = React.useState<Group[]>([]);
  const [contactSessions, setContactSessions] = React.useState<CallingSessionRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isConfirmSessionDialogOpen, setIsConfirmSessionDialogOpen] = React.useState(false);
  
  const [navIds, setNavIds] = React.useState<{ prev?: string; next?: string }>({});
  const detailsFormRef = React.useRef<EditablePersonDetailsFormRef>(null);

  const contextGroupId = searchParams.get('groupId') || undefined;
  const contextScope = (searchParams.get('scope') as 'all' | 'my') || 'my';

  const fetchData = React.useCallback(async () => {
    if (!personId || !appUser) return;

    setIsLoading(true);
    setFetchError(null);
    try {
      const [personData, staticGroups] = await Promise.all([
        getPerson(personId),
        getStaticGroups(appUser)
      ]);
      
      if (!personData) {
        toast({ variant: 'destructive', title: 'Not Found' });
        router.push('/contacts');
        return;
      }

      let sessions: CallingSessionRecord[] = [];
      try {
        sessions = await getSessionsForContact(personId, appUser.id);
      } catch (e) {
        console.warn("Failed to fetch sessions for contact", e);
      }
      
      setContactSessions(sessions);
      setPerson(personData);
      setPersonGroups(staticGroups.filter(g => g.peopleIds.includes(personData.id)));

      const { people: contextPeople } = await getPeople(appUser, { 
        groupId: contextGroupId, 
        scope: contextScope,
        ignoreLimit: true 
      });
      
      const currentIndex = contextPeople.findIndex(p => p.id === personId);
      if (currentIndex !== -1) {
        setNavIds({
          prev: contextPeople[currentIndex - 1]?.id,
          next: contextPeople[currentIndex + 1]?.id
        });
      }

    } catch (error) {
      console.error("Fetch person failed:", error);
      if (error instanceof Error) setFetchError(error);
    } finally {
      setIsLoading(false);
    }
  }, [personId, appUser, router, toast, contextGroupId, contextScope]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDirectCall = async () => {
    if (!person || !person.phone) {
        toast({ variant: 'destructive', title: 'Error', description: 'No phone number available.' });
        return;
    }
    try {
        await CallLog.makeCall({ phoneNumber: person.phone });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Call Failed', description: 'Could not initiate the call.' });
        console.error("Failed to make call:", error);
    }
  };

  const handleResumeSession = async (session: CallingSessionRecord) => {
    if (!appUser) return;
    const pausedSession = {
      event: session.name,
      peopleIds: session.peopleIds,
      currentIndex: session.peopleIds.indexOf(personId),
      assignedById: session.assignedById,
      assignedByName: session.assignedByName,
      historyId: session.id,
      coEnablerIds: session.coEnablerIds || []
    };
    await updateUser(appUser.id, { pausedCallingSession: pausedSession });
    setAppUser(prev => prev ? { ...prev, pausedCallingSession: pausedSession } : null);
    router.push('/session');
  };

  const handleStartNewSession = async (eventName: string) => {
    if (!appUser || !person) return;
    
    const coEnablerIds = person.coEnablerId && person.coEnablerId !== appUser.id ? [person.coEnablerId] : [];

    const historyId = await trackSessionStart({
        name: eventName,
        peopleIds: [person.id],
        assignedById: appUser.id,
        assignedByName: appUser.name,
        coEnablerIds
    }, appUser);

    const pausedSession = {
      event: eventName,
      peopleIds: [person.id],
      currentIndex: 0,
      assignedById: appUser.id,
      assignedByName: appUser.name,
      historyId,
      coEnablerIds
    };
    
    await updateUser(appUser.id, { pausedCallingSession: pausedSession });
    setAppUser(prev => prev ? { ...prev, pausedCallingSession: pausedSession } : null);
    router.push('/session');
  };

  const goToProfile = (id: string) => {
    const params = new URLSearchParams();
    params.set('id', id);
    if (contextGroupId) params.set('groupId', contextGroupId);
    if (contextScope) params.set('scope', contextScope);
    router.push(`/contacts/profile?${params.toString()}`);
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  
  if (fetchError) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <AppSidebar />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <PageHeader title="Error" description="An error occurred while loading the profile." />
          <main className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Load Failed</AlertTitle>
              <AlertDescription>{fetchError.message}</AlertDescription>
            </Alert>
            <Button className="mt-4" onClick={() => fetchData()}>Try Again</Button>
          </main>
        </div>
      </div>
    );
  }

  if (!person || !appUser) return null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <PageHeader title="Contact Details" description={`Profile for ${person.fullName}`}>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => router.back()} 
                    className="h-9 px-3 mr-1 font-bold border-white/10 bg-white/5 rounded-xl shrink-0"
                >
                    <ArrowLeft className="h-4 w-4 sm:mr-2" /> 
                    <span className="text-[10px] sm:text-sm">Back</span>
                </Button>
                <div className="flex items-center gap-1 mr-1 sm:mr-2 border-r pr-1 sm:pr-2">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-full" 
                        disabled={!navIds.prev}
                        onClick={() => navIds.prev && goToProfile(navIds.prev)}
                    >
                        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-full" 
                        disabled={!navIds.next}
                        onClick={() => navIds.next && goToProfile(navIds.next)}
                    >
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                </div>

                <Button 
                    onClick={handleDirectCall} 
                    className="h-9 font-black uppercase text-[10px] tracking-widest shadow-lg px-2 sm:px-4 bg-green-500 hover:bg-green-600"
                >
                    <PhoneCall className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Call</span>
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="h-9 font-black uppercase text-[10px] tracking-widest shadow-lg px-2 sm:px-4">
                            <Phone className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Session</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>Calling Options</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {contactSessions.length > 0 && (
                            <>
                                <div className="px-2 py-1.5 text-[9px] font-black uppercase text-muted-foreground opacity-70">Active Sessions</div>
                                {contactSessions.map(s => (
                                    <DropdownMenuItem key={s.id} onSelect={() => handleResumeSession(s)}>
                                        <PlayCircle className="h-4 w-4 mr-2 text-primary" />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs">{s.name}</span>
                                            <span className="text-[9px] opacity-70">Index {s.currentIndex + 1}</span>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem onSelect={() => setIsConfirmSessionDialogOpen(true)}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Start New Session
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
          </PageHeader>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 sm:pt-0">
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/3 space-y-6">
                  <Card className="overflow-hidden border-primary/10">
                    <CardHeader className="flex flex-row items-center justify-between bg-muted/30 border-b py-3 px-4">
                       <div className="flex items-center gap-2">
                        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Profile</h2>
                        {person.verifiedByFg === 'Yes' && <BadgeCheck className="h-4 w-4 text-blue-500" />}
                       </div>
                       <div className="flex items-center gap-2">
                          {isEditing ? (
                              <div className="flex items-center gap-1">
                                  <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => setIsEditing(false)} 
                                      className="h-8 text-[10px] font-bold uppercase tracking-tight px-3"
                                  >
                                      Cancel
                                  </Button>
                                  <Button 
                                      size="sm" 
                                      onClick={() => detailsFormRef.current?.submit()} 
                                      className="h-8 text-[10px] font-black uppercase tracking-widest px-4 shadow-md bg-primary hover:bg-primary/90"
                                      disabled={isSubmitting}
                                  >
                                      {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Save className="h-3 w-3 mr-1.5" />}
                                      Save
                                  </Button>
                              </div>
                          ) : (
                              <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setIsEditing(true)} 
                                  className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary transition-colors"
                              >
                                  <Edit className="h-4 w-4" />
                              </Button>
                          )}
                       </div>
                    </CardHeader>
                    <CardContent className="p-6">
                       <EditablePersonDetailsForm 
                          ref={detailsFormRef}
                          person={person} 
                          isEditing={isEditing} 
                          onSave={async (d) => { 
                              setIsSubmitting(true);
                              try {
                                  await updatePerson(person.id, d, appUser!); 
                                  setIsEditing(false); 
                                  fetchData(); 
                                  toast({ title: 'Success', description: 'Profile updated successfully.' });
                              } catch (e) {
                                  toast({ variant: 'destructive', title: 'Error', description: 'Failed to update profile.' });
                              } finally {
                                  setIsSubmitting(false);
                              }
                          }}
                          onCancel={() => setIsEditing(false)}
                          allPeople={[]}
                          groups={personGroups}
                        />
                    </CardContent>
                  </Card>
                  <AttendanceHistoryCard person={person} />
                </div>
                <div className="lg:w-2/3">
                  <ProgressTracker 
                    progress={person.progress || createInitialProgress()}
                    onProgressChange={async (ci, ii, li, v, f) => {
                        const newP = JSON.parse(JSON.stringify(person.progress));
                        if (f === 'goal') newP[ci].items[ii].levels[li] = v;
                        else if (f === 'achieved') newP[ci].items[ii].answers[`l${li+1}`] = v;
                        else newP[ci].items[ii].answers[`l${li+1}_remark`] = v;
                        await updatePerson(personId, { progress: newP }, appUser!);
                        setPerson({...person, progress: newP});
                    }}
                    isEditable={(appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide')) || false}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GeneralRemarksCard personId={person.id} initialRemarks={person.generalRemarks || ''} personName={person.fullName} />
                <CallHistory contactPhoneNumber={person.phone} userId={appUser.id} />
              </div>
            </div>
          </main>
      </div>
      <ConfirmSessionDialog 
        isOpen={isConfirmSessionDialogOpen} 
        setIsOpen={setIsConfirmSessionDialogOpen} 
        onStartSession={handleStartNewSession} 
        singlePersonName={person.fullName} 
        totalCount={1}
      />
    </div>
  );
}
