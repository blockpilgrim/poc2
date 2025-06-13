import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Lead } from '@partner-portal/shared';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { leadKeys } from '../queryKeys';

interface UpdateLeadPayload {
  id: string;
  data: Partial<Lead>;
}

interface UseUpdateLeadOptions {
  onSuccess?: (data: Lead) => void;
  onError?: (error: Error) => void;
  optimistic?: boolean;
}

/**
 * Hook to update a lead
 * Supports optimistic updates and automatic cache invalidation
 */
export const useUpdateLead = (options?: UseUpdateLeadOptions) => {
  const queryClient = useQueryClient();
  const { initiative } = useAuthStore();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ id, data }: UpdateLeadPayload) => {
      const response = await api.patch<Lead>(`/v1/leads/${id}`, data);
      return response.data;
    },
    onMutate: async ({ id, data }) => {
      if (!options?.optimistic || !initiative) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: leadKeys.detail(initiative, id) });
      await queryClient.cancelQueries({ queryKey: leadKeys.lists() });

      // Snapshot the previous value
      const previousLead = queryClient.getQueryData<Lead>(leadKeys.detail(initiative, id));
      const previousLeads = queryClient.getQueriesData({ queryKey: leadKeys.lists() });

      // Optimistically update the cache
      if (previousLead) {
        queryClient.setQueryData<Lead>(leadKeys.detail(initiative, id), {
          ...previousLead,
          ...data,
          updatedAt: new Date(), // Keep as Date for type consistency
        });
      }

      // Update the lead in any list queries
      queryClient.setQueriesData(
        { queryKey: leadKeys.lists() },
        (old: any) => {
          if (!old?.data) return old;
          
          return {
            ...old,
            data: old.data.map((lead: Lead) =>
              lead.id === id ? { ...lead, ...data, updatedAt: new Date() } : lead
            ),
          };
        }
      );

      // Return a context object with the snapshot
      return { previousLead, previousLeads, initiative };
    },
    onError: (error: Error, { id }, context) => {
      // Rollback on error if we did optimistic update
      if (options?.optimistic && context?.initiative) {
        if (context.previousLead) {
          queryClient.setQueryData(leadKeys.detail(context.initiative, id), context.previousLead);
        }
        
        context.previousLeads.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      // Show error message
      if (error.message.includes('404')) {
        showToast('Lead not found or you may not have access to update this lead', 'error');
      } else if (error.message.includes('403')) {
        showToast('You do not have permission to update this lead', 'error');
      } else if (error.message.includes('Network')) {
        showToast('Connection error. Your changes were not saved.', 'error');
      } else {
        showToast(error.message || 'Failed to update lead', 'error');
      }

      options?.onError?.(error);
    },
    onSuccess: (data, { id }) => {
      if (!initiative) return;
      
      // Update the cache with the server response
      queryClient.setQueryData(leadKeys.detail(initiative, id), data);
      
      // Invalidate and refetch any lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      
      showToast('Lead updated successfully', 'success');
      options?.onSuccess?.(data);
    },
  });
};

/**
 * Hook to update lead status with confirmation
 */
export const useUpdateLeadStatus = (options?: UseUpdateLeadOptions) => {
  const { showModal } = useUIStore();
  const updateLead = useUpdateLead(options);

  const updateStatus = (id: string, status: Lead['status']) => {
    showModal({
      type: 'confirm',
      title: 'Update Lead Status',
      message: `Are you sure you want to update the lead status to "${status}"?`,
      onConfirm: () => {
        updateLead.mutate({ id, data: { status } });
      },
    });
  };

  return {
    ...updateLead,
    updateStatus,
  };
};