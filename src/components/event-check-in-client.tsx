'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Loader2, 
  Phone, 
  AlertCircle,
  CheckCircle2,
  CalendarCheck2,
  ArrowRight
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { markAttendance } from '@/services/attendance-service';
import { getFolkGuides, getAssignableUsersForAssignments, getUserById } from '@/services/user-service';
import type { Group, Person, GroupEvent, AppUser } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useAppToast } from '@/contexts/toast-context';
import Image from 'next/image';
import { format } from 'date-fns';
import placeholderData from '@/app/lib/placeholder-images.json';

export default function EventCheckInClient({ groupId, eventId }: { groupId: string, eventId: string }) {
  const router = useRouter();
  const { toast } = useAppToast();

  const [group, setGroup] = React.useState<Group | null>(null);
  const [event, setEvent] = React.useState<GroupEvent | null>(null);
  const [groupOwner, setGroupOwner] = React.useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [phone, setPhone] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<'idle' | 'success' | 'assignment'>('idle');
  const [statusMsg, setStatusMsg] = React.useState('');
  const [foundPerson, setFoundPerson] = React.useState<Person | null>(null);

  const [folkGuides, setFolkGuides] = React.useState<AppUser[]>([]);
  const [enablers, setEnablers] = React.useState<AppUser[]>([]);
  const [selectedGuideId, setSelectedGuideId] = React.useState('');
  const [selectedEnablerId, setSelectedEnablerId] = React.useState('');
  const [isEnablersLoading, setIsEnablersLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupDoc, eventDoc, guides] = await Promise.all([
          getDoc(doc(db, 'groups', groupId)), 
          getDoc(doc(db, 'groups', groupId, 'events', eventId)), 
          getFolkGuides()
        ]);
        if (groupDoc.exists()) {
            const gData = { id: groupDoc.id, ...groupDoc.data() } as Group;
            setGroup(gData);
            if (gData.createdBy) {
                const owner = await getUserById(gData.createdBy);
                setGroupOwner(owner);
                if (owner) setSelectedGuideId(owner.role.includes('Folk Guide') ? owner.id : (owner.reportsTo?.guideId || ''));
            }
        }
        if (eventDoc.exists()) setEvent({ id: eventDoc.id, ...eventDoc.data() } as GroupEvent);
        setFolkGuides(guides);
      } finally { setIsLoading(false); }
    };
    fetchData();
  }, [groupId, eventId]);

  React.useEffect(() => {
    if (selectedGuideId) {
        setIsEnablersLoading(true);
        const guide = folkGuides.find(g => g.id === selectedGuideId);
        if (guide) getAssignableUsersForAssignments(guide).then(list => { setEnablers(list); setIsEnablersLoading(false); });
    }
  }, [selectedGuideId, folkGuides]);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    setIsSubmitting(true);
    try {
      const snap = await getDocs(query(collection(db, 'people'), where('phone', '==', cleanPhone), limit(1)));
      if (snap.empty) setStatus('assignment');
      else {
        const person = { id: snap.docs[0].id, ...snap.docs[0].data() } as Person;
        setFoundPerson(person);
        const result = await markAttendance(person.id, groupId, group?.name || 'Event', eventId, event?.name);
        if (result.success) { setStatusMsg(result.message); setStatus('success'); }
        else toast({ variant: 'destructive', title: "Error" });
      }
    } finally { setIsSubmitting(false); }
  };

  const goToRegister = () => {
      const ownerId = groupOwner?.id || group?.createdBy || 'anonymous-user';
      // Carry selection parameters to registration to skip redundant assignment step
      router.push(`/register/?id=${ownerId}&groupId=${groupId}&eventId=${eventId}&phone=${phone}&guideId=${selectedGuideId}&enablerId=${selectedEnablerId}`);
  };

  const logo = placeholderData.app_logo;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-12">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
          <div className="bg-primary p-3 rounded-[2rem] shadow-2xl border-4 border-primary/20 h-24 w-24 flex items-center justify-center overflow-hidden">
            <Image src={logo.url} alt={logo.alt} width={64} height={64} className="object-contain" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase leading-none">JOIN THE EVENT</h1>
            <p className="text-[10px] text-orange-500 font-black uppercase tracking-[0.4em]">{event?.name}</p>
          </div>
        </div>

        {status === 'idle' && (
          <Card className="shadow-2xl rounded-[3rem] border-none bg-popover overflow-hidden animate-in zoom-in-95 duration-500">
            <CardHeader className="text-center pt-10 pb-4"><CardTitle className="text-2xl font-black text-foreground uppercase tracking-tight">ATTENDANCE LOG</CardTitle></CardHeader>
            <CardContent className="p-10 pt-4">
                <form onSubmit={handleCheckIn} className="space-y-8">
                    <div className="space-y-3 text-center">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Enter Registered Phone</Label>
                        <div className="relative"><Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="10-digit" className="pl-14 h-16 text-2xl font-black rounded-2xl border-border bg-muted text-foreground focus:ring-orange-500" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} type="tel" required /></div>
                    </div>
                    <Button className="w-full h-16 text-lg font-black rounded-2xl shadow-xl bg-orange-500 hover:bg-orange-600 text-black transition-all hover:scale-[1.01]" disabled={isSubmitting || phone.length < 10}>{isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : "CONTINUE"}</Button>
                </form>
            </CardContent>
          </Card>
        )}

        {status === 'success' && (
          <Card className="shadow-2xl rounded-[3rem] border-none bg-popover overflow-hidden text-center p-12 space-y-8 animate-in zoom-in-95 duration-500">
             <div className="mx-auto bg-green-500/10 p-8 rounded-[2.5rem] w-fit border border-green-500/20 shadow-inner">{statusMsg.includes('already') ? <CalendarCheck2 className="h-16 w-16 text-green-500" /> : <CheckCircle2 className="h-16 w-16 text-green-500" />}</div>
             <div className="space-y-3"><h2 className="text-3xl font-black text-foreground uppercase tracking-tighter">{statusMsg.includes('already') ? 'LOGGED PREVIOUSLY' : 'ALL DONE! ✨'}</h2><div className="space-y-1"><p className="text-muted-foreground font-bold">{statusMsg.includes('already') ? "Already submitted." : "Thank you for joining."}</p><p className="text-primary font-black text-xl uppercase tracking-tight">{foundPerson?.fullName}</p></div></div>
             <Badge className="bg-muted text-muted-foreground border-none font-black text-[10px] uppercase tracking-[0.2em] py-2 px-6">{format(new Date(), 'PPPP')}</Badge>
          </Card>
        )}

        {status === 'assignment' && (
           <Card className="shadow-2xl rounded-[3rem] border-none bg-popover overflow-hidden p-10 text-center space-y-8 animate-in zoom-in-95 duration-500">
              <div className="mx-auto bg-amber-500/10 p-6 rounded-[2rem] w-fit border border-amber-500/20">
                 <AlertCircle className="h-12 w-12 text-amber-500" />
              </div>
              <div className="space-y-2">
                 <h2 className="text-2xl font-black text-foreground">Contact Not Found</h2>
                 <p className="text-sm text-muted-foreground font-bold leading-relaxed">
                    We couldn't find a record for <span className="text-orange-500">{phone}</span>. Please select your coordinator below to register.
                 </p>
              </div>
              
              <div className="space-y-4 text-left">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Folk Guide</Label>
                      <Select value={selectedGuideId} onValueChange={setSelectedGuideId}>
                          <SelectTrigger className="h-14 rounded-xl border-border bg-muted text-foreground font-bold"><SelectValue placeholder="Select Guide..." /></SelectTrigger>
                          <SelectContent className="bg-popover border-border text-foreground">
                              {folkGuides.map(g => <SelectItem key={g.id} value={g.id} className="font-bold">{g.name}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Enabler</Label>
                      <Select value={selectedEnablerId} onValueChange={setSelectedEnablerId} disabled={!selectedGuideId || isEnablersLoading}>
                          <SelectTrigger className="h-14 rounded-xl border-border bg-muted text-foreground font-bold">
                              {isEnablersLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                              <SelectValue placeholder="Select Enabler..." />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-foreground">
                              {enablers.map(e => <SelectItem key={e.id} value={e.id} className="font-bold">{e.name}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
              </div>

              <Button onClick={goToRegister} className="w-full h-16 text-lg font-black rounded-2xl shadow-xl bg-orange-500 text-black transition-all hover:scale-[1.01]" disabled={!selectedEnablerId}>
                 Start Registration <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
           </Card>
        )}
      </div>
    </div>
  );
}
