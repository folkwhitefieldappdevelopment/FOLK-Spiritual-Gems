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
  PlusCircle, 
  AlertCircle,
  Save,
  ArrowLeft,
  Edit,
  PhoneCall
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import type { Person, Group } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { getPerson, updatePerson, getPeople } from '@/services/people-service';
import { getStaticGroups } from '@/services/groups-service';
import { getSessionsForContact, trackSessionStart, type CallingSessionRecord } from '@/services/session-history-service';
import { createInitialProgress } from '@/lib/data';
import { updateUser } from '@/services/user-service';

import { PageHeader } from '@/components/page-header';
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
import { FullPageLoader } from './loader';
import { CallLog } from '@/lib/call-log';

const AttendanceHistoryCard = ({ person }: { person: Person }) => {
    const history = person.attendanceHistory || [];
    return (
        <Card className="rounded-[2rem] border-none shadow-xl">
            <CardHeader><CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest"><CalendarCheck className="h-4 w-4 text-primary" /> Attendance History</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {history.length > 0 ? history.slice().reverse().map((entry, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-muted/50 pb-3 last:border-0 last:pb-0">
                            <div className="space-y-0.5"><p className="text-xs font-black text-primary uppercase tracking-tight">{entry.groupName}</p><div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold"><Clock className="h-2.5 w-2.5" /> {format(new Date(entry.timestamp), 'p')}</div></div>
                            <Badge variant="secondary" className="bg-muted text-[10px] font-black uppercase">{format(new Date(entry.date), 'dd MMM yyyy')}</Badge>
                        </div>
                    )) : <div className="text-center py-8 text-muted-foreground opacity-40">No attendance records</div>}
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
  const [isEditing, setIsEditing] = React.useState(false);
  const [isConfirmSessionDialogOpen, setIsConfirmSessionDialogOpen] = React.useState(false);
  const [navIds, setNavIds] = React.useState<{ prev?: string; next?: string }>({});
  const detailsFormRef = React.useRef<EditablePersonDetailsFormRef>(null);

  const contextScope = (searchParams.get('scope') as 'all' | 'my') || 'my';

  const fetchData = React.useCallback(async () => {
    if (!personId || !appUser) return;
    setIsLoading(true);
    try {
      const [personData, staticGroups] = await Promise.all([getPerson(personId), getStaticGroups(appUser)]);
      if (!personData) { router.push('/contacts'); return; }
      setPerson(personData);
      setPersonGroups(staticGroups.filter(g => g.peopleIds.includes(personData.id)));
      setIsLoading(false);

      getSessionsForContact(personId, appUser.id).then(setContactSessions);
      getPeople(appUser, { scope: contextScope, ignoreLimit: true }).then(({ people }) => {
          const idx = people.findIndex(p => p.id === personId);
          if (idx !== -1) setNavIds({ prev: people[idx - 1]?.id, next: people[idx + 1]?.id });
      });
    } catch (error) { console.error(error); setIsLoading(false); }
  }, [personId, appUser, router, contextScope]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handleStartNewSession = async (eventName: string) => {
    if (!appUser || !person) return;
    const historyId = await trackSessionStart({ name: eventName, peopleIds: [person.id] }, appUser);
    const pausedSession = { event: eventName, peopleIds: [person.id], currentIndex: 0, assignedById: appUser.id, assignedByName: appUser.name, historyId, coEnablerIds: [] };
    await updateUser(appUser.id, { pausedCallingSession: pausedSession });
    setAppUser(prev => prev ? { ...prev, pausedCallingSession: pausedSession } : null);
    router.push('/session');
  };

  const handleDirectCall = async () => {
    if (!person || !person.phone) {
        toast({ variant: 'destructive', title: 'Error', description: 'No phone number available.' });
        return;
    }
    
    if (Capacitor.isNativePlatform()) {
      try {
          await CallLog.makeCall({ phoneNumber: person.phone });
      } catch (error) {
          toast({ variant: 'destructive', title: 'Call Failed', description: 'Could not initiate the call.' });
          console.error("Failed to make call:", error);
      }
    } else {
      window.location.href = `tel:${person.phone}`;
    }
  };

  if (isLoading && !person) return <FullPageLoader />;
  if (!person || !appUser) return null;

  return (
    <>
          <PageHeader title="PROFILE SUMMARY" description={`Details for ${person.fullName}`}>
              <div className="flex items-center gap-1 sm:gap-3">
                <Button variant="default" size="sm" onClick={() => router.back()} className="h-9 px-4 font-black uppercase tracking-widest bg-accent text-accent-foreground rounded-xl shadow-lg transition-all active:scale-95"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                <div className="flex items-center gap-1 border-x border-muted px-1 sm:px-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={!navIds.prev} onClick={() => navIds.prev && router.push(`/contacts/profile?id=${navIds.prev}&scope=${contextScope}`)}><ChevronLeft className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={!navIds.next} onClick={() => navIds.next && router.push(`/contacts/profile?id=${navIds.next}&scope=${contextScope}`)}><ChevronRight className="h-5 w-5" /></Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleDirectCall} className="h-9 font-black uppercase text-[10px] rounded-xl bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/10">
                        <PhoneCall className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Call Now</span>
                    </Button>
                    <Button onClick={() => setIsConfirmSessionDialogOpen(true)} className="h-9 font-black uppercase text-[10px] rounded-xl bg-primary">
                        <PlusCircle className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Interaction</span>
                    </Button>
                </div>
              </div>
          </PageHeader>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 sm:pt-0 pb-24">
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/3 space-y-6">
                  <Card className="overflow-hidden border-none shadow-xl rounded-[2.5rem]">
                    <CardHeader className="flex flex-row items-center justify-between bg-muted/30 border-b border-muted/50 py-3 px-6">
                       <div className="flex items-center gap-2"><h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">General Info</h2>{person.verifiedByFg === 'Yes' && <BadgeCheck className="h-4 w-4 text-blue-500" />}</div>
                       {isEditing ? (
                           <div className="flex items-center gap-1">
                               <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-8 text-[10px] font-bold">Cancel</Button>
                               <Button size="sm" onClick={() => detailsFormRef.current?.submit()} className="h-8 text-[10px] font-black uppercase tracking-widest bg-primary" disabled={isSubmitting}><Save className="h-3 w-3 mr-1.5" /> Save</Button>
                           </div>
                       ) : <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8 text-primary"><Edit className="h-4 w-4" /></Button>}
                    </CardHeader>
                    <CardContent className="p-6">
                       <EditablePersonDetailsForm ref={detailsFormRef} person={person} isEditing={isEditing} onSave={async d => { setIsSubmitting(true); try { await updatePerson(person.id, d, appUser!); setIsEditing(false); fetchData(); toast({ title: 'Success' }); } finally { setIsSubmitting(false); } }} onCancel={() => setIsEditing(false)} allPeople={[]} groups={personGroups} />
                    </CardContent>
                  </Card>
                  <AttendanceHistoryCard person={person} />
                </div>
                <div className="lg:w-2/3 space-y-6">
                  <ProgressTracker progress={person.progress || createInitialProgress()} onProgressChange={async (ci, ii, li, v, f) => { const newP = JSON.parse(JSON.stringify(person.progress)); if (f === 'goal') newP[ci].items[ii].levels[li] = v; else if (f === 'achieved') newP[ci].items[ii].answers[`l${li+1}`] = v; else newP[ci].items[ii].answers[`l${li+1}_remark`] = v; await updatePerson(personId, { progress: newP }, appUser!); setPerson({...person, progress: newP}); }} isEditable={appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide')} />
                  <div className="grid grid-cols-1 gap-6">
                    <GeneralRemarksCard personId={person.id} initialRemarks={person.generalRemarks || ''} personName={person.fullName} />
                    <CallHistory personId={person.id} contactPhoneNumber={person.phone} userId={appUser.id} manualHistory={person.callHistory || []} attendanceHistory={person.attendanceHistory || []} onRefresh={() => fetchData()} />
                  </div>
                </div>
              </div>
            </div>
          </main>
      <ConfirmSessionDialog isOpen={isConfirmSessionDialogOpen} setIsOpen={setIsConfirmSessionDialogOpen} onStartSession={handleStartNewSession} singlePersonName={person.fullName} totalCount={1} />
    </>
  );
}
