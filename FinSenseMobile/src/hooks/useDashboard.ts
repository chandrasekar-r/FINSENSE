import { useState, useEffect, useCallback } from 'react';
import { dashboardService, DashboardData } from '../services/dashboardService';

export const useDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const dashboardData = await dashboardService.getDashboardData();
      setData(dashboardData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard hook error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  const retry = useCallback(() => {
    loadData(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh,
    retry,
  };
};