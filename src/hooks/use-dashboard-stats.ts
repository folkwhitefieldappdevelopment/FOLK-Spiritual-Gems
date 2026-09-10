import { useState, useEffect, useCallback, useRef } from 'react';
import { getDashboardStats, getFastSummaryStats } from '../services/dashboard-service';
import { useAuth } from '../contexts/auth-context';
import { useAppToast } from '../contexts/toast-context';
import { DashboardData, type Person, type CallingReport, type Goal, type AppUser } from '../lib/types';
import { DateRange } from 'react-day-picker';
import { 
    subscribeToSyncStatus, 
    type SyncStatus,
    initMasterPeopleStream
} from '../services/people-service';

export type DashboardViewData = DashboardData & { 
    goals?: Goal[], 
    enablers?: AppUser[], 
    categories?: string[], 
    hiddenColumns?: string[], 
    columnOrder?: string[] 
};

export function useDashboardStats(dateRange?: DateRange, folkGuideId?: string, selectedSection?: string | null) {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  
  const [data, setData] = useState<DashboardViewData | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('initializing');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);

  const dateRangeRef = useRef(dateRange);
  const folkGuideIdRef = useRef(folkGuideId);
  const fastStatsRef = useRef<{ totalContactsCount: number } | null>(null);

  useEffect(() => {
    dateRangeRef.current = dateRange;
    folkGuideIdRef.current = folkGuideId;
  }, [dateRange, folkGuideId]);

  /**
   * Performs an on-demand recompute for a specific section or all data.
   */
  const recomputeStats = useCallback(async (sections: string[] = ['all']) => {
    if (!appUser) return;
    setIsRefetching(true);
    try {
      const stats = await getDashboardStats(appUser, { 
        from: dateRangeRef.current?.from, 
        to: dateRangeRef.current?.to, 
        timezoneOffset: new Date().getTimezoneOffset(),
        targetFolkGuideId: folkGuideIdRef.current === 'all' ? undefined : folkGuideIdRef.current,
        trustedTotalCounts: fastStatsRef.current ?? undefined,
        sections
      });
      setData(prev => ({ ...prev, ...stats }));
    } catch (e) {
      console.error("Recompute failed", e);
    } finally {
      setIsRefetching(false);
      setIsLoading(false);
    }
  }, [appUser]);

  // Sections that actually need the full people cache to compute their stats.
  // Keep this in sync with the `loadStats` / `loadGoals` logic in getDashboardStats.
  const PEOPLE_DEPENDENT_SECTIONS = ['all', 'enabler-breakdown', 'calling-report', 'leaderboard', 'goal-alerts', 'team-goals'];

  // Initial Fast Summary Load
  // Only the cheap, count-based summary loads eagerly here. The full
  // org-wide people sync (initMasterPeopleStream) is deferred to the
  // "Lazy Section Loading" effect below, and only runs if the section
  // actually in view needs it — not on every dashboard mount.
  useEffect(() => {
    if (!appUser) return;

    const refreshFastStats = async () => {
        try {
            const counts = await getFastSummaryStats(appUser);
            fastStatsRef.current = counts;
            setData(prev => ({
                ...prev,
                stats: { ...(prev?.stats || {}), totalContactsCount: counts.totalContactsCount }
            } as any));
            setIsLoading(false);
        } catch (e) { console.warn(e); }
    };

    refreshFastStats();

    const unsubStatus = subscribeToSyncStatus((status) => {
        setSyncStatus(status);
        if (status === 'synced') refreshFastStats();
    });

    return () => unsubStatus();
  }, [appUser]);

  // Lazy Section Loading
  useEffect(() => {
    if (!appUser || !selectedSection) return;

    if (PEOPLE_DEPENDENT_SECTIONS.includes(selectedSection)) {
      // Warm the master cache only now that a section needing it is in view.
      // Subsequent selections reuse the cache (see initMasterPeopleStream's
      // internal cachePromise/staleness guard), so this is cheap after the first call.
      initMasterPeopleStream(appUser);
    }

    recomputeStats([selectedSection]);
  }, [appUser, selectedSection, dateRange?.from?.getTime(), dateRange?.to?.getTime(), folkGuideId, recomputeStats]);

  return { 
    data, 
    syncStatus,
    isLoading, 
    isRefetching, 
    recomputeStats 
  };
}
