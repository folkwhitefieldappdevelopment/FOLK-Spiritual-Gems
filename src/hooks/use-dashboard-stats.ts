import { useState, useEffect, useCallback, useRef } from 'react';
import { getDashboardStats, getFastSummaryStats } from '../services/dashboard-service';
import { useAuth } from '../contexts/auth-context';
import { useAppToast } from '../contexts/toast-context';
import { DashboardData, type Person, type CallingReport } from '../lib/types';
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
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<any | null>(null);

  const dateRangeRef = useRef(dateRange);
  const folkGuideIdRef = useRef(folkGuideId);
  const fastStatsRef = useRef<{ totalContactsCount: number } | null>(null);
  const hasMountedRef = useRef(false);

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
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    let cancelled = false;
    setIsRefetching(true);
    recomputeStats([]).finally(() => {
      if (!cancelled) setIsRefetching(false);
    });
    return () => { cancelled = true; };
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime(), folkGuideId, appUser, recomputeStats]);

  useEffect(() => {
    if (!appUser) return;

    const refreshFastStats = async () => {
        if (document.visibilityState === 'hidden') return;
        
        try {
            const counts = await getFastSummaryStats(appUser);
            fastStatsRef.current = counts;
            
            setData(prev => {
                if (prev) {
                    return {
                        ...prev,
                        stats: {
                            ...prev.stats,
                            totalContactsCount: counts.totalContactsCount
                        }
                    };
                }
                
                const emptyReport: CallingReport = {
                    totalCalls: 0, picked: 0, notPicked: 0, eliminated: 0, totalDuration: 0,
                    percentages: { picked: 0, notPicked: 0, eliminated: 0 },
                    daily: {}, byEnabler: {}, subCategories: {}, detailedBreakdown: {}
                };

                return {
                    stats: {
                        myContactsCount: 0, 
                        totalContactsCount: counts.totalContactsCount,
                        myNewInRange: 0,
                        allNewInRange: 0,
                        byEnabler: {},
                        byYear: {},
                        byChantingCategory: {},
                        enablerBreakdown: [],
                        chantingBreakdown: []
                    },
                    callingReportAll: emptyReport,
                    callingReportMy: emptyReport,
                    teamCallingReports: {}, // Added to prevent undefined access errors in UI
                    leaderboard: [],
                    isPrivileged: appUser.role.includes('Admin') || appUser.role.includes('Folk Guide'),
                };
            });
            setIsLoading(false);
        } catch (e) {
            console.warn("[Dashboard] Fast summary refresh failed", e);
        }
    };

    refreshFastStats();

    const unsubStatus = subscribeToSyncStatus((status, warning) => {
        setSyncStatus(status);
        setSyncWarning(warning);
        if (status === 'synced') refreshFastStats();
    });

    const unsubData = subscribeToPeopleData(recomputeStats);

    initMasterPeopleStream(appUser);

    const interval = setInterval(refreshFastStats, 90000); 

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshFastStats();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubStatus();
      unsubData();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [appUser, recomputeStats]);

  const refetch = useCallback(async () => {
      if (!appUser) return;
      setIsRefetching(true);
      
      // For admins, re-run the paginated master fetch manually since it's not live
      if (appUser.role.includes('Admin')) {
          await initMasterPeopleStream(appUser, true);
      }
      
      await recomputeStats([]); 
      setIsRefetching(false);
  }, [appUser, recomputeStats]);

  return { 
    data, 
    syncStatus,
    syncWarning,
    isLoading, 
    isRefetching, 
    error, 
    refetch 
  };
}