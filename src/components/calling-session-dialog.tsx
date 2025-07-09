
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Person, CallStatus, CustomField, Group } from "@/lib/types";
import { callStatuses } from "@/lib/data";
import { Phone, SkipForward, Square, CheckSquare, Loader2, Tags } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";

const callFormSchema = z.object({
  remark: z.string().trim().optional(),
  status: z.string().min(1, { message: "Please select a call status." }),
  sg: z.string().optional(),
  ma: z.string().optional(),
  frp: z.string().optional(),
});

type CallFormValues = z.infer<typeof callFormSchema>;

type CallingSessionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaveRemark: (
    personId: string, 
    remark: string, 
    status: CallStatus,
    sg: boolean | undefined,
    ma: boolean | undefined,
    frp: boolean | undefined
  ) => void;
  people: Person[];
  currentEvent: string;
  customFields: CustomField[];
  groups: Group[];
};

export function CallingSessionDialog({
  isOpen,
  onClose,
  onSaveRemark,
  people,
  currentEvent,
  customFields,
  groups
}: CallingSessionDialogProps) {
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isInitializing, setIsInitializing] = React.useState(false);
  const currentPerson = people[currentIndex];

  const form = useForm<CallFormValues>({
    resolver: zodResolver(callFormSchema),
    defaultValues: {
      remark: "",
      status: "",
      sg: "",
      ma: "",
      frp: "",
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
        setIsInitializing(true);
        setCurrentIndex(0);
        
        const timer = setTimeout(() => {
          setIsInitializing(false);
        }, 150);

        return () => clearTimeout(timer);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isInitializing && currentPerson) {
        form.reset({ 
            remark: "", 
            status: currentPerson.lastCallStatus || "",
            sg: typeof currentPerson.lastSg === 'boolean' ? (currentPerson.lastSg ? 'yes' : 'no') : '',
            ma: typeof currentPerson.lastMa === 'boolean' ? (currentPerson.lastMa ? 'yes' : 'no') : '',
            frp: typeof currentPerson.lastFrp === 'boolean' ? (currentPerson.lastFrp ? 'yes' : 'no') : '',
        });
    }
  }, [currentPerson, form, isInitializing]);
  
  const goToNext = () => {
    if (currentIndex < people.length - 1) {
        setCurrentIndex(currentIndex + 1);
    } else {
        toast({
            title: "Calling Session Complete!",
            description: "You have gone through all the contacts in this list.",
        });
        onClose();
    }
  }

  const handleSkip = () => {
    goToNext();
  };
  
  const onSubmit = (data: CallFormValues) => {
    if (!currentPerson) return;
    
    const sg = data.sg === 'yes' ? true : data.sg === 'no' ? false : undefined;
    const ma = data.ma === 'yes' ? true : data.ma === 'no' ? false : undefined;
    const frp = data.frp === 'yes' ? true : data.frp === 'no' ? false : undefined;
    const fullName = currentPerson.fullName || '';

    onSaveRemark(currentPerson.id, data.remark || '', data.status as CallStatus, sg, ma, frp);
    toast({
        title: "Call Logged",
        description: `Status for ${fullName} has been updated.`
    });
    goToNext();
  };

  const handleCloseDialog = () => {
    onClose();
  }

  const formatCustomValue = (value: any, type: CustomField['type']) => {
    if (value === null || typeof value === 'undefined' || value === '') return 'N/A';
    if (type === 'boolean') return value ? 'Yes' : 'No';
    if (type === 'date') {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return 'Invalid Date';
      }
    }
    return String(value);
  }

  const personGroups = React.useMemo(() => {
    if (!currentPerson || !groups) return [];
    return groups.filter(g => g.peopleIds.includes(currentPerson.id));
  }, [currentPerson, groups]);


  if (!isOpen) {
    return null;
  }
  
  const fullName = currentPerson?.fullName || '';
  const nameParts = fullName.split(' ');
  const fallback = (
    `${nameParts[0]?.charAt(0) || ''}${nameParts.length > 1 ? nameParts[nameParts.length - 1]?.charAt(0) || '' : ''}`
  ).toUpperCase();
  const hasCustomData = currentPerson && customFields.some(field => currentPerson.customData && currentPerson.customData[field.id]);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh] p-0" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
          <DialogTitle>
            Calling Session
          </DialogTitle>
          <DialogDescription>
            {isInitializing ? 'Preparing session...' : `Contact ${currentIndex + 1} of ${people.length} for: `}
            {!isInitializing && <span className="font-semibold text-primary">{currentEvent}</span>}
          </DialogDescription>
        </DialogHeader>
        
        {isInitializing || !currentPerson ? (
             <div className="flex-1 flex items-center justify-center p-6 min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : (
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 p-6 overflow-y-auto">
                {/* Left Column: Form & Actions */}
                <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                            <Phone className="h-5 w-5 text-primary" />
                            <span className="text-lg font-semibold text-primary">{currentPerson.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button asChild variant="outline">
                            <a href={`tel:${currentPerson.phone}`}>Call Now</a>
                          </Button>
                          <Button asChild variant="outline" size="icon" aria-label="Open WhatsApp chat">
                            <a href={`https://wa.me/91${currentPerson.phone.replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer">
                                <svg
                                    role="img"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 fill-current text-green-600"
                                >
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.204-1.634a11.86 11.86 0 005.794 1.504h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                <span className="sr-only">Open WhatsApp chat</span>
                            </a>
                          </Button>
                        </div>
                    </div>
                    
                    {currentPerson.lastCallRemark && (
                      <div className="text-sm p-3 bg-muted/50 rounded-lg max-h-24 overflow-y-auto">
                        <p className="font-semibold text-muted-foreground mb-1">Previous Remark:</p>
                        <p className="text-foreground whitespace-pre-wrap">{currentPerson.lastCallRemark}</p>
                      </div>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} id="call-form" className="space-y-4">
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Call Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a call status" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {callStatuses.map(status => (
                                            <SelectItem key={status} value={status}>{status}</SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="sg"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>SG</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="yes">Yes</SelectItem>
                                                    <SelectItem value="no">No</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="ma"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>MA</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="yes">Yes</SelectItem>
                                                    <SelectItem value="no">No</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="frp"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>FRP</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="yes">Yes</SelectItem>
                                                    <SelectItem value="no">No</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                            control={form.control}
                            name="remark"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>New Remark (Optional)</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="e.g., Discussed about the upcoming event, interested to join."
                                        className="resize-y min-h-[100px]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </form>
                    </Form>
                     <div className="grid grid-cols-3 gap-2 pt-4">
                        <Button variant="secondary" onClick={onClose} className="col-span-1">
                            <Square className="mr-2 h-4 w-4"/>
                            End Session
                        </Button>
                         <Button variant="outline" onClick={handleSkip} className="col-span-1">
                            <SkipForward className="mr-2 h-4 w-4"/>
                            Skip
                        </Button>
                        <Button type="submit" form="call-form" className="col-span-1" disabled={form.formState.isSubmitting}>
                            <CheckSquare className="mr-2 h-4 w-4"/>
                            Save & Next
                        </Button>
                    </div>
                </div>

                {/* Right Column: Person Details */}
                <div className="md:border-l md:pl-8">
                    <div className="space-y-4">
                        <div className="flex flex-col items-center text-center">
                            <Avatar className="h-24 w-24 mb-3">
                                <AvatarImage src={currentPerson.photoUrl} alt={fullName} data-ai-hint="person portrait" />
                                <AvatarFallback>{fallback}</AvatarFallback>
                            </Avatar>
                            <h3 className="font-semibold text-lg text-foreground">{fullName}</h3>
                            <p className="text-sm text-muted-foreground">
                                {currentPerson.sgRating ? `Rating: ${currentPerson.sgRating}/10` : 'No rating'}
                            </p>
                        </div>

                        <Separator />

                        <div className="text-sm grid grid-cols-[120px_1fr] gap-x-2 gap-y-3">
                            <div className="font-semibold text-muted-foreground">Age</div>
                            <div>{currentPerson.age}</div>

                            <div className="font-semibold text-muted-foreground">Staying With</div>
                            <div>{currentPerson.stayingWith}</div>

                            <div className="font-semibold text-muted-foreground">Occupation</div>
                            <div>{currentPerson.occupation || 'N/A'}</div>

                            <div className="font-semibold text-muted-foreground">Organisation</div>
                            <div>{currentPerson.organisation || 'N/A'}</div>

                            <div className="font-semibold text-muted-foreground">Rent Details</div>
                            <div>{currentPerson.rentDetails || 'N/A'}</div>

                            <div className="font-semibold text-muted-foreground">Native Place</div>
                            <div>{currentPerson.nativePlace || 'N/A'}</div>
                            
                            <div className="font-semibold text-muted-foreground">Contact Source</div>
                            <div>{currentPerson.contactSource || 'N/A'}</div>

                            <div className="font-semibold text-muted-foreground">Chanting Status</div>
                            <div>{currentPerson.chantingStatus || 'N/A'}</div>

                            <div className="font-semibold text-muted-foreground">From Other Camp</div>
                            <div>{currentPerson.fromOtherCamp ? 'Yes' : 'No'}</div>
                            
                            <div className="font-semibold text-muted-foreground">Enabler</div>
                            <div>{currentPerson.enablerInTouchWith || 'N/A'}</div>

                            <div className="font-semibold text-muted-foreground">Folk Guide</div>
                            <div>{currentPerson.folkGuide || 'N/A'}</div>
                        </div>

                        {personGroups.length > 0 && (
                            <>
                                <Separator className="my-4" />
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold flex items-center gap-2"><Tags className="h-4 w-4 text-muted-foreground"/>Groups</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {personGroups.map(group => (
                                            <Badge key={group.id} variant="secondary">{group.name}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                        
                        {hasCustomData && (
                        <>
                          <Separator className="my-4" />
                          <div className="text-sm grid grid-cols-[120px_1fr] gap-x-2 gap-y-3">
                             {customFields.map(field => {
                                const value = currentPerson.customData?.[field.id];
                                if (!value) return null;
                                 if (field.type === 'textarea') {
                                  return (
                                    <React.Fragment key={field.id}>
                                      <div className="font-semibold text-muted-foreground col-span-2">{field.label}</div>
                                      <div className="col-span-2 whitespace-pre-wrap">{formatCustomValue(value, field.type)}</div>
                                    </React.Fragment>
                                  );
                                }
                                return (
                                  <React.Fragment key={field.id}>
                                    <div className="font-semibold text-muted-foreground">{field.label}</div>
                                    <div>{formatCustomValue(value, field.type)}</div>
                                  </React.Fragment>
                                );
                             })}
                          </div>
                        </>
                      )}
                    </div>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
