'use client';

import * as React from 'react';
import { db } from '@/lib/firebase';
import { onSnapshotsInSync } from 'firebase/firestore';

type ConnectivityContextType = {
  isOnline: boolean;
  isSyncing: boolean;
  isSlow: boolean;
  reportRequestStart: () => void;
  reportRequestEnd: () => void;
};

const ConnectivityContext = React.createContext<ConnectivityContextType>({
  isOnline: true,
  isSyncing: false,
  isSlow: false,
  reportRequestStart: () => {},
  reportRequestEnd: () => {},
});

/**
 * Global signal handlers for services to report request activity.
 * Dispatches custom events that the Provider listens to.
 */
export const connectionManager = {
  reportRequestStart: () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sg-request-start'));
    }
  },
  reportRequestEnd: () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sg-request-end'));
    }
  }
};

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isSlow, setIsSlow] = React.useState(false);
  
  const activeRequests = React.useRef(0);
  const slowTimer = React.useRef<NodeJS.Timeout | null>(null);

  const reportRequestStart = React.useCallback(() => {
    activeRequests.current++;
    // If we're not already in a slow state, start a timer
    if (!slowTimer.current) {
      slowTimer.current = setTimeout(() => {
        if (activeRequests.current > 0) {
          setIsSlow(true);
        }
      }, 4000); // 4 seconds threshold for "slow"
    }
  }, []);

  const reportRequestEnd = React.useCallback(() => {
    activeRequests.current = Math.max(0, activeRequests.current - 1);
    if (activeRequests.current === 0) {
      setIsSlow(false);
      if (slowTimer.current) {
        clearTimeout(slowTimer.current);
        slowTimer.current = null;
      }
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Listen to manual signal reports from services
    const startHandler = () => reportRequestStart();
    const endHandler = () => reportRequestEnd();
    window.addEventListener('sg-request-start', startHandler);
    window.addEventListener('sg-request-end', endHandler);

    // Listen to Firestore sync state
    const unsubscribe = onSnapshotsInSync(db!, () => {
      setIsSyncing(false);
    });

    // We assume syncing when a write occurs
    const handleWrite = () => setIsSyncing(true);
    window.addEventListener('firestore-write', handleWrite);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('sg-request-start', startHandler);
      window.removeEventListener('sg-request-end', endHandler);
      window.removeEventListener('firestore-write', handleWrite);
      unsubscribe();
    };
  }, [reportRequestStart, reportRequestEnd]);

  return (
    <ConnectivityContext.Provider value={{ 
      isOnline, 
      isSyncing, 
      isSlow,
      reportRequestStart,
      reportRequestEnd
    }}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export const useConnectivity = () => React.useContext(ConnectivityContext);
