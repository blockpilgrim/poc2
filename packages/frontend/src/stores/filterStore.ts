import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { LeadStatus, LeadType } from '@partner-portal/shared';
import { DEFAULT_FILTERS } from '@/constants/leads';

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
  // Hydration state
  hasHydrated: boolean;
  
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
  search: DEFAULT_FILTERS.SEARCH,
  status: DEFAULT_FILTERS.STATUS,
  type: DEFAULT_FILTERS.TYPE,
  assignedToId: null,
  assignedOrganizationId: null,
  dateFrom: null,
  dateTo: null,
};

const defaultPagination: Pagination = {
  page: DEFAULT_FILTERS.PAGE,
  pageSize: DEFAULT_FILTERS.PAGE_SIZE,
  totalItems: 0,
  totalPages: 0,
};

const defaultSort: TableSort = {
  field: DEFAULT_FILTERS.SORT_FIELD,
  order: DEFAULT_FILTERS.SORT_ORDER,
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
          hasHydrated: false,
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
          version: 1, // Add version for migration
          migrate: (persistedState: any, version: number) => {
            // Migration from version 0 (or no version) to version 1
            if (version === 0 || version === undefined) {
              // Clear any corrupted state and return fresh defaults
              return {
                hasHydrated: false,
                leadFilters: defaultLeadTableFilters,
                tableFilters: {},
              };
            }
            return persistedState;
          },
          partialize: (state) => ({
            // Only persist specific filters, not pagination or transient state
            leadFilters: {
              search: '', // Reset search on page reload
              filters: {
                ...defaultLeadFilters, // Ensure all filter properties exist
                status: state.leadFilters.filters.status,
                type: state.leadFilters.filters.type,
              },
              sort: state.leadFilters.sort,
              pagination: defaultPagination, // Always use default pagination on reload
            },
          }),
          merge: (persistedState: any, currentState: FilterState) => {
            // Ensure the persisted state has the complete structure
            const mergedLeadFilters = {
              ...defaultLeadTableFilters,
              ...(persistedState?.leadFilters || {}),
              filters: {
                ...defaultLeadFilters,
                ...(persistedState?.leadFilters?.filters || {}),
              },
              sort: persistedState?.leadFilters?.sort || defaultSort,
              pagination: defaultPagination, // Always use default pagination
            };

            return {
              ...currentState,
              leadFilters: mergedLeadFilters,
              tableFilters: persistedState?.tableFilters || {},
            };
          },
          onRehydrateStorage: () => (state) => {
            // Set hasHydrated to true after the store has been rehydrated
            if (state) {
              state.hasHydrated = true;
            }
          },
        }
      )
    )
  )
);

// Selectors for common use cases with defensive defaults
export const useLeadFilters = () => useFilterStore((state) => state.leadFilters || defaultLeadTableFilters);
export const useLeadSearch = () => useFilterStore((state) => state.leadFilters?.search || '');
export const useLeadPagination = () => useFilterStore((state) => state.leadFilters?.pagination || defaultPagination);
export const useLeadSort = () => useFilterStore((state) => state.leadFilters?.sort || defaultSort);

/**
 * Selector for hydration status
 * @returns true if the store has been hydrated from localStorage, false otherwise
 */
export const useFilterStoreHasHydrated = () => useFilterStore((state) => state.hasHydrated);

/**
 * Computed selector that determines if any filters are currently active
 * @returns true if any filters are applied, false otherwise
 */
export const useHasActiveFilters = () => useFilterStore((state) => {
  const leadFilters = state.leadFilters || defaultLeadTableFilters;
  const { filters, search } = leadFilters;
  return !!(
    search ||
    filters?.status ||
    filters?.type ||
    filters?.assignedToId ||
    filters?.assignedOrganizationId ||
    filters?.dateFrom ||
    filters?.dateTo
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
  const search = searchParams.get('search') || DEFAULT_FILTERS.SEARCH;
  const page = parseInt(searchParams.get('page') || String(DEFAULT_FILTERS.PAGE), 10);
  const pageSize = parseInt(searchParams.get('pageSize') || String(DEFAULT_FILTERS.PAGE_SIZE), 10);
  const sortField = searchParams.get('sortBy') || DEFAULT_FILTERS.SORT_FIELD;
  const sortOrder = (searchParams.get('sortOrder') || DEFAULT_FILTERS.SORT_ORDER) as 'asc' | 'desc';
  
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