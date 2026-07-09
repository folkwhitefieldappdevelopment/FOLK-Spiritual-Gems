'use client';

import * as React from 'react';
import { Capacitor } from '@capacitor/core';
import { CallLog } from '@/lib/call-log';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Camera } from '@capacitor/camera';
import { Contacts } from '@capacitor-community/contacts';
import { useAppToast } from '@/contexts/toast-context';

/**
 * Sequential Android Permission Requester.
 * Ensures high-privilege permissions are requested one-by-one to avoid system collisions.
 * Sequence: Runtime Prompts -> Overlay Settings -> Battery Exemption.
 */
export function NativePermissionRequester() {
  const { toast } = useAppToast();
  const hasRequested = React.useRef(false);

  React.useEffect(() => {
    if (!Capacitor.isNativePlatform() || hasRequested.current) return;
    
    const onboardingDone = localStorage.getItem('onboarding_permissions_completed_v17');
    if (onboardingDone) return;

    hasRequested.current = true;

    const requestAllSequentially = async () => {
      try {
        console.log('[NativePermissions] Starting sequential initialization...');

        // 1. Runtime Permissions (System Dialogs)
        // Request Call Log & Phone first
        await CallLog.requestPermissions();
        
        // Request Camera
        await Camera.requestPermissions();
        
        // Request Contacts
        await Contacts.requestPermissions();

        // Explicitly request notifications
        await LocalNotifications.requestPermissions();

        // 2. Overlay Permission (Redirection to Settings)
        await new Promise(r => setTimeout(r, 2000));
        toast({ 
          title: "Setup Step 2/3", 
          description: "Please enable 'Display over other apps' to identify contacts during calls." 
        });
        await CallLog.requestOverlayPermission();
          
        // 3. Battery Exemption (Redirection to Settings)
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

    // Delay start to ensure splash screen and UI are ready
    const timer = setTimeout(requestAllSequentially, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return null;
}