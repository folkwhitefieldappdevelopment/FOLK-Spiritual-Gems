import { useState, useEffect, useCallback, useRef } from 'react';
import { getDashboardStats, getFastSummaryStats } from '../services/dashboard-service';
import { useAuth } from '../contexts/auth-context';
import { useAppToast } from '../contexts/toast-context';
import { DashboardData, type Person } from '../lib/types';
import { DateRange } from 'react-day-picker';
import { 
    subscribeToPeopleData, 
    subscribeToSyncStatus, 
    type SyncStatus,
    initMasterPeopleStream
} from '../services/people-service';

export function useDashboardStats(dateRange?: DateRange, folkGuideId?: string) {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('initializing');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<any | null>(null);

  // Use refs to prevent stale closure data in the reactive sync
  const dateRangeRef = useRef(dateRange);
  const folkGuideIdRef = useRef(folkGuideId);
  // Store accurate server counts to prevent regression from local cache snapshots
  const fastStatsRef = useRef<{ totalContactsCount: number; myContactsCount: number } | null>(null);

  useEffect(() => {
    dateRangeRef.current = dateRange;
    folkGuideIdRef.current = folkGuideId;
  }, [dateRange, folkGuideId]);

  const recomputeStats = useCallback(async (people: Person[]) => {
    if (!appUser) return;
    
    try {
      const stats = await getDashboardStats(appUser, { 
        from: dateRangeRef.current?.from, 
        to: dateRangeRef.current?.to, 
        timezoneOffset: new Date().getTimezoneOffset(),
        targetFolkGuideId: folkGuideIdRef.current === 'all' ? undefined : folkGuideIdRef.current,
        trustedTotalCounts: fastStatsRef.current ?? undefined
      });
      setData(stats);
      setIsLoading(false);
    } catch (e) {
      console.error("Recompute failed", e);
    }
  }, [appUser]);

  useEffect(() => {
    if (!appUser) return;

    const refreshFastStats = async () => {
        try {
            const fastStats = await getFastSummaryStats(appUser);
            fastStatsRef.current = fastStats;
            
            // Merge into current data if it exists to show immediately
            setData(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    stats: {
                        ...prev.stats,
                        totalContactsCount: fastStats.totalContactsCount,
                        myContactsCount: fastStats.myContactsCount
                    }
                };
            });
        } catch (e) {
            console.warn("[Dashboard] Fast summary refresh failed", e);
        }
    };

    // 1. Initial fast path
    refreshFastStats();

    // 2. Subscribe to sync status to show progress indicator
    const unsubStatus = subscribeToSyncStatus((status) => {
        setSyncStatus(status);
        // Refresh accurate server counts when hitting live sync to ensure ref is fresh
        if (status === 'synced') {
            refreshFastStats();
        }
    });

    // 3. Subscribe to people data. This triggers every time Firestore delivers more items
    const unsubData = subscribeToPeopleData(recomputeStats);

    // Ensure the stream is running
    initMasterPeopleStream();

    // Background heartbeat for counts
    const interval = setInterval(refreshFastStats, 30000);

    return () => {
      unsubStatus();
      unsubData();
      clearInterval(interval);
    };
  }, [appUser, recomputeStats]);

  const refetch = useCallback(async () => {
      if (!appUser) return;
      setIsRefetching(true);
      await recomputeStats([]); // Forces a clear if needed
      initMasterPeopleStream();
      setIsRefetching(false);
  }, [appUser, recomputeStats]);

  return { 
    data, 
    syncStatus,
    isLoading, 
    isRefetching, 
    error, 
    refetch 
  };
}