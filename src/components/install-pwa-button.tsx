'use client';

import * as React from 'react';
import { Download, Smartphone, Monitor, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function InstallPwaButton() {
  const [installPrompt, setInstallPrompt] = React.useState<any>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      toast({
        title: "App Installed!",
        description: "FOLK Gems is now available on your home screen.",
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      toast({
        title: "Installation Note",
        description: "To install, tap your browser's menu (⋮ or  शेअर) and select 'Add to Home Screen'.",
      });
      return;
    }

    // Show the install prompt
    installPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl border border-green-200">
        <CheckCircle2 className="h-4 w-4" />
        Installed on Device
      </div>
    );
  }

  return (
    <Button 
      onClick={handleInstallClick}
      className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-primary shadow-xl shadow-primary/20 group"
    >
      <Smartphone className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
      Install App Now
    </Button>
  );
}
