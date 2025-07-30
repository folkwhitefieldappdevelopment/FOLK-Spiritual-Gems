
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Person, CallStatus, Group, CustomField, PausedSession, UserRole } from "@/lib/types";
import { callStatuses } from "@/lib/data";
import { Phone, CheckSquare, Loader2, Edit, Save, XCircle, Pause, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Label } from "@/components/ui/label";
import { Separator } from "./ui/separator";
import { updatePerson } from "@/services/people-service";
import { getWhatsAppTemplate } from "@/services/settings-service";
import { updateUser } from "@/services/user-service";
import { EditablePersonDetailsForm } from "./editable-person-details-form";
import { useAuth } from "@/contexts/auth-context";
import { ColumnFilterState } from "./column-header-filter";
import { FilterRule } from "./filter-popover";
import { SortDescriptor } from "./sort-popover";


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
  onSaveRemark: (
    personId: string, 
    remark: string, 
    status: CallStatus,
    sg: boolean | undefined,
    ma: boolean | undefined,
    frp: boolean | undefined
  ) => Promise<void>;
  people: Person[];
  currentEvent: string;
  customFields: CustomField[];
  groups: Group[];
  sessionStartIndex: number;
  totalPeopleCount: number;
  initialIndex?: number;
  context: 'assistant' | 'group';
  // Filter states to be saved
  filters: FilterRule[];
  sortDescriptors: SortDescriptor[];
  searchTerm: string;
  selectedGroupId: string;
  columnFilters: ColumnFilterState;
};

const CallingSessionDialogComponent = ({
  isOpen,
  onClose,
  onSaveRemark,
  people,
  currentEvent,
  customFields,
  groups,
  sessionStartIndex,
  totalPeopleCount,
  initialIndex = 0,
  context,
  ...filterStates
}: CallingSessionDialogProps) => {
  const { toast } = useToast();
  const { appUser, updateCurrentAppUser } = useAuth();
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [currentPeople, setCurrentPeople] = React.useState<Person[]>(people);
  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [whatsAppTemplate, setWhatsAppTemplate] = React.useState('');

  const [generalRemarks, setGeneralRemarks] = React.useState('');
  const [isNotesDirty, setIsNotesDirty] = React.useState(false);
  const [isSavingNotes, setIsSavingNotes] = React.useState(false);
  
  const isIntentionalClose = React.useRef(false);

  const currentPerson = currentPeople[currentIndex];
  
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

  const personGroups = React.useMemo(() => {
    if (!currentPerson || !groups) return [];
    return groups.filter(g => g.peopleIds.includes(currentPerson.id));
  }, [currentPerson, groups]);
  
  const handleCloseDialog = React.useCallback(() => {
    isIntentionalClose.current = true;
    onClose();
  }, [onClose]);

  const handleEndAndClearSession = React.useCallback(async (silent = false) => {
    if (!appUser) return;
    isIntentionalClose.current = true;
    try {
        await updateUser(appUser.id, { pausedSession: null }); // Use null to signify deletion
        updateCurrentAppUser({ pausedSession: undefined });
        if (!silent) {
            toast({ title: "Session Ended", description: "Your paused session has been cleared." });
        }
        handleCloseDialog();
    } catch (e) {
        if (!silent) {
            toast({ variant: 'destructive', title: "Error", description: 'Could not end the session.' });
        }
    }
  }, [appUser, handleCloseDialog, toast, updateCurrentAppUser]);
  
  const handleNext = React.useCallback(() => {
    if (currentIndex < currentPeople.length - 1) {
        setCurrentIndex(prevIndex => prevIndex + 1);
    } else {
        toast({
            title: "Calling Session Complete!",
            description: "You have gone through all the contacts in this list.",
        });
        handleEndAndClearSession(true); // Silently clear session
    }
  }, [currentIndex, currentPeople.length, handleEndAndClearSession, toast]);
  
  const handlePrevious = React.useCallback(() => {
    if (currentIndex > 0) {
        setCurrentIndex(prevIndex => prevIndex - 1);
    }
  }, [currentIndex]);


  React.useEffect(() => {
    if (isOpen) {
        setIsInitializing(true);
        setCurrentIndex(initialIndex);
        setCurrentPeople(people);
        setIsEditingDetails(false);
        isIntentionalClose.current = false;

        const fetchTemplate = async () => {
            if (appUser) {
                const template = await getWhatsAppTemplate(appUser);
                setWhatsAppTemplate(template);
            }
        };
        fetchTemplate();
        
        const timer = setTimeout(() => {
          setIsInitializing(false);
        }, 150);

        return () => clearTimeout(timer);
    }
  }, [isOpen, people, initialIndex, appUser]);

  // Auto-save session on unmount (refresh, close tab, etc.)
  React.useEffect(() => {
    const autoSaveSession = () => {
        if (isOpen && !isIntentionalClose.current && appUser && currentPeople.length > 0) {
            const pausedSessionData: PausedSession = {
                context,
                peopleIds: currentPeople.map(p => p.id),
                currentIndex,
                currentEvent,
                sessionStartIndex,
                totalPeopleCount,
                filters: filterStates.filters,
                sortDescriptors: filterStates.sortDescriptors,
                searchTerm: filterStates.searchTerm,
                selectedGroupId: filterStates.selectedGroupId,
                columnFilters: filterStates.columnFilters,
            };
            // This is a fire-and-forget operation on page unload.
            updateUser(appUser.id, { pausedSession: pausedSessionData });
            updateCurrentAppUser({ pausedSession: pausedSessionData });
        }
    }

    return () => {
        autoSaveSession();
    }
  }, [isOpen, isIntentionalClose, appUser, context, currentIndex, currentEvent, currentPeople, sessionStartIndex, totalPeopleCount, filterStates, updateCurrentAppUser]);


  React.useEffect(() => {
    if (!isInitializing && currentPerson) {
        form.reset({ 
            remark: "", 
            status: "", // Reset status for each new person
            sg: typeof currentPerson.lastSg === 'boolean' ? (currentPerson.lastSg ? 'yes' : 'no') : '',
            ma: typeof currentPerson.lastMa === 'boolean' ? (currentPerson.lastMa ? 'yes' : 'no') : '',
            frp: typeof currentPerson.lastFrp === 'boolean' ? (currentPerson.lastFrp ? 'yes' : 'no') : '',
        });
        setGeneralRemarks(currentPerson.generalRemarks || '');
        setIsNotesDirty(false);
        setIsEditingDetails(false);
    }
  }, [currentPerson, form, isInitializing]);
  
  const onSubmit = React.useCallback(async (data: CallFormValues) => {
    if (!currentPerson) return;
    
    setIsSubmitting(true);
    const sg = data.sg === 'yes' ? true : data.sg === 'no' ? false : undefined;
    const ma = data.ma === 'yes' ? true : data.ma === 'no' ? false : undefined;
    const frp = data.frp === 'yes' ? true : data.frp === 'no' ? false : undefined;
    const fullName = currentPerson.fullName || '';

    try {
        await onSaveRemark(currentPerson.id, data.remark || '', data.status as CallStatus, sg, ma, frp);
        
        const updatedPerson = { ...currentPerson, lastCallRemark: data.remark, lastCallStatus: data.status as CallStatus, lastSg: sg, lastMa: ma, lastFrp: frp, lastCallAt: new Date().toISOString() };
        setCurrentPeople(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));

        toast({
            title: "Call Logged",
            description: `Status for ${fullName} has been updated.`
        });
        handleNext();
    } catch (e) {
        console.error("Error in onSubmit:", e);
        toast({ variant: 'destructive', title: "Error", description: 'Could not save the call log.' });
    } finally {
        setIsSubmitting(false);
    }
  }, [currentPerson, onSaveRemark, toast, handleNext]);

  const handlePauseSession = React.useCallback(async () => {
    if (!appUser) return;
    isIntentionalClose.current = true;
    const pausedSessionData: PausedSession = {
        context,
        peopleIds: currentPeople.map(p => p.id),
        currentIndex,
        currentEvent,
        sessionStartIndex,
        totalPeopleCount,
        filters: filterStates.filters,
        sortDescriptors: filterStates.sortDescriptors,
        searchTerm: filterStates.searchTerm,
        selectedGroupId: filterStates.selectedGroupId,
        columnFilters: filterStates.columnFilters,
    };
    try {
        await updateUser(appUser.id, { pausedSession: pausedSessionData });
        updateCurrentAppUser({ pausedSession: pausedSessionData });
        toast({ title: "Session Paused", description: "Your progress has been saved." });
        handleCloseDialog();
    } catch (e) {
        toast({ variant: 'destructive', title: "Error", description: 'Could not pause the session.' });
    }
  }, [appUser, context, currentPeople, currentIndex, currentEvent, sessionStartIndex, totalPeopleCount, filterStates, handleCloseDialog, toast, updateCurrentAppUser]);

  const handleSaveDetails = React.useCallback(async (formData: Partial<Person>) => {
    if (!currentPerson || !appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    setIsSubmitting(true);
    try {
        await updatePerson(currentPerson.id, formData, userInfo);
        
        const updatedPerson = { ...currentPerson, ...formData };
        setCurrentPeople(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));

        toast({ title: 'Details Updated', description: "The contact's details have been saved." });
        setIsEditingDetails(false);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update contact details.' });
    } finally {
        setIsSubmitting(false);
    }
  }, [currentPerson, toast, appUser]);
  
  const handleSaveNotes = React.useCallback(async () => {
    if (!currentPerson || !isNotesDirty || !appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    setIsSavingNotes(true);
    try {
        await updatePerson(currentPerson.id, { generalRemarks: generalRemarks }, userInfo);
        
        const updatedPerson = { ...currentPerson, generalRemarks: generalRemarks };
        setCurrentPeople(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));

        toast({ title: 'Progress Notes Saved' });
        setIsNotesDirty(false);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save the progress notes.' });
    } finally {
        setIsSavingNotes(false);
    }
  }, [currentPerson, isNotesDirty, generalRemarks, toast, appUser]);

  if (!isOpen) {
    return null;
  }
  
  const whatsAppLink = () => {
    if (!currentPerson) return '#';
    const message = whatsAppTemplate.replace('{name}', currentPerson.fullName);
    return `https://wa.me/91${currentPerson.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh] p-0" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
          <DialogTitle>
            Calling Session
          </DialogTitle>
          <DialogDescription>
            {isInitializing ? 'Preparing session...' : `Contact ${sessionStartIndex + currentIndex + 1} of ${totalPeopleCount} for: `}
            {!isInitializing && <span className="font-semibold text-primary">{currentEvent}</span>}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto">
            {isInitializing || !currentPerson ? (
                <div className="flex-1 flex items-center justify-center p-6 min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 p-6">
                    {/* Left Column: Form */}
                    <div className="space-y-4">
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
                        
                        {currentPerson.lastCallRemark && (
                          <div className="text-sm p-3 bg-muted/50 rounded-lg max-h-24 overflow-y-auto">
                            <p className="font-semibold text-muted-foreground mb-1">Previous Remark:</p>
                            <p className="text-foreground whitespace-pre-wrap">{currentPerson.lastCallRemark}</p>
                          </div>
                        )}

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
                          person={currentPerson} 
                          isEditing={isEditingDetails} 
                          onSave={handleSaveDetails}
                          onCancel={() => setIsEditingDetails(false)}
                          allPeople={currentPeople}
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
            )}
        </div>

        <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
           <div className="flex items-center gap-2 justify-center sm:justify-start">
                <Button variant="secondary" size="sm" onClick={handlePauseSession}>
                    <Pause className="mr-2 h-4 w-4"/> Pause & Save
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4"/> End & Clear
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to end the session?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will clear your paused session progress, and you will not be able to resume.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleEndAndClearSession()} className="bg-destructive hover:bg-destructive/90">
                                End Session
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
           </div>
           <div className="flex items-center gap-2 justify-center sm:justify-end">
                <Button variant="ghost" size="icon" onClick={handlePrevious} disabled={currentIndex === 0}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting || isInitializing} className="min-w-[120px]">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CheckSquare className="mr-2 h-4 w-4"/>
                    Save & Next
                </Button>
                 <Button variant="ghost" size="icon" onClick={handleNext} disabled={currentIndex >= currentPeople.length - 1}>
                    <ArrowRight className="h-4 w-4" />
                </Button>
           </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const CallingSessionDialog = React.memo(CallingSessionDialogComponent);
