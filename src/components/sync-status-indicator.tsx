'use client';

import * as React from 'react';
import { useConnectivity } from '@/contexts/connectivity-context';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SyncStatusIndicator() {
  const { isOnline, isSyncing } = useConnectivity();
  const [showStatus, setShowStatus] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState('');

  React.useEffect(() => {
    if (!isOnline) {
      setStatusMessage('Working Offline');
      setShowStatus(true);
    } else if (isSyncing) {
      setStatusMessage('Syncing with Server...');
      setShowStatus(true);
    } else {
      // Briefly show success then hide
      setStatusMessage('Synced');
      const timer = setTimeout(() => setShowStatus(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSyncing]);

  if (!showStatus && isOnline) return null;

  return (
    <div className={cn(
      "fixed top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 transition-all duration-500 animate-in slide-in-from-top-4",
      !isOnline ? "bg-destructive text-white" : isSyncing ? "bg-primary text-white" : "bg-green-600 text-white"
    )}>
      {!isOnline ? (
        <WifiOff className="h-3.5 w-3.5" />
      ) : isSyncing ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      <span className="text-[10px] font-black uppercase tracking-widest">
        {statusMessage}
      </span>
    </div>
  );
}
