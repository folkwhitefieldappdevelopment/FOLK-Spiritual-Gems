'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getPeopleForReminders, updatePerson } from '@/services/people-service';
import { cancelAlarm } from '@/lib/notification-service';
import type { Person } from '@/lib/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, Bell, X, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppToast } from '@/contexts/toast-context';

/**
 * ReminderManager - Handles background follow-up monitoring and alarm UI.
 * Audio is initialized safely within useEffect using window.Audio to prevent "Illegal constructor" errors.
 */
export function ReminderManager() {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  const [activeAlarm, setActiveAlarm] = React.useState<Person | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const processedReminders = React.useRef<Set<string>>(new Set());
  const isAlarmActiveRef = React.useRef<boolean>(false);

  // Initialize browser-only Audio once on mount after hydration
  React.useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current && typeof window.Audio !== 'undefined') {
      try {
        const audioObj = new window.Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioObj.loop = true;
        audioRef.current = audioObj;
      } catch (e) {
        console.warn("Audio initialization failed", e);
      }
    }
  }, []);

  // Handle global event listeners for the test alarm
  React.useEffect(() => {
    const handleTestAlarm = () => {
      if (isAlarmActiveRef.current) return;

      const testPerson = {
        id: 'test',
        fullName: 'Rahul Sharma (Test)',
        phone: '9876543210',
        photoUrl: 'https://picsum.photos/seed/rahul/200/200',
        age: 22,
        lastCallRemark: 'Test Follow-up Notification Triggered.',
      } as any;
      
      isAlarmActiveRef.current = true;
      setActiveAlarm(testPerson);
      if (audioRef.current) {
        audioRef.current.play().catch((err) => console.warn("Audio play blocked", err));
      }
    };

    window.addEventListener('trigger-test-alarm', handleTestAlarm);
    return () => {
      window.removeEventListener('trigger-test-alarm', handleTestAlarm);
    };
  }, []);

  const stopAlarm = React.useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    isAlarmActiveRef.current = false;
    setActiveAlarm(null);
  }, []);

  const handleCall = (person: Person) => {
    window.location.href = `tel:${person.phone}`;
    handleDismiss(person);
  };

  const handleSnooze = async (person: Person) => {
    if (person.id === 'test') { stopAlarm(); return; }
    if (!appUser) return;
    const snoozeTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    try {
      await updatePerson(person.id, { nextFollowUpAt: snoozeTime }, { id: appUser.id, name: appUser.name, role: appUser.role });
      toast({ title: "Snoozed for 10m" });
      stopAlarm();
    } catch (e) {
      toast({ variant: 'destructive', title: "Error snoozing alarm" });
    }
  };

  const handleDismiss = async (person: Person) => {
    if (person.id === 'test') { stopAlarm(); return; }
    if (!appUser) return;
    try {
      await cancelAlarm(person.id);
      await updatePerson(person.id, { nextFollowUpAt: '', reminderSetName: '' }, { id: appUser.id, name: appUser.name, role: appUser.role });
      stopAlarm();
    } catch (e) {
      toast({ variant: 'destructive', title: "Error dismiss alarm" });
    }
  };

  const checkReminders = React.useCallback(async () => {
    if (!appUser || isAlarmActiveRef.current) return;
    try {
      const people = await getPeopleForReminders({ id: appUser.id, name: appUser.name, role: appUser.role });
      const now = new Date();
      
      for (const person of people) {
        if (!person.nextFollowUpAt) continue;
        const reminderTime = new Date(person.nextFollowUpAt);
        const reminderId = `${person.id}-${person.nextFollowUpAt}`;
        
        if (reminderTime <= now && !processedReminders.current.has(reminderId)) {
          const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
          if (reminderTime >= thirtyMinsAgo) {
            isAlarmActiveRef.current = true;
            setActiveAlarm(person);
            if (audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
            processedReminders.current.add(reminderId);
            break; 
          }
        }
      }
    } catch (error) { 
      console.error("Reminder check error", error); 
    }
  }, [appUser]);

  React.useEffect(() => {
    if (!appUser) return;
    const interval = setInterval(checkReminders, 30000);
    checkReminders();
    return () => clearInterval(interval);
  }, [appUser, checkReminders]);

  if (!activeAlarm) return null;

  return (
    <Dialog open={!!activeAlarm} onOpenChange={(open) => !open && stopAlarm()}>
      <DialogContent className="max-w-none w-screen h-screen border-none rounded-none p-0 bg-background/95 backdrop-blur-2xl z-[9999] overflow-hidden">
        <div className="h-full flex flex-col items-center justify-center p-8 space-y-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-20" />
                <div className="relative bg-primary p-6 rounded-full shadow-2xl border-4 border-primary/20">
                  <Bell className="h-10 w-10 text-white animate-bounce" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">FOLLOW-UP DUE</h2>
                <p className="text-[10px] text-primary font-black uppercase tracking-[0.4em]">Active outreach task</p>
              </div>
            </div>

            <div className="w-full max-w-sm bg-[#1e1e2e] border border-white/5 rounded-[3rem] shadow-2xl p-10 space-y-8 relative overflow-hidden">
              <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                <Avatar className="h-32 w-32 border-4 border-primary/30 shadow-2xl rounded-[2.5rem]">
                  <AvatarImage src={activeAlarm.photoUrl} alt={activeAlarm.fullName} />
                  <AvatarFallback className="text-3xl font-black bg-[#161623] text-primary">{activeAlarm.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1.5">
                  <h3 className="text-3xl font-black text-white tracking-tight leading-none uppercase truncate max-w-[280px]">
                    {activeAlarm.fullName}
                  </h3>
                  <p className="text-base font-black text-primary/80 tracking-widest">{activeAlarm.phone}</p>
                </div>
              </div>
              {activeAlarm.lastCallRemark && (
                <div className="bg-[#161623] p-6 rounded-3xl border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    <MessageSquare className="h-3 w-3" /> Latest Context
                  </div>
                  <p className="text-xs text-slate-300 font-bold leading-relaxed italic">"{activeAlarm.lastCallRemark}"</p>
                </div>
              )}
            </div>

            <div className="w-full max-w-sm grid grid-cols-1 gap-4">
              <Button className="w-full h-20 text-xl font-black rounded-3xl shadow-2xl shadow-primary/30 uppercase tracking-tight bg-primary text-white" onClick={() => handleCall(activeAlarm)}>
                <Phone className="mr-4 h-8 w-8" /> MAKE THE CALL
              </Button>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-16 text-[10px] font-black uppercase tracking-widest border-white/10 text-white bg-white/5 rounded-2xl" onClick={() => handleSnooze(activeAlarm)}>Snooze 10m</Button>
                <Button variant="ghost" className="h-16 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 rounded-2xl" onClick={() => handleDismiss(activeAlarm)}><X className="mr-2 h-4 w-4" /> Dismiss</Button>
              </div>
            </div>
            <p className="text-[10px] font-black text-primary/30 uppercase tracking-[0.6em]">FOLK SPIRITUAL GEMS</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}