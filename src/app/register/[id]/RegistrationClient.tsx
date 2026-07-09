'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Loader2, 
  CheckCircle2, 
  Camera, 
  Upload, 
  SwitchCamera, 
  ArrowRight, 
  UserPlus,
  X,
  Smartphone,
  MapPin,
  Building,
  Pencil,
  Cake,
  Heart,
  Briefcase,
  Home,
  Lock,
  Image as ImageIcon
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { upsertPerson } from '@/services/people-service';
import { markAttendance } from '@/services/attendance-service';
import { getStayingWithOptions, getOccupationStatuses } from '@/services/settings-service';
import { getFolkGuides, getAssignableUsersForAssignments } from '@/services/user-service';
import type { AppUser, Person } from '@/lib/types';
import { createInitialProgress } from '@/lib/data';
import Image from 'next/image';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const registrationSchema = z.object({
  fullName: z.string().min(2, 'Full name is required.'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number.'),
  age: z.coerce.number().min(16, 'Min 16').max(40, 'Max 40'),
  location: z.string().min(2, 'Location is required.'),
  stayingWith: z.string().min(1, 'Selection required.'),
  occupation: z.string().min(1, 'Selection required.'),
  organisation: z.string().min(2, 'Organisation name is required.'),
  nativePlace: z.string().optional(),
  relationshipStatus: z.enum(['Single', 'Married']).default('Single'),
});

type RegistrationValues = z.infer<typeof registrationSchema>;

export default function RegistrationClient({ initialGuideId }: { initialGuideId: string }) {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const router = useRouter();
  
  const initialEnablerId = searchParams.get('enablerId');
  const groupId = searchParams.get('groupId');
  const eventId = searchParams.get('eventId');
  const initialPhone = searchParams.get('phone') || '';

  const [folkGuides, setFolkGuides] = React.useState<AppUser[]>([]);
  const [enablers, setEnablers] = React.useState<AppUser[]>([]);
  const [selectedGuideId, setSelectedGuideId] = React.useState(initialGuideId);
  const [selectedEnablerId, setSelectedEnablerId] = React.useState(initialEnablerId || '');
  
  const [step, setStep] = React.useState<'assignment' | 'form'>(initialEnablerId ? 'form' : 'assignment');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [stayingWithOptions, setStayingWithOptions] = React.useState<string[]>([]);
  const [occupationOptions, setOccupationOptions] = React.useState<string[]>([]);
  
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [showCamera, setShowCamera] = React.useState(false);
  const [cameraMode, setCameraMode] = React.useState<'user' | 'environment'>('user');
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { 
      fullName: '', 
      phone: initialPhone, 
      age: 18, 
      location: '', 
      stayingWith: '', 
      occupation: '', 
      organisation: '', 
      nativePlace: '', 
      relationshipStatus: 'Single' 
    },
  });

  React.useEffect(() => {
    const fetchInitial = async () => {
        const [guides, staying, occupations] = await Promise.all([
          getFolkGuides(), 
          getStayingWithOptions(), 
          getOccupationStatuses()
        ]);
        setFolkGuides(guides);
        setStayingWithOptions(staying);
        setOccupationOptions(occupations);
        setIsLoading(false);
    };
    fetchInitial();
  }, []);

  React.useEffect(() => {
    if (selectedGuideId) {
        const guide = folkGuides.find(g => g.id === selectedGuideId);
        if (guide) getAssignableUsersForAssignments(guide).then(setEnablers);
    }
  }, [selectedGuideId, folkGuides]);

  React.useEffect(() => {
    if (!showCamera) return;
    let stream: MediaStream | null = null;
    const startCam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraMode } });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        toast({ variant: 'destructive', title: 'Camera Error' });
        setShowCamera(false);
      }
    };
    startCam();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, [showCamera, cameraMode, toast]);

  const handleCapture = () => {
    if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        setPhotoPreview(canvas.toDataURL('image/jpeg', 0.8));
        setShowCamera(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: RegistrationValues) => {
    if (!photoPreview) {
        toast({ variant: 'destructive', title: "Photo Required", description: "Please take a quick selfie to identify your profile." });
        return;
    }
    const enabler = enablers.find(e => e.id === selectedEnablerId);
    const guide = folkGuides.find(g => g.id === selectedGuideId);
    if (!enabler || !guide) { setStep('assignment'); return; }

    setIsSubmitting(true);
    try {
      const personData: Partial<Person> = { 
        ...data, 
        photoUrl: photoPreview, 
        enablerInTouchWith: enabler.name, 
        enablerId: enabler.id, 
        folkGuideId: guide.id, 
        folkGuide: `${guide.name} (${guide.fgCode})`, 
        currentFolkStage: 'Fresh Lead', 
        progress: createInitialProgress(), 
        verifiedByFg: 'No', 
        contactSource: ['Public Registration'] 
      };
      
      const result = await upsertPerson(personData, { id: 'public', name: 'Public Lead', role: [] });
      if (result.success && result.person) {
        if (groupId) {
            const groupSnap = await getDoc(doc(db, 'groups', groupId));
            await markAttendance(result.person.id, groupId, groupSnap.data()?.name || 'Group', eventId || undefined);
        }
        setIsSubmitted(true);
      }
    } catch (e) { 
      toast({ variant: 'destructive', title: "Submission Failed" }); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-start overflow-y-auto scrollbar-hide">
      <div className="w-full max-w-lg pt-12 pb-20 space-y-8">
        <div className="text-center space-y-3 animate-in fade-in duration-700">
          <h1 className="text-4xl font-black text-foreground tracking-tight">
            Hey, glad you're <span className="text-primary">here!</span>
          </h1>
          <p className="text-muted-foreground font-bold text-sm px-8 leading-relaxed">
            Quick intro so we know who you are.<br/>Takes less than a minute, promise.
          </p>
        </div>

        {!isSubmitted ? (
          <Card className="bg-popover border-none rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            {step === 'assignment' ? (
                <div className="p-10 space-y-10">
                    <div className="text-center space-y-4">
                        <div className="bg-card p-6 rounded-[2rem] w-fit mx-auto shadow-inner border border-border">
                            <UserPlus className="h-12 w-12 text-[#929DD8]" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-foreground">Who is helping you?</h2>
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Select your introduction coordinator.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Select Folk Guide</Label>
                            <Select value={selectedGuideId} onValueChange={setSelectedGuideId}>
                                <SelectTrigger className="h-16 rounded-2xl border-border bg-muted text-foreground font-bold px-6 text-lg focus:ring-primary">
                                    <SelectValue placeholder="Choose a Guide..." />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border text-foreground">
                                    {folkGuides.map(g => (
                                        <SelectItem key={g.id} value={g.id} className="font-bold py-3">{g.name} ({g.fgCode})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Select Enabler</Label>
                            <Select value={selectedEnablerId} onValueChange={setSelectedEnablerId}>
                                <SelectTrigger className="h-16 rounded-2xl border-border bg-muted text-foreground font-bold px-6 text-lg focus:ring-primary">
                                    <SelectValue placeholder="Pick an Enabler" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border text-foreground">
                                    {enablers.length > 0 ? enablers.map(e => (
                                        <SelectItem key={e.id} value={e.id} className="font-bold py-3">{e.name}</SelectItem>
                                    )) : (
                                        <div className="p-4 text-center text-sm text-muted-foreground font-bold italic">Select a Guide first</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button 
                            className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.01]" 
                            disabled={!selectedEnablerId}
                            onClick={() => setStep('form')}
                        >
                            Continue <ArrowRight className="ml-2 h-6 w-6" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col">
                    <CardHeader className="p-8 pb-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                New Member Form
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setStep('assignment')}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black text-foreground">Tell us a little about you</CardTitle>
                            <CardDescription className="text-muted-foreground font-bold text-sm">
                                Just the basics — nothing weird, we promise 😉
                            </CardDescription>
                        </div>
                    </CardHeader>
                    
                    <div className="p-8 pt-4 space-y-8">
                        {/* Photo Section */}
                        <div className="space-y-3">
                            <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                                <ImageIcon className="h-3.5 w-3.5" /> Your photo <span className="text-primary">★ required</span>
                            </Label>
                            
                            {showCamera ? (
                                <div className="w-full space-y-4">
                                    <video ref={videoRef} className="w-full aspect-video rounded-3xl bg-black object-cover border-4 border-border shadow-2xl" autoPlay muted playsInline />
                                    <div className="flex justify-center gap-4">
                                        <Button variant="outline" className="rounded-xl border-border text-foreground" onClick={() => setCameraMode(p => p === 'user' ? 'environment' : 'user')}><SwitchCamera className="h-4 w-4 mr-2" /> Switch</Button>
                                        <Button className="rounded-xl bg-primary text-primary-foreground font-black px-10" onClick={handleCapture}>Take Snap</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full rounded-[2rem] border-2 border-dashed border-border bg-muted/50 p-8 flex flex-col items-center justify-center text-center gap-4">
                                    {photoPreview ? (
                                        <Avatar className="h-24 w-24 rounded-2xl border-2 border-primary">
                                            <AvatarImage src={photoPreview} className="object-cover" />
                                            <AvatarFallback>IMG</AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <>
                                            <div className="text-3xl">🧑</div>
                                            <div className="space-y-1">
                                                <p className="text-foreground font-black text-sm uppercase">Put a face to your name</p>
                                                <p className="text-[10px] text-muted-foreground font-bold">Tap a button below to add your photo</p>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex gap-3 pt-2">
                                        <Button variant="outline" className="h-10 rounded-xl bg-muted/50 border-border font-bold text-foreground text-[11px]" onClick={() => fileInputRef.current?.click()}>
                                            <ImageIcon className="h-4 w-4 mr-2 text-green-400" /> Gallery
                                        </Button>
                                        <Button variant="outline" className="h-10 rounded-xl bg-muted/50 border-border font-bold text-foreground text-[11px]" onClick={() => setShowCamera(true)}>
                                            <Camera className="h-4 w-4 mr-2 text-primary" /> Camera
                                        </Button>
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                                </div>
                            )}
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField control={form.control} name="fullName" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                                            <Pencil className="h-3.5 w-3.5 text-primary" /> Full Name <span className="text-primary">★</span>
                                        </FormLabel>
                                        <FormControl><Input placeholder="Your name" className="h-14 rounded-xl border-none bg-muted text-foreground font-bold px-6 focus-visible:ring-primary" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                                            <Smartphone className="h-3.5 w-3.5 text-primary" /> Mobile Number <span className="text-primary">★</span>
                                        </FormLabel>
                                        <FormControl><Input placeholder="10-digit number" className="h-14 rounded-xl border-none bg-muted text-foreground font-bold px-6 focus-visible:ring-primary" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="age" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                                                <Cake className="h-3.5 w-3.5 text-amber-400" /> Age
                                            </FormLabel>
                                            <Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}>
                                                <FormControl><SelectTrigger className="h-14 rounded-xl border-none bg-muted text-foreground font-bold px-6"><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent className="bg-popover border-border text-foreground">
                                                    {Array.from({length: 25}, (_, i) => i + 16).map(age => <SelectItem key={age} value={String(age)} className="font-bold">{age}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="location" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                                                <MapPin className="h-3.5 w-3.5 text-red-400" /> Where in Bangalore?
                                            </FormLabel>
                                            <FormControl><Input placeholder="Whitefield, Marathalli..." className="h-14 rounded-xl border-none bg-muted text-foreground font-bold px-6 focus-visible:ring-primary" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <FormField control={form.control} name="organisation" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                                            <Building className="h-3.5 w-3.5 text-blue-400" /> Organisation (College / Company)
                                        </FormLabel>
                                        <FormControl><Input placeholder="e.g. PES University, TCS" className="h-14 rounded-xl border-none bg-muted text-foreground font-bold px-6 focus-visible:ring-primary" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="relationshipStatus" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                                                <Heart className="h-3.5 w-3.5 text-pink-400" /> Relationship Status
                                            </FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-14 rounded-xl border-none bg-muted text-foreground font-bold px-6"><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent className="bg-popover border-border text-foreground">
                                                    <SelectItem value="Single" className="font-bold">Single</SelectItem>
                                                    <SelectItem value="Married" className="font-bold">Married</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="occupation" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                                                <Briefcase className="h-3.5 w-3.5 text-orange-400" /> Occupation
                                            </FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-14 rounded-xl border-none bg-muted text-foreground font-bold px-6"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                <SelectContent className="bg-popover border-border text-foreground">
                                                    {occupationOptions.map(o => <SelectItem key={o} value={o} className="font-bold">{o}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>

                                <FormField control={form.control} name="stayingWith" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                                            <Home className="h-3.5 w-3.5 text-green-400" /> Staying With
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger className="h-14 rounded-xl border-none bg-muted text-foreground font-bold px-6"><SelectValue placeholder="How's home life?" /></SelectTrigger></FormControl>
                                            <SelectContent className="bg-popover border-border text-foreground">
                                                {stayingWithOptions.map(o => <SelectItem key={o} value={o} className="font-bold">{o}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />

                                {/* Privacy Box */}
                                <div className="bg-muted/50 rounded-2xl p-4 flex gap-4 border border-border">
                                    <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                                        <Lock className="h-4 w-4 text-primary" />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed font-bold pt-0.5">
                                        <span className="text-primary uppercase">Your info stays with us.</span> This is just so our team knows who you are. We won't spam, sell, or share your details with anyone.
                                    </p>
                                </div>

                                <Button 
                                    className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg shadow-xl shadow-primary/20 mt-4 transition-all active:scale-95" 
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : 'Submit Form! 🚀'}
                                </Button>
                            </form>
                        </Form>
                    </div>
                </div>
            )}
          </Card>
        ) : (
          <Card className="bg-popover border-none rounded-[3rem] shadow-2xl overflow-hidden p-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
            <div className="bg-green-500/10 p-8 rounded-[3rem] w-fit mx-auto border border-green-500/20 shadow-inner">
                <CheckCircle2 className="h-24 w-24 text-green-500" />
            </div>
            <div className="space-y-2">
                <h2 className="text-4xl font-black text-foreground tracking-tighter uppercase">Success! ✨</h2>
                <p className="text-muted-foreground font-bold leading-relaxed px-4">Your registration is complete. Welcome to the spiritual community!</p>
            </div>
            <Button 
                variant="outline" 
                className="rounded-2xl border-border text-foreground font-black uppercase tracking-widest h-14 px-10 hover:bg-muted" 
                onClick={() => window.location.reload()}
            >
                Register Another
            </Button>
          </Card>
        )}

        <footer className="text-center pb-12 opacity-30">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.6em]">FOLK SPIRITUAL GEMS</p>
        </footer>
      </div>
    </div>
  );
}
