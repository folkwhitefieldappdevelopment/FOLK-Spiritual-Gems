"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import type { Person, CallStatus, Group, CustomField, ActivityFieldLabels, CallLog } from "@/lib/types";
import { callStatuses } from "@/lib/types";
import { Phone, Loader2, Edit, Save, XCircle, ArrowLeft, ArrowRight, Trash2, Clock, Calendar as CalendarIcon, BellRing, User, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { updatePerson, getPeople } from "@/services/people-service";
import { getSgOptions, getMaOptions, getFrpOptions, getActivityFieldLabels } from "@/services/settings-service";
import { EditablePersonDetailsForm, type EditablePersonDetailsFormRef } from "./editable-person-details-form";
import { useAuth } from "@/contexts/auth-context";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { Badge } from "@/components/ui/badge";
import { safeDate } from "@/utils/date";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { cn } from "@/lib/utils";

const DEFAULT_WHATSAPP_TEMPLATE = "Hare Krishna {name}, we are inviting you for our upcoming spiritual session. Hope to see you there!";

const callFormSchema = z.object({
  remark: z.string().trim().optional(),
  status: z.string().min(1, { message: "Please select a call status." }),
  sg: z.string().optional(),
  ma: z.string().optional(),
  frp: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
});

type CallFormValues = z.infer<typeof callFormSchema>;

type CallingSessionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onEndSession: () => void;
  onSaveAndNext: (
    personId: string, 
    remark: string, 
    status: CallStatus,
    sg: string | undefined,
    ma: string | undefined,
    frp: string | undefined,
    nextFollowUpAt: string | undefined
  ) => Promise<void>;
  onNavigate: (direction: 'next' | 'prev', jumpToIndex?: number) => void;
  person: Person;
  currentEvent: string;
  sessionCurrentNumber: number;
  sessionTotalCount: number;
  customFields: CustomField[];
  groups: Group[];
  sessionPeopleIds: string[];
  onPersonUpdate: (updatedPerson?: Person) => void;
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
  groups,
  onPersonUpdate,
}: CallingSessionDialogProps) => {
  const { toast } = useToast();
  const { appUser } = useAuth();
  
  const contactFormId = React.useId().replace(/:/g, '') + '-details-' + (person?.id || 'new');
  const detailsFormRef = React.useRef<EditablePersonDetailsFormRef>(null);
  
  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isNavigating, setIsNavigating] = React.useState(false);
  
  const [generalRemarks, setGeneralRemarks] = React.useState(person.generalRemarks || '');
  const [isNotesDirty, setIsNotesDirty] = React.useState(false);
  const [isSavingNotes, setIsSavingNotes] = React.useState(false);
  
  const [sessionProgress, setSessionProgress] = React.useState<Record<string, Partial<CallFormValues>>>({});

  const [sgOptions, setSgOptions] = React.useState<string[]>([]);
  const [maOptions, setMaOptions] = React.useState<string[]>([]);
  const [frpOptions, setFrpOptions] = React.useState<string[]>([]);
  const [activityLabels, setActivityLabels] = React.useState<ActivityFieldLabels>({ sg: 'SG-S', ma: 'SG-W', frp: 'FRP' });

  const [isCallbackSearchOpen, setIsCallbackSearchOpen] = React.useState(false);
  const [callbackSearchQuery, setCallbackSearchQuery] = React.useState('');
  const [callbackResults, setCallbackResults] = React.useState<Person[]>([]);
  const [selectedCallbackPerson, setSelectedCallbackPerson] = React.useState<Person | null>(null);
  const [isSearchingCallback, setIsSearchingCallback] = React.useState(false);

  const [jumpIndex, setJumpIndex] = React.useState(String(sessionCurrentNumber));

  const form = useForm<CallFormValues>({
    resolver: zodResolver(callFormSchema),
    defaultValues: {
      remark: "",
      status: "",
      sg: '',
      ma: '',
      frp: '',
      nextFollowUpAt: '',
    },
  });

  const currentActivePerson = selectedCallbackPerson || person;

  const personGroups = React.useMemo(() => {
    if (!person || !groups) return [];
    return groups.filter(g => (g.peopleIds || []).includes(person.id));
  }, [person, groups]);
  
  const sortedHistory = React.useMemo(() => {
    const p = currentActivePerson;
    if (!p.callHistory || !Array.isArray(p.callHistory)) return [];
    return [...p.callHistory].sort((a, b) => {
        const dateA = safeDate(a.calledAt);
        const dateB = safeDate(b.calledAt);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
    });
  }, [currentActivePerson]);

  React.useEffect(() => {
    if (isOpen) {
      sessionStorage.setItem('calling_session_active', 'true');
      const fetchOptions = async () => {
          const [sg, ma, frp, labels] = await Promise.all([
            getSgOptions(),
            getMaOptions(),
            getFrpOptions(),
            getActivityFieldLabels(),
          ]);
          setSgOptions(sg);
          setMaOptions(ma);
          setFrpOptions(frp);
          setActivityLabels(labels);
      };
      fetchOptions();
      setSessionProgress({});
    }
  }, [isOpen]);
  
  const handleNavigation = (direction: 'next' | 'prev', jumpToIndex?: number) => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    const currentFormData = form.getValues();
    if (form.formState.isDirty) {
      setSessionProgress(prev => ({ ...prev, [person.id]: currentFormData }));
    }
    
    onNavigate(direction, jumpToIndex);
    
    setTimeout(() => setIsNavigating(false), 500);
  }

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const idx = parseInt(jumpIndex);
    if (isNaN(idx) || idx < 1 || idx > sessionTotalCount) {
        setJumpIndex(String(sessionCurrentNumber));
        return;
    }
    
    if (idx === sessionCurrentNumber) return;

    handleNavigation(idx > sessionCurrentNumber ? 'next' : 'prev', idx - 1);
  };

  React.useEffect(() => {
    if (person && !selectedCallbackPerson) {
      const unsavedProgress = sessionProgress[person.id];
      const lastCallForEvent = [...(person.callHistory || [])]
          .filter(log => log.event === currentEvent)
          .sort((a,b) => (safeDate(b.calledAt)?.getTime() || 0) - (safeDate(a.calledAt)?.getTime() || 0))[0];

      form.reset({
        remark: unsavedProgress?.remark ?? lastCallForEvent?.remark ?? '',
        status: unsavedProgress?.status ?? '',
        sg: unsavedProgress?.sg ?? person.lastSg ?? '',
        ma: unsavedProgress?.ma ?? person.lastMa ?? '',
        frp: unsavedProgress?.frp ?? person.lastFrp ?? '',
        nextFollowUpAt: unsavedProgress?.nextFollowUpAt ?? '',
      });

      setGeneralRemarks(person.generalRemarks || '');
      setJumpIndex(String(sessionCurrentNumber));
      setIsNotesDirty(false);
      setIsEditingDetails(false);
    } else if (selectedCallbackPerson) {
        form.reset({
            remark: '',
            status: '',
            sg: selectedCallbackPerson.lastSg ?? '',
            ma: selectedCallbackPerson.lastMa ?? '',
            frp: selectedCallbackPerson.lastFrp ?? '',
            nextFollowUpAt: '',
        });
        setGeneralRemarks(selectedCallbackPerson.generalRemarks || '');
        setIsNotesDirty(false);
        setIsEditingDetails(false);
    }
  }, [person, currentEvent, form, sessionProgress, selectedCallbackPerson, sessionCurrentNumber]);

  const handleSaveNotes = React.useCallback(async (silent = false) => {
    const targetPerson = selectedCallbackPerson || person;
    if (!targetPerson || !isNotesDirty || !appUser) return;
    
    if (!silent) setIsSavingNotes(true);
    try {
        await updatePerson(targetPerson.id, { generalRemarks: generalRemarks }, appUser);
        const updatedPerson = { ...targetPerson, generalRemarks } as Person;
        if (!silent) toast({ title: 'Progress Notes Saved' });
        setIsNotesDirty(false);
        onPersonUpdate(updatedPerson);
        if (selectedCallbackPerson) {
            setSelectedCallbackPerson(updatedPerson);
        }
    } catch (error) {
        if (!silent) toast({ variant: 'destructive', title: 'Error saving notes' });
    } finally {
        if (!silent) setIsSavingNotes(false);
    }
  }, [person, selectedCallbackPerson, isNotesDirty, generalRemarks, toast, appUser, onPersonUpdate]);

  const onSubmit = async (data: CallFormValues) => {
    if (isNavigating) return;

    if (isEditingDetails && detailsFormRef.current) {
      const detailsSaved = await detailsFormRef.current.submit();
      if (!detailsSaved) return; 
    }

    if (isNotesDirty) {
        await handleSaveNotes(true);
    }

    setIsSubmitting(true);
    setIsNavigating(true);
    try {
      // Sync stage based on markings with precedence: FRP > SG-W > SG-S
      let newStage: string | undefined = undefined;
      if (data.frp) newStage = 'FRP';
      else if (data.ma) newStage = 'SG-W';
      else if (data.sg) newStage = 'SG-S';

      if (selectedCallbackPerson) {
        const callLog: Partial<CallLog> = {
          calledAt: new Date().toISOString(),
          remark: data.remark || '',
          status: data.status as CallStatus,
          event: `${currentEvent} (Callback)`,
          sg: data.sg,
          ma: data.ma,
          frp: data.frp,
          nextFollowUpAt: data.nextFollowUpAt,
          callerId: appUser?.id || 'system',
          callerName: appUser?.name || 'System',
          callerPhotoUrl: appUser?.photoUrl || '',
        };
        
        const updates: Partial<Person> = {
          lastCallRemark: data.remark,
          lastCallStatus: data.status as CallStatus,
          lastCallAt: '__now__',
          lastSg: data.sg,
          lastMa: data.ma,
          lastFrp: data.frp,
          nextFollowUpAt: data.nextFollowUpAt,
          ...(newStage ? { currentFolkStage: newStage as any } : {})
        };

        const updatedPerson = {
            ...selectedCallbackPerson,
            ...updates,
            lastCallAt: new Date().toISOString(),
            callHistory: [callLog as CallLog, ...(selectedCallbackPerson.callHistory || [])]
        };

        await updatePerson(selectedCallbackPerson.id, { ...updates, callHistory: [callLog as CallLog] }, appUser || undefined);
        
        setSelectedCallbackPerson(updatedPerson);
        onPersonUpdate(updatedPerson);

        toast({ title: "Callback Logged", description: "Returning to your calling session." });
        
        setTimeout(() => {
            setSelectedCallbackPerson(null);
            setIsCallbackSearchOpen(false);
        }, 1500);
      } else {
        await onSaveAndNext(person.id, data.remark || '', data.status as CallStatus, data.sg, data.ma, data.frp, data.nextFollowUpAt);
        setSessionProgress(prev => ({ ...prev, [person.id]: data }));
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not log the call.' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setIsNavigating(false), 500);
    }
  };

  const handleSaveDetails = React.useCallback(async (formData: Partial<Person>) => {
    const targetPerson = selectedCallbackPerson || person;
    if (!targetPerson || !appUser) return;
    setIsSubmitting(true);
    try {
        const result = await updatePerson(targetPerson.id, formData, appUser);
        if (result.success) {
            const updatedPerson = { ...targetPerson, ...formData } as Person;
            toast({ title: 'Details Updated' });
            setIsEditingDetails(false);
            onPersonUpdate(updatedPerson);
            if (selectedCallbackPerson) {
              setSelectedCallbackPerson(updatedPerson);
            }
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.message });
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Update failed.' });
    } finally {
        setIsSubmitting(false);
    }
  }, [person, selectedCallbackPerson, toast, appUser, onPersonUpdate]);
  
  const whatsAppLink = () => {
    const targetPerson = currentActivePerson;
    if (!targetPerson || !appUser) return '#';
    const template = appUser.whatsAppTemplate || DEFAULT_WHATSAPP_TEMPLATE;
    return `https://wa.me/91${String(targetPerson.phone).replace(/\s+/g, '')}?text=${encodeURIComponent(template.replace('{name}', targetPerson.fullName))}`;
  };

  const handleSearchCallback = async () => {
    if (!callbackSearchQuery.trim() || !appUser) return;
    setIsSearchingCallback(true);
    try {
      const { people } = await getPeople(appUser, {
        scope: 'all',
        filters: { phone: callbackSearchQuery.trim() },
        ignoreLimit: true
      });
      setCallbackResults(people);
      if (people.length === 0) {
        toast({ title: "Not Found", description: "No contact found with this number." });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: "Search Failed" });
    } finally {
      setIsSearchingCallback(false);
    }
  };

  const isDetour = !!selectedCallbackPerson;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[95vh] p-0 bg-popover border-none shadow-2xl overflow-hidden rounded-[2.5rem]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0 p-6 sm:p-8 pb-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-foreground font-black text-xl sm:text-2xl uppercase tracking-tight">
                {isDetour && <Badge variant="destructive" className="animate-pulse font-black text-[9px] h-6 px-3">CALLBACK MODE</Badge>}
                Outreach Center
              </DialogTitle>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-bold flex items-center gap-2 flex-wrap mt-1.5 uppercase tracking-widest">
                  {isDetour ? (
                    <>Logging callback: <span className="font-black text-[#FF9800]">{currentActivePerson.fullName}</span></>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                          QUEUE
                          <form onSubmit={handleJump} className="w-14">
                              <Input 
                                  value={jumpIndex} 
                                  onChange={e => setJumpIndex(e.target.value)} 
                                  className="h-6 px-1 text-center text-[11px] font-black bg-muted/50 border-border text-foreground rounded-lg"
                              />
                          </form>
                          OF {sessionTotalCount} FOR:
                      </div>
                      <span className="font-black text-primary truncate max-w-[120px] sm:max-w-none">{currentEvent}</span>
                    </div>
                  )}
              </div>
            </div>
            {isDetour && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedCallbackPerson(null)} className="text-muted-foreground hover:text-foreground font-bold h-9">
                <ArrowLeft className="mr-2 h-4 w-4" /> Cancel Callback
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto bg-background">
            {isCallbackSearchOpen && !selectedCallbackPerson ? (
              <div className="p-8 space-y-10 flex flex-col items-center justify-center min-h-[400px]">
                <div className="max-w-md w-full space-y-8 text-center">
                  <div className="bg-primary/10 p-6 rounded-[2rem] w-fit mx-auto border border-primary/20 shadow-inner">
                    <PhoneIncoming className="h-12 w-12 text-primary opacity-50" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Callback Received?</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest px-4">Search for the contact who called back to log their status before continuing your session.</p>
                  </div>
                  <div className="flex gap-2 p-1 bg-popover rounded-2xl border border-border shadow-2xl">
                    <Input 
                      placeholder="Enter 10-digit number..." 
                      className="h-14 text-xl font-black border-none bg-transparent text-foreground px-5"
                      value={callbackSearchQuery}
                      onChange={(e) => setCallbackSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchCallback()}
                    />
                    <Button onClick={handleSearchCallback} disabled={isSearchingCallback} className="h-14 px-8 rounded-xl font-black uppercase tracking-widest shadow-xl">
                      {isSearchingCallback ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search'}
                    </Button>
                  </div>
                  
                  <div className="space-y-3 pt-4">
                    {callbackResults.map(p => (
                      <div key={p.id} className="p-4 bg-popover border border-border rounded-2xl flex items-center justify-between hover:bg-muted transition-all cursor-pointer group" onClick={() => setSelectedCallbackPerson(p)}>
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-lg">
                            <AvatarImage src={p.photoUrl} />
                            <AvatarFallback className="bg-muted text-foreground font-black">{p.fullName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="text-base font-black text-foreground">{p.fullName}</p>
                            <p className="text-xs text-muted-foreground font-bold tracking-widest">{p.phone}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                  
                  <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground" onClick={() => setIsCallbackSearchOpen(false)}>Return to Queue</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-full">
                <div className="p-6 sm:p-10 space-y-10 border-b md:border-b-0 md:border-r border-border bg-muted/30">
                    <div className="flex items-center justify-between bg-popover rounded-3xl border border-border p-5 shadow-2xl">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Phone className="h-6 w-6 text-primary" />
                            </div>
                            <span className="text-2xl font-black text-foreground tracking-tighter">{currentActivePerson.phone}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button asChild className="h-12 px-6 rounded-xl bg-primary font-black uppercase tracking-widest shadow-xl shadow-primary/20"><a href={`tel:${currentActivePerson.phone}`}>Call</a></Button>
                          <Button asChild variant="outline" className="h-12 px-4 rounded-xl border-green-500/20 text-green-500 hover:bg-green-500/10">
                            <a href={whatsAppLink()} target="_blank" rel="noopener noreferrer">
                              <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.204-1.634a11.86 11.86 0 005.794 1.504h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                            </a>
                          </Button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Interaction Milestone</h3>
                            <Badge variant="outline" className="text-[9px] font-bold border-border text-muted-foreground">{sortedHistory.length} logs</Badge>
                        </div>
                        <ScrollArea className="h-[340px] pr-4 rounded-[2rem] border border-border bg-popover/50">
                            <div className="p-6 space-y-6">
                                {sortedHistory.length > 0 ? (
                                    sortedHistory.map((log, idx) => {
                                        const date = safeDate(log.calledAt);
                                        return (
                                            <div key={idx} className="flex items-start gap-4 border-b border-border pb-5 last:border-0 last:pb-0">
                                                <div className="mt-1 shrink-0 bg-primary/10 p-2 rounded-lg">
                                                    <Clock className="h-3 w-3 text-primary" />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <span className="text-[10px] font-black text-foreground/70 uppercase tracking-tighter">
                                                            {date ? format(date, 'dd MMM, HH:mm') : 'N/A'}
                                                        </span>
                                                        <Badge variant="secondary" className="bg-primary/5 text-primary text-[9px] font-black h-5 uppercase border-none px-2.5">
                                                            {log.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs font-bold leading-relaxed text-foreground/80 italic">
                                                        "{log.remark || 'No specific notes left.'}"
                                                    </p>
                                                    <div className="flex items-center gap-1.5 opacity-40">
                                                        <User className="h-2.5 w-2.5" />
                                                        <span className="text-[9px] font-black uppercase text-foreground">{log.callerName}</span>
                                                        {log.event && <span className="text-[9px] font-bold text-foreground">via {log.event}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-30">
                                        <History className="h-10 w-10 mb-3" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No history yet</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                <div className="p-6 sm:p-10 space-y-8 bg-background">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Log outreach</h3>
                        <div className="flex items-center gap-2">
                          {isEditingDetails ? (
                              <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => setIsEditingDetails(false)} className="h-8 text-[10px] font-black text-muted-foreground uppercase">Cancel</Button>
                                  <Button size="sm" onClick={() => detailsFormRef.current?.submit()} disabled={isSubmitting} className="h-8 px-4 bg-primary font-black uppercase text-[10px] rounded-lg">Save</Button>
                              </div>
                          ) : (
                              <Button variant="outline" size="sm" onClick={() => setIsEditingDetails(true)} className="h-8 px-4 border-border bg-muted/50 text-muted-foreground hover:text-foreground font-black uppercase text-[10px] rounded-lg">
                                <Edit className="mr-1.5 h-3 w-3" /> Profile
                              </Button>
                          )}
                        </div>
                    </div>

                    <Form {...form}>
                        <form id="call-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Call Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-12 rounded-xl border-border bg-muted text-foreground font-black text-xs uppercase tracking-tight focus:ring-primary">
                                                <SelectValue placeholder="Select outcome..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-popover border-border text-foreground">
                                            {callStatuses.map(s => (<SelectItem key={s} value={s} className="font-bold text-[10px] py-3">{s}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="nextFollowUpAt" render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2">
                                        <BellRing className="h-3 w-3 text-[#FF9800]" /> Schedule Follow-up
                                    </FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full h-12 rounded-xl border-border bg-muted text-foreground font-bold px-5 text-left justify-start",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                                    {field.value ? format(new Date(field.value), "PPP p") : <span>No reminder set</span>}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 border-none shadow-2xl bg-popover" align="start">
                                            <div className="p-4 space-y-4">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value ? new Date(field.value) : undefined}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            const current = field.value ? new Date(field.value) : new Date();
                                                            date.setHours(current.getHours());
                                                            date.setMinutes(current.getMinutes());
                                                            field.onChange(date.toISOString());
                                                        }
                                                    }}
                                                    initialFocus
                                                />
                                                <div className="p-3 border-t border-border flex flex-col gap-3">
                                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Pick Time</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Select
                                                            value={field.value ? format(new Date(field.value), "HH") : "10"}
                                                            onValueChange={(h) => {
                                                                const date = field.value ? new Date(field.value) : new Date();
                                                                date.setHours(parseInt(h));
                                                                field.onChange(date.toISOString());
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-9 bg-muted border-border text-foreground flex-1"><SelectValue placeholder="Hr"/></SelectTrigger>
                                                            <SelectContent className="bg-popover text-foreground">
                                                                {Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')).map(h => (
                                                                    <SelectItem key={h} value={h}>{h}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <span className="text-foreground font-black">:</span>
                                                        <Select
                                                            value={field.value ? format(new Date(field.value), "mm") : "00"}
                                                            onValueChange={(m) => {
                                                                const date = field.value ? new Date(field.value) : new Date();
                                                                date.setMinutes(parseInt(m));
                                                                field.onChange(date.toISOString());
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-9 bg-muted border-border text-foreground flex-1"><SelectValue placeholder="Min"/></SelectTrigger>
                                                            <SelectContent className="bg-popover text-foreground">
                                                                {["00", "15", "30", "45"].map(m => (
                                                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </FormItem>
                            )} />

                            <div className="grid grid-cols-3 gap-2">
                                <FormField control={form.control} name="sg" render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-[9px] font-black uppercase text-muted-foreground ml-1">{activityLabels.sg}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-[10px] font-bold rounded-lg border-border bg-muted text-foreground px-2"><SelectValue /></SelectTrigger></FormControl><SelectContent className="bg-popover border-border text-foreground">{sgOptions.map(o => <SelectItem key={o} value={o} className="font-bold text-[10px]">{o}</SelectItem>)}</SelectContent></Select>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="ma" render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-[9px] font-black uppercase text-muted-foreground ml-1">{activityLabels.ma}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-[10px] font-bold rounded-lg border-border bg-muted text-foreground px-2"><SelectValue /></SelectTrigger></FormControl><SelectContent className="bg-popover border-border text-foreground">{maOptions.map(o => <SelectItem key={o} value={o} className="font-bold text-[10px]">{o}</SelectItem>)}</SelectContent></Select>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="frp" render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-[9px] font-black uppercase text-muted-foreground ml-1">{activityLabels.frp}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-[10px] font-bold rounded-lg border-border bg-muted text-foreground px-2"><SelectValue /></SelectTrigger></FormControl><SelectContent className="bg-popover border-border text-foreground">{frpOptions.map(o => <SelectItem key={o} value={o} className="font-bold text-[10px]">{o}</SelectItem>)}</SelectContent></Select>
                                    </FormItem>
                                )} />
                            </div>

                            <FormField control={form.control} name="remark" render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Call Remark</FormLabel>
                                    <FormControl><Textarea placeholder="Type conversation notes..." className="min-h-[120px] resize-none rounded-xl border-border bg-muted text-foreground font-bold p-4" {...field} /></FormControl>
                                </FormItem>
                            )} />
                        </form>
                    </Form>

                    <div className="pt-6 border-t border-border space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Progress Notes</Label>
                        <Textarea 
                            value={generalRemarks} 
                            onChange={e => { setGeneralRemarks(e.target.value); setIsNotesDirty(true); }} 
                            className="min-h-[140px] text-xs font-bold leading-relaxed p-4 border-none shadow-inner bg-muted text-foreground/80 rounded-[2rem]"
                            placeholder="Add important journey insights..." 
                        />
                        <div className="flex justify-end">
                            <Button size="sm" onClick={() => handleSaveNotes()} disabled={!isNotesDirty || isSavingNotes} className="rounded-full px-6 h-9 text-[9px] font-black uppercase tracking-widest">
                                {isSavingNotes ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                                Update Notes
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            )}
        </div>

        <DialogFooter className="p-6 sm:p-8 border-t border-border bg-card flex flex-col sm:flex-row justify-between gap-4 shrink-0">
           <div className="flex items-center gap-3">
              {!isDetour && (
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="destructive" className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-500/10"><Trash2 className="mr-2 h-4 w-4"/> END SESSION</Button></AlertDialogTrigger>
                  <AlertDialogContent className="bg-popover border-border text-foreground rounded-[2rem]">
                    <AlertDialogHeader><AlertDialogTitle className="font-black uppercase">Finish outreach?</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground font-bold">Your progress is saved. You can always resume from Live Activity.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel className="bg-muted border-border text-foreground rounded-xl">Stay</AlertDialogCancel><AlertDialogAction onClick={onEndSession} className="bg-destructive rounded-xl font-black uppercase">End Now</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {!isCallbackSearchOpen && !isDetour && (
                <Button variant="secondary" className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest bg-muted/50 border-border text-muted-foreground hover:text-foreground" onClick={() => setIsCallbackSearchOpen(true)}>
                  <PhoneIncoming className="mr-2 h-4 w-4" /> CALLBACK?
                </Button>
              )}
           </div>
           
           <div className="flex items-center gap-3">
                {!isDetour && sessionTotalCount > 1 && (
                  <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground" onClick={() => handleNavigation('prev')} disabled={sessionCurrentNumber <= 1 || isNavigating}><ArrowLeft className="h-5 w-5"/></Button>
                    <div className="px-2 text-[10px] font-black text-foreground/40">{sessionCurrentNumber} / {sessionTotalCount}</div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground" onClick={() => handleNavigation('next')} disabled={sessionCurrentNumber >= sessionTotalCount || isNavigating}><ArrowRight className="h-5 w-5"/></Button>
                  </div>
                )}
                <Button form="call-form" type="submit" disabled={isSubmitting || isNavigating} className="min-w-[160px] h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (isDetour ? 'LOG CALLBACK RESULT' : (sessionCurrentNumber < sessionTotalCount ? 'SAVE & NEXT' : 'FINISH OUTREACH'))}
                </Button>
           </div>
        </DialogFooter>

        {isEditingDetails && (
            <div className="absolute inset-0 z-50 bg-background flex flex-col animate-in fade-in">
                <div className="p-6 sm:p-8 flex items-center justify-between border-b border-border bg-card">
                    <h3 className="font-black text-foreground uppercase tracking-tight">Edit Profile: {currentActivePerson.fullName}</h3>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditingDetails(false)} className="text-muted-foreground"><XCircle className="h-6 w-6" /></Button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 sm:p-10">
                    <div className="max-w-xl mx-auto">
                        <EditablePersonDetailsForm 
                            ref={detailsFormRef}
                            person={currentActivePerson} 
                            isEditing={true} 
                            onSave={handleSaveDetails}
                            onCancel={() => setIsEditingDetails(false)}
                            allPeople={[]}
                            groups={personGroups}
                            isInDialog
                            formId={contactFormId}
                        />
                    </div>
                </div>
                <div className="p-8 border-t border-border bg-card flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setIsEditingDetails(false)} className="font-bold text-muted-foreground hover:text-foreground">Cancel</Button>
                    <Button onClick={() => detailsFormRef.current?.submit()} className="bg-primary text-primary-foreground font-black uppercase px-8 h-12 rounded-xl shadow-lg">Save Profile</Button>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const CallingSessionDialog = React.memo(CallingSessionDialogComponent);