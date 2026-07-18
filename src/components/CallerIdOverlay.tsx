
'use client';

import * as React from 'react';
import { Capacitor } from '@capacitor/core';
import { CallLog } from '@/lib/call-log';
import { getPersonByPhone } from '@/services/people-service';
import { getCachedContact } from '@/services/contact-cache-service';
import { useAuth } from '@/contexts/auth-context';
import { useAppToast } from '@/contexts/toast-context';
import type { Person } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    PhoneIncoming, 
    PhoneOutgoing, 
    X, 
    User, 
    ExternalLink, 
    PlayCircle,
    Loader2,
    BadgeCheck,
    Clock
} from 'lucide-react';
import { StarRating } from './star-rating';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { safeDate } from '@/utils/date';
import { trackSessionStart } from '@/services/session-history-service';
import { updateUser } from '@/services/user-service';

export function CallerIdOverlay() {
  const { appUser, setAppUser } = useAuth();
  const { toast } = useAppToast();
  const router = useRouter();
  const [activeCall, setActiveCall] = React.useState<{ phoneNumber: string; type: string } | null>(null);
  const [contact, setContact] = React.useState<Person | any | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isStartingSession, setIsStartingSession] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const isAndroid = Capacitor.getPlatform() === 'android';
  const isPrivileged = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');

  React.useEffect(() => {
    if (!appUser || !Capacitor.isNativePlatform()) return;

    let nativeListener: any = null;
    let actionListener: any = null;

    const setupListeners = async () => {
      try {
        nativeListener = await CallLog.addListener('callDetected', async (data) => {
          // Fix: Persistence is now handled natively via markCallEnded()
          // We no longer auto-hide on DISCONNECTED to allow the user to view data after call
          if (data.type === 'DISCONNECTED') {
            return;
          }

          setActiveCall(data);
          setIsLoading(true);
          if (!isAndroid) setIsOpen(true);
          
          try {
            // 1. Try instant local cache first for zero-latency UI
            const cachedMatch = await getCachedContact(data.phoneNumber);
            if (cachedMatch) {
                setContact({ id: 'cached', ...cachedMatch, phone: data.phoneNumber });
                
                if (isAndroid) {
                    await CallLog.showNativeOverlay({
                        name: cachedMatch.fullName,
                        phone: data.phoneNumber,
                        photoUrl: cachedMatch.photoUrl || '',
                        stage: cachedMatch.currentFolkStage || 'Fresh Lead',
                        remark: cachedMatch.lastCallRemark || '',
                        type: data.type,
                        occupation: cachedMatch.occupation,
                        enabler: cachedMatch.enablerInTouchWith,
                        folkGuide: cachedMatch.folkGuide,
                        attendance: cachedMatch.attendanceHistory,
                        isAdmin: isPrivileged
                    });
                }
            }

            // 2. Refresh with latest from Firestore if online
            if (navigator.onLine) {
                const match = await getPersonByPhone(data.phoneNumber, { id: appUser.id, name: appUser.name, role: appUser.role });
                if (match) {
                    setContact(match);
                    if (isAndroid) {
                        const attendance = (match.attendanceHistory || [])
                            .slice(0, 3)
                            .map(a => `${a.eventName || a.groupName} · ${a.date}`);

                        const result = await CallLog.showNativeOverlay({
                            name: match.fullName,
                            phone: data.phoneNumber,
                            photoUrl: match.photoUrl || '',
                            stage: match.currentFolkStage || 'Fresh Lead',
                            remark: match.lastCallRemark || '',
                            type: data.type,
                            occupation: match.occupation,
                            enabler: match.enablerInTouchWith,
                            folkGuide: match.folkGuide,
                            attendance: attendance,
                            isAdmin: isPrivileged
                        });

                        if (result.shown === false) {
                            toast({
                                title: "Caller ID overlay blocked",
                                description: "Enable 'Display over other apps' in Settings to identify contacts during calls.",
                                action: (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 rounded-lg font-bold"
                                        onClick={() => CallLog.requestOverlayPermission()}
                                    >
                                        Enable
                                    </Button>
                                )
                            });
                        }
                    }
                }
            }
          } catch (e) { 
              console.error('[CallerID] Lookup failed', e); 
          } finally { 
              setIsLoading(false); 
          }
        });

        if (isAndroid) {
            actionListener = await CallLog.addListener('nativeOverlayAction', (data: any) => {
                if (data.action === 'startSession') handleQuickStartSession();
                else if (data.action === 'viewProfile') {
                    if (contact?.id) {
                        router.push(`/contacts/profile?id=${contact.id}`);
                    }
                }
            });
        }
      } catch (e) { 
          console.warn('[CallerID] Native plugin initialization issue.'); 
      }
    };

    setupListeners();
    return () => {
      if (nativeListener) nativeListener.remove();
      if (actionListener) actionListener.remove();
    };
  }, [appUser, isAndroid, contact, router, toast, isPrivileged]);

  const handleQuickStartSession = async () => {
    if (!appUser || !contact || isStartingSession || contact.id === 'cached') return;
    setIsStartingSession(true);
    try {
        const isIncoming = activeCall?.type === 'INCOMING';
        const eventName = isIncoming ? `Incoming: ${contact.fullName}` : `Manual: ${contact.fullName}`;
        const historyId = await trackSessionStart({ 
            name: eventName, 
            peopleIds: [contact.id], 
            assignedById: appUser.id, 
            assignedByName: appUser.name, 
            coEnablerIds: contact.coEnablerId && contact.coEnablerId !== appUser.id ? [contact.coEnablerId] : [] 
        }, appUser);
        const pausedSession = { 
            event: eventName, 
            peopleIds: [contact.id], 
            currentIndex: 0, 
            assignedById: appUser.id, 
            assignedByName: appUser.name, 
            historyId, 
            coEnablerIds: contact.coEnablerId && contact.coEnablerId !== appUser.id ? [contact.coEnablerId] : [] 
        };
        await updateUser(appUser.id, { pausedCallingSession: pausedSession });
        setAppUser(prev => prev ? {...prev, pausedCallingSession: pausedSession} : null);
        setIsOpen(false);
        router.push('/session');
    } catch (e) { 
        console.error("[CallerID] Session start failed", e); 
    } finally { 
        setIsStartingSession(false); 
    }
  };

  if (isAndroid || !Capacitor.isNativePlatform()) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="fixed top-10 left-1/2 -translate-x-1/2 sm:max-w-md w-[90vw] p-0 overflow-hidden bg-popover border-none shadow-2xl rounded-[2.5rem] z-[1000]">
        <DialogHeader className="sr-only"><DialogTitle>Caller Context</DialogTitle></DialogHeader>
        <div className="relative">
            <div className={cn("h-2 w-full animate-pulse", activeCall?.type === 'INCOMING' ? "bg-blue-500" : "bg-green-500")} />
            <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {activeCall?.type === 'INCOMING' ? <div className="bg-blue-500/20 p-2 rounded-lg"><PhoneIncoming className="h-4 w-4 text-blue-400" /></div> : <div className="bg-green-500/20 p-2 rounded-lg"><PhoneOutgoing className="h-4 w-4 text-green-400" /></div>}
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{activeCall?.type === 'INCOMING' ? 'Incoming Preaching' : 'Outgoing Preaching'}</span>
                    </div>
                </div>
                {isLoading ? <div className="flex flex-col items-center py-10 space-y-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Identifying...</p></div> : contact ? (
                    <div className="space-y-8">
                        <div className="flex items-center gap-5">
                            <Avatar className="h-20 w-20 border-4 border-primary/20 shadow-xl rounded-3xl"><AvatarImage src={contact.photoUrl} className="object-cover" /><AvatarFallback className="bg-muted text-primary text-xl font-black">{contact.fullName[0]}</AvatarFallback></Avatar>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5"><h3 className="text-xl font-black text-foreground truncate uppercase leading-none">{contact.fullName}</h3>{contact.verifiedByFg === 'Yes' && <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />}</div>
                                <p className="text-sm font-black text-primary/80 tracking-widest mt-1.5">{activeCall?.phoneNumber}</p>
                                <div className="mt-3"><Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-tight py-1 px-3">{contact.currentFolkStage || 'Fresh Lead'}</Badge></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 bg-muted p-5 rounded-2xl border border-border">
                            <div className="space-y-1"><p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Rating</p><StarRating value={contact.sgRating || 0} size={12} /></div>
                            <div className="space-y-1"><p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Age / Status</p><p className="text-[10px] font-bold text-foreground uppercase">{contact.age}y • {contact.relationshipStatus || 'Single'}</p></div>
                        </div>
                        {contact.lastCallRemark && (<div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 space-y-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60">Note</div>{contact.lastCallAt && <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground uppercase"><Clock className="h-2" />{formatDistanceToNow(safeDate(contact.lastCallAt)!, { addSuffix: true })}</div>}</div><p className="text-xs font-bold text-foreground/80 leading-relaxed italic line-clamp-3">"{contact.lastCallRemark}"</p></div>)}
                        <div className="pt-2 flex flex-col gap-3"><Button className="w-full h-14 rounded-2xl bg-orange-500 text-black font-black uppercase tracking-widest text-[10px] shadow-xl shadow-orange-500/20" onClick={handleQuickStartSession} disabled={isStartingSession}>{isStartingSession ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />} Initialize Interaction</Button><Button variant="outline" className="w-full h-12 rounded-2xl border-border text-muted-foreground hover:text-foreground bg-muted/50 font-black uppercase tracking-widest text-[10px]" onClick={() => { setIsOpen(false); router.push(`/contacts/profile?id=${contact.id}`); }}><ExternalLink className="mr-2 h-4 w-4" /> Open Journey</Button></div>
                    </div>
                ) : <div className="flex flex-col items-center py-10 space-y-4 text-center"><div className="bg-muted/50 p-5 rounded-full"><User className="h-10 w-10 text-muted-foreground" /></div><div className="space-y-1"><p className="text-foreground text-lg font-black uppercase tracking-tight">{activeCall?.phoneNumber}</p><p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Not in database</p></div><Button variant="outline" className="rounded-xl border-border text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>Dismiss</Button></div>}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
