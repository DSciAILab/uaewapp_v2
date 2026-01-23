import useSWR, { mutate } from 'swr';
import { getDashboardData } from '@/lib/services/dashboard-service';
import { useEffect } from 'react';
import { useRealtime } from '@/lib/realtime/use-realtime';

export function useDashboard(eventId: string) {
  const { data, error, isLoading, mutate: refresh } = useSWR(
    eventId ? `dashboard-${eventId}` : null,
    () => getDashboardData(eventId),
    {
      revalidateOnFocus: false, // Don't reload every time user switches tab
      dedupingInterval: 10000, // Consider data fresh for 10 seconds
    }
  );

  // Integrate with Realtime
  useRealtime({
    eventId,
    onUpdate: () => {
      // When a change happens in Supabase, invalidate the cache
      mutate(`dashboard-${eventId}`);
    }
  });

  return {
    dashboardData: data,
    loading: isLoading,
    error,
    refresh
  };
}
