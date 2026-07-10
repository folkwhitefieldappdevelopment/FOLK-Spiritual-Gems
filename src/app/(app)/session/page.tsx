'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { 
  Phone, 
  Loader2, 
  Edit, 
  Save, 
  XCircle, 
  ArrowLeft, 
  ArrowRight, 
  Trash2, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  BellRing, 
  PhoneIncoming, 
  User,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Timer,
  Activity
} from "lucide-react";
import { Capacitor } from '@capacitor/core';
import type { Person, CallStatus, Group, ActivityFieldLabels, CallLog as CallLogType } from "@/lib/types";
import { callStatuses } from "@/lib/types";
import { useAppToast } from "@/contexts/toast-context";
import { useAuth } from "@/contexts/auth-context";
import { updatePerson, getPeople, getPerson } from "@/services/people-service";
import { 
  getSgOptions, 
  getMaOptions, 
  getFrpOptions, 
  getActivityFieldLabels
} from "@/services/settings-service";
import { scheduleFollowUpAlarm } from "@/lib/notification-service";
import { getAllGroups } from "@/services/groups-service";
import { updateUser } from "@/services/user-service";
import { updateSessionHistory } from "@/services/session-history-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { safeDate } from "@/utils/date";
import { EditablePersonDetailsForm } from "@/components/editable-person-details-form";
import { CallLog } from '@/lib/call-log';
import { CallHistory } from '@/components/call-history';

const callFormSchema = z.object({
  remark: z.string().trim().optional(),
  status: z.string().min(1, { message: "Please select a call status." }),
  sg: z.string().optional(),
  ma: z.string().optional(),
  frp: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
});

type CallFormValues = z.infer<typeof callFormSchema>;

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
};

export default function SessionPage() {
  const { appUser, setAppUser, loading: authLoading } = useAuth();
  const { toast } = useAppToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isFinishing, setIsFinishing] = React.useState(false);
  const [people, setPeople] = React.useState<Person[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [sessionEvent, setSessionEvent] = React.useState('');
  
  const [sgOptions, setSgOptions] = React.useState<string[]>([]);
  const [maOptions, setMaOptions] = React.useState<string[]>([]);
  const [frpOptions, setFrpOptions] = React.useState<string[]>([]);
  const [activityLabels, setActivityLabels] = React.useState<ActivityFieldLabels>({ sg: 'SG-S', ma: 'SG-W', frp: 'FRP' });
  const [allGroups, setAllGroups] = React.useState<Group[]>([]);

  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [generalRemarks, setGeneralRemarks] = React.useState('');
  const [isNotesDirty, setIsNotesDirty] = React.useState(false);
  const [isSavingNotes, setIsSavingNotes] = React.useState(false);
  const [jumpIndex, setJumpIndex] = React.useState('');

  const [isCallbackSearchOpen, setIsCallbackSearchOpen] = React.useState(false);
  const [callbackSearchQuery, setCallbackSearchQuery] = React.useState('');
  const [callbackResults, setCallbackResults] = React.useState<Person[]>([]);
  const [selectedCallbackPerson, setSelectedCallbackPerson] = React.useState<Person | null>(null);
  const [isSearchingCallback, setIsSearchingCallback] = React.useState(false);

  const [callStartTime, setCallStartTime] = React.useState<number | null>(null);
  const [sessionStartTime] = React.useState(Date.now());
  const [sessionDuration, setSessionDuration] = React.useState(0);

  const syncTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const detailsFormRef = React.useRef<any>(null);
  const hasInitialized = React.useRef(false);

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

  React.useEffect(() => {
      const interval = setInterval(() => {
          setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
  }, [sessionStartTime]);

  const handleEndSession = async (removePermanently = false) => {
    if (!appUser) return;
    
    if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
    }

    if (removePermanently && people.length > 0) {
        setIsFinishing(true);
        if (currentIndex >= people.length) setCurrentIndex(people.length - 1);
    } else {
        setIsLoading(true);
    }

    try {
      const sessionId = appUser.pausedCallingSession?.historyId;
      
      if (sessionId) {
          await updateSessionHistory(sessionId, currentIndex, removePermanently);
      }

      await updateUser(appUser.id, { pausedCallingSession: null });
      
      setAppUser(prev => prev ? { ...prev, pausedCallingSession: null } : null);
      sessionStorage.removeItem('calling_session_active');
      
      toast({ 
          title: removePermanently ? "Session Completed" : "Session Paused",
          description: removePermanently ? "The outreach record has been removed from Live Activity." : "Your progress has been saved."
      });

      router.push('/dashboard/');
    } catch (e) {
      console.error("Failed to end session:", e);
      toast({ variant: 'destructive', title: "End Error", description: "Something went wrong while closing your session." });
      setIsLoading(false);
      setIsFinishing(false);
    }
  };

  const currentActivePerson = React.useMemo(() => {
    if (isFinishing && people.length > 0) {
        const safeIndex = Math.min(currentIndex, people.length - 1);
        return people[safeIndex];
    }
    return selectedCallbackPerson || (people.length > 0 ? people[currentIndex] : null);
  }, [selectedCallbackPerson, people, currentIndex, isFinishing]);

  const currentPersonGroups = React.useMemo(() => {
    if (!currentActivePerson?.id || !allGroups.length) return [];
    return allGroups.filter(g => g.peopleIds?.includes(currentActivePerson.id));
  }, [allGroups, currentActivePerson?.id]);

  const refreshCurrentPerson = async () => {
    if (!currentActivePerson?.id) return;
    try {
        const updated = await getPerson(currentActivePerson.id);
        if (updated) {
            if (selectedCallbackPerson) {
                setSelectedCallbackPerson(updated);
            } else {
                setPeople(prev => prev.map(p => p.id === updated.id ? updated : p));
            }
        }
    } catch (e) {
        console.error("Refresh failed", e);
    }
  };

  React.useEffect(() => {
    if (authLoading) return;
    if (!appUser?.pausedCallingSession) {
      router.push('/dashboard/');
      return;
    }

    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initSession = async () => {
      setIsLoading(true);
      try {
        const { event, peopleIds, currentIndex: savedIndex } = appUser.pausedCallingSession!;
        setSessionEvent(event);
        setJumpIndex(String(savedIndex + 1));

        const [peopleResult, sg, ma, frp, labels, groupsData] = await Promise.all([
          getPeople(appUser, { personIds: peopleIds, ignoreLimit: true }),
          getSgOptions(),
          getMaOptions(),
          getFrpOptions(),
          getActivityFieldLabels(),
          getAllGroups(appUser)
        ]);

        const resumedPeopleMap = new Map(peopleResult.people.map(p => [p.id, p]));
        const orderedPeople = peopleIds.map(id => resumedPeopleMap.get(id)).filter((p): p is Person => !!p);
        
        setPeople(orderedPeople);
        setSgOptions(sg);
        setMaOptions(ma);
        setFrpOptions(frp);
        setActivityLabels(labels);
        setAllGroups(groupsData);

        if (savedIndex >= orderedPeople.length && orderedPeople.length > 0) {
            await handleEndSession(true);
        } else {
            setCurrentIndex(savedIndex);
        }
      } catch (e) {
        console.error("Session init failed", e);
        toast({ variant: 'destructive', title: "Load Error" });
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, [appUser, authLoading, router, toast]);

  React.useEffect(() => {
    if (!currentActivePerson || isFinishing) return;

    const eventName = selectedCallbackPerson ? `${sessionEvent} (Callback)` : sessionEvent;
    const lastCallForEvent = [...(currentActivePerson.callHistory || [])]
      .filter(log => log.event === eventName)
      .sort((a,b) => (safeDate(b.calledAt)?.getTime() || 0) - (safeDate(a.calledAt)?.getTime() || 0))[0];

    form.reset({
      remark: lastCallForEvent?.remark ?? '',
      status: '',
      sg: currentActivePerson.lastSg ?? '',
      ma: currentActivePerson.lastMa ?? '',
      frp: currentActivePerson.lastFrp ?? '',
      nextFollowUpAt: '',
    });

    setGeneralRemarks(currentActivePerson.generalRemarks || '');
    setIsNotesDirty(false);
    setIsEditingDetails(false);
    setCallStartTime(null);
    if (!selectedCallbackPerson) setJumpIndex(String(currentIndex + 1));
  }, [currentIndex, currentActivePerson, sessionEvent, form, selectedCallbackPerson, isFinishing]);

  const handleUpdatePausedSession = (newIndex: number) => {
    if (!appUser || appUser.id === 'anonymous-user' || !appUser.pausedCallingSession) return;

    const newPausedSession = { ...appUser.pausedCallingSession, currentIndex: newIndex };
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      syncTimeoutRef.current = null;
      await updateUser(appUser.id, { pausedCallingSession: newPausedSession });
      if (newPausedSession.historyId) {
          await updateSessionHistory(newPausedSession.historyId, newIndex);
      }
    }, 1000);
  };

  const handleSaveNotes = async (silent = false) => {
    if (!currentActivePerson || !isNotesDirty || !appUser) return;
    if (!silent) setIsSavingNotes(true);
    try {
      await updatePerson(currentActivePerson.id, { generalRemarks }, appUser);
      setIsNotesDirty(false);
      const updated = { ...currentActivePerson, generalRemarks } as Person;
      if (selectedCallbackPerson) setSelectedCallbackPerson(updated);
      else setPeople(prev => prev.map(p => p.id === updated.id ? updated : p));
      if (!silent) toast({ title: "Notes Saved" });
    } catch (e) {
      if (!silent) toast({ variant: 'destructive', title: "Notes Error" });
    } finally {
      if (!silent) setIsSavingNotes(false);
    }
  };

  const handleSaveDetails = async (formData: Partial<Person>) => {
    if (!currentActivePerson || !appUser) return;
    setIsSubmitting(true);
    try {
      const result = await updatePerson(currentActivePerson.id, formData, appUser);
      if (result.success) {
        const updated = { ...currentActivePerson, ...formData } as Person;
        toast({ title: 'Profile Updated' });
        setIsEditingDetails(false);
        if (selectedCallbackPerson) setSelectedCallbackPerson(updated);
        else setPeople(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Update failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCallSubmit = async (data: CallFormValues) => {
    if (isSubmitting || isFinishing || !appUser || !currentActivePerson) return;

    if (isEditingDetails && detailsFormRef.current) {
      const detailsSaved = await detailsFormRef.current.submit();
      if (!detailsSaved) return; 
    }

    if (isNotesDirty) {
      await handleSaveNotes(true);
    }

    setIsSubmitting(true);
    try {
      const isPicked = ['A1 - Coming', 'Z - Already Attended', 'A4 - Tentative'].includes(data.status);
      let duration = 0;
      if (isPicked) {
          if (callStartTime) {
              duration = Math.round((Date.now() - callStartTime) / 1000);
          } else {
              duration = 60;
          }
      } else {
          duration = 10;
      }

      // Sync stage based on markings with precedence: FRP > SG-W > SG-S
      let newStage: string | undefined = undefined;
      if (data.frp) newStage = 'FRP';
      else if (data.ma) newStage = 'SG-W';
      else if (data.sg) newStage = 'SG-S';

      const callLog: Partial<CallLogType> = {
        calledAt: new Date().toISOString(),
        remark: data.remark || '',
        status: data.status as CallStatus,
        event: selectedCallbackPerson ? `${sessionEvent} (Callback)` : sessionEvent,
        sg: data.sg,
        ma: data.ma,
        frp: data.frp,
        nextFollowUpAt: data.nextFollowUpAt,
        callerId: appUser.id,
        callerName: appUser.name,
        callerPhotoUrl: appUser.photoUrl || '',
        sessionCreatorId: appUser.pausedCallingSession?.assignedById || appUser.id,
        duration: duration
      };

      const updates: Partial<Person> = {
        lastCallRemark: data.remark,
        lastCallStatus: data.status as CallStatus,
        lastCallAt: '__now__',
        lastSg: data.sg,
        lastMa: data.ma,
        lastFrp: data.frp,
        nextFollowUpAt: data.nextFollowUpAt,
        reminderSetName: data.nextFollowUpAt ? appUser.name : '',
        ...(newStage ? { currentFolkStage: newStage as any } : {})
      };

      if (data.nextFollowUpAt) {
          const followUpDate = new Date(data.nextFollowUpAt);
          await scheduleFollowUpAlarm(currentActivePerson.id, currentActivePerson.fullName, followUpDate, data.remark);
      }

      await updatePerson(currentActivePerson.id, { ...updates, callHistory: [callLog as CallLogType] }, appUser);
      
      const updatedPerson = { 
        ...currentActivePerson, 
        ...updates, 
        lastCallAt: new Date().toISOString(), 
        callHistory: [callLog as CallLogType, ...(currentActivePerson.callHistory || [])] 
      } as Person;

      if (selectedCallbackPerson) {
        setSelectedCallbackPerson(null);
        setIsCallbackSearchOpen(false);
        setPeople(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
        toast({ title: "Callback Logged" });
        setIsSubmitting(false);
      } else {
        const nextIdx = currentIndex + 1;
        setPeople(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
        if (nextIdx < people.length) {
          setCurrentIndex(nextIdx);
          handleUpdatePausedSession(nextIdx);
          setIsSubmitting(false);
        } else {
          await handleEndSession(true);
        }
      }
    } catch (e) {
      toast({ variant: 'destructive', title: "Log Failed" });
      setIsSubmitting(false);
    }
  };

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const idx = parseInt(jumpIndex);
    if (isNaN(idx) || idx < 1 || idx > people.length) {
      setJumpIndex(String(currentIndex + 1));
      return;
    }
    setCurrentIndex(idx - 1);
    handleUpdatePausedSession(idx - 1);
  };

  const handleMakeCall = async () => {
    if (!currentActivePerson) return;
    setCallStartTime(Date.now());
    
    if (Capacitor.isNativePlatform()) {
        const permissions = await CallLog.checkPermissions();
        if (permissions.callLog !== 'granted') {
          const result = await CallLog.requestPermissions();
          if (result.callLog !== 'granted') {
             toast({ variant: 'destructive', title: 'Permission Denied' });
             return;
          }
        }
        await CallLog.makeCall({ phoneNumber: currentActivePerson.phone });
    } else {
        window.location.href = `tel:${currentActivePerson.phone}`;
    }
  };

  const whatsAppLink = () => {
    if (!currentActivePerson || !appUser) return '#';
    const template = appUser.whatsAppTemplate || "Hare Krishna {name}, inviting you for our session!";
    return `https://wa.me/91${String(currentActivePerson.phone).replace(/\s+/g, '')}?text=${encodeURIComponent(template.replace('{name}', currentActivePerson.fullName))}`;
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
    } catch (e) {
      toast({ variant: 'destructive', title: "Search Failed" });
    } finally {
      setIsSearchingCallback(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <header className="flex-shrink-0 border-b border-border bg-popover px-4 py-2 sm:py-4 z-10 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-2 max-w-full">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button onClick={() => handleEndSession(false)} className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[10px] sm:text-xl font-black tracking-tight text-foreground flex items-center gap-1.5 truncate uppercase">
                {isCallbackSearchOpen ? 'Detour' : 'Outreach Center'}
              </h1>
              <div className="text-[8px] sm:text-xs text-muted-foreground flex items-center gap-1 sm:gap-2 mt-0.5 truncate uppercase font-bold tracking-widest">
                <span className="text-primary truncate max-w-[60px] sm:max-w-none">{sessionEvent}</span>
                {!selectedCallbackPerson && (
                  <>
                    <Separator orientation="vertical" className="h-2.5 bg-border" />
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <span className="hidden xs:inline">Row</span>
                      <form onSubmit={handleJump} className="flex items-center gap-1">
                        <Input 
                          value={jumpIndex} 
                          onChange={e => setJumpIndex(e.target.value)} 
                          onBlur={() => setJumpIndex(String(currentIndex + 1))}
                          className="h-4 sm:h-6 w-8 sm:w-12 px-1 text-center text-[8px] sm:text-xs font-black bg-muted/50 border-border text-foreground"
                        />
                      </form>
                      <span className="hidden xs:inline">of {people.length}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <Badge variant="outline" className="hidden sm:flex h-9 px-3 gap-2 border-border text-foreground bg-muted/50 rounded-xl font-mono">
                <Activity className="h-3 w-3 text-primary animate-pulse" />
                Session: {formatDuration(sessionDuration)}
            </Badge>
            {callStartTime && (
              <Badge variant="outline" className="h-7 sm:h-9 px-2 sm:px-3 gap-1.5 sm:gap-2 border-primary/20 text-primary bg-primary/5 rounded-xl font-mono animate-pulse">
                <Timer className="h-3 w-3" />
                {Math.floor((Date.now() - callStartTime) / 1000)}s
              </Badge>
            )}
            {!selectedCallbackPerson && !isCallbackSearchOpen && (
              <Button variant="outline" size="sm" onClick={() => setIsCallbackSearchOpen(true)} className="h-7 sm:h-9 px-1.5 sm:px-3 text-[8px] sm:text-[10px] font-black uppercase tracking-widest border-border text-muted-foreground bg-muted/50 hover:text-foreground">
                <PhoneIncoming className="sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Detour</span>
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-7 sm:h-9 px-1.5 sm:px-3 text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg">
                  <Trash2 className="sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">End</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-popover border-border text-foreground rounded-[2rem]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-black uppercase tracking-tight">End Session?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground font-bold">Progress will be finalized and cleared from live dashboards.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-muted/50 border-border text-foreground rounded-xl font-bold">Stay</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleEndSession(true)} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black uppercase tracking-widest">End Now</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="flex-1 min-0 bg-background overflow-y-auto">
        {isCallbackSearchOpen && !selectedCallbackPerson ? (
          <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8">
            <div className="max-w-md w-full space-y-8 text-center">
              <div className="bg-primary/10 p-6 rounded-[2rem] w-fit mx-auto border border-primary/20 shadow-inner">
                <PhoneIncoming className="h-10 w-10 sm:h-16 sm:w-16 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-3xl font-black text-foreground uppercase tracking-tight">Logging a Detour</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-[0.2em]">Find the contact by phone to record their milestone.</p>
              </div>
              <div className="flex gap-2 p-1 bg-popover rounded-2xl border border-border shadow-2xl">
                <Input 
                  placeholder="10-digit number..." 
                  value={callbackSearchQuery}
                  onChange={e => setCallbackSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchCallback()}
                  className="h-12 sm:h-14 text-base sm:text-xl font-black border-none bg-transparent text-foreground px-5"
                />
                <Button className="h-12 sm:h-14 px-6 sm:px-10 rounded-xl font-black uppercase tracking-widest shadow-xl" onClick={handleSearchCallback} disabled={isSearchingCallback}>
                  {isSearchingCallback ? <Loader2 className="animate-spin h-5 w-5" /> : 'Find'}
                </Button>
              </div>
              <div className="space-y-3 mt-8">
                {callbackResults.map(p => (
                  <Button key={p.id} variant="outline" className="w-full h-16 sm:h-20 justify-between p-4 sm:p-5 rounded-2xl bg-popover border-border hover:bg-muted transition-all text-foreground group" onClick={() => setSelectedCallbackPerson(p)}>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 sm:h-12 w-12 border-2 border-primary/20"><AvatarImage src={p.photoUrl} /><AvatarFallback className="bg-muted"><User /></AvatarFallback></Avatar>
                      <div className="text-left overflow-hidden">
                        <p className="text-sm sm:text-base font-black truncate">{p.fullName}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-bold mt-0.5 tracking-wider">{p.phone}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                ))}
              </div>
              <Button variant="ghost" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground" onClick={() => setIsCallbackSearchOpen(false)}>Cancel & Return</Button>
            </div>
          </div>
        ) : currentActivePerson ? (
          <div className="h-full flex flex-col lg:grid lg:grid-cols-12 relative">
            {isFinishing && (
                <div className="fixed inset-0 z-[200] bg-background/90 backdrop-blur-md flex flex-col items-center justify-center space-y-6">
                    <Loader2 className="h-16 w-16 animate-spin text-primary opacity-50" />
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter">Cleaning Up</h3>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.3em]">Finalizing logs & clearing live trackers...</p>
                    </div>
                </div>
            )}
            <div className="lg:col-span-4 border-r border-border bg-popover/30 flex flex-col min-h-0">
              <ScrollArea className="flex-1">
                <div className="p-4 sm:p-8 space-y-8 sm:space-y-10 pb-32 sm:pb-8">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 sm:h-40 sm:w-40 border-4 border-primary/20 mb-4 shadow-2xl rounded-[2.5rem]">
                      <AvatarImage src={currentActivePerson.photoUrl} className="object-cover" />
                      <AvatarFallback className="text-2xl sm:text-5xl font-black bg-muted">{currentActivePerson.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex items-center justify-center gap-2 max-w-full px-2">
                      <h2 className="text-xl sm:text-3xl font-black text-foreground tracking-tighter truncate leading-none uppercase">{currentActivePerson.fullName}</h2>
                      {currentActivePerson.verifiedByFg === 'Yes' && <BadgeCheck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 shrink-0" />}
                    </div>
                    <p className="text-[10px] sm:text-base text-muted-foreground font-black tracking-widest mt-1.5">{currentActivePerson.phone}</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest py-1.5 px-4 rounded-full">{currentActivePerson.currentFolkStage}</Badge>
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest border-border text-muted-foreground py-1.5 px-4 rounded-full">{currentActivePerson.age} Years</Badge>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Log Interaction</h3>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-10 px-4 sm:px-6 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl shadow-primary/20" onClick={handleMakeCall}>Call</Button>
                        <Button asChild size="sm" variant="outline" className="h-10 px-4 sm:px-6 font-black uppercase text-[10px] tracking-widest rounded-xl border-green-500/20 text-green-500 hover:bg-green-500/10">
                          <a href={whatsAppLink()} target="_blank" rel="noopener noreferrer">WA</a>
                        </Button>
                      </div>
                    </div>
                    
                    <Form {...form}>
                      <form id="call-form" onSubmit={form.handleSubmit(onCallSubmit)} className="space-y-5">
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Call Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 sm:h-14 rounded-xl border-border bg-muted text-foreground font-black text-sm uppercase tracking-tight focus:ring-primary">
                                <SelectValue placeholder="Select outcome..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover border-border text-foreground">
                              {callStatuses.map(s => (
                                <SelectItem key={s} value={s} className="font-bold text-[11px] py-3">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                    )} />
                        <div className="grid grid-cols-3 gap-2">
                          <FormField control={form.control} name="sg" render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-[9px] font-black uppercase text-muted-foreground truncate tracking-widest ml-1">{activityLabels.sg}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="h-10 text-[10px] font-bold rounded-lg border-border bg-muted text-foreground px-2"><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent className="bg-popover border-border text-foreground">{sgOptions.map(o => <SelectItem key={o} value={o} className="font-bold text-xs">{o}</SelectItem>)}</SelectContent>
                              </Select>
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="ma" render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-[9px] font-black uppercase text-muted-foreground truncate tracking-widest ml-1">{activityLabels.ma}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="h-10 text-[10px] font-bold rounded-lg border-border bg-muted text-foreground px-2"><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent className="bg-popover border-border text-foreground">{maOptions.map(o => <SelectItem key={o} value={o} className="font-bold text-xs">{o}</SelectItem>)}</SelectContent>
                              </Select>
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="frp" render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-[9px] font-black uppercase text-muted-foreground truncate tracking-widest ml-1">{activityLabels.frp}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="h-10 text-[10px] font-bold rounded-lg border-border bg-muted text-foreground px-2"><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent className="bg-popover border-border text-foreground">{frpOptions.map(o => <SelectItem key={o} value={o} className="font-bold text-xs">{o}</SelectItem>)}</SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="nextFollowUpAt" render={({ field }) => (
                          <FormItem className="space-y-2">
                             <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2"><BellRing className="h-3 w-3 text-[#FF9800]" /> Follow-up Schedule</FormLabel>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full h-12 rounded-xl border-border bg-muted text-foreground font-bold px-5 text-left justify-start",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                            {field.value ? format(new Date(field.value), "PPP p") : <span>Set reminder...</span>}
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
                                                  <SelectTrigger className="h-9 bg-muted border-border text-foreground"><SelectValue/></SelectTrigger>
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
                                                  <SelectTrigger className="h-9 bg-muted border-border text-foreground"><SelectValue/></SelectTrigger>
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
                        <FormField control={form.control} name="remark" render={({ field }) => (
                          <FormItem className="space-y-2"><FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Call Remark</FormLabel><FormControl><Textarea placeholder="Interaction notes..." className="min-h-[100px] resize-none rounded-xl border-border bg-muted text-foreground font-bold p-5" {...field} /></FormControl></FormItem>
                        )} />
                      </form>
                    </Form>
                  </div>

                  <div className="pt-4">
                     <CallHistory 
                       personId={currentActivePerson.id}
                       contactPhoneNumber={currentActivePerson.phone} 
                       userId={appUser.id} 
                       manualHistory={currentActivePerson.callHistory || []} 
                       onRefresh={() => refreshCurrentPerson()}
                     />
                  </div>
                </div>
              </ScrollArea>
            </div>

            <div className="lg:col-span-8 flex flex-col min-h-0 flex-1 bg-background">
              <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-10 py-3 sm:py-6 border-b border-border bg-popover/50 backdrop-blur-xl">
                <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                  <h3 className="font-black text-[10px] sm:text-xs uppercase tracking-[0.3em] text-muted-foreground truncate">Journey Overview</h3>
                  <Badge variant="outline" className="h-6 text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-3 border-border text-muted-foreground bg-muted/50">
                    {currentPersonGroups.length} Active Lists
                  </Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isEditingDetails ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingDetails(false)} className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4 mr-2" /> Cancel</Button>
                      <Button size="sm" onClick={() => detailsFormRef.current?.submit()} disabled={isSubmitting} className="h-10 px-6 text-[10px] font-black uppercase tracking-widest bg-primary shadow-lg shadow-primary/20 rounded-xl">
                        {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4 mr-2" />}
                        Apply
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingDetails(true)} className="h-10 px-6 text-[10px] font-black uppercase tracking-widest border-border text-foreground bg-muted/50 hover:bg-muted rounded-xl">
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                <ScrollArea className="flex-1">
                  <div className="flex flex-col xl:grid xl:grid-cols-2 min-h-0">
                    <div className="border-b xl:border-b-0 xl:border-r border-border p-4 sm:p-10 bg-muted/30 overflow-hidden">
                      <EditablePersonDetailsForm 
                        ref={detailsFormRef}
                        person={currentActivePerson}
                        isEditing={isEditingDetails}
                        onSave={handleSaveDetails}
                        onCancel={() => setIsEditingDetails(false)}
                        allPeople={[]}
                        groups={currentPersonGroups}
                        isInDialog
                      />
                    </div>

                    <div className="p-4 sm:p-10 space-y-6 bg-background relative pb-40 xl:pb-10">
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Spiritual Insights</Label>
                        <div className="relative group">
                            <Textarea 
                              value={generalRemarks} 
                              onChange={e => { setGeneralRemarks(e.target.value); setIsNotesDirty(true); }}
                              className="min-h-[250px] sm:min-h-[500px] text-sm sm:text-lg font-bold leading-relaxed p-6 sm:p-10 border-none shadow-2xl bg-muted text-foreground focus-visible:ring-1 focus-visible:ring-primary rounded-[2rem]"
                              placeholder="Track their spiritual progress here..."
                            />
                            {isNotesDirty && (
                                <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-accent animate-pulse" />
                            )}
                        </div>
                        <div className="flex justify-end pt-2">
                          <Button 
                            size="lg" 
                            variant={isNotesDirty ? 'default' : 'ghost'} 
                            onClick={() => handleSaveNotes()}
                            disabled={!isNotesDirty || isSavingNotes}
                            className="rounded-full px-8 h-12 text-[10px] font-black uppercase tracking-[0.2em]"
                          >
                            {isSavingNotes && <Loader2 className="mr-2 h-3 w-3 mr-2" />}
                            {isNotesDirty ? 'Update Notes' : 'Saved'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="hidden lg:block absolute bottom-0 left-0 right-0 p-8 border-t border-border bg-popover/95 backdrop-blur-xl z-20">
                  <div className="mx-auto max-w-2xl flex items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        className="h-14 w-14 rounded-2xl border-border bg-muted/50 text-foreground hover:bg-muted"
                        onClick={() => {
                            const newIdx = Math.max(0, currentIndex - 1);
                            setCurrentIndex(newIdx);
                            handleUpdatePausedSession(newIdx);
                        }}
                        disabled={currentIndex === 0 || isSubmitting}
                      >
                        <ChevronLeft className="h-8 w-8" />
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-14 w-14 rounded-2xl border-border bg-muted/50 text-foreground hover:bg-muted"
                        onClick={() => {
                            const newIdx = Math.min(people.length - 1, currentIndex + 1);
                            setCurrentIndex(newIdx);
                            handleUpdatePausedSession(newIdx);
                        }}
                        disabled={currentIndex === people.length - 1 || isSubmitting}
                      >
                        <ChevronRight className="h-8 w-8" />
                      </Button>
                    </div>
                    <Button 
                      form="call-form" 
                      type="submit" 
                      size="lg" 
                      className="flex-1 h-16 rounded-2xl text-xl font-black shadow-2xl shadow-primary/30 uppercase tracking-tight"
                      disabled={isSubmitting}
                    >
                      {currentIndex < people.length - 1 ? (
                        <>Save & Next <ArrowRight className="ml-3 h-6 w-6" /></>
                      ) : (
                        <>Finish Outreach <CheckCircle2 className="ml-3 h-6 w-6" /></>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-8 bg-background">
            <div className="text-center space-y-6">
                <div className="bg-popover p-8 rounded-[3rem] w-fit mx-auto shadow-2xl border border-border">
                    <User className="h-16 w-16 text-muted-foreground opacity-20" />
                </div>
                <div className="space-y-1">
                    <p className="text-foreground text-lg font-black uppercase tracking-tight">Queue Empty</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">No session data loaded.</p>
                </div>
                <Button variant="outline" onClick={() => router.push('/dashboard/')} className="rounded-xl border-border text-foreground font-black uppercase text-[10px] tracking-widest px-8">Back to Dashboard</Button>
            </div>
          </div>
        )}
      </main>

      {!isCallbackSearchOpen && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 sm:p-5 border-t border-border bg-popover/95 backdrop-blur-xl z-[100] shadow-2xl">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            {!selectedCallbackPerson ? (
              <>
                <div className="flex items-center gap-2 shrink-0">
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-12 w-12 rounded-xl border-border bg-muted/50 text-foreground"
                    onClick={() => {
                        const newIdx = Math.max(0, currentIndex - 1);
                        setCurrentIndex(newIdx);
                        handleUpdatePausedSession(newIdx);
                    }}
                    disabled={currentIndex === 0 || isSubmitting}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-12 w-12 rounded-xl border-border bg-muted/50 text-foreground"
                    onClick={() => {
                        const newIdx = Math.min(people.length - 1, currentIndex + 1);
                        setCurrentIndex(newIdx);
                        handleUpdatePausedSession(newIdx);
                    }}
                    disabled={currentIndex === people.length - 1 || isSubmitting}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
                <Button 
                  form="call-form" 
                  type="submit" 
                  className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : currentIndex < people.length - 1 ? (
                    <>Save & Next <ArrowRight className="ml-2 h-4 w-4" /></>
                  ) : (
                    <>Finish <CheckCircle2 className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </>
            ) : (
              <Button 
                form="call-form" 
                type="submit" 
                className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-destructive shadow-xl shadow-destructive/20"
                disabled={isSubmitting}
              >
                Log Detour
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
