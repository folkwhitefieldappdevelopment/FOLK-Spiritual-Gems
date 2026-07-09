'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Phone, AlertCircle, CalendarCheck2 } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { markAttendance } from '@/services/attendance-service';
import type { Group, Person } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAppToast } from '@/contexts/toast-context';
import Image from 'next/image';
import { format } from 'date-fns';
import placeholderData from '@/app/lib/placeholder-images.json';
import { cn } from '@/lib/utils';

export default function CheckInClient({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { toast } = useAppToast();

  const [group, setGroup] = React.useState<Group | null>(null);
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
          setGroup({ id: groupDoc.id, ...groupDoc.data() } as Group);
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
      toast({ variant: 'destructive', title: "Invalid Phone", description: "Please enter a valid 10-digit mobile number." });
      return;
    }

    setIsSubmitting(true);
    try {
      const peopleRef = collection(db, 'people');
      const q = query(peopleRef, where('phone', '==', cleanPhone), limit(1));
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
      console.error("Check-in error:", e);
      toast({ variant: 'destructive', title: "Error", description: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToRegister = () => {
    if (!group) return;
    const ownerId = group.createdBy || 'anonymous-user';
    router.push(`/register?guideId=${ownerId}&groupId=${groupId}&phone=${phone}`);
  };

  const logo = placeholderData.app_logo;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-muted/30"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  if (!group) return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader><div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4"><AlertCircle className="h-12 w-12 text-destructive" /></div><CardTitle>Invalid Event</CardTitle></CardHeader>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="bg-primary p-2 rounded-full shadow-lg border-2 border-primary/20 h-20 w-20 flex items-center justify-center overflow-hidden">
            <Image src={logo.url} alt={logo.alt} width={64} height={64} className="object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-black text-primary tracking-tight">SUBMIT THE FORM</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{group.name}</p>
          </div>
        </div>
        {status === 'idle' && (
          <Card className="shadow-xl border-t-4 border-t-primary"><CardHeader><CardTitle>Check-in</CardTitle></CardHeader><CardContent><form onSubmit={handleCheckIn} className="space-y-4"><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="10-digit mobile number" className="pl-10 h-12 text-lg font-bold" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} type="tel" required /></div><Button className="w-full h-12 text-lg font-bold" disabled={isSubmitting || phone.length < 10}>{isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Submit Form"}</Button></form></CardContent></Card>
        )}
        {status === 'success' && (
          <Card className="shadow-xl border-t-4 border-t-green-500 text-center py-8"><CardContent className="space-y-4 pt-6">
            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
              {statusMsg.includes('already') ? <CalendarCheck2 className="h-12 w-12 text-green-600" /> : <CheckCircle2 className="h-12 w-12 text-green-600" />}
            </div>
            <CardTitle className="text-2xl">
              {statusMsg.includes('already') ? 'Previously Submitted' : 'Form Submitted!'}
            </CardTitle>
            <div className="space-y-1">
              <p className="text-muted-foreground">
                {statusMsg.includes('already') ? "You have already filled this form previously." : "Thank you for filling the form."}
              </p>
              <p className="font-bold text-foreground">{foundPerson?.fullName}</p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700">{format(new Date(), 'PPPP')}</Badge>
          </CardContent></Card>
        )}
        {status === 'not-found' && (
          <Card className="shadow-xl border-t-4 border-t-amber-500 text-center py-8"><CardContent className="space-y-6 pt-6"><div className="mx-auto bg-amber-100 p-3 rounded-full w-fit mb-4"><AlertCircle className="h-12 w-12 text-amber-600" /></div><CardTitle className="text-2xl">Contact Not Found</CardTitle><p className="text-muted-foreground text-sm">We couldn't find a record for <span className="font-bold text-foreground">{phone}</span>. Please register first to mark attendance.</p><Button onClick={handleGoToRegister} className="w-full h-12 text-lg font-bold">Go to Registration</Button></CardContent></Card>
        )}
      </div>
    </div>
  );
}