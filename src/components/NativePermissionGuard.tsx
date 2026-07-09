'use client';

import * as React from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Contacts } from '@capacitor-community/contacts';
import { LocalNotifications } from '@capacitor/local-notifications';
import { CallLog } from '@/lib/call-log';
import { 
  ShieldCheck, 
  PhoneCall, 
  Camera as CameraIcon, 
  Users, 
  Bell, 
  Zap, 
  Layers,
  ArrowRight,
  Info,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppToast } from '@/contexts/toast-context';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * NativePermissionGuard - Optimized sequential onboarding for Android.
 * Fixed activation for Overlay and Battery optimization settings.
 */
export function NativePermissionGuard() {
  const { toast } = useAppToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [errorCount, setErrorCount] = React.useState(0);

  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    const onboardingDone = localStorage.getItem('onboarding_permissions_completed_v9');
    if (!onboardingDone) {
        setIsOpen(true);
    }
  }, []);

  const steps = [
    {
      id: 'welcome',
      icon: ShieldCheck,
      title: 'Mission Ready?',
      description: "Welcome to SG CRM. To help you manage the preaching mission, we need to activate native phone features for call tracking and follow-ups.",
      color: 'text-primary'
    },
    {
        id: 'call_logs',
        icon: PhoneCall,
        title: 'Call Sync',
        description: "Allow the app to read call logs to automatically record interactions with your contacts.",
        color: 'text-blue-400'
    },
    {
        id: 'overlay',
        icon: Layers,
        title: 'Caller Info',
        description: "Enable 'Draw Over Other Apps'. Tapping 'Enable Now' will open your phone settings. Find SG CRM and toggle the switch.",
        color: 'text-[#FF9800]'
    },
    {
        id: 'media',
        icon: CameraIcon,
        title: 'Photos',
        description: "Access to Camera and Gallery is required for capturing profile photos of new members.",
        color: 'text-green-400'
    },
    {
        id: 'contacts',
        icon: Users,
        title: 'Phonebook',
        description: "Access your device contacts to identify incoming calls accurately within the team database.",
        color: 'text-pink-400'
    },
    {
        id: 'notifications',
        icon: Bell,
        title: 'Follow-ups',
        description: "Enable notifications so your spiritual follow-up alarms trigger reliably at the right time.",
        color: 'text-yellow-400'
    },
    {
        id: 'background',
        icon: Zap,
        title: 'Always On',
        description: "Tapping 'Enable Now' will open battery settings. Select 'Allow' or 'Ignore Optimizations' to ensure your outreach data stays synced.",
        color: 'text-purple-400'
    }
  ];

  const handleNext = async () => {
    if (currentStep === 0) {
      setCurrentStep(1);
      return;
    }

    setIsProcessing(true);
    try {
        const step = steps[currentStep];
        
        switch (step.id) {
            case 'call_logs':
                if (CallLog.requestPermissions) await CallLog.requestPermissions();
                break;
            case 'overlay':
                if (CallLog.requestOverlayPermission) {
                    await CallLog.requestOverlayPermission();
                    toast({ title: "Opening Settings", description: "Enable 'Draw Over Other Apps' for SG CRM." });
                }
                break;
            case 'media':
                await Camera.requestPermissions();
                break;
            case 'contacts':
                await Contacts.requestPermissions();
                break;
            case 'notifications':
                await LocalNotifications.requestPermissions();
                break;
            case 'background':
                if (CallLog.requestBatteryExemption) {
                    await CallLog.requestBatteryExemption();
                    toast({ title: "Opening Settings", description: "Set Battery to 'Unrestricted' or 'Ignore Optimizations'." });
                }
                break;
        }

        // Move to next step regardless of outcome to allow user to proceed
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
            setErrorCount(0);
        } else {
            localStorage.setItem('onboarding_permissions_completed_v9', 'true');
            setIsOpen(false);
            toast({ title: "Setup Complete!", description: "All mission modules initialized." });
        }
    } catch (e) {
        console.warn("Step Error", e);
        setErrorCount(prev => prev + 1);
        if (errorCount > 0) {
            // If they fail twice, just move on
            if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
            else setIsOpen(false);
        }
    } finally {
        setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const active = steps[currentStep];
  const Icon = active.icon;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="fixed inset-x-4 bottom-10 sm:top-1/2 sm:-translate-y-1/2 left-1/2 sm:-translate-x-1/2 max-w-md w-[92vw] sm:w-full p-0 bg-[#11121d] border-none shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col z-[1000] gap-0 animate-in slide-in-from-bottom duration-500 max-h-[85vh]">
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center justify-center p-8 pb-10 space-y-6 text-center">
              
              <div className="relative shrink-0 mt-4">
                  <div className={cn("absolute inset-0 rounded-full blur-3xl opacity-20 animate-pulse", active.color.replace('text-', 'bg-'))} />
                  <div className="relative bg-[#1e1e2e] p-6 rounded-[1.5rem] border border-white/5 shadow-2xl">
                      <Icon className={cn("h-10 w-10 sm:h-12 sm:w-12", active.color)} />
                  </div>
              </div>

              <div className="space-y-3">
                  <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500">
                          INITIALIZATION: STEP {currentStep} / {steps.length - 1}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter leading-none">
                          {active.title}
                      </h2>
                  </div>
                  <p className="text-[11px] sm:text-xs font-bold text-slate-400 leading-relaxed px-4">
                      {active.description}
                  </p>
                  {errorCount > 0 && (
                      <div className="flex items-center justify-center gap-2 text-amber-500 bg-amber-500/10 p-2 rounded-lg mx-4">
                          <AlertTriangle className="h-3 w-3" />
                          <p className="text-[9px] font-black uppercase">Setting not opening? Try again or move to next.</p>
                      </div>
                  )}
              </div>
          </div>
        </ScrollArea>

        <div className="p-6 bg-[#1e1e2e] border-t border-white/5 space-y-4 shrink-0 pb-10 sm:pb-6">
            <Button 
                onClick={handleNext} 
                disabled={isProcessing}
                className="w-full h-14 rounded-[1.2rem] bg-primary text-white font-black text-base uppercase tracking-tight shadow-2xl shadow-primary/20 transition-all active:scale-95"
            >
                {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : currentStep === 0 ? (
                    'START INITIALIZATION'
                ) : (
                    <>ENABLE NOW <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
            </Button>
            
            <div className="flex items-center justify-center gap-2 opacity-20">
                <Info className="h-3 w-3" />
                <p className="text-[8px] text-center font-bold uppercase tracking-widest">
                    Safe & Encrypted Environment
                </p>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}