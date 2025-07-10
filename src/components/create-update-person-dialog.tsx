
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Person, CustomField, AppUser } from "@/lib/types";
import { occupationStatuses } from "@/lib/types";
import { Camera, Upload, SwitchCamera, Loader2 } from "lucide-react";
import { getEnablers, getContactSources, getCustomPersonFields, type EnablerOption } from "@/services/settings-service";
import { getFolkGuides } from "@/services/user-service";
import { useAuth } from "@/contexts/auth-context";
import { useAdmin } from "@/contexts/admin-context";

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
  FormDescription,
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

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
    sgRating: z.coerce.number().min(0).max(10).default(0),
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

type CreateUpdatePersonDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (data: Omit<Person, "id" | "progress" | "createdAt">) => Promise<void>;
  person?: Person;
  allPeople: Person[];
};

const ageOptions = Array.from({ length: 25 }, (_, i) => i + 16);

export function CreateUpdatePersonDialog({
  isOpen,
  setIsOpen,
  onSave,
  person,
  allPeople,
}: CreateUpdatePersonDialogProps) {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const { isAdmin } = useAdmin();
  const personFormSchema = createPersonFormSchema(allPeople, person?.id);
  
  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      age: 18,
      stayingWith: "Family",
      occupation: "Working",
      organisation: "",
      rentDetails: "",
      nativePlace: "",
      sgRating: 0,
      contactSource: "",
      chantingStatus: "",
      fromOtherCamp: false,
      enablerInTouchWith: "",
      folkGuideId: "",
    },
  });

  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [showCamera, setShowCamera] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<
    boolean | null
  >(null);
  const [cameraMode, setCameraMode] = React.useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [customData, setCustomData] = React.useState<{ [key: string]: any }>({});
  const [folkGuides, setFolkGuides] = React.useState<AppUser[]>([]);


  React.useEffect(() => {
    if (isOpen) {
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
          sgRating: person.sgRating || 0,
          contactSource: person.contactSource,
          chantingStatus: person.chantingStatus,
          fromOtherCamp: person.fromOtherCamp,
          enablerInTouchWith: person.enablerInTouchWith,
          folkGuideId: person.folkGuideId,
        });
        setPhotoPreview(person.photoUrl);
        setCustomData(person.customData || {});
      } else {
        form.reset({
          fullName: "",
          phone: "",
          age: 18,
          stayingWith: "Family",
          occupation: "Working",
          organisation: "",
          rentDetails: "",
          nativePlace: "",
          sgRating: 0,
          contactSource: "",
          chantingStatus: "",
          fromOtherCamp: false,
          enablerInTouchWith: "",
          folkGuideId: "",
        });
        setPhotoPreview(null);
        setCustomData({});
      }
      setShowCamera(false);
      setHasCameraPermission(null);
      setCameraMode('user');
      setIsSubmitting(false);
    }
  }, [person, form, isOpen, toast, appUser, isAdmin]);

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
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraMode },
        });
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
          description:
            "Please enable camera permissions in your browser settings to use this feature.",
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
        context.drawImage(
          videoRef.current,
          0,
          0,
          canvas.width,
          canvas.height
        );
        const dataUrl = canvas.toDataURL("image/png");
        setPhotoPreview(dataUrl);
        setShowCamera(false);
      }
    }
  };

  const handleCustomDataChange = (fieldId: string, value: any) => {
    setCustomData(prev => ({ ...prev, [fieldId]: value }));
  };

  const onSubmit = async (data: PersonFormValues) => {
    setIsSubmitting(true);
    try {
      const saveData: Partial<Omit<Person, 'folkGuide' | 'folkGuideId'>> = {
        ...data,
        organisation: data.organisation || "",
        rentDetails: data.rentDetails || "",
        nativePlace: data.nativePlace || "",
        contactSource: data.contactSource || "",
        chantingStatus: data.chantingStatus || "",
        enablerInTouchWith: data.enablerInTouchWith || "",
        photoUrl:
          photoPreview ||
          person?.photoUrl ||
          `https://placehold.co/100x100.png`,
        customData: customData,
      };

      const finalData: Partial<Person> = saveData;
      
      if (isAdmin) {
          const selectedGuide = folkGuides.find(g => g.id === data.folkGuideId);
          if (selectedGuide) {
              finalData.folkGuideId = selectedGuide.id;
              finalData.folkGuide = `${selectedGuide.name} (${selectedGuide.fgCode || 'N/A'})`;
          } else {
              finalData.folkGuideId = '';
              finalData.folkGuide = '';
          }
      }
      
      await onSave(finalData as Omit<Person, "id" | "progress" | "createdAt">);
      setIsOpen(false);
    } catch(e) {
      // Error is handled by onSave implementation
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCustomField = (field: CustomField) => {
    const { id, label, type } = field;
    const value = customData[id];

    switch (type) {
      case 'text':
        return <Input value={value || ''} onChange={e => handleCustomDataChange(id, e.target.value)} />;
      case 'textarea':
        return <Textarea value={value || ''} onChange={e => handleCustomDataChange(id, e.target.value)} />;
      case 'number':
        return <Input type="number" value={value || ''} onChange={e => handleCustomDataChange(id, e.target.valueAsNumber)} />;
      case 'date':
        return <Input type="date" value={value || ''} onChange={e => handleCustomDataChange(id, e.target.value)} />;
      case 'boolean':
        return <Checkbox checked={!!value} onCheckedChange={checked => handleCustomDataChange(id, checked)} />;
      default:
        return null;
    }
  }

  const currentPhoto = photoPreview || person?.photoUrl;
  const fullName = form.watch("fullName");
  const nameParts = (fullName || ' ').split(' ');
  const fallback = (
    `${nameParts[0]?.charAt(0) || ''}${nameParts.length > 1 ? nameParts[nameParts.length - 1]?.charAt(0) || '' : ''}`
  ).toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{person ? "Edit Person" : "Add Person"}</DialogTitle>
          <DialogDescription>
            {person
              ? "Update the details for this person."
              : "Add a new person to your contacts."}
          </DialogDescription>
        </DialogHeader>

        {showCamera ? (
          <div className="space-y-4 py-4">
            <video
              ref={videoRef}
              className="w-full aspect-video rounded-md bg-muted"
              autoPlay
              muted
              playsInline
            />
            {hasCameraPermission === false && (
              <Alert variant="destructive">
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>
                  Please allow camera access to use this feature.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCamera(false)}>
                Cancel
              </Button>
              {hasMultipleCameras && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSwitchCamera}
                >
                  <SwitchCamera className="mr-2 h-4 w-4" />
                  Switch
                </Button>
              )}
              <Button size="sm" onClick={handleCapture} disabled={!hasCameraPermission}>
                Capture Photo
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <ScrollArea className="h-[60vh]">
                <div className="space-y-4 pr-6">
                  <div className="flex flex-col items-center gap-4 pt-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={currentPhoto} alt="Person photo" />
                      <AvatarFallback>{fallback}</AvatarFallback>
                    </Avatar>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Gallery
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCamera(true)}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Camera
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />                  

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="9876543210" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    <FormField
                        control={form.control}
                        name="age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Age</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select age" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ageOptions.map(age => <SelectItem key={age} value={String(age)}>{age}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>

                  <FormField
                    control={form.control}
                    name="stayingWith"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Staying At & With</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select accommodation" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PG / Hostel">PG / Hostel</SelectItem>
                            <SelectItem value="Flat">Flat</SelectItem>
                            <SelectItem value="Family">Family</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="occupation"
                      render={({ field }) => (
                        <FormItem>
                            <FormLabel>Occupation Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Working">Working</SelectItem>
                                    <SelectItem value="Student">Student</SelectItem>
                                    <SelectItem value="Searching for job">Searching for job</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="organisation"
                      render={({ field }) => (
                        <FormItem>
                            <FormLabel>Organisation Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Acme Corp" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="rentDetails"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>PG/Flat Rent</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. 5000/month" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                      control={form.control}
                      name="nativePlace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Native</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. New Delhi" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="sgRating"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>SG Rating</FormLabel>
                            <Select
                                onValueChange={(value) => field.onChange(Number(value))}
                                value={String(field.value)}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select a rating" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="0">Not Rated</SelectItem>
                                    {Array.from({ length: 10 }, (_, i) => i + 1).map(rating => (
                                        <SelectItem key={rating} value={String(rating)}>{rating}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactSource"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Source</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === '__NONE__' ? '' : value)}
                            value={field.value || '__NONE__'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a source" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__NONE__">None</SelectItem>
                              {contactSourceOptions.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="chantingStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chanting Status</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 16 rounds" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="enablerInTouchWith"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Enabler in touch with</FormLabel>
                        <Select
                            onValueChange={(value) => field.onChange(value === '__NONE__' ? '' : value)}
                            value={field.value || '__NONE__'}
                          >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an enabler" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__NONE__">None</SelectItem>
                            {enablerOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isAdmin ? (
                    <FormField
                      control={form.control}
                      name="folkGuideId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Folk Guide</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === '__NONE__' ? '' : value)}
                            value={field.value || '__NONE__'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Assign a Folk Guide" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__NONE__">Unassigned</SelectItem>
                              {folkGuides.map(guide => <SelectItem key={guide.id} value={guide.id}>{`${guide.name} (${guide.fgCode || 'N/A'})`}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="space-y-2">
                      <Label>Folk Guide</Label>
                      <Input
                        disabled
                        value={
                          (person?.folkGuide) ||
                          (appUser?.role.includes('Folk Guide')
                            ? `${appUser.name} (${appUser.fgCode || 'N/A'})`
                            : appUser?.role.includes('Folk Enabler') && appUser.reportsTo
                            ? `${appUser.reportsTo.guideName} (${appUser.reportsTo.guideFgCode || 'N/A'})`
                            : 'N/A')
                        }
                        className="mt-1"
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="fromOtherCamp"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            From other camp?
                          </FormLabel>
                          <FormDescription>
                            Check this if the contact has come from another spiritual group or camp.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {customFields.length > 0 && (
                    <>
                      <Separator />
                      <h3 className="text-lg font-medium">Custom Information</h3>
                      <div className="space-y-4">
                        {customFields.map(field => (
                          <div key={field.id}>
                            <Label>{field.label}</Label>
                            <div className="mt-1">
                              {renderCustomField(field)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
