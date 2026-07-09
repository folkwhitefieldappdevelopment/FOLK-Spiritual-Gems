'use client';

import * as React from 'react';
import { db } from '@/lib/firebase';
import { onSnapshotsInSync } from 'firebase/firestore';

type ConnectivityContextType = {
  isOnline: boolean;
  isSyncing: boolean;
};

const ConnectivityContext = React.createContext<ConnectivityContextType>({
  isOnline: true,
  isSyncing: false,
});

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Listen to Firestore sync state
    const unsubscribe = onSnapshotsInSync(db, () => {
      setIsSyncing(false);
    });

    // We assume syncing when a write occurs
    const handleWrite = () => setIsSyncing(true);
    window.addEventListener('firestore-write', handleWrite);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('firestore-write', handleWrite);
      unsubscribe();
    };
  }, []);

  return (
    <ConnectivityContext.Provider value={{ isOnline, isSyncing }}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export const useConnectivity = () => React.useContext(ConnectivityContext);
