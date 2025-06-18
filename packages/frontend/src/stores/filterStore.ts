import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { LeadStatus, LeadType } from '@partner-portal/shared';

export interface TableSort {
  field: string;
  order: 'asc' | 'desc';
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface LeadFilters {
  search: string;
  status: LeadStatus | LeadStatus[] | null;
  type: LeadType | LeadType[] | null;
  assignedToId: string | null;
  assignedOrganizationId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface TableFilters<T = Record<string, unknown>> {
  search: string;
  filters: T;
  sort: TableSort;
  pagination: Pagination;
}

interface FilterState {
  // Lead filters
  leadFilters: TableFilters<LeadFilters>;
  
  // Generic table filters (for future use)
  tableFilters: Record<string, TableFilters>;
  
  // Actions - Lead filters
  setLeadSearch: (search: string) => void; // ✅ Functional
  setLeadStatus: (status: LeadStatus | LeadStatus[] | null) => void; // 🚧 UI only - backend support coming
  setLeadType: (type: LeadType | LeadType[] | null) => void; // 🚧 UI only - backend support coming
  setLeadAssignee: (assignedToId: string | null) => void; // 🚧 Future feature
  setLeadOrganization: (assignedOrganizationId: string | null) => void; // 🚧 Future feature
  setLeadDateRange: (dateFrom: string | null, dateTo: string | null) => void; // 🚧 Future feature
  setLeadSort: (field: string, order?: 'asc' | 'desc') => void; // ✅ Functional
  setLeadPagination: (pagination: Partial<Pagination>) => void; // ✅ Functional
  resetLeadFilters: () => void;
  
  // Actions - Generic table filters
  setTableFilters: (tableKey: string, filters: Partial<TableFilters>) => void;
  resetTableFilters: (tableKey: string) => void;
  
  // Actions - Global
  resetAllFilters: () => void;
}

// Default values
const defaultLeadFilters: LeadFilters = {
  search: '',
  status: null,
  type: null,
  assignedToId: null,
  assignedOrganizationId: null,
  dateFrom: null,
  dateTo: null,
};

const defaultPagination: Pagination = {
  page: 1,
  pageSize: 25,
  totalItems: 0,
  totalPages: 0,
};

const defaultSort: TableSort = {
  field: 'updatedAt',
  order: 'desc',
};

const defaultLeadTableFilters: TableFilters<LeadFilters> = {
  search: '',
  filters: defaultLeadFilters,
  sort: defaultSort,
  pagination: defaultPagination,
};

export const useFilterStore = create<FilterState>()(
  subscribeWithSelector(
    devtools(
      persist(
        (set) => ({
          // Initial state
          leadFilters: defaultLeadTableFilters,
          tableFilters: {},
          
          // Lead filter actions
          setLeadSearch: (search) =>
            set((state) => ({
              leadFilters: {
                ...state.leadFilters,
                search,
                pagination: { ...state.leadFilters.pagination, page: 1 }, // Reset to page 1 on search
              },
            })),
          
          setLeadStatus: (status) =>
            set((state) => ({
              leadFilters: {
                ...state.leadFilters,
                filters: { ...state.leadFilters.filters, status },
                pagination: { ...state.leadFilters.pagination, page: 1 },
              },
            })),
          
          setLeadType: (type) =>
            set((state) => ({
              leadFilters: {
                ...state.leadFilters,
                filters: { ...state.leadFilters.filters, type },
                pagination: { ...state.leadFilters.pagination, page: 1 },
              },
            })),
          
          setLeadAssignee: (assignedToId) =>
            set((state) => ({
              leadFilters: {
                ...state.leadFilters,
                filters: { ...state.leadFilters.filters, assignedToId },
                pagination: { ...state.leadFilters.pagination, page: 1 },
              },
            })),
          
          setLeadOrganization: (assignedOrganizationId) =>
            set((state) => ({
              leadFilters: {
                ...state.leadFilters,
                filters: { ...state.leadFilters.filters, assignedOrganizationId },
                pagination: { ...state.leadFilters.pagination, page: 1 },
              },
            })),
          
          setLeadDateRange: (dateFrom, dateTo) =>
            set((state) => ({
              leadFilters: {
                ...state.leadFilters,
                filters: { ...state.leadFilters.filters, dateFrom, dateTo },
                pagination: { ...state.leadFilters.pagination, page: 1 },
              },
            })),
          
          setLeadSort: (field, order) =>
            set((state) => ({
              leadFilters: {
                ...state.leadFilters,
                sort: {
                  field,
                  order: order || (state.leadFilters.sort.field === field && state.leadFilters.sort.order === 'asc' ? 'desc' : 'asc'),
                },
              },
            })),
          
          setLeadPagination: (pagination) =>
            set((state) => ({
              leadFilters: {
                ...state.leadFilters,
                pagination: { ...state.leadFilters.pagination, ...pagination },
              },
            })),
          
          resetLeadFilters: () =>
            set({ leadFilters: defaultLeadTableFilters }),
          
          // Generic table filter actions
          setTableFilters: (tableKey, filters) =>
            set((state) => ({
              tableFilters: {
                ...state.tableFilters,
                [tableKey]: {
                  ...state.tableFilters[tableKey],
                  ...filters,
                },
              },
            })),
          
          resetTableFilters: (tableKey) =>
            set((state) => {
              const { [tableKey]: _, ...rest } = state.tableFilters;
              return { tableFilters: rest };
            }),
          
          // Global reset
          resetAllFilters: () =>
            set({
              leadFilters: defaultLeadTableFilters,
              tableFilters: {},
            }),
        }),
        {
          name: 'filter-store',
          partialize: (state) => ({
            // Only persist specific filters, not pagination or transient state
            leadFilters: {
              filters: {
                status: state.leadFilters.filters.status,
                type: state.leadFilters.filters.type,
              },
              sort: state.leadFilters.sort,
            },
          }),
        }
      )
    )
  )
);

// Selectors for common use cases
export const useLeadFilters = () => useFilterStore((state) => state.leadFilters);
export const useLeadSearch = () => useFilterStore((state) => state.leadFilters.search);
export const useLeadPagination = () => useFilterStore((state) => state.leadFilters.pagination);
export const useLeadSort = () => useFilterStore((state) => state.leadFilters.sort);

/**
 * Computed selector that determines if any filters are currently active
 * @returns true if any filters are applied, false otherwise
 */
export const useHasActiveFilters = () => useFilterStore((state) => {
  const { filters, search } = state.leadFilters;
  return !!(
    search ||
    filters.status ||
    filters.type ||
    filters.assignedToId ||
    filters.assignedOrganizationId ||
    filters.dateFrom ||
    filters.dateTo
  );
});

/**
 * Parses URL search parameters and returns filter configuration
 * Note: Currently only search, pagination, and sorting are functional
 * Other filters are preserved for future backend support
 * @param searchParams - URLSearchParams object from the current URL
 * @returns Partial filter configuration to apply to the store
 */
export const getLeadFiltersFromURL = (searchParams: URLSearchParams): Partial<TableFilters<LeadFilters>> => {
  // Currently functional parameters
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
  const sortField = searchParams.get('sortBy') || 'updatedAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  
  // Parse future filter parameters (not yet functional)
  const filters: Partial<LeadFilters> = {};
  if (searchParams.has('status')) filters.status = searchParams.get('status') as LeadStatus;
  if (searchParams.has('type')) filters.type = searchParams.get('type') as LeadType;
  if (searchParams.has('assignedTo')) filters.assignedToId = searchParams.get('assignedTo');
  if (searchParams.has('organization')) filters.assignedOrganizationId = searchParams.get('organization');
  if (searchParams.has('dateFrom')) filters.dateFrom = searchParams.get('dateFrom');
  if (searchParams.has('dateTo')) filters.dateTo = searchParams.get('dateTo');
  
  return {
    search,
    filters: { ...defaultLeadFilters, ...filters },
    sort: { field: sortField, order: sortOrder },
    pagination: { ...defaultPagination, page, pageSize },
  };
};