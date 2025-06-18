import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Lead } from '@partner-portal/shared';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { leadKeys } from '../queryKeys';

type CreateLeadPayload = Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>;

interface UseCreateLeadOptions {
  onSuccess?: (data: Lead) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to create a new lead
 * Automatically invalidates lead lists on success
 */
export const useCreateLead = (options?: UseCreateLeadOptions) => {
  const queryClient = useQueryClient();
  const { initiative } = useAuthStore();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (data: CreateLeadPayload) => {
      const response = await api.post<Lead>('/v1/leads', data);
      return response.data;
    },
    onError: (error: Error) => {
      // Show error message
      if (error.message.includes('400')) {
        showToast('Invalid lead data. Please check your input and try again.', 'error');
      } else if (error.message.includes('403')) {
        showToast('You do not have permission to create leads', 'error');
      } else if (error.message.includes('Network')) {
        showToast('Connection error. The lead was not created.', 'error');
      } else {
        showToast(error.message || 'Failed to create lead', 'error');
      }

      options?.onError?.(error);
    },
    onSuccess: (data) => {
      if (!initiative) return;
      
      // Invalidate and refetch lead lists
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      
      // Optionally prefetch the new lead detail
      queryClient.setQueryData(leadKeys.detail(initiative, data.id), data);
      
      showToast('Lead created successfully', 'success');
      options?.onSuccess?.(data);
    },
  });
};