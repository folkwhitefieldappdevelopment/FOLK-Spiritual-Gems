import { useState, useEffect, useCallback } from 'react';
import { getDashboardStats } from '../services/dashboard-service';
import { useAuth } from '../contexts/auth-context';
import { useAppToast } from '../contexts/toast-context';
import { DashboardData } from '../lib/types';
import { DateRange } from 'react-day-picker';

const CACHE_KEY = 'dashboard_data_cache';
const CACHE_TIMESTAMP_KEY = 'dashboard_data_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useDashboardStats(dateRange?: DateRange, folkGuideId?: string) {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<any | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!appUser) return;

    if (!isSilent) {
      setIsRefetching(true);
    }

    try {
      const timezoneOffset = new Date().getTimezoneOffset();
      const stats = await getDashboardStats(appUser, { 
        from: dateRange?.from, 
        to: dateRange?.to, 
        timezoneOffset,
        targetFolkGuideId: folkGuideId === 'all' ? undefined : folkGuideId
      });
      
      setData(stats);
      localStorage.setItem(CACHE_KEY, JSON.stringify(stats));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      setError(null);
    } catch (e) {
      console.error("Failed to fetch dashboard data:", e);
      setError(e);
      toast({
        variant: "destructive",
        title: "Error Fetching Data",
        description: "Could not load latest dashboard analytics.",
      });
    } finally {
      setIsLoading(false);
      if (!isSilent) {
        setIsRefetching(false);
      }
    }
  }, [appUser, dateRange, folkGuideId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, isRefetching, error, refetch: fetchData };
}
