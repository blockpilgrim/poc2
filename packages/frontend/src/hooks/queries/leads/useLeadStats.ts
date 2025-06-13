import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { leadKeys } from '../queryKeys';

interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  recentActivity: {
    created: number;
    updated: number;
    converted: number;
  };
}

interface UseLeadStatsOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch lead statistics
 * Useful for dashboard widgets and summary views
 */
export const useLeadStats = (options?: UseLeadStatsOptions) => {
  const { initiative } = useAuthStore();
  const { showToast } = useUIStore();

  const query = useQuery({
    queryKey: leadKeys.stats(initiative!),
    queryFn: async () => {
      const response = await api.get<LeadStats>('/v1/leads/stats');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    retry: 1, // Only retry once for stats
    enabled: !!initiative && (options?.enabled ?? true),
  });

  // Handle errors silently for stats (non-critical feature)
  if (query.error && query.fetchStatus === 'idle') {
    const error = query.error as Error;
    console.error('Failed to load lead statistics:', error);
    
    // Only show toast for network errors
    if (error.message.includes('Network')) {
      showToast('Unable to load statistics. Some dashboard data may be unavailable.', 'warning');
    }
  }

  return query;
};