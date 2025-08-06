
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Person, CallStatus, Group, CustomField, UserRole } from "@/lib/types";
import { callStatuses } from "@/lib/types";
import { Phone, CheckSquare, Loader2, Edit, Save, XCircle, ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "./ui/separator";
import { updatePerson } from "@/services/people-service";
import { getWhatsAppTemplate } from "@/services/settings-service";
import { EditablePersonDetailsForm } from "./editable-person-details-form";
import { useAuth } from "@/contexts/auth-context";
import { updateUser } from "@/services/user-service";

const callFormSchema = z.object({
  remark: z.string().trim().optional(),
  status: z.string().min(1, { message: "Please select a call status." }),
  sg: z.string().optional(),
  ma: z.string().optional(),
  frp: z.string().optional(),
});

type CallFormValues = z.infer<typeof callFormSchema>;

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

type CallingSessionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onEndSession: () => void;
  onSaveAndNext: (
    personId: string, 
    remark: string, 
    status: CallStatus,
    sg: boolean | undefined,
    ma: boolean | undefined,
    frp: boolean | undefined
  ) => Promise<void>;
  onNavigate: (direction: 'next' | 'prev') => void;
  person: Person;
  currentEvent: string;
  sessionCurrentNumber: number;
  sessionTotalCount: number;
  customFields: CustomField[];
  groups: Group[];
  allPeople: Person[];
};

const CallingSessionDialogComponent = ({
  isOpen,
  onClose,
  onEndSession,
  onSaveAndNext,
  onNavigate,
  person,
  currentEvent,
  sessionCurrentNumber,
  sessionTotalCount,
  customFields,
  groups,
  allPeople,
}: CallingSessionDialogProps) => {
  const { toast } = useToast();
  const { appUser } = useAuth();
  
  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [whatsAppTemplate, setWhatsAppTemplate] = React.useState('');
  
  const [generalRemarks, setGeneralRemarks] = React.useState(person.generalRemarks || '');
  const [isNotesDirty, setIsNotesDirty] = React.useState(false);
  const [isSavingNotes, setIsSavingNotes] = React.useState(false);
  
  const form = useForm<CallFormValues>({
    resolver: zodResolver(callFormSchema),
    defaultValues: {
      remark: person.lastCallRemark || "",
      status: "",
      sg: typeof person.lastSg === 'boolean' ? (person.lastSg ? 'yes' : 'no') : '',
      ma: typeof person.lastMa === 'boolean' ? (person.lastMa ? 'yes' : 'no') : '',
      frp: typeof person.lastFrp === 'boolean' ? (person.lastFrp ? 'yes' : 'no') : '',
    },
  });

  const personGroups = React.useMemo(() => {
    if (!person || !groups) return [];
    return groups.filter(g => g.peopleIds.includes(person.id));
  }, [person, groups]);

  React.useEffect(() => {
    if (isOpen) {
      const fetchTemplate = async () => {
        if (appUser) {
          const template = await getWhatsAppTemplate(appUser);
          setWhatsAppTemplate(template);
        }
      };
      fetchTemplate();
    }
  }, [isOpen, appUser]);

  React.useEffect(() => {
    form.reset({ 
      remark: person.lastCallRemark || "", 
      status: "",
      sg: typeof person.lastSg === 'boolean' ? (person.lastSg ? 'yes' : 'no') : '',
      ma: typeof person.lastMa === 'boolean' ? (person.lastMa ? 'yes' : 'no') : '',
      frp: typeof person.lastFrp === 'boolean' ? (person.lastFrp ? 'yes' : 'no') : '',
    });
    setGeneralRemarks(person.generalRemarks || '');
    setIsNotesDirty(false);
    setIsEditingDetails(false);
  }, [person, form]);
  
  // This effect handles saving session state
  React.useEffect(() => {
      if(isOpen && appUser) {
          const pausedSession = {
              event: currentEvent,
              people: allPeople,
              currentIndex: sessionCurrentNumber -1
          };
          updateUser(appUser.id, { pausedCallingSession: pausedSession });

          const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            updateUser(appUser.id, { pausedCallingSession: pausedSession });
          };
          window.addEventListener('beforeunload', handleBeforeUnload);

          return () => {
              window.removeEventListener('beforeunload', handleBeforeUnload);
          }
      }
  }, [isOpen, appUser, currentEvent, allPeople, sessionCurrentNumber]);

  const onSubmit = async (data: CallFormValues) => {
    setIsSubmitting(true);
    const sg = data.sg === 'yes' ? true : data.sg === 'no' ? false : undefined;
    const ma = data.ma === 'yes' ? true : data.ma === 'no' ? false : undefined;
    const frp = data.frp === 'yes' ? true : data.frp === 'no' ? false : undefined;

    try {
      await onSaveAndNext(person.id, data.remark || '', data.status as CallStatus, sg, ma, frp);
      onNavigate('next');
    } catch (e) {
      // Errors are toasted in the parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDetails = React.useCallback(async (formData: Partial<Person>) => {
    if (!person || !appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    setIsSubmitting(true);
    try {
        await updatePerson(person.id, formData, userInfo);
        toast({ title: 'Details Updated', description: "The contact's details have been saved." });
        setIsEditingDetails(false);
        // Note: We don't need to update local state here as the parent will send a new 'person' prop on next render
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update contact details.' });
    } finally {
        setIsSubmitting(false);
    }
  }, [person, toast, appUser]);
  
  const handleSaveNotes = React.useCallback(async () => {
    if (!person || !isNotesDirty || !appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    setIsSavingNotes(true);
    try {
        await updatePerson(person.id, { generalRemarks: generalRemarks }, userInfo);
        toast({ title: 'Progress Notes Saved' });
        setIsNotesDirty(false);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save the progress notes.' });
    } finally {
        setIsSavingNotes(false);
    }
  }, [person, isNotesDirty, generalRemarks, toast, appUser]);
  
  const whatsAppLink = () => {
    if (!person) return '#';
    const message = whatsAppTemplate.replace('{name}', person.fullName);
    return `https://wa.me/91${person.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh] p-0" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
          <DialogTitle>Calling Session</DialogTitle>
          <DialogDescription>
            Contact {sessionCurrentNumber} of {sessionTotalCount} for: <span className="font-semibold text-primary">{currentEvent}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 p-6">
                {/* Left Column: Form */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                            <Phone className="h-5 w-5 text-primary" />
                            <span className="text-lg font-semibold text-primary">{person.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button asChild variant="outline">
                            <a href={`tel:${person.phone}`}>Call Now</a>
                          </Button>
                          <Button asChild variant="outline" size="icon" aria-label="Open WhatsApp chat">
                            <a href={whatsAppLink()} target="_blank" rel="noopener noreferrer">
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
                    
                    <Form {...form}>
                        <form id="call-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Call Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
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
                                <FormLabel>New Remark</FormLabel>
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
                </div>

                {/* Right Column: Person Details */}
                <div className="md:border-l md:pl-8 space-y-4">
                  <div className="flex justify-end mb-4 -mt-2">
                     {isEditingDetails ? (
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => setIsEditingDetails(false)}>
                                <XCircle className="mr-2 h-4 w-4" />Cancel
                            </Button>
                            <Button size="sm" type="submit" form="person-details-form" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />Save
                            </Button>
                        </div>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setIsEditingDetails(true)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </Button>
                    )}
                  </div>
                   <EditablePersonDetailsForm 
                      person={person} 
                      isEditing={isEditingDetails} 
                      onSave={handleSaveDetails}
                      onCancel={() => setIsEditingDetails(false)}
                      allPeople={allPeople}
                      groups={personGroups}
                      isInDialog
                    />

                    <Separator />

                    <div className="space-y-2">
                        <Label htmlFor="progress-notes">Progress Notes</Label>
                        <Textarea
                            id="progress-notes"
                            value={generalRemarks}
                            onChange={(e) => {
                                setGeneralRemarks(e.target.value);
                                setIsNotesDirty(true);
                            }}
                            className="min-h-[120px] text-sm"
                            placeholder="Log progress, important updates, or any general notes here..."
                        />
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                onClick={handleSaveNotes}
                                disabled={!isNotesDirty || isSavingNotes}
                            >
                                {isSavingNotes && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Notes
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
           <div>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4"/> End Session
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>End Calling Session?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will end the current session. You can start a new one from the Calling Assistant page.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onEndSession}>End Session</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
           </div>
           <div className="flex items-center gap-2 justify-center sm:justify-end">
                <Button variant="outline" size="icon" onClick={() => onNavigate('prev')} disabled={sessionCurrentNumber <= 1}>
                    <ArrowLeft className="h-4 w-4"/>
                    <span className="sr-only">Previous Contact</span>
                </Button>
                <Button variant="outline" size="icon" onClick={() => onNavigate('next')} disabled={sessionCurrentNumber >= sessionTotalCount}>
                    <ArrowRight className="h-4 w-4"/>
                    <span className="sr-only">Next Contact</span>
                </Button>
                <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting} className="min-w-[120px]">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CheckSquare className="mr-2 h-4 w-4"/>
                    Save & Next
                </Button>
           </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const CallingSessionDialog = React.memo(CallingSessionDialogComponent);
