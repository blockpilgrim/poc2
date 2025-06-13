# State Management Architecture

This guide explains our state management approach for the Partner Portal v2.0, helping new team members understand when and how to use our different state solutions.

## Overview

We use a hybrid approach to state management:

- **Zustand** - Client-side application state (auth, UI, filters)
- **TanStack Query** - Server state and data fetching
- **React Hook Form** - Form state
- **URL State** - Navigation and deep linking

## State Categories

### 1. Server State (TanStack Query)
**What:** Data fetched from APIs (leads, organizations, statistics)  
**Why:** Built-in caching, synchronization, and request deduplication  
**When to use:** Any data that comes from or goes to the backend

```typescript
// ❌ Don't store API data in Zustand
const useLeadStore = create((set) => ({
  leads: [],
  setLeads: (leads) => set({ leads })
}));

// ✅ Use TanStack Query
const useLeads = () => {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => apiClient.get('/v1/leads')
  });
};
```

### 2. UI State (Zustand - uiStore)
**What:** Modals, toasts, loading indicators, navigation state  
**Why:** Global UI state that multiple components need  
**When to use:** UI elements that affect multiple parts of the app

```typescript
// Available from uiStore:
- isLoading, loadingMessage, loadingStack
- modal (show/hide with data)
- toasts (notifications)
- sidebar/mobile menu state
```

### 3. Filter State (Zustand - filterStore)
**What:** Search, filters, sorting, pagination for data tables  
**Why:** Persist user preferences, enable deep linking  
**When to use:** Any data filtering or table state

```typescript
// Available from filterStore:
- leadFilters (search, status, type, etc.)
- pagination state
- sorting preferences
- generic table filters for future entities
```

### 4. Auth State (Zustand - authStore)
**What:** User info, roles, initiative, organization, theme  
**Why:** Needed throughout the app for access control and theming  
**When to use:** User identity, permissions, initiative context

```typescript
// Available from authStore:
- user profile
- initiative (security boundary)
- roles/permissions
- theme configuration
- organization details
```

### 5. Form State (React Hook Form)
**What:** Form values, validation, submission state  
**Why:** Optimized for form performance and validation  
**When to use:** Any user input form

```typescript
// Don't put form state in Zustand
const { register, handleSubmit } = useForm<LeadFormData>({
  resolver: zodResolver(leadSchema)
});
```

## Key Principles

### 1. Single Source of Truth
Each piece of state should have ONE owner:
- API data → TanStack Query
- UI state → uiStore
- Filter state → filterStore
- Auth state → authStore
- Form state → React Hook Form

### 2. Don't Duplicate State
```typescript
// ❌ Bad: Duplicating loading state
const useLeadStore = create((set) => ({
  isLoading: false,
  leads: []
}));

// ✅ Good: Use TanStack Query's built-in state
const { data, isLoading, error } = useLeads();
```

### 3. Colocate When Possible
If state is only used by one component, keep it local:
```typescript
// ✅ Good: Local state for component-specific UI
const LeadCard = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  // ...
};
```

## Store Integration Patterns

### Coordinating Stores with Queries
```typescript
export const useLeads = () => {
  const { leadFilters } = useFilterStore();
  const { showToast } = useUIStore();
  const setLeadPagination = useFilterStore(s => s.setLeadPagination);
  
  return useQuery({
    queryKey: ['leads', leadFilters],
    queryFn: async () => {
      const response = await apiClient.get('/v1/leads', {
        params: filterToParams(leadFilters)
      });
      
      // Update pagination totals after successful fetch
      setLeadPagination({
        totalItems: response.data.pagination.totalItems,
        totalPages: response.data.pagination.totalPages
      });
      
      return response.data;
    },
    onError: (error) => {
      showToast('Failed to load leads', 'error');
    }
  });
};
```

### Using Selectors for Performance
```typescript
// ❌ Bad: Subscribes to entire store
const store = useFilterStore();

// ✅ Good: Only subscribes to needed slice
const leadSearch = useFilterStore(state => state.leadFilters.search);
const setLeadSearch = useFilterStore(state => state.setLeadSearch);
```

## Common Patterns

### Loading States
```typescript
// For isolated operations, use TanStack Query's isLoading
const { data, isLoading } = useLeads();

// For app-wide operations, use uiStore
const { startLoading, stopLoading } = useUIStore();

const handleBulkOperation = async () => {
  startLoading('bulk-operation', 'Processing leads...');
  try {
    await bulkUpdateLeads(selectedIds);
  } finally {
    stopLoading('bulk-operation');
  }
};
```

### Error Handling
```typescript
// Query errors show toasts
onError: (error) => {
  const message = error.response?.status === 404
    ? 'No access to this resource'
    : 'An error occurred';
  showToast(message, 'error');
}

// Form errors show inline
{errors.email && (
  <span className="text-sm text-red-500">{errors.email.message}</span>
)}
```

### Optimistic Updates
```typescript
const updateLead = useMutation({
  mutationFn: (data) => apiClient.patch(`/v1/leads/${id}`, data),
  onMutate: async (newData) => {
    // Cancel in-flight queries
    await queryClient.cancelQueries(['leads']);
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['leads', id]);
    
    // Optimistically update
    queryClient.setQueryData(['leads', id], (old) => ({
      ...old,
      ...newData
    }));
    
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['leads', id], context.previous);
  }
});
```

## Best Practices

### Do's
- ✅ Use TypeScript for all stores and queries
- ✅ Create small, focused stores
- ✅ Use selectors to minimize re-renders
- ✅ Persist only necessary state (user preferences)
- ✅ Clear sensitive data on logout
- ✅ Use query invalidation after mutations

### Don'ts
- ❌ Store sensitive data in localStorage
- ❌ Duplicate server state in Zustand
- ❌ Create deeply nested store structures
- ❌ Use stores for form state
- ❌ Mix concerns in a single store
- ❌ Forget to handle loading/error states

## Store File Structure
```
src/stores/
├── authStore.ts       # User, roles, initiative, theme
├── uiStore.ts         # Modals, toasts, navigation
├── filterStore.ts     # Search, filters, pagination
├── types.ts           # Shared store types
├── utils.ts           # Store utilities
└── index.ts           # Central exports

src/hooks/queries/
├── leads/
│   ├── useLeads.ts
│   ├── useLead.ts
│   └── useUpdateLead.ts
└── queryKeys.ts       # Centralized query key management
```

## Migration Checklist

When adding new features:

1. **Identify state type**: Is it server data, UI state, or user input?
2. **Choose the right tool**: TanStack Query, Zustand, or local state?
3. **Define TypeScript types**: Ensure full type safety
4. **Consider persistence**: Should this survive page refresh?
5. **Plan error handling**: How will errors be displayed?
6. **Document patterns**: Update this guide if introducing new patterns

## Debugging

### Zustand DevTools
All stores are connected to Redux DevTools:
```typescript
// In browser: Redux DevTools Extension
// Look for: auth-store, ui-store, filter-store
```

### React Query DevTools
```typescript
// Already configured in App.tsx
// Shows cache state, active queries, and mutations
```

### Common Issues

**State not updating?**
- Check if you're mutating state directly
- Ensure you're using the action, not accessing state directly
- Verify selectors are returning new references

**Too many re-renders?**
- Use specific selectors instead of entire store
- Memoize computed values
- Check for infinite loops in effects

**State out of sync?**
- Ensure single source of truth
- Check query invalidation after mutations
- Verify store subscriptions are cleaned up