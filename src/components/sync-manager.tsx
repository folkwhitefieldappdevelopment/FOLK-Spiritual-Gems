'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { startBackgroundSync, stopBackgroundSync } from '@/services/sync-service';
import type { AppUser } from '@/lib/types';

export function SyncManager() {
  const { appUser } = useAuth();

  useEffect(() => {
    if (appUser) {
      startBackgroundSync(appUser as AppUser);
    }

    return () => {
      stopBackgroundSync();
    };
  }, [appUser]);

  return null; // This component does not render anything
}
