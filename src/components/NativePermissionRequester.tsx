'use client';

import * as React from 'react';
import { Capacitor } from '@capacitor/core';
import { CallLog } from '@/lib/call-log';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Camera } from '@capacitor/camera';
import { Contacts } from '@capacitor-community/contacts';
import { useAppToast } from '@/contexts/toast-context';
import { Button } from './ui/button';

/**
 * Sequential Android Permission Requester.
 * Ensures high-privilege permissions are requested one-by-one to avoid system collisions.
 */
export function NativePermissionRequester() {
  const { toast } = useAppToast();
  const hasRequested = React.useRef(false);

  // A3. Re-verify critical overlay permission on app resume
  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const checkOverlayStatus = async () => {
        const perms = await CallLog.checkPermissions();
        if (perms.overlay !== 'granted') {
            toast({
                title: "Caller ID Disabled",
                description: "Permission to 'Draw over other apps' is required for ID tracking.",
                action: (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 font-black uppercase text-[10px] rounded-lg"
                        onClick={() => CallLog.requestOverlayPermission()}
                    >
                        Enable
                    </Button>
                )
            });
        }
    };

    const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            checkOverlayStatus();
        }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [toast]);

  React.useEffect(() => {
    if (!Capacitor.isNativePlatform() || hasRequested.current) return;
    
    const onboardingDone = localStorage.getItem('onboarding_permissions_completed_v17');
    if (onboardingDone) return;

    hasRequested.current = true;

    const requestAllSequentially = async () => {
      try {
        console.log('[NativePermissions] Starting sequential initialization...');

        // 1. Runtime System Dialogs
        await CallLog.requestPermissions();
        await Camera.requestPermissions();
        await Contacts.requestPermissions();
        await LocalNotifications.requestPermissions();

        // 2. Overlay Setting (Redirection)
        await new Promise(r => setTimeout(r, 2000));
        toast({ 
          title: "Setup Step 2/3", 
          description: "Please enable 'Display over other apps' to identify contacts during calls." 
        });
        await CallLog.requestOverlayPermission();
          
        // 3. Battery Exemption (Redirection)
        await new Promise(r => setTimeout(r, 8000));
        toast({ 
          title: "Final Step 3/3", 
          description: "Disable battery optimization to ensure follow-up reminders trigger reliably." 
        });
        await CallLog.requestBatteryExemption();

        localStorage.setItem('onboarding_permissions_completed_v17', 'true');
        console.log('[NativePermissions] Setup sequence completed.');
      } catch (e) {
        console.warn("[NativePermissions] Initialization interrupted:", e);
      }
    };

    const timer = setTimeout(requestAllSequentially, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return null;
}
