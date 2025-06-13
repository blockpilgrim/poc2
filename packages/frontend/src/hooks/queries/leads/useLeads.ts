import { useQuery } from '@tanstack/react-query';
import type { PaginatedResponse, Lead } from '@partner-portal/shared';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../stores/authStore';
import { useFilterStore } from '../../../stores/filterStore';
import { useUIStore } from '../../../stores/uiStore';
import { leadKeys } from '../queryKeys';
import { handleApiError } from '../utils/errorHandling';
import { standardDataOptions } from '../utils/queryOptions';

interface UseLeadsOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch paginated leads with filters
 * Integrates with filterStore for filter/pagination state
 * Updates pagination info after successful queries
 */
export const useLeads = (options?: UseLeadsOptions) => {
  const { initiative } = useAuthStore();
  const { leadFilters, setLeadPagination } = useFilterStore();
  const { showToast } = useUIStore();

  // Extract filters from store
  const { search, filters, sort, pagination } = leadFilters;

  const query = useQuery({
    queryKey: leadKeys.list(initiative!, {
      search,
      status: filters.status ?? undefined,
      type: filters.type ?? undefined,
      assignedToId: filters.assignedToId ?? undefined,
      assignedOrganizationId: filters.assignedOrganizationId ?? undefined,
      priority: filters.priority ?? undefined,
      tags: filters.tags,
      dateFrom: filters.dateFrom ?? undefined,
      dateTo: filters.dateTo ?? undefined,
      sortBy: sort.field,
      sortOrder: sort.order,
      page: pagination.page,
      pageSize: pagination.pageSize,
    }),
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Lead>>('/v1/leads', {
        params: {
          // Pagination
          page: pagination.page,
          pageSize: pagination.pageSize,
          
          // Sorting
          sortBy: sort.field,
          sortOrder: sort.order,
          
          // Search
          search: search || undefined,
          
          // Filters
          status: filters.status || undefined,
          type: filters.type || undefined,
          assignedToId: filters.assignedToId || undefined,
          assignedOrganizationId: filters.assignedOrganizationId || undefined,
          priority: filters.priority || undefined,
          tags: filters.tags?.length > 0 ? filters.tags : undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        },
      });
      
      // Update pagination state with server response
      setLeadPagination({
        totalItems: response.data.pagination.totalItems,
        totalPages: response.data.pagination.totalPages,
      });
      
      return response.data;
    },
    ...standardDataOptions,
    enabled: !!initiative && (options?.enabled ?? true),
  });

  // Handle errors in the UI layer
  if (query.error && query.fetchStatus === 'idle') {
    handleApiError(query.error as Error, showToast, 'Failed to load leads');
  }

  return query;
};