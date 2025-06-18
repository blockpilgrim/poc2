import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { PaginatedResponse, Lead } from '@partner-portal/shared';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../stores/authStore';
import { useFilterStore, useFilterStoreHasHydrated } from '../../../stores/filterStore';
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
  const hasHydrated = useFilterStoreHasHydrated();
  const { showToast } = useUIStore();

  // Extract filters from store with defensive defaults
  const { 
    search = '', 
    sort = { field: 'updatedAt', order: 'desc' }, 
    pagination = { page: 1, pageSize: 25 } 
  } = leadFilters || {};

  const query = useQuery({
    queryKey: leadKeys.list(initiative!, {
      search,
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
          
          // Currently only search filter is supported by backend
        },
      });
      
      return response.data;
    },
    ...standardDataOptions,
    enabled: !!initiative && hasHydrated && (options?.enabled ?? true),
  });

  // Update pagination state after successful query
  useEffect(() => {
    if (query.data) {
      setLeadPagination({
        totalItems: query.data.pagination.totalItems,
        totalPages: query.data.pagination.totalPages,
      });
    }
  }, [query.data, setLeadPagination]);

  // Handle errors in the UI layer
  if (query.error && query.fetchStatus === 'idle') {
    handleApiError(query.error as Error, showToast, 'Failed to load leads');
  }

  return query;
};