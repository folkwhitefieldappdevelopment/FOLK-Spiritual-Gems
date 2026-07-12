'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Phone, AlertCircle, CalendarCheck2, ArrowRight } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { markAttendance } from '@/services/attendance-service';
import { getUserById } from '@/services/user-service';
import type { Group, Person, AppUser } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { format } from 'date-fns';
import placeholderData from '@/app/lib/placeholder-images.json';

export default function CheckInClient({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const [group, setGroup] = React.useState<Group | null>(null);
  const [groupOwner, setGroupOwner] = React.useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [phone, setPhone] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<'idle' | 'success' | 'not-found'>('idle');
  const [statusMsg, setStatusMsg] = React.useState('');
  const [foundPerson, setFoundPerson] = React.useState<Person | null>(null);

  React.useEffect(() => {
    const fetchGroup = async () => {
      try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          const gData = { id: groupDoc.id, ...groupDoc.data() } as Group;
          setGroup(gData);
          if (gData.createdBy) {
              const owner = await getUserById(gData.createdBy);
              setGroupOwner(owner);
          }
        }
      } catch (e) {
        console.error("Fetch group failed", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGroup();
  }, [groupId]);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone.match(/^[6-9]\d{9}$/)) {
      toast({ variant: 'destructive', title: "Invalid Phone" });
      return;
    }

    setIsSubmitting(true);
    try {
      const q = query(collection(db, 'people'), where('phone', '==', cleanPhone), limit(1));
      const snap = await getDocs(q);

      if (snap.empty) {
        setStatus('not-found');
      } else {
        const person = { id: snap.docs[0].id, ...snap.docs[0].data() } as Person;
        setFoundPerson(person);
        const result = await markAttendance(person.id, groupId, group?.name || 'Event');
        if (result.success) {
          setStatusMsg(result.message);
          setStatus('success');
        } else {
          toast({ variant: 'destructive', title: "Error", description: result.message });
        }
      }
    } catch (e) {
      toast({ variant: 'destructive', title: "Error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToRegister = () => {
    const ownerId = groupOwner?.id || group?.createdBy || 'anonymous-user';
    // Standardize routing: pass owner ID as the 'id' parameter.
    // RegistrationClient will resolve their role and show the appropriate UI.
    router.push(`/register/?id=${ownerId}&groupId=${groupId}&phone=${phone}`);
  };

  const logo = placeholderData.app_logo;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  if (!group) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center p-8 bg-popover border-none rounded-[2.5rem]">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <CardTitle className="text-foreground">Invalid Outreach Link</CardTitle>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-12">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
          <div className="bg-primary p-3 rounded-[2rem] shadow-2xl border-4 border-primary/20 h-24 w-24 flex items-center justify-center overflow-hidden">
            <Image src={logo.url} alt={logo.alt} width={64} height={64} className="object-contain" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase leading-none">JOIN THE GROUP</h1>
            <p className="text-[10px] text-orange-500 font-black uppercase tracking-[0.4em]">{group.name}</p>
          </div>
        </div>

        {status === 'idle' && (
          <Card className="shadow-2xl rounded-[3rem] border-none bg-popover overflow-hidden animate-in zoom-in-95 duration-500">
            <CardHeader className="text-center pt-10 pb-4">
                <CardTitle className="text-2xl font-black text-foreground uppercase tracking-tight">ATTENDANCE LOG</CardTitle>
            </CardHeader>
            <CardContent className="p-10 pt-4">
                <form onSubmit={handleCheckIn} className="space-y-8">
                    <div className="space-y-3 text-center">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Enter Registered Phone</Label>
                        <div className="relative">
                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="10-digit mobile" className="pl-14 h-16 text-2xl font-black rounded-2xl border-border bg-muted text-foreground focus:ring-orange-500" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} type="tel" required />
                        </div>
                    </div>
                    <Button className="w-full h-16 text-lg font-black rounded-2xl shadow-xl bg-orange-500 hover:bg-orange-600 text-black transition-all hover:scale-[1.01]" disabled={isSubmitting || phone.length < 10}>
                        {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : "SUBMIT FORM"}
                    </Button>
                </form>
            </CardContent>
          </Card>
        )}

        {status === 'success' && (
          <Card className="shadow-2xl rounded-[3rem] border-none bg-popover overflow-hidden text-center p-12 space-y-8 animate-in zoom-in-95 duration-500">
             <div className="mx-auto bg-green-500/10 p-8 rounded-[2.5rem] w-fit border border-green-500/20 shadow-inner">
                {statusMsg.includes('already') ? <CalendarCheck2 className="h-16 w-16 text-green-500" /> : <CheckCircle2 className="h-16 w-16 text-green-500" />}
             </div>
             <div className="space-y-3">
                <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter">
                    {statusMsg.includes('already') ? 'LOGGED PREVIOUSLY' : 'SUCCESS! ✨'}
                </h2>
                <div className="space-y-1">
                    <p className="text-muted-foreground font-bold">
                        {statusMsg.includes('already') ? "Your attendance is already on record." : "You have been added to the group list."}
                    </p>
                    <p className="text-primary font-black text-xl uppercase tracking-tight">{foundPerson?.fullName}</p>
                </div>
             </div>
             <Badge className="bg-muted text-muted-foreground border-none font-black text-[10px] uppercase tracking-[0.2em] py-2 px-6">
                {format(new Date(), 'PPPP')}
             </Badge>
          </Card>
        )}

        {status === 'not-found' && (
           <Card className="shadow-2xl rounded-[3rem] border-none bg-popover overflow-hidden p-12 text-center space-y-10 animate-in zoom-in-95 duration-500">
              <div className="mx-auto bg-amber-500/10 p-8 rounded-[2.5rem] w-fit border border-amber-500/20">
                 <AlertCircle className="h-16 w-16 text-amber-500" />
              </div>
              <div className="space-y-3">
                 <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">NEW TO CRM?</h2>
                 <p className="text-sm text-muted-foreground font-bold leading-relaxed px-2">
                    We couldn't find a profile for <span className="text-orange-500 font-black">{phone}</span>.<br/>Register now to join the list!
                 </p>
              </div>
              
              <div className="space-y-4">
                  <div className="bg-muted p-5 rounded-2xl border border-border flex items-center justify-between">
                      <div className="text-left">
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Coordinator</p>
                          <p className="text-sm font-black text-foreground">{groupOwner?.name || 'App Team'}</p>
                      </div>
                      <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase text-[8px] tracking-widest">OFFICIAL</Badge>
                  </div>

                  <Button onClick={goToRegister} className="w-full h-16 text-lg font-black rounded-2xl shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:scale-[1.01]">
                     START REGISTRATION <ArrowRight className="ml-2 h-6 w-6" />
                  </Button>
              </div>
           </Card>
        )}
      </div>
      
      <footer className="mt-16 opacity-30">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em]">FOLK SPIRITUAL GEMS</p>
      </footer>
    </div>
  );
}
