"use client";

import * as React from 'react';
import { Bell, X, ShieldCheck, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { requestNotificationPermission, getNotificationPermission, isNotificationSupported } from '@/lib/notification-service';
import { useAppToast } from '@/contexts/toast-context';

/**
 * High-performance permission requester for Android/PWA.
 * Triggers on initial app mount to ensure alarms work reliably.
 */
export function NotificationPermissionPrompt() {
  const [showPrompt, setShowPrompt] = React.useState(false);
  const { toast } = useAppToast();

  React.useEffect(() => {
    if (!isNotificationSupported()) return;
    
    const checkPermission = () => {
      const permission = getNotificationPermission();
      const dismissedAt = localStorage.getItem('notification_prompt_dismissed');
      
      // If permission is default (not asked yet) and not dismissed recently
      if (permission === 'default' && !dismissedAt) {
        setShowPrompt(true);
      }
    };

    const timeout = setTimeout(checkPermission, 3000); 
    return () => clearTimeout(timeout);
  }, []);

  const handleRequest = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setShowPrompt(false);
      toast({ title: "Notifications Active", description: "Alarms are now synchronized." });
    } else {
      toast({ 
        variant: 'destructive', 
        title: "Permission Denied", 
        description: "Please manually enable notifications in your phone's App Settings for alarms to work."
      });
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notification_prompt_dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-x-4 bottom-6 z-[200] animate-in slide-in-from-bottom-full duration-500 max-w-sm mx-auto">
      <Card className="shadow-2xl border-none bg-[#1e1e2e] rounded-[2rem] overflow-hidden">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4">
              <div className="bg-primary/20 p-4 rounded-2xl border border-primary/30 shadow-inner">
                <Bell className="h-8 w-8 text-primary animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Activate Alarms</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Native Sync Required</p>
              </div>
          </div>
          
          <p className="text-xs text-slate-300 font-medium leading-relaxed bg-[#161623] p-4 rounded-2xl border border-white/5">
            To ensure your <span className="text-[#FF9800] font-black uppercase">Follow-up Alarms</span> ring on time, please allow notifications.
          </p>

          <div className="flex items-center gap-3">
              <Button variant="ghost" className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white" onClick={handleDismiss}>Later</Button>
              <Button className="flex-2 h-12 px-8 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20" onClick={handleRequest}>
                Enable Now
              </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}