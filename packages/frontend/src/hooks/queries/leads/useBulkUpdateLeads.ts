import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Lead } from '@partner-portal/shared';
import { api } from '../../../services/api';
import { useUIStore } from '../../../stores/uiStore';
import { leadKeys } from '../queryKeys';

interface BulkUpdatePayload {
  ids: string[];
  data: Partial<Lead>;
}

interface BulkUpdateResponse {
  updated: string[];
  failed: string[];
  errors?: Record<string, string>;
}

interface UseBulkUpdateLeadsOptions {
  onSuccess?: (data: BulkUpdateResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to update multiple leads at once
 * Useful for bulk status changes, assignments, etc.
 */
export const useBulkUpdateLeads = (options?: UseBulkUpdateLeadsOptions) => {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ ids, data }: BulkUpdatePayload) => {
      const response = await api.patch<BulkUpdateResponse>('/v1/leads/bulk', {
        ids,
        updates: data,
      });
      return response.data;
    },
    onError: (error: Error) => {
      if (error.message.includes('403')) {
        showToast('You do not have permission to update these leads', 'error');
      } else if (error.message.includes('Network')) {
        showToast('Connection error. The bulk update was not completed.', 'error');
      } else {
        showToast(error.message || 'Failed to update leads', 'error');
      }

      options?.onError?.(error);
    },
    onSuccess: (data) => {
      // Invalidate all lead queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
      
      // Show success/warning message based on results
      if (data.failed.length === 0) {
        showToast(`Successfully updated ${data.updated.length} leads`, 'success');
      } else if (data.updated.length === 0) {
        showToast('Failed to update any leads', 'error');
      } else {
        showToast(
          `Updated ${data.updated.length} leads. ${data.failed.length} failed.`,
          'warning'
        );
      }
      
      options?.onSuccess?.(data);
    },
  });
};

/**
 * Hook to bulk update lead status with confirmation
 */
export const useBulkUpdateLeadStatus = (options?: UseBulkUpdateLeadsOptions) => {
  const { showModal } = useUIStore();
  const bulkUpdate = useBulkUpdateLeads(options);

  const updateStatus = (ids: string[], status: Lead['status']) => {
    showModal({
      type: 'confirm',
      title: 'Bulk Update Lead Status',
      message: `Are you sure you want to update ${ids.length} lead(s) to status "${status}"?`,
      onConfirm: () => {
        bulkUpdate.mutate({ ids, data: { status } });
      },
    });
  };

  return {
    ...bulkUpdate,
    updateStatus,
  };
};