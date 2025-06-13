# State Management Quick Reference

## Decision Tree: Where Does This State Belong?

```
Is it data from an API?
├─ YES → TanStack Query
└─ NO → Is it form input?
   ├─ YES → React Hook Form  
   └─ NO → Is it used by multiple components?
      ├─ YES → Is it UI state (modals, toasts)?
      │  ├─ YES → uiStore (Zustand)
      │  └─ NO → Is it filter/search state?
      │     ├─ YES → filterStore (Zustand)
      │     └─ NO → Create domain-specific Zustand store
      └─ NO → Local component state (useState)
```

**Note:** All our global stores (authStore, uiStore, filterStore) are implemented using Zustand for consistent state management patterns.

## Quick Patterns

### Get Data from API
```typescript
// ✅ Correct
const { data, isLoading } = useLeads();

// ❌ Wrong - Don't store API data in Zustand
const leads = useLeadStore(state => state.leads);
```

### Show Error Toast
```typescript
// ✅ Correct
const { showToast } = useUIStore();
showToast('Error message', 'error');

// ❌ Wrong - Don't create multiple toast solutions
toast.error('Error message'); // Some other library
```

### Update Filters
```typescript
// ✅ Correct
const setLeadStatus = useFilterStore(state => state.setLeadStatus);
setLeadStatus('active');

// ❌ Wrong - Don't manage filters in component state
const [status, setStatus] = useState('active');
```

### Handle Loading
```typescript
// ✅ For data fetching - use query state
const { data, isLoading } = useLeads();
if (isLoading) return <Spinner />;

// ✅ For UI operations - use uiStore
const { startLoading, stopLoading } = useUIStore();
startLoading('operation-key');
```

## Store Responsibilities

| Store | Owns | Examples |
|-------|------|----------|
| **authStore** | User identity & context | user, roles, initiative, theme |
| **uiStore** | Global UI state | modals, toasts, sidebar, loading |
| **filterStore** | Data filtering & tables | search, filters, sort, pagination |
| **TanStack Query** | Server data | leads, organizations, stats |
| **React Hook Form** | Form data | input values, validation |
| **useState** | Local UI | accordions, tooltips, hover |

## Common Tasks

### Show a Confirmation Modal
```typescript
const { showModal } = useUIStore();

showModal({
  type: 'confirm',
  title: 'Delete Lead?',
  message: 'This action cannot be undone.',
  onConfirm: async () => {
    await deleteLead(id);
  }
});
```

### Update After Mutation
```typescript
const updateLead = useMutation({
  mutationFn: updateLeadApi,
  onSuccess: () => {
    // Invalidate and refetch
    queryClient.invalidateQueries(['leads']);
    showToast('Lead updated', 'success');
  }
});
```

### Filter + Paginate Data
```typescript
const { leadFilters } = useFilterStore();
const { data } = useQuery({
  queryKey: ['leads', leadFilters],
  queryFn: () => fetchLeads(leadFilters),
  keepPreviousData: true, // Smooth pagination
});
```

### Persist User Preferences
```typescript
// In store definition, add persist middleware
persist(
  (set) => ({ /* store */ }),
  {
    name: 'user-preferences',
    partialize: (state) => ({
      viewMode: state.viewMode,
      itemsPerPage: state.itemsPerPage,
      // Don't persist: isLoading, errors, etc.
    })
  }
)
```

## Anti-Patterns to Avoid

### ❌ Duplicating Server State
```typescript
// Bad
const [leads, setLeads] = useState([]);
useEffect(() => {
  fetchLeads().then(setLeads);
}, []);

// Good
const { data: leads } = useLeads();
```

### ❌ Prop Drilling Store Actions
```typescript
// Bad
<Parent showToast={showToast}>
  <Child showToast={showToast}>
    <GrandChild showToast={showToast} />

// Good - Import directly where needed
const GrandChild = () => {
  const { showToast } = useUIStore();
};
```

### ❌ Storing Derived State
```typescript
// Bad
const useStore = create((set) => ({
  items: [],
  filteredItems: [], // Derived from items
  setItems: (items) => set({ 
    items, 
    filteredItems: items.filter(...) 
  })
}));

// Good - Calculate when needed
const filteredItems = useMemo(
  () => items.filter(...),
  [items, filters]
);
```

### ❌ Async Actions in Stores
```typescript
// Bad
const useStore = create((set) => ({
  fetchData: async () => {
    const data = await api.get('/data');
    set({ data });
  }
}));

// Good - Use TanStack Query
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: () => api.get('/data')
});
```

## Performance Checklist

- [ ] Using selectors to avoid unnecessary re-renders?
- [ ] Query keys are stable (no new objects each render)?
- [ ] Memoizing expensive computations?
- [ ] Setting appropriate `staleTime` for queries?
- [ ] Using `keepPreviousData` for pagination?
- [ ] Avoiding store subscriptions in loops?

## Testing Checklist

- [ ] Reset stores before each test?
- [ ] Mock API calls, not TanStack Query?
- [ ] Test store actions produce correct state?
- [ ] Test error states and edge cases?
- [ ] Test optimistic updates rollback on error?

## Debugging Commands

```javascript
// In browser console

// View Zustand store state
useAuthStore.getState()
useUIStore.getState()
useFilterStore.getState()

// Trigger store actions
useUIStore.getState().showToast('Test', 'info')

// Check React Query cache
queryClient.getQueryData(['leads'])
queryClient.getQueryState(['leads'])

// Clear all queries
queryClient.clear()

// Reset specific store
useFilterStore.getState().resetAllFilters()
```