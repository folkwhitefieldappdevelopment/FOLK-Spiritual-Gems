
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Person, CustomField, AppUser, Group } from "@/lib/types";
import { occupationStatuses } from "@/lib/types";
import { Camera, Upload, SwitchCamera, Phone, Tags } from "lucide-react";
import { getEnablers, getContactSources, getCustomPersonFields, type EnablerOption } from "@/services/settings-service";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StarRating } from "./star-rating";

const createPersonFormSchema = (allPeople: Person[], currentPersonId?: string) => 
  z.object({
    fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
    phone: z.string().regex(/^[6-9]\d{9}$/, { message: "Please enter a valid 10-digit Indian mobile number." }),
    age: z.coerce.number().min(16, "Must be at least 16").max(40, "Must be at most 40"),
    stayingWith: z.enum(["PG / Hostel", "Flat", "Family"]),
    occupation: z.enum(occupationStatuses),
    organisation: z.string().optional(),
    rentDetails: z.string().optional(),
    nativePlace: z.string().optional(),
    sgRating: z.coerce.number().min(0).max(10).optional(),
    contactSource: z.string().optional(),
    chantingStatus: z.string().optional(),
    fromOtherCamp: z.boolean().default(false),
    enablerInTouchWith: z.string().optional(),
    folkGuideId: z.string().optional(),
  }).refine(
    (data) => {
      // Return false if a different person already has this phone number
      return !allPeople.some(p => p.phone === data.phone && p.id !== currentPersonId);
    },
    {
      message: "This phone number is already registered to another contact.",
      path: ["phone"],
    }
  );

type PersonFormValues = z.infer<ReturnType<typeof createPersonFormSchema>>;

type EditablePersonDetailsFormProps = {
  person: Person;
  isEditing: boolean;
  onSave: (data: Partial<Person>) => void;
  onCancel: () => void;
  allPeople: Person[];
  groups?: Group[];
  isInDialog?: boolean;
};

const ageOptions = Array.from({ length: 25 }, (_, i) => i + 16);

export function EditablePersonDetailsForm({
  person,
  isEditing,
  onSave,
  onCancel,
  allPeople,
  groups = [],
  isInDialog = false,
}: EditablePersonDetailsFormProps) {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const isAdmin = appUser?.role.includes('Admin');
  const personFormSchema = createPersonFormSchema(allPeople, person?.id);
  
  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues: {},
  });

  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [showCamera, setShowCamera] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [cameraMode, setCameraMode] = React.useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [customData, setCustomData] = React.useState<{ [key: string]: any }>({});
  const [folkGuides, setFolkGuides] = React.useState<AppUser[]>([]);

  const resetFormToPerson = React.useCallback(() => {
    if (person) {
      const isStandardOccupation = occupationStatuses.includes(person.occupation);
      form.reset({
        fullName: person.fullName,
        phone: person.phone,
        age: person.age,
        stayingWith: person.stayingWith,
        occupation: isStandardOccupation ? person.occupation : 'Working',
        organisation: person.organisation || (!isStandardOccupation ? person.occupation : ''),
        rentDetails: person.rentDetails,
        nativePlace: person.nativePlace,
        sgRating: person.sgRating,
        contactSource: person.contactSource,
        chantingStatus: person.chantingStatus,
        fromOtherCamp: person.fromOtherCamp,
        enablerInTouchWith: person.enablerInTouchWith,
        folkGuideId: person.folkGuideId,
      });
      setPhotoPreview(person.photoUrl);
      setCustomData(person.customData || {});
    }
  }, [person, form]);


  React.useEffect(() => {
    resetFormToPerson();
  }, [person, resetFormToPerson]);
  
  React.useEffect(() => {
    if (isEditing) {
      const loadOptions = async () => {
          if (!appUser) return;
          try {
              const [enablers, sources, fields] = await Promise.all([
                getEnablers(appUser, 'assignment'), 
                getContactSources(),
                getCustomPersonFields()
              ]);
              setEnablerOptions(enablers);
              setContactSourceOptions(sources);
              setCustomFields(fields);
              if (isAdmin) {
                  const guides = await getFolkGuides();
                  setFolkGuides(guides);
              }
          } catch (error) {
              console.error('Failed to load dropdown options for dialog', error);
              toast({ variant: 'destructive', title: 'Could not load form options.' });
          }
      }
      loadOptions();
      setShowCamera(false);
      setHasCameraPermission(null);
      setCameraMode('user');
    }
  }, [isEditing, appUser, isAdmin, toast]);


  const handleSwitchCamera = () => {
    setCameraMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  React.useEffect(() => {
    if (!showCamera) {
      return; 
    }
    let activeStream: MediaStream | null = null;
    const getCameraPermission = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraMode } });
        activeStream = stream;
        setHasCameraPermission(true);

        if (videoRef.current) {
          if (videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
          }
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        setHasCameraPermission(false);
        toast({
          variant: "destructive",
          title: "Camera Access Denied",
          description: "Please enable camera permissions in your browser settings to use this feature.",
        });
      }
    };
    getCameraPermission();
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showCamera, cameraMode, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        setPhotoPreview(dataUrl);
        setShowCamera(false);
      }
    }
  };

  const handleCustomDataChange = (fieldId: string, value: any) => {
    setCustomData(prev => ({ ...prev, [fieldId]: value }));
  };

  const onSubmit = (data: PersonFormValues) => {
    const saveData: Partial<Omit<Person, 'folkGuide' | 'folkGuideId'>> = {
      ...data,
      photoUrl: photoPreview || person?.photoUrl || `https://placehold.co/100x100.png`,
      customData: customData,
    };
    const finalData: Partial<Person> = saveData;
    if (isAdmin) {
        const selectedGuide = folkGuides.find(g => g.id === data.folkGuideId);
        finalData.folkGuideId = selectedGuide ? selectedGuide.id : '';
        finalData.folkGuide = selectedGuide ? `${selectedGuide.name} (${selectedGuide.fgCode || 'N/A'})` : '';
    }
    onSave(finalData);
  };

  const handleCancel = () => {
    resetFormToPerson();
    onCancel();
  };

  const renderCustomField = (field: CustomField) => {
    const { id, label, type } = field;
    const value = customData[id];
    switch (type) {
      case 'text': return <Input value={value || ''} onChange={e => handleCustomDataChange(id, e.target.value)} />;
      case 'textarea': return <Textarea value={value || ''} onChange={e => handleCustomDataChange(id, e.target.value)} />;
      case 'number': return <Input type="number" value={value || ''} onChange={e => handleCustomDataChange(id, e.target.valueAsNumber)} />;
      case 'date': return <Input type="date" value={value || ''} onChange={e => handleCustomDataChange(id, e.target.value)} />;
      case 'boolean': return <Checkbox checked={!!value} onCheckedChange={checked => handleCustomDataChange(id, checked)} />;
      default: return null;
    }
  }

  const currentPhoto = photoPreview || person?.photoUrl;
  const fullName = person.fullName;
  const nameParts = (fullName || ' ').split(' ');
  const fallback = (`${nameParts[0]?.charAt(0) || ''}${nameParts.length > 1 ? nameParts[nameParts.length - 1]?.charAt(0) || '' : ''}`).toUpperCase();
  const hasCustomData = customFields.some(field => person.customData && person.customData[field.id]);

  if (isEditing) {
    return (
      <Form {...form}>
        <form id="person-details-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col items-center gap-4 pt-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={currentPhoto} alt="Person photo" />
              <AvatarFallback>{form.watch("fullName")?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Gallery
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCamera(true)}>
                <Camera className="mr-2 h-4 w-4" /> Camera
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
            {showCamera && (
              <div className="w-full space-y-2">
                <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                {hasCameraPermission === false && <Alert variant="destructive"><AlertTitle>Camera Access Required</AlertTitle><AlertDescription>Please allow camera access.</AlertDescription></Alert>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowCamera(false)}>Cancel</Button>
                  {hasMultipleCameras && <Button type="button" variant="outline" size="sm" onClick={handleSwitchCamera}><SwitchCamera className="mr-2 h-4 w-4" /> Switch</Button>}
                  <Button size="sm" onClick={handleCapture} disabled={!hasCameraPermission}>Capture</Button>
                </div>
              </div>
            )}
          </div>

          <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="age" render={({ field }) => (<FormItem><FormLabel>Age</FormLabel><Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{ageOptions.map(age => <SelectItem key={age} value={String(age)}>{age}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
          </div>
          <FormField control={form.control} name="stayingWith" render={({ field }) => (<FormItem><FormLabel>Staying At & With</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="PG / Hostel">PG / Hostel</SelectItem><SelectItem value="Flat">Flat</SelectItem><SelectItem value="Family">Family</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="occupation" render={({ field }) => (<FormItem><FormLabel>Occupation Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{occupationStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="organisation" render={({ field }) => (<FormItem><FormLabel>Organisation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <FormField control={form.control} name="sgRating" render={({ field }) => (<FormItem><FormLabel>SG Rating</FormLabel><FormControl><Input type="number" min="0" max="10" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="contactSource" render={({ field }) => (<FormItem><FormLabel>Contact Source</FormLabel><Select onValueChange={(v) => field.onChange(v === '__NONE__' ? '' : v)} value={field.value || '__NONE__'}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="__NONE__">None</SelectItem>{contactSourceOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="chantingStatus" render={({ field }) => (<FormItem><FormLabel>Chanting Status</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="enablerInTouchWith" render={({ field }) => (<FormItem><FormLabel>Enabler</FormLabel><Select onValueChange={(v) => field.onChange(v === '__NONE__' ? '' : v)} value={field.value || '__NONE__'}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="__NONE__">None</SelectItem>{enablerOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
          {isAdmin && <FormField control={form.control} name="folkGuideId" render={({ field }) => (<FormItem><FormLabel>Folk Guide</FormLabel><Select onValueChange={(v) => field.onChange(v === '__NONE__' ? '' : v)} value={field.value || '__NONE__'}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="__NONE__">Unassigned</SelectItem>{folkGuides.map(g => <SelectItem key={g.id} value={g.id}>{`${g.name} (${g.fgCode || 'N/A'})`}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
          <FormField control={form.control} name="fromOtherCamp" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-2 pt-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">From other camp?</FormLabel></FormItem>)} />
          {customFields.length > 0 && <Separator />}
          {customFields.map(field => (<div key={field.id}><Label>{field.label}</Label><div className="mt-1">{renderCustomField(field)}</div></div>))}
        </form>
      </Form>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col items-center text-center">
            <div className={cn("relative", isInDialog ? "mb-4" : "mb-8")}>
                <Dialog>
                <DialogTrigger asChild>
                    <Avatar className={cn("cursor-pointer hover:opacity-80 transition-opacity", isInDialog ? "h-24 w-24" : "h-32 w-32")}>
                        <AvatarImage src={person.photoUrl} alt={fullName} data-ai-hint="person portrait" />
                        <AvatarFallback>{fallback}</AvatarFallback>
                    </Avatar>
                </DialogTrigger>
                <DialogContent className="p-0 border-0 max-w-lg bg-transparent shadow-none"><img src={person.photoUrl} alt={fullName} className="rounded-lg w-full h-auto object-contain" /></DialogContent>
                </Dialog>
                <StarRating value={person.sgRating} totalStars={5} />
            </div>

            <h2 className="text-2xl font-bold">{fullName}</h2>
        </div>

      <div className="w-full text-left grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-sm">
        <div className="font-semibold text-muted-foreground">Phone</div>
        <div className="flex items-center gap-x-3">
          <a href={`tel:${person.phone}`} className="flex items-center gap-2 text-primary hover:underline"><Phone className="h-4 w-4" />{person.phone}</a>
          <a href={`https://wa.me/91${person.phone.replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="Open WhatsApp chat"><svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current text-green-600 hover:opacity-80 transition-opacity"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.204-1.634a11.86 11.86 0 005.794 1.504h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg></a>
        </div>
        <div className="font-semibold text-muted-foreground">Age</div><div>{person.age}</div>
        <div className="font-semibold text-muted-foreground">Staying With</div><div>{person.stayingWith}</div>
        <div className="font-semibold text-muted-foreground">Occupation</div><div>{person.occupation || 'N/A'}</div>
        <div className="font-semibold text-muted-foreground">Organisation</div><div>{person.organisation || 'N/A'}</div>
        <div className="font-semibold text-muted-foreground">Rent Details</div><div>{person.rentDetails || 'N/A'}</div>
        <div className="font-semibold text-muted-foreground">Native Place</div><div>{person.nativePlace || 'N/A'}</div>
        <div className="font-semibold text-muted-foreground">Contact Source</div><div>{person.contactSource || 'N/A'}</div>
        <div className="font-semibold text-muted-foreground">Chanting Status</div><div>{person.chantingStatus || 'N/A'}</div>
        <div className="font-semibold text-muted-foreground">From other camp?</div><div>{person.fromOtherCamp ? 'Yes' : 'No'}</div>
        <div className="font-semibold text-muted-foreground">Enabler</div><div>{person.enablerInTouchWith || 'N/A'}</div>
        <div className="font-semibold text-muted-foreground">Folk Guide</div><div>{person.folkGuide || 'N/A'}</div>
      </div>
      {groups.length > 0 && (<><Separator className="my-4" /><div className="w-full text-left space-y-2"><h4 className="font-semibold text-sm flex items-center gap-2"><Tags className="h-4 w-4 text-muted-foreground"/> In Groups</h4><div className="flex flex-wrap gap-1">{groups.map(g => (<Badge key={g.id} variant="secondary">{g.name}</Badge>))}</div></div></>)}
      {hasCustomData && (<><Separator className="my-4" /><div className="w-full text-left grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-sm">{customFields.map(f => {const v = person.customData?.[f.id];if (!v) return null;if (f.type === 'textarea') return <React.Fragment key={f.id}><div className="font-semibold text-muted-foreground col-span-2">{f.label}</div><div className="col-span-2 whitespace-pre-wrap">{String(v)}</div></React.Fragment>;return <React.Fragment key={f.id}><div className="font-semibold text-muted-foreground">{f.label}</div><div>{String(v)}</div></React.Fragment>;})}</div></>)}
    </div>
  );
}
