# State Management Patterns & Conventions

Quick reference for implementing stores and queries in the Partner Portal v2.0.

## Zustand Store Pattern

### Basic Store Structure
```typescript
// stores/[domain]Store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface DomainState {
  // State
  data: SomeType;
  
  // Actions (always void return)
  setData: (data: SomeType) => void;
  updateData: (updates: Partial<SomeType>) => void;
  resetData: () => void;
}

export const useDomainStore = create<DomainState>()(
  devtools(
    (set) => ({
      // Initial state
      data: initialData,
      
      // Actions
      setData: (data) => set({ data }),
      updateData: (updates) => 
        set((state) => ({ data: { ...state.data, ...updates } })),
      resetData: () => set({ data: initialData }),
    }),
    {
      name: 'domain-store', // For DevTools
    }
  )
);
```

### Store with Persistence
```typescript
import { persist } from 'zustand/middleware';

export const usePreferencesStore = create<PreferencesState>()(
  devtools(
    persist(
      (set) => ({
        // ... store implementation
      }),
      {
        name: 'preferences-store',
        partialize: (state) => ({
          // Only persist specific fields
          theme: state.theme,
          language: state.language,
          // Don't persist: isLoading, errors, etc.
        }),
      }
    )
  )
);
```

### Async Actions Pattern
```typescript
interface StoreState {
  data: Data | null;
  isLoading: boolean;
  error: string | null;
  
  fetchData: () => Promise<void>;
}

// ❌ Avoid: Async actions in Zustand stores
const useStore = create<StoreState>((set) => ({
  fetchData: async () => {
    set({ isLoading: true });
    const data = await apiClient.get('/data');
    set({ data, isLoading: false });
  }
}));

// ✅ Prefer: TanStack Query for async data
const useData = () => {
  return useQuery({
    queryKey: ['data'],
    queryFn: () => apiClient.get('/data')
  });
};
```

## TanStack Query Patterns

### Query Keys Factory
```typescript
// hooks/queries/queryKeys.ts
export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (filters: LeadFilters) => [...leadKeys.lists(), filters] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
};
```

### Standard Query Hook
```typescript
// hooks/queries/leads/useLeads.ts
export const useLeads = () => {
  const { leadFilters } = useFilterStore();
  const { showToast } = useUIStore();
  
  return useQuery({
    queryKey: leadKeys.list(leadFilters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Lead>>(
        '/v1/leads',
        { params: filterToApiParams(leadFilters) }
      );
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: (error: AxiosError) => {
      const message = getErrorMessage(error);
      showToast(message, 'error');
    },
  });
};
```

### Mutation with Optimistic Update
```typescript
export const useUpdateLead = () => {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  
  return useMutation({
    mutationFn: ({ id, data }: UpdateLeadParams) =>
      apiClient.patch(`/v1/leads/${id}`, data),
    
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries(leadKeys.detail(id));
      
      const previous = queryClient.getQueryData(leadKeys.detail(id));
      
      queryClient.setQueryData(leadKeys.detail(id), (old: Lead) => ({
        ...old,
        ...data,
      }));
      
      return { previous };
    },
    
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          leadKeys.detail(variables.id),
          context.previous
        );
      }
      showToast('Failed to update lead', 'error');
    },
    
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries(leadKeys.lists());
      queryClient.invalidateQueries(leadKeys.detail(id));
      showToast('Lead updated successfully', 'success');
    },
  });
};
```

## Integration Patterns

### Store + Query Coordination
```typescript
export const useLeadsWithFilters = () => {
  const filters = useFilterStore((state) => state.leadFilters);
  const setLeadPagination = useFilterStore((state) => state.setLeadPagination);
  
  const query = useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: async () => {
      const response = await fetchLeads(filters);
      
      // Update store with server pagination info
      setLeadPagination({
        totalItems: response.pagination.totalItems,
        totalPages: response.pagination.totalPages,
      });
      
      return response;
    },
  });
  
  return query;
};
```

### Computed Selectors
```typescript
// In store
export const useHasActiveFilters = () => 
  useFilterStore((state) => {
    const { filters, search } = state.leadFilters;
    return !!(search || filters.status || filters.type);
  });

// Or as a separate selector
const selectHasActiveFilters = (state: FilterState) => {
  const { filters, search } = state.leadFilters;
  return !!(search || filters.status || filters.type);
};

// Usage
const hasFilters = useFilterStore(selectHasActiveFilters);
```

## Naming Conventions

### Stores
- File: `[domain]Store.ts` (e.g., `authStore.ts`, `uiStore.ts`)
- Hook: `use[Domain]Store` (e.g., `useAuthStore`)
- DevTools: `[domain]-store` (e.g., `auth-store`)

### Queries
- Directory: `hooks/queries/[resource]/`
- List: `use[Resources]` (e.g., `useLeads`)
- Single: `use[Resource]` (e.g., `useLead`)
- Create: `useCreate[Resource]` (e.g., `useCreateLead`)
- Update: `useUpdate[Resource]` (e.g., `useUpdateLead`)
- Delete: `useDelete[Resource]` (e.g., `useDeleteLead`)

### Actions
- Set: `set[Property]` - Replace entire value
- Update: `update[Property]` - Partial update
- Add: `add[Item]` - Add to collection
- Remove: `remove[Item]` - Remove from collection
- Reset: `reset[Property]` - Return to initial state
- Toggle: `toggle[Property]` - Boolean flip
- Clear: `clear[Property]` - Empty/null state

## TypeScript Patterns

### Store Types
```typescript
// Separate state and actions for clarity
interface UIState {
  // State
  modal: Modal;
  toasts: Toast[];
}

interface UIActions {
  // Actions
  showModal: (modal: Partial<Modal>) => void;
  closeModal: () => void;
  showToast: (message: string, type?: ToastType) => void;
}

type UIStore = UIState & UIActions;
```

### Generic Table Store
```typescript
interface TableState<TFilters> {
  filters: TableFilters<TFilters>;
  setFilters: (filters: Partial<TFilters>) => void;
  setSorting: (field: string, order?: 'asc' | 'desc') => void;
  setPagination: (pagination: Partial<Pagination>) => void;
  reset: () => void;
}

// Reusable factory
export const createTableStore = <TFilters>(
  name: string,
  defaultFilters: TFilters
) => {
  return create<TableState<TFilters>>()(
    devtools((set) => ({
      // Implementation...
    }), { name })
  );
};
```

## Testing Patterns

### Testing Stores
```typescript
import { renderHook, act } from '@testing-library/react';
import { useUIStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
  });
  
  it('should show and hide modal', () => {
    const { result } = renderHook(() => useUIStore());
    
    act(() => {
      result.current.showModal({
        type: 'confirm',
        title: 'Test Modal',
      });
    });
    
    expect(result.current.modal.isOpen).toBe(true);
    expect(result.current.modal.title).toBe('Test Modal');
  });
});
```

### Testing Queries
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useLeads } from './useLeads';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useLeads', () => {
  it('should fetch leads', async () => {
    const { result } = renderHook(() => useLeads(), {
      wrapper: createWrapper(),
    });
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data).toBeDefined();
  });
});
```

## Performance Tips

1. **Use Selectors**: Only subscribe to needed state slices
2. **Memoize Computations**: Use `useMemo` for expensive calculations
3. **Shallow Comparisons**: Zustand uses Object.is by default
4. **Query Deduplication**: Same query key = shared cache
5. **Stale While Revalidate**: Set appropriate `staleTime`
6. **Pagination Prefetch**: Prefetch next page for smooth UX

## Common Gotchas

### State Mutations
```typescript
// ❌ Mutating state
set((state) => {
  state.data.push(newItem); // Don't mutate!
  return state;
});

// ✅ Creating new state
set((state) => ({
  data: [...state.data, newItem]
}));
```

### Stale Closures
```typescript
// ❌ Using state in async action
const doSomething = async () => {
  const { data } = get(); // Might be stale after await
  await api.call();
  console.log(data); // Stale!
};

// ✅ Get fresh state after async
const doSomething = async () => {
  await api.call();
  const { data } = get(); // Fresh state
  console.log(data);
};
```

### Over-fetching
```typescript
// ❌ New query for every filter change
queryKey: ['leads', searchTerm, status, type, page, limit]

// ✅ Stable object for related filters
queryKey: ['leads', { search, filters, pagination }]
```