"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Person, CustomField, AppUser, Group, FolkStage } from "@/lib/types";
import { 
  Camera, 
  Upload, 
  SwitchCamera, 
  Loader2, 
  Star, 
  User, 
  Briefcase, 
  MapPin, 
  Sparkles, 
  Anchor, 
  UserCheck, 
  Tag, 
  Info, 
  Building,
  Phone,
  Banknote,
  AlertCircle,
  ChevronDown,
  Heart,
  BadgeCheck,
  UsersRound,
  XCircle,
  Save,
  Edit
} from "lucide-react";
import { getEnablers, getContactSources, getCustomPersonFields, getOccupationStatuses, getStayingWithOptions, type EnablerOption, getCurrentFolkStages } from "@/services/settings-service";
import { getFolkGuides } from "@/services/user-service";
import { useAuth } from "@/contexts/auth-context";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { StarRating } from "./star-rating";
import { Slider } from "./ui/slider";
import { ScrollArea } from "./ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

const DEFAULT_WHATSAPP_TEMPLATE = "Hare Krishna {name}, we are inviting you for our upcoming spiritual session. Hope to see you there!";

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

export const FolkStageDisplay = ({ stage, className }: { stage?: string, className?: string }) => {
  if (!stage) return null;
  const lowerCaseStage = stage.toLowerCase();
  
  return (
    <div className={cn(
      "text-[10px] font-black uppercase tracking-tight px-3 py-1.5 rounded-lg inline-flex items-center justify-center border text-center leading-none max-w-[140px]",
      lowerCaseStage.includes('interested') ? "bg-muted/50 text-muted-foreground border-muted-foreground/20" : 
      lowerCaseStage.includes('inactive') ? "bg-red-500/10 text-red-500 border-red-500/20" :
      lowerCaseStage.includes('diamond-club') ? "bg-green-500/20 text-green-500 border-green-500/30 animate-pulse" :
      lowerCaseStage.includes('frj') || lowerCaseStage.includes('frp') ? "bg-green-500/10 text-green-600 border-green-500/20" :
      lowerCaseStage.includes('challenge') ? "bg-primary/10 text-primary border-primary/20" :
      lowerCaseStage.includes('sg-s') || lowerCaseStage.includes('sg-w') ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
      "bg-primary/5 text-primary/70 border-primary/10",
      className
    )}>
      {stage}
    </div>
  );
};

const createPersonFormSchema = (allPeople: Person[], currentPersonId?: string) => 
  z.object({
    fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
    phone: z.string().regex(/^[6-9]\d{9}$/, { message: "Please enter a valid 10-digit Indian mobile number." }),
    age: z.coerce.number().min(16, "Must be at least 16").max(40, "Must be at most 40"),
    currentFolkStage: z.string().optional(),
    location: z.string().optional(),
    stayingWith: z.string().min(1, { message: "Accommodation type is required."}),
    occupation: z.string().min(1, { message: "Occupation status is required."}),
    organisation: z.string().optional(),
    rentDetails: z.coerce.number().nullable().optional(),
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
  }).refine((data) => {
      if (!allPeople || allPeople.length === 0) return true;
      return !allPeople.some(p => p.phone === data.phone && p.id !== currentPersonId);
    }, { message: "This phone number is already registered.", path: ["phone"] });

type PersonFormValues = z.infer<ReturnType<typeof createPersonFormSchema>>;

export type EditablePersonDetailsFormRef = {
  submit: () => Promise<boolean>;
};

type EditablePersonDetailsFormProps = {
  person: Person;
  isEditing: boolean;
  onSave: (data: Partial<Person>) => void | Promise<void>;
  onCancel: () => void;
  allPeople: Person[];
  groups?: Group[];
  isInDialog?: boolean;
  formId?: string;
};

const ageOptions = Array.from({ length: 25 }, (_, i) => i + 16);
const chantingRoundOptions = Array.from({ length: 17 }, (_, i) => i);

export const EditablePersonDetailsForm = React.forwardRef<EditablePersonDetailsFormRef, EditablePersonDetailsFormProps>(({
  person,
  isEditing,
  onSave,
  onCancel,
  allPeople = [],
  groups = [],
  isInDialog = false,
  formId = "person-details-form",
}, ref) => {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const isAdmin = appUser?.role.includes('Admin');
  const isPrivileged = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');
  
  const personFormSchema = React.useMemo(() => createPersonFormSchema(allPeople, person?.id), [allPeople, person?.id]);
  
  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues: {
        fullName: person?.fullName || '',
        phone: person?.phone || '',
        age: person?.age || 18,
        currentFolkStage: person?.currentFolkStage || 'Fresh Lead',
        location: person?.location || '',
        stayingWith: person?.stayingWith || '',
        occupation: person?.occupation || '',
        organisation: person?.organisation || '',
        rentDetails: person?.rentDetails || 0,
        nativePlace: person?.nativePlace || '',
        sgRating: Math.round(person?.sgRating || 0),
        contactSource: Array.isArray(person?.contactSource) ? person.contactSource : person?.contactSource ? [person.contactSource] : [],
        chantingStatus: person?.chantingStatus || 0,
        fromOtherCamp: person?.fromOtherCamp || false,
        enablerInTouchWith: person?.enablerInTouchWith || '',
        folkGuideId: person?.folkGuideId || '',
        folkId: person?.folkId || 'NA',
        relationshipStatus: person?.relationshipStatus || 'Single',
        verifiedByFg: person?.verifiedByFg || 'No',
    },
  });

  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [showCamera, setShowCamera] = React.useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
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

  const resetFormToPerson = React.useCallback(() => {
    if (person) {
      const enablerVal = enablerOptions.find(o => o.label === person.enablerInTouchWith)?.value || person.enablerInTouchWith || "";

      form.reset({
        fullName: person.fullName || '', 
        phone: person.phone || '', 
        age: person.age || 18,
        currentFolkStage: person.currentFolkStage || 'Fresh Lead', 
        location: person.location || '',
        stayingWith: person.stayingWith || '', 
        occupation: person.occupation || '',
        organisation: person.organisation || '', 
        rentDetails: person.rentDetails || 0,
        nativePlace: person.nativePlace || '', 
        sgRating: Math.round(person.sgRating || 0),
        contactSource: Array.isArray(person.contactSource) ? person.contactSource : person.contactSource ? [person.contactSource] : [],
        chantingStatus: person.chantingStatus || 0,
        fromOtherCamp: person.fromOtherCamp || false, 
        enablerInTouchWith: enablerVal,
        folkGuideId: person.folkGuideId || '', 
        folkId: person.folkId || 'NA',
        relationshipStatus: person.relationshipStatus || 'Single',
        verifiedByFg: person.verifiedByFg || 'No',
      });
      setPhotoPreview(person.photoUrl);
      setCustomData(person.customData || {});
    }
  }, [person, form, enablerOptions]);

  React.useEffect(() => { resetFormToPerson(); }, [person, resetFormToPerson]);
  
  React.useEffect(() => {
    if (isEditing && appUser) {
        const loadOptions = async () => {
            try {
                const [enablers, sources, occupations, stayings, fields, stages, guides] = await Promise.all([
                    getEnablers(appUser, 'assignment'),
                    getContactSources(appUser),
                    getOccupationStatuses(appUser),
                    getStayingWithOptions(appUser),
                    getCustomPersonFields(appUser),
                    getCurrentFolkStages(),
                    isAdmin ? getFolkGuides() : Promise.resolve(undefined),
                ]);
                setEnablerOptions(enablers);
                setContactSourceOptions(sources);
                setOccupationOptions(occupations);
                setStayingWithOptions(stayings);
                setCustomFields(fields);
                if (stages) setCurrentFolkStages(stages as FolkStage[]);
                if (guides) setFolkGuides(guides);
            } catch (error) { console.error('Failed to load options', error); }
        };
        loadOptions();
    }
  }, [isEditing, appUser, isAdmin]);

  React.useEffect(() => {
    if (!showCamera) return;
    let activeStream: MediaStream | null = null;
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraMode } });
        activeStream = stream;
        setHasCameraPermission(true);
        if (videoRef.current) {
          if (videoRef.current.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        setHasCameraPermission(false);
        toast({ variant: "destructive", title: "Camera Access Denied" });
      }
    };
    getCameraPermission();
    return () => activeStream?.getTracks().forEach(t => t.stop());
  }, [showCamera, cameraMode, toast]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) { toast({ variant: 'destructive', title: 'File too large' }); return; }
      setIsProcessingPhoto(true);
      try {
        const compressed = await compressImage(file);
        setPhotoPreview(compressed);
      } catch (e) { toast({ variant: 'destructive', title: 'Upload failed' }); }
      finally { setIsProcessingPhoto(false); if (event.target) event.target.value = ''; }
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
    const selectedEnablerName = data.enablerInTouchWith ? data.enablerInTouchWith.split('::')[0] : '';
    const selectedEnablerId = data.enablerInTouchWith ? data.enablerInTouchWith.split('::')[1] : '';
    
    const saveData = {
      ...data,
      currentFolkStage: data.currentFolkStage as FolkStage,
      enablerInTouchWith: selectedEnablerName,
      enablerId: selectedEnablerId,
      rentDetails: Number(data.rentDetails || 0),
      sgRating: Math.round(Number(data.sgRating || 0)),
      chantingStatus: Number(data.chantingStatus || 0),
      photoUrl: photoPreview || person?.photoUrl || `https://placehold.co/100x100.png`,
      customData: customData,
    } as Partial<Person>;
    if (isAdmin) {
        const selectedGuide = folkGuides.find(g => g.id === data.folkGuideId);
        saveData.folkGuideId = selectedGuide?.id || '';
        saveData.folkGuide = selectedGuide ? `${selectedGuide.name} (${selectedGuide.fgCode || 'N/A'})` : '';
    }
    await onSave(saveData);
  };

  React.useImperativeHandle(ref, () => ({
    submit: async () => {
      let isSuccess = false;
      await form.handleSubmit(async (data) => {
        await onSubmit(data);
        isSuccess = true;
      })();
      return isSuccess;
    }
  }));

  const renderCustomField = (field: CustomField) => {
    const { id, type, options = [] } = field;
    const value = customData[id];
    switch (type) {
        case 'text': return <Input value={value ?? ''} onChange={e => setCustomData(prev => ({...prev, [id]: e.target.value}))} />;
        case 'textarea': return <Textarea value={value ?? ''} onChange={e => setCustomData(prev => ({...prev, [id]: e.target.value}))} />;
        case 'number': return <Input type="number" value={value ?? ''} onChange={e => setCustomData(prev => ({...prev, [id]: e.target.valueAsNumber}))} />;
        case 'date': return <Input type="date" value={value ?? ''} onChange={e => setCustomData(prev => ({...prev, [id]: e.target.value}))} />;
        case 'boolean': return <Checkbox checked={!!value} onCheckedChange={checked => setCustomData(prev => ({...prev, [id]: checked}))} />;
        case 'dropdown': return (
            <Select value={value ?? ''} onValueChange={v => setCustomData(prev => ({...prev, [id]: v}))}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                <SelectContent>{options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
            </Select>
        );
        default: return null;
    }
  };

  if (isEditing) {
    return (
      <Form {...form}>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col items-center gap-4 pt-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={photoPreview || person?.photoUrl} />
                <AvatarFallback>{form.watch("fullName")?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              {isProcessingPhoto && <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isProcessingPhoto}><Upload className="mr-2 h-4 w-4" /> Gallery</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCamera(true)} disabled={isProcessingPhoto}><Camera className="mr-2 h-4 w-4" /> Camera</Button>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Max 2MB (Auto-compressed)</p>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
            {showCamera && (
              <div className="w-full space-y-2">
                <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowCamera(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleCapture} disabled={isProcessingPhoto}>{isProcessingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Capture'}</Button>
                </div>
              </div>
            )}
          </div>
          <ScrollArea className={cn("pr-4", isInDialog ? "h-[50vh]" : "h-auto")}>
            <div className="space-y-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="age" render={({ field }) => (<FormItem><FormLabel>Age</FormLabel><Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{ageOptions.map(age => <SelectItem key={age} value={String(age)}>{age}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="currentFolkStage" render={({ field }) => (<FormItem><FormLabel>Folk Stage</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{currentFolkStages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="relationshipStatus" render={({ field }) => (<FormItem><FormLabel>Relationship Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Single">Single</SelectItem><SelectItem value="Married">Married</SelectItem></SelectContent></Select></FormItem>)} />
                    <FormField control={form.control} name="verifiedByFg" render={({ field }) => (<FormItem><FormLabel>Verified by FG?</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isPrivileged}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent></Select></FormItem>)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="folkId" render={({ field }) => (<FormItem><FormLabel>Folk ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="chantingStatus" render={({ field }) => (<FormItem><FormLabel>Chanting Rounds</FormLabel><Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{chantingRoundOptions.map(r => <SelectItem key={r} value={String(r)}>{r}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="stayingWith" render={({ field }) => (<FormItem><FormLabel>Staying With</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{stayingWithOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="occupation" render={({ field }) => (<FormItem><FormLabel>Occupation</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{occupationOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="organisation" render={({ field }) => (<FormItem><FormLabel>Organisation</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="rentDetails" render={({ field }) => (<FormItem><FormLabel>Monthly Rent</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="nativePlace" render={({ field }) => (<FormItem><FormLabel>Native Place</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Current Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="contactSource" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Sources</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between font-normal h-10 px-3 py-2 text-left">
                              <span className="truncate">
                                {(field.value || []).length > 0 
                                  ? `${field.value.length} sources selected` 
                                  : "Select sources..."}
                              </span>
                              <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[240px] p-0" align="start">
                            <div className="p-2 max-h-[300px] overflow-y-auto">
                              {contactSourceOptions.map((o) => (
                                <div
                                  key={o}
                                  className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                                  onClick={() => {
                                    const current = field.value || [];
                                    const next = current.includes(o)
                                      ? current.filter(s => s !== o)
                                      : [...current, o];
                                    field.onChange(next);
                                  }}
                                >
                                  <Checkbox checked={(field.value || []).includes(o)} onCheckedChange={() => {}} />
                                  <span className="text-sm">{o}</span>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="sgRating" render={({ field }) => (<FormItem><FormLabel>Rating ({field.value})</FormLabel><FormControl><Slider value={[field.value || 0]} onValueChange={v => field.onChange(Math.round(v[0]))} min={0} max={5} step={1} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="enablerInTouchWith" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enabler</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isPrivileged}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__NONE__">None</SelectItem>
                        {enablerOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {!isPrivileged && <FormDescription className="text-[10px]">Only Guides/Admins can reassign Enablers.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )} />
                {isAdmin && (
                    <FormField control={form.control} name="folkGuideId" render={({ field }) => (<FormItem><FormLabel>Folk Guide</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="__NONE__">Unassigned</SelectItem>{folkGuides.map(g => <SelectItem key={g.id} value={g.id}>{g.name} ({g.fgCode})</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                )}
                <FormField control={form.control} name="fromOtherCamp" render={({ field }) => (<FormItem className="flex items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>From Other Camp</FormLabel></FormItem>)} />
                {customFields.length > 0 && (
                    <div className="space-y-4 pt-4 border-t"><h4 className="font-bold">Custom Information</h4>{customFields.map(f => (<div key={f.id} className="space-y-1"><Label>{f.label}</Label>{renderCustomField(f)}</div>))}</div>
                )}
            </div>
          </ScrollArea>
        </form>
      </Form>
    );
  }

  const rating = Math.round(Number(person.sgRating || 0));
  const whatsAppLink = () => {
    if (!person || !appUser) return '#';
    const template = appUser.whatsAppTemplate || DEFAULT_WHATSAPP_TEMPLATE;
    return `https://wa.me/91${person.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(template.replace('{name}', person.fullName))}`;
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col items-center text-center">
            <Dialog>
              <DialogTrigger asChild>
                <Avatar className={cn("mb-4 border-2 border-primary cursor-pointer hover:opacity-90 transition-opacity", isInDialog ? 'h-24 w-24' : 'h-32 w-32')}>
                    <AvatarImage src={person.photoUrl} alt={person.fullName} />
                    <AvatarFallback className="text-3xl">{person.fullName?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-transparent border-none flex items-center justify-center">
                <DialogHeader className="sr-only">
                  <DialogTitle>Profile Photo of {person.fullName}</DialogTitle>
                </DialogHeader>
                <img src={person.photoUrl} alt={person.fullName} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
              </DialogContent>
            </Dialog>
            <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{person.fullName}</h2>
                {person.verifiedByFg === 'Yes' && <BadgeCheck className="h-6 w-6 text-blue-500" />}
            </div>
            <div className="text-muted-foreground mt-1">{person.age} years • {person.location || 'N/A'}</div>
            <div className="mt-2"><FolkStageDisplay stage={person.currentFolkStage} /></div>
        </div>

      {groups.length > 0 && (
          <div className="space-y-2 bg-primary/5 p-4 rounded-xl border border-primary/10">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                  <UsersRound className="h-4 w-4" />
                  Group Memberships
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                  {groups.map(g => (
                      <Badge key={g.id} variant="outline" className="bg-background border-primary/20 text-primary font-bold text-[10px] h-6 px-3">
                          {g.name}
                      </Badge>
                  ))}
              </div>
          </div>
      )}

      <div className="grid grid-cols-[auto_1fr] items-start gap-x-6 gap-y-4 text-sm bg-muted/30 p-4 rounded-xl border">
        <div className="font-semibold text-muted-foreground flex items-center gap-2 pt-0.5"><Info className="h-4 w-4" /> Folk ID</div>
        <div>{person.folkId || 'NA'}</div>
        <div className="font-semibold text-muted-foreground flex items-center gap-2 pt-0.5"><Star className="h-4 w-4" /> Rating</div>
        <div><StarRating value={rating} /></div>
        <div className="font-semibold text-muted-foreground flex items-center gap-2 pt-0.5"><Heart className="h-4 w-4" /> Relationship</div>
        <div>{person.relationshipStatus || 'Single'}</div>
        <div className="font-semibold text-muted-foreground flex items-center gap-2 pt-0.5"><Phone className="h-4 w-4" /> Phone</div>
        <div className="flex items-center gap-3">
            <a href={`tel:${person.phone}`} className="text-primary font-bold hover:underline">{person.phone}</a>
            <a href={whatsAppLink()} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:scale-110 transition-transform">
                <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.204-1.634a11.86 11.86 0 005.794 1.504h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
            </a>
        </div>
        <div className="font-semibold text-muted-foreground flex items-center gap-2 pt-0.5"><Briefcase className="h-4 w-4" /> Occupation</div>
        <div>{person.occupation || 'N/A'} {person.organisation ? `@ ${person.organisation}` : ''}</div>
        <div className="font-semibold text-muted-foreground flex items-center gap-2 pt-0.5"><Building className="h-4 w-4" /> Staying With</div>
        <div>{person.stayingWith || 'N/A'}</div>
        {person.rentDetails ? (<><div className="font-semibold text-muted-foreground flex items-center gap-2 pt-0.5"><Banknote className="h-4 w-4" /> Monthly Rent</div><div>₹{person.rentDetails}</div></>) : null}
        <div className="font-semibold text-muted-foreground flex items-center gap-2 pt-0.5"><Anchor className="h-4 w-4" /> Native Place</div>
        <div>{person.nativePlace || 'N/A'}</div>
        <div className="font-semibold text-muted-foreground flex items-center gap-2 pt-0.5"><MapPin className="h-4 w-4" /> Location</div>
        <div>{person.location || 'N/A'}</div>
        <div className="font-semibold text-muted-foreground flex items-center gap-2 pt-0.5"><Sparkles className="h-4 w-4" /> Chanting</div>
        <div>{person.chantingStatus || 0} rounds</div>
        <div className="font-semibold text-muted-foreground flex items-center gap-2 pt-0.5"><UserCheck className="h-4 w-4" /> Folk Guide</div>
        <div>{person.folkGuide || 'N/A'}</div>
        <div className="font-semibold text-muted-foreground flex items-center gap-2 pt-0.5"><UserCheck className="h-4 w-4" /> Enabler</div>
        <div>{person.enablerInTouchWith || 'N/A'}</div>
        <div className="font-semibold text-muted-foreground flex items-center gap-2 pt-0.5"><Tag className="h-4 w-4" /> Sources</div>
        <div className="flex flex-wrap gap-1">
          {Array.isArray(person.contactSource) && person.contactSource.length > 0 ? (
            person.contactSource.map(source => <Badge key={source} variant="secondary">{source}</Badge>)
          ) : (
            <span className="text-muted-foreground italic">No sources</span>
          )}
        </div>
        {person.fromOtherCamp && (<div className="col-span-2"><Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">From Other Camp</Badge></div>)}
        {customFields.length > 0 && (
            <>{customFields.map(f => (<React.Fragment key={f.id}><div className="font-semibold text-muted-foreground flex items-center gap-2 pt-0.5"><Info className="h-4 w-4" /> {f.label}</div><div>{customData[f.id]?.toString() || 'N/A'}</div></React.Fragment>))}</>
        )}
      </div>
    </div>
  );
});

EditablePersonDetailsForm.displayName = "EditablePersonDetailsForm";
