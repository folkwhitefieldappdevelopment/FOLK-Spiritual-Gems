"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Person, CustomField, AppUser, FolkStage } from "@/lib/types";
import { Camera, Upload, SwitchCamera, Loader2, AlertCircle, ChevronDown, UserCircle2, X } from "lucide-react";
import { 
  getEnablers, 
  getContactSources, 
  getCustomPersonFields, 
  getOccupationStatuses, 
  getStayingWithOptions, 
  type EnablerOption, 
  getCurrentFolkStages 
} from "@/services/settings-service";
import { getFolkGuides } from "@/services/user-service";
import { checkDuplicatePhone, upsertPerson } from "@/services/people-service";
import { useAuth } from "@/contexts/auth-context";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const personFormSchema = z.object({
    fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
    phone: z.string().regex(/^[6-9]\d{9}$/, { message: "Please enter a valid 10-digit Indian mobile number." }),
    age: z.coerce.number().min(16, "Must be at least 16").max(40, "Must be at most 40"),
    currentFolkStage: z.string().optional(),
    location: z.string().optional(),
    stayingWith: z.string().min(1, { message: "This field is required."}),
    occupation: z.string().min(1, { message: "This field is required."}),
    organisation: z.string().optional(),
    rentDetails: z.coerce.number().optional(),
    nativePlace: z.string().optional(),
    sgRating: z.coerce.number().min(0).max(5).optional(),
    contactSource: z.array(z.string()).default([]),
    chantingStatus: z.coerce.number().optional(),
    fromOtherCamp: z.boolean().default(false),
    enablerInTouchWith: z.string().optional(),
    folkGuideId: z.string().optional(),
    folkId: z.string().optional(),
    relationshipStatus: z.enum(['Single', 'Married']).default('Single'),
    verifiedByFg: z.enum(['Yes', 'No']).default('No'),
});

type PersonFormValues = z.infer<typeof personFormSchema>;

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scaleSize = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context not available')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
    reader.onerror = reject;
  });
};

const ageOptions = Array.from({ length: 25 }, (_, i) => i + 16);
const chantingRoundOptions = Array.from({ length: 17 }, (_, i) => i);

export function CreateUpdatePersonDialog({
  isOpen,
  setIsOpen,
  onSave,
  person,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (data: Partial<Person>) => Promise<{success: boolean, message?: string}>;
  person?: Person;
  allPeople: Person[];
}) {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const isAdmin = appUser?.role.includes('Admin') ?? false;
  const isPrivileged = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');
  
  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues: {
      fullName: "", phone: "", age: 18, currentFolkStage: "Fresh Lead", location: "", stayingWith: "",
      occupation: "", organisation: "", rentDetails: 0, nativePlace: "", sgRating: 0,
      contactSource: [], chantingStatus: 0, fromOtherCamp: false,
      enablerInTouchWith: "", folkGuideId: "", folkId: "NA", relationshipStatus: 'Single', verifiedByFg: 'No',
    },
  });

  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [showCamera, setShowCamera] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = React.useState(false);
  const [cameraMode, setCameraMode] = React.useState<'user' | 'environment'>('user');
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);
  const [occupationOptions, setOccupationOptions] = React.useState<string[]>([]);
  const [stayingWithOptions, setStayingWithOptions] = React.useState<string[]>([]);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [customData, setCustomData] = React.useState<{ [key: string]: any }>({});
  const [folkGuides, setFolkGuides] = React.useState<AppUser[]>([]);
  const [currentFolkStages, setCurrentFolkStages] = React.useState<FolkStage[]>([]);

  const watchedPhone = form.watch('phone');
  const [duplicatePerson, setDuplicatePerson] = React.useState<Person | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = React.useState(false);

  React.useEffect(() => {
    const checkDuplicate = async () => {
        if (watchedPhone?.length === 10) {
            setIsCheckingDuplicate(true);
            try {
                const match = await checkDuplicatePhone(watchedPhone, person?.id);
                setDuplicatePerson(match);
            } catch (e) {
                console.error("Duplicate check failed", e);
            } finally {
                setIsCheckingDuplicate(false);
            }
        } else {
            setDuplicatePerson(null);
        }
    };

    const timer = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timer);
  }, [watchedPhone, person?.id]);

  React.useEffect(() => {
    if (!isOpen) return;
    const loadOptions = async () => {
        if (!appUser) return;
        try {
            const [enablers, sources, occupations, stayings, fields, guides, stages] = await Promise.all([
                getEnablers(appUser, 'assignment'),
                getContactSources(appUser),
                getOccupationStatuses(appUser),
                getStayingWithOptions(appUser),
                getCustomPersonFields(appUser),
                isAdmin ? getFolkGuides() : Promise.resolve([]),
                getCurrentFolkStages()
            ]);
            setEnablerOptions(enablers);
            setContactSourceOptions(sources);
            setOccupationOptions(occupations);
            setStayingWithOptions(stayings);
            setCustomFields(fields);
            setFolkGuides(guides || []);
            setCurrentFolkStages(stages as FolkStage[]);
        } catch (error) {
            console.error('Failed to load dropdown options', error);
        }
    };
    loadOptions();
    setShowCamera(false);
    setIsSubmitting(false);
  }, [isOpen, appUser, isAdmin]);

  React.useEffect(() => {
    if (person && isOpen) {
      const enablerVal = enablerOptions.find(o => o.label === person.enablerInTouchWith || o.value === person.enablerInTouchWith)?.value || person.enablerInTouchWith || "";
      form.reset({
        fullName: person.fullName || "", 
        phone: person.phone || "", 
        age: person.age || 18,
        currentFolkStage: person.currentFolkStage || "Fresh Lead", 
        location: person.location || "",
        stayingWith: person.stayingWith || "", 
        occupation: person.occupation || "",
        organisation: person.organisation || "", 
        rentDetails: person.rentDetails || 0,
        nativePlace: person.nativePlace || "", 
        sgRating: Math.round(person.sgRating || 0),
        contactSource: Array.isArray(person.contactSource) ? person.contactSource : person.contactSource ? [person.contactSource] : [],
        chantingStatus: person.chantingStatus || 0, 
        fromOtherCamp: person.fromOtherCamp || false,
        enablerInTouchWith: enablerVal,
        folkGuideId: person.folkGuideId || "", 
        folkId: person.folkId || 'NA',
        relationshipStatus: person.relationshipStatus || 'Single',
        verifiedByFg: person.verifiedByFg || 'No',
      });
      setPhotoPreview(person.photoUrl || null);
      setCustomData(person.customData || {});
    } else if (isOpen) {
      const defaultEnabler = (!isPrivileged && appUser) ? `${appUser.name}::${appUser.id}` : "";
      
      form.reset({
        fullName: "", phone: "", age: 18, currentFolkStage: "Fresh Lead", location: "", stayingWith: "",
        occupation: "", organisation: "", rentDetails: 0, nativePlace: "", sgRating: 0,
        contactSource: [], chantingStatus: 0, fromOtherCamp: false,
        enablerInTouchWith: defaultEnabler, folkGuideId: "", folkId: "NA", relationshipStatus: 'Single', verifiedByFg: 'No'
      });
      setPhotoPreview(null);
      setCustomData({});
    }
  }, [person, isOpen, form, enablerOptions, isPrivileged, appUser]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessingPhoto(true);
      try {
        const compressed = await compressImage(file);
        setPhotoPreview(compressed);
      } catch (e) {
        toast({ variant: 'destructive', title: 'Upload failed' });
      } finally {
        setIsProcessingPhoto(false);
        if (event.target) event.target.value = '';
      }
    }
  };

  const handleCapture = async () => {
    if (videoRef.current) {
      setIsProcessingPhoto(true);
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            const compressed = await compressImage(new File([blob], "capture.jpg", { type: "image/jpeg" }));
            setPhotoPreview(compressed);
            setShowCamera(false);
          } catch (e) { toast({ variant: 'destructive', title: 'Capture failed' }); }
          finally { setIsProcessingPhoto(false); }
        }
      }, 'image/jpeg', 0.7);
    }
  };

  const onSubmit = async (data: PersonFormValues) => {
    setIsSubmitting(true);
    try {
      const selectedEnablerName = data.enablerInTouchWith ? data.enablerInTouchWith.split('::')[0] : '';
      const selectedEnablerId = data.enablerInTouchWith ? data.enablerInTouchWith.split('::')[1] : '';
      
      const saveData: Partial<Person> = {
        ...data,
        currentFolkStage: (data.currentFolkStage || "Fresh Lead") as FolkStage,
        rentDetails: Number(data.rentDetails || 0),
        enablerInTouchWith: selectedEnablerName,
        enablerId: selectedEnablerId,
        sgRating: Math.round(Number(data.sgRating || 0)),
        chantingStatus: Number(data.chantingStatus || 0),
        photoUrl: photoPreview || person?.photoUrl || `https://placehold.co/100x100.png`,
        customData: customData,
      };

      if (isAdmin) {
          const selectedGuide = folkGuides.find(g => g.id === data.folkGuideId);
          saveData.folkGuideId = selectedGuide ? selectedGuide.id : '';
          saveData.folkGuide = selectedGuide ? `${selectedGuide.name} (${selectedGuide.fgCode || 'N/A'})` : '';
      }

      const result = duplicatePerson 
        ? await upsertPerson(saveData, appUser!)
        : await onSave(saveData);

      if (result.success) {
        toast({ title: duplicatePerson ? 'Contact Updated' : (person ? 'Contact Saved' : 'Contact Created') });
        setIsOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    } catch(e) {
        toast({ variant: 'destructive', title: 'Save Failed' });
    } finally { 
        setIsSubmitting(false); 
    }
  };

  const renderCustomField = (field: CustomField) => {
    const { id, type, options = [] } = field;
    const value = customData[id];
    
    if (type === 'dropdown') {
        return (
            <Select key={id} value={value ?? ''} onValueChange={v => setCustomData(prev => ({ ...prev, [id]: v }))}>
                <SelectTrigger className="bg-[#161623] border-white/5 rounded-xl"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent className="bg-[#1e1e2e] border-white/5 text-white">{options.map(opt => <SelectItem key={opt} value={opt} className="font-bold">{opt}</SelectItem>)}</SelectContent>
            </Select>
        );
    }
    if (type === 'boolean') return <Checkbox key={id} checked={!!value} onCheckedChange={checked => setCustomData(prev => ({ ...prev, [id]: checked }))} />;
    if (type === 'textarea') return <Textarea key={id} value={value ?? ''} onChange={e => setCustomData(prev => ({ ...prev, [id]: e.target.value }))} className="bg-[#161623] border-white/5 rounded-xl" />;
    return <Input key={id} type={type === 'number' ? 'number' : 'text'} value={value ?? ''} onChange={e => setCustomData(prev => ({ ...prev, [id]: type === 'number' ? e.target.valueAsNumber : e.target.value }))} className="bg-[#161623] border-white/5 rounded-xl" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl bg-[#1e1e2e] border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-8 pb-4 border-b border-white/5 bg-[#1b1d32]">
          <DialogTitle className="text-2xl font-black text-white">{person ? "Update Profile ✏️" : "Add New Friend 🌟"}</DialogTitle>
          <DialogDescription className="text-slate-400 font-bold">{person ? "Keep the details fresh and updated." : "Register a new soul into the community."}</DialogDescription>
        </DialogHeader>

        {showCamera ? (
          <div className="p-8 space-y-4">
            <div className="relative">
                <video ref={videoRef} className="w-full aspect-video rounded-3xl bg-black object-cover shadow-2xl border-2 border-white/5" autoPlay muted playsInline />
                <Button variant="ghost" size="icon" onClick={() => setShowCamera(false)} className="absolute top-4 right-4 rounded-full bg-black/50 text-white"><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex justify-center gap-4">
              <Button type="button" variant="outline" className="rounded-xl font-bold border-white/10 text-white" onClick={() => setCameraMode(p => p === 'user' ? 'environment' : 'user')}>
                <SwitchCamera className="h-4 w-4 mr-2" /> Switch
              </Button>
              <Button size="lg" className="rounded-xl font-black bg-[#FF9800] text-black px-10" onClick={handleCapture} disabled={isProcessingPhoto}>
                  {isProcessingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Capture Now'}
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <ScrollArea className="h-[65vh]">
                <div className="p-8 space-y-8">
                  {duplicatePerson && (
                    <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 rounded-2xl animate-in fade-in zoom-in-95">
                        <AlertTitle className="text-[10px] font-black uppercase tracking-widest text-red-500">Duplicate Identified</AlertTitle>
                        <AlertDescription className="text-xs font-bold text-slate-300">
                            <span className="text-red-500">{duplicatePerson.fullName}</span> is already in the system. Saving will update the existing record.
                        </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex flex-col items-center gap-6">
                    <div className="relative group/photo">
                        <Avatar className="h-28 w-28 border-4 border-primary/20 shadow-2xl rounded-3xl">
                        <AvatarImage src={photoPreview || person?.photoUrl} className="object-cover" />
                        <AvatarFallback className="bg-[#161623] text-primary text-2xl font-black">{form.watch("fullName")?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        {isProcessingPhoto && <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-3xl"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}
                    </div>
                    <div className="flex gap-3">
                        <Button type="button" variant="outline" size="sm" className="rounded-xl bg-white/5 border-white/5 font-bold h-10 px-4 text-white hover:bg-white/10" onClick={() => fileInputRef.current?.click()} disabled={isProcessingPhoto}><Upload className="mr-2 h-4 w-4" /> Gallery</Button>
                        <Button type="button" variant="outline" size="sm" className="rounded-xl bg-white/5 border-white/5 font-bold h-10 px-4 text-white hover:bg-white/10" onClick={() => setShowCamera(true)} disabled={isProcessingPhoto}><Camera className="mr-2 h-4 w-4" /> Camera</Button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Full Name</FormLabel>
                            <FormControl><Input placeholder="Full name" className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex justify-between">
                                Phone Number
                                {isCheckingDuplicate && <Loader2 className="h-3 w-3 animate-spin opacity-50" />}
                            </FormLabel>
                            <FormControl><Input placeholder="10-digit mobile" className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="age" render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Age</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                                <FormControl><SelectTrigger className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent className="bg-[#1e1e2e] border-white/5 text-white">{ageOptions.map(age => <SelectItem key={age} value={String(age)} className="font-bold">{age}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="currentFolkStage" render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Folk Stage</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold"><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent className="bg-[#1e1e2e] border-white/5 text-white">{currentFolkStages.map(stage => <SelectItem key={stage} value={stage} className="font-bold">{stage}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="relationshipStatus" render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Relationship</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold"><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent className="bg-[#1e1e2e] border-white/5 text-white"><SelectItem value="Single" className="font-bold">Single</SelectItem><SelectItem value="Married" className="font-bold">Married</SelectItem></SelectContent>
                            </Select>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="verifiedByFg" render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Verified by FG?</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!isPrivileged}>
                                <FormControl><SelectTrigger className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold"><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent className="bg-[#1e1e2e] border-white/5 text-white"><SelectItem value="Yes" className="font-bold">Yes</SelectItem><SelectItem value="No" className="font-bold">No</SelectItem></SelectContent>
                            </Select>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="organisation" render={({ field }) => (
                        <FormItem className="space-y-2 md:col-span-2">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Organisation (College / Company)</FormLabel>
                            <FormControl><Input placeholder="e.g. PES University, TCS" className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold" {...field} /></FormControl>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Bangalore Locality</FormLabel>
                            <FormControl><Input placeholder="Whitefield, Marathalli..." className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold" {...field} /></FormControl>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="nativePlace" render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Native Place</FormLabel>
                            <FormControl><Input placeholder="Home town" className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold" {...field} /></FormControl>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="stayingWith" render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Staying With</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold"><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent className="bg-[#1e1e2e] border-white/5 text-white">{stayingWithOptions.map(o => <SelectItem key={o} value={o} className="font-bold">{o}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="occupation" render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Occupation</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold"><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent className="bg-[#1e1e2e] border-white/5 text-white">{occupationOptions.map(o => <SelectItem key={o} value={o} className="font-bold">{o}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="chantingStatus" render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Chanting Rounds</FormLabel>
                            <Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}>
                                <FormControl><SelectTrigger className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold"><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent className="bg-[#1e1e2e] border-white/5 text-white">{chantingRoundOptions.map(r => <SelectItem key={r} value={String(r)} className="font-bold">{r}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="sgRating" render={({ field }) => (
                        <FormItem className="space-y-4">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">SG Rating ({field.value})</FormLabel>
                            <FormControl><Slider value={[field.value || 0]} onValueChange={v => field.onChange(Math.round(v[0]))} min={0} max={5} step={1} /></FormControl>
                        </FormItem>
                    )} />
                  </div>

                  <div className="space-y-6 pt-6 border-t border-white/5">
                    <h3 className="text-xs font-black uppercase text-primary tracking-[0.2em]">Assignment & Admin</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <FormField control={form.control} name="enablerInTouchWith" render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Primary Enabler</FormLabel>
                            <Select onValueChange={(v) => field.onChange(v === '__NONE__' ? '' : v)} value={field.value || '__NONE__'} disabled={!isPrivileged}>
                                <FormControl><SelectTrigger className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold"><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent className="bg-[#1e1e2e] border-white/5 text-white">
                                    <SelectItem value="__NONE__" className="font-bold">None</SelectItem>
                                    {enablerOptions.map(opt => <SelectItem key={opt.value} value={opt.value} className="font-bold">{opt.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormItem>
                        )} />

                        {isAdmin && (
                        <FormField control={form.control} name="folkGuideId" render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Folk Guide</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold"><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent className="bg-[#1e1e2e] border-white/5 text-white">
                                        <SelectItem value="__NONE__" className="font-bold">Unassigned</SelectItem>
                                        {folkGuides.map(g => <SelectItem key={g.id} value={g.id} className="font-bold">{g.name} ({g.fgCode})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        )}
                    </div>
                  </div>

                  {customFields.length > 0 && (
                    <div className="space-y-6 pt-6 border-t border-white/5">
                      <h3 className="text-xs font-black uppercase text-primary tracking-[0.2em]">Custom Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {customFields.map(field => (
                          <div key={field.id} className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">{field.label}</Label>
                            {renderCustomField(field)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <DialogFooter className="p-8 border-t border-white/5 bg-[#1b1d32] gap-4">
                <Button type="button" variant="ghost" className="rounded-xl font-bold text-slate-400 hover:text-white" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" className="rounded-xl font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 px-10 h-14 shadow-xl shadow-primary/20" disabled={isSubmitting || isProcessingPhoto}>
                    {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : (person ? 'Save Changes' : 'Create Contact')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
