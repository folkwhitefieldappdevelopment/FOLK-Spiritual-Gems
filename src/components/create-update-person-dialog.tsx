"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Person, CustomField, AppUser, FolkStage } from "@/lib/types";
import { Camera, Upload, SwitchCamera, Loader2, X, ShieldCheck, UserCheck } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const personFormSchema = z.object({
    fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
    phone: z.string().regex(/^[6-9]\d{9}$/, { message: "Please enter a valid 10-digit Indian mobile number." }),
    age: z.coerce.number().min(16, "Must be at least 16").max(40, "Must be at most 40"),
    currentFolkStage: z.string().optional(),
    location: z.string().optional(),
    stayingWith: z.string().min(1, { message: "Required"}),
    occupation: z.string().min(1, { message: "Required"}),
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
  const isOnlyEnabler = appUser?.role.includes('Folk Enabler') && !appUser?.role.includes('Folk Guide') && !appUser?.role.includes('Admin');
  
  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues: { fullName: "", phone: "", age: 18, currentFolkStage: "Fresh Lead", stayingWith: "", occupation: "", organisation: "", chantingStatus: 0, fromOtherCamp: false, relationshipStatus: 'Single', verifiedByFg: 'No' },
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
                isPrivileged ? getFolkGuides() : Promise.resolve([]), 
                getCurrentFolkStages()
            ]);
            setEnablerOptions(enablers); 
            setContactSourceOptions(sources); 
            setOccupationOptions(occupations); 
            setStayingWithOptions(stayings); 
            setCustomFields(fields); 
            setFolkGuides(guides || []); 
            setCurrentFolkStages(stages as FolkStage[]);

            if (person) {
                const enablerVal = enablers.find(o => o.label === person.enablerInTouchWith)?.value || person.enablerInTouchWith || "";
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
                setPhotoPreview(person.photoUrl || null);
                setCustomData(person.customData || {});
            } else {
                form.reset({ fullName: "", phone: "", age: 18, currentFolkStage: "Fresh Lead", stayingWith: "", occupation: "", organisation: "", chantingStatus: 0, fromOtherCamp: false, relationshipStatus: 'Single', verifiedByFg: 'No', enablerInTouchWith: isOnlyEnabler ? `${appUser.name}::${appUser.id}` : '' });
                setPhotoPreview(null);
                setCustomData({});
            }
        } catch (error) { console.error(error); }
    };
    loadOptions(); setShowCamera(false); setIsSubmitting(false);
  }, [isOpen, appUser, isAdmin, isPrivileged, isOnlyEnabler, person, form]);

  const handleCapture = async () => {
    if (videoRef.current) {
      setIsProcessingPhoto(true);
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setPhotoPreview(canvas.toDataURL('image/jpeg', 0.7)); setShowCamera(false); setIsProcessingPhoto(false);
    }
  };

  const onSubmit = async (data: PersonFormValues) => {
    if (!appUser) return;
    setIsSubmitting(true);
    try {
      let finalEnablerName = '';
      let finalEnablerId = '';
      let finalFolkGuideId = '';
      let finalFolkGuide = '';

      if (isOnlyEnabler) {
          finalEnablerName = appUser.name;
          finalEnablerId = appUser.id;
          finalFolkGuideId = appUser.reportsTo?.guideId || '';
          finalFolkGuide = appUser.reportsTo ? `${appUser.reportsTo.guideName} (${appUser.reportsTo.guideFgCode})` : '';
      } else if (isAdmin) {
          if (data.enablerInTouchWith) {
              const [name, id] = data.enablerInTouchWith.split('::');
              finalEnablerName = name;
              finalEnablerId = id;
          }
          if (data.folkGuideId) {
              const guide = folkGuides.find(g => g.id === data.folkGuideId);
              finalFolkGuideId = data.folkGuideId;
              finalFolkGuide = guide ? `${guide.name} (${guide.fgCode || 'N/A'})` : '';
          }
      } else if (isPrivileged) {
          // Folk Guide
          if (data.enablerInTouchWith) {
              const [name, id] = data.enablerInTouchWith.split('::');
              finalEnablerName = name;
              finalEnablerId = id;
          } else {
              finalEnablerName = appUser.name;
              finalEnablerId = appUser.id;
          }
          finalFolkGuideId = appUser.id;
          finalFolkGuide = `${appUser.name} (${appUser.fgCode || 'N/A'})`;
      }

      const saveData: Partial<Person> = { 
        ...data, 
        currentFolkStage: (data.currentFolkStage || "Fresh Lead") as FolkStage, 
        enablerInTouchWith: finalEnablerName, 
        enablerId: finalEnablerId, 
        folkGuideId: finalFolkGuideId,
        folkGuide: finalFolkGuide,
        photoUrl: photoPreview || person?.photoUrl || `https://placehold.co/100x100.png`, 
        customData 
      };
      
      const result = await onSave(saveData);
      if (result.success) { 
          toast({ title: person ? 'Saved' : 'Created' }); 
          setIsOpen(false); 
      }
    } finally { setIsSubmitting(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl bg-popover border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4 border-b border-border bg-card">
          <DialogTitle className="text-2xl font-black text-foreground">{person ? "Update Profile ✏️" : "Add New Friend 🌟"}</DialogTitle>
          <DialogDescription className="text-muted-foreground font-bold">Manage community records.</DialogDescription>
        </DialogHeader>
        {showCamera ? (
          <div className="p-8 space-y-4">
            <div className="relative"><video ref={videoRef} className="w-full aspect-video rounded-3xl bg-black object-cover shadow-2xl border-2 border-border" autoPlay muted playsInline /><Button variant="ghost" size="icon" onClick={() => setShowCamera(false)} className="absolute top-4 right-4 rounded-full bg-black/50 text-white"><X className="h-4 w-4" /></Button></div>
            <div className="flex justify-center gap-4"><Button type="button" variant="outline" className="rounded-xl font-bold border-border text-foreground" onClick={() => setCameraMode(p => p === 'user' ? 'environment' : 'user')}><SwitchCamera className="h-4 w-4 mr-2" /> Switch</Button><Button size="lg" className="rounded-xl font-black bg-[#FF9800] text-black px-10" onClick={handleCapture}>Capture</Button></div>
          </div>
        ) : (
          <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)}><ScrollArea className="h-[65vh]"><div className="p-8 space-y-8">
            <div className="flex flex-col items-center gap-6"><Avatar className="h-28 w-28 border-4 border-primary/20 shadow-2xl rounded-3xl"><AvatarImage src={photoPreview || person?.photoUrl} className="object-cover" /><AvatarFallback className="bg-muted text-primary text-2xl font-black">{form.watch("fullName")?.charAt(0) || '?'}</AvatarFallback></Avatar><div className="flex gap-3"><Button type="button" variant="outline" size="sm" className="rounded-xl bg-muted/50 border-border font-bold h-10 px-4 text-foreground hover:bg-muted" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Gallery</Button><Button type="button" variant="outline" size="sm" className="rounded-xl bg-muted/50 border-border font-bold h-10 px-4 text-foreground hover:bg-muted" onClick={() => setShowCamera(true)}><Camera className="mr-2 h-4 w-4" /> Camera</Button></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1">Full Name</FormLabel><FormControl><Input placeholder="Name" className="h-14 rounded-xl border-border bg-muted text-foreground font-bold px-5" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1">Phone</FormLabel><FormControl><Input placeholder="10-digit" className="h-14 rounded-xl border-border bg-muted text-foreground font-bold px-5" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="currentFolkStage" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1">Folk Stage</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-14 rounded-xl border-border bg-muted text-foreground font-bold px-5"><SelectValue/></SelectTrigger></FormControl><SelectContent className="bg-popover border-border text-foreground">{currentFolkStages.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}</SelectContent></Select></FormItem>)} />
              
              {!isOnlyEnabler && (
                <FormField control={form.control} name="enablerInTouchWith" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><UserCheck className="h-3 w-3" /> Enabler</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-14 rounded-xl border-border bg-muted text-foreground font-bold px-5"><SelectValue placeholder="Assign Enabler..." /></SelectTrigger></FormControl>
                      <SelectContent className="bg-popover border-border text-foreground">
                        {enablerOptions.map(o => <SelectItem key={o.value} value={o.value} className="font-bold">{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              )}

              {isAdmin && (
                <FormField control={form.control} name="folkGuideId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Folk Guide</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-14 rounded-xl border-border bg-muted text-foreground font-bold px-5"><SelectValue placeholder="Assign Guide..." /></SelectTrigger></FormControl>
                      <SelectContent className="bg-popover border-border text-foreground">
                        {folkGuides.map(g => <SelectItem key={g.id} value={g.id} className="font-bold">{g.name} ({g.fgCode || 'N/A'})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              )}
            </div>
          </div></ScrollArea><DialogFooter className="p-8 border-t border-border bg-card gap-4"><Button type="button" variant="ghost" className="rounded-xl font-bold text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>Cancel</Button><Button type="submit" className="rounded-xl font-black uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 px-10 h-14 shadow-xl shadow-primary/20">{person ? 'Save' : 'Create'}</Button></DialogFooter></form></Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
