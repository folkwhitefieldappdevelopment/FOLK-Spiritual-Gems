'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, PhoneCall, AlertTriangle, User, Search, RefreshCw } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getPeople, updatePerson } from '@/services/people-service';
import { updateSessionHistory } from '@/services/session-history-service';
import type { Person, CoEnablerSession, CallStatus, CallLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PersonTable } from '@/components/person-table';
import { CallingSessionDialog } from '@/components/calling-session-dialog';
import { useToast } from '@/hooks/use-toast';
import { isAfter } from 'date-fns';
import Image from 'next/image';
import placeholderData from '@/app/lib/placeholder-images.json';

export default function CoEnablerClient({ sessionId }: { sessionId: string }) {
  const { toast } = useToast();
  const router = useRouter();

  const [session, setSession] = React.useState<CoEnablerSession | null>(null);
  const [people, setPeople] = React.useState<Person[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExpired, setIsExpired] = React.useState(false);
  
  const [isCallingSessionDialogOpen, setIsCallingSessionDialogOpen] = React.useState(false);
  const [sessionCurrentIndex, setSessionCurrentIndex] = React.useState(0);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const sessionDoc = await getDoc(doc(db, 'co_enabler_sessions', sessionId));
      if (!sessionDoc.exists()) {
        setIsLoading(false);
        return;
      }
      const sessionData = { id: sessionDoc.id, ...sessionDoc.data() } as CoEnablerSession;
      if (isAfter(new Date(), new Date(sessionData.expiresAt))) {
        setIsExpired(true);
        setIsLoading(false);
        return;
      }
      setSession(sessionData);
      const { people: assignedPeople } = await getPeople({ id: 'public', name: sessionData.name, role: [] }, {
        personIds: sessionData.peopleIds,
        ignoreLimit: true
      });
      setPeople(assignedPeople);
    } catch (e) {
      console.error("Public fetch failed", e);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSessionSave = async (personId: string, remark: string, status: CallStatus, sg: string | undefined, ma: string | undefined, frp: string | undefined, nextFollowUpAt: string | undefined) => {
    if (!session) return;
    const callLog: Partial<CallLog> = { calledAt: new Date().toISOString(), remark, status, event: `${session.task} (Co-Enabler)`, sg, ma, frp, nextFollowUpAt, callerId: `co-${session.id}`, callerName: session.name, sessionCreatorId: session.creatorId };
    const updates: Partial<Person> = { lastCallRemark: remark, lastCallStatus: status, lastCallAt: '__now__', lastSg: sg, lastMa: ma, lastFrp: frp, nextFollowUpAt: nextFollowUpAt };
    try {
      await updatePerson(personId, { ...updates, callHistory: [callLog as CallLog] });
      await updateSessionHistory(session.id, sessionCurrentIndex);
      toast({ title: "Call Logged" });
      const syncLocal = (prev: Person[]) => prev.map(p => p.id === personId ? { ...p, ...updates, lastCallAt: new Date().toISOString(), callHistory: [callLog as CallLog, ...(p.callHistory || [])] } : p);
      setPeople(syncLocal);
    } catch (error) {
      toast({ variant: 'destructive', title: "Error" });
    }
  };

  const logo = placeholderData.app_logo;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-muted/30"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  if (isExpired) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Card className="max-w-md w-full text-center p-8">
                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <CardTitle>Session Expired</CardTitle>
                <p className="text-muted-foreground mt-2">This outreach link has expired. Please ask for a new link.</p>
            </Card>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-primary p-4 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-full h-10 w-10 flex items-center justify-center">
                <Image src={logo.url} alt={logo.alt} width={24} height={24} className="object-contain" />
            </div>
            <div><h1 className="font-black text-sm uppercase tracking-widest leading-none">SG CRM</h1><p className="text-[10px] opacity-80 font-bold">Public Portal</p></div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div className="space-y-1"><h2 className="text-2xl font-black text-foreground">Assigned Contacts</h2><p className="text-sm text-muted-foreground flex items-center gap-2"><User className="h-4 w-4" />You have {people.length} contacts to call.</p></div><Button onClick={() => { setSessionCurrentIndex(0); setIsCallingSessionDialogOpen(true); }} className="h-12 px-8 font-bold shadow-lg"><PhoneCall className="mr-2 h-5 w-5" />Begin Session</Button></div>
        <Card><CardContent className="pt-6"><PersonTable people={people} onEdit={() => {}} onDelete={() => {}} onStartCall={(p) => { const idx = people.findIndex(person => person.id === p.id); setSessionCurrentIndex(idx); setIsCallingSessionDialogOpen(true); }} allGroups={[]} navigationContext={{ scope: 'all' }} /></CardContent></Card>
      </main>
      {isCallingSessionDialogOpen && (
         <CallingSessionDialog isOpen={isCallingSessionDialogOpen} onClose={() => setIsCallingSessionDialogOpen(false)} onEndSession={() => setIsCallingSessionDialogOpen(false)} person={people[sessionCurrentIndex]} currentEvent={session?.task || ''} onSaveAndNext={async (...args) => { await handleSessionSave(...args); const nextIdx = sessionCurrentIndex + 1; if (nextIdx < people.length) setSessionCurrentIndex(nextIdx); else setIsCallingSessionDialogOpen(false); }} onNavigate={(dir) => setSessionCurrentIndex(prev => dir === 'next' ? Math.min(prev + 1, people.length - 1) : Math.max(prev - 1, 0))} sessionTotalCount={people.length} sessionCurrentNumber={sessionCurrentIndex + 1} customFields={[]} groups={[]} sessionPeopleIds={people.map(p => p.id)} onPersonUpdate={() => {}} />
      )}
    </div>
  );
}
