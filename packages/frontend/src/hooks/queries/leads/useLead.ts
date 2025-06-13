import { useQuery } from '@tanstack/react-query';
import type { Lead } from '@partner-portal/shared';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { leadKeys } from '../queryKeys';

interface UseLeadOptions {
  enabled?: boolean;
  onSuccess?: (data: Lead) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to fetch a single lead by ID
 * Includes error handling with user-friendly toast messages
 */
export const useLead = (id: string, options?: UseLeadOptions) => {
  const { initiative } = useAuthStore();
  const { showToast } = useUIStore();

  const query = useQuery({
    queryKey: leadKeys.detail(initiative!, id),
    queryFn: async () => {
      const response = await api.get<Lead>(`/v1/leads/${id}`);
      
      // Trigger success callback if provided
      if (options?.onSuccess) {
        options.onSuccess(response.data);
      }
      
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 or 403 errors
      if (error.message.includes('404') || error.message.includes('403')) {
        return false;
      }
      return failureCount < 3;
    },
    enabled: !!id && !!initiative && (options?.enabled ?? true),
  });

  // Handle errors in the UI layer
  if (query.error && query.fetchStatus === 'idle') {
    const error = query.error as Error;
    if (error.message.includes('404')) {
      showToast('Lead not found or you may not have access to view this lead', 'error');
    } else if (error.message.includes('Network')) {
      showToast('Connection error. Please check your internet connection.', 'error');
    } else {
      showToast(error.message || 'Failed to load lead details', 'error');
    }
    
    if (options?.onError) {
      options.onError(error);
    }
  }

  return query;
};