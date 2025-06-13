# Data Fetching Layer

## Overview

The Partner Portal uses [TanStack Query v5](https://tanstack.com/query/latest) for all server state management. This provides automatic caching, background refetching, and optimistic updates.

## Quick Start

### Basic Query Usage

```typescript
import { useLeads } from '@/hooks/queries/leads';

function LeadsList() {
  const { data, isLoading, error } = useLeads();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return null; // Error toast shown automatically
  
  return <LeadTable leads={data.data} />;
}
```

### Basic Mutation Usage

```typescript
import { useUpdateLead } from '@/hooks/queries/leads';

function LeadEditForm({ lead }) {
  const updateLead = useUpdateLead();
  
  const handleSubmit = (formData) => {
    updateLead.mutate({
      id: lead.id,
      data: formData
    });
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Architecture

### Directory Structure

```
src/hooks/queries/
├── queryKeys.ts          # Centralized cache keys
├── utils/
│   ├── errorHandling.ts  # Error utilities
│   └── queryOptions.ts   # Common query configs
└── leads/                # Lead-specific hooks
    ├── useLeads.ts       # List query
    ├── useLead.ts        # Detail query
    └── useUpdateLead.ts  # Update mutation
```

### Key Concepts

1. **Query Keys**: All cache keys include the user's initiative for security
2. **Store Integration**: Queries sync with Zustand stores automatically
3. **Error Handling**: Errors show as toast notifications by default
4. **Type Safety**: Full TypeScript support with shared types

## Security Model

**CRITICAL**: Every query key includes the user's initiative ID. This ensures users can only access data within their assigned initiative.

```typescript
// ✅ Correct - includes initiative
queryKey: leadKeys.list(initiative, filters)

// ❌ Wrong - missing initiative
queryKey: leadKeys.list(filters)
```

The backend enforces this boundary, but the frontend must include it for proper caching.

## Common Patterns

### List with Filters

Filters are automatically synced from `filterStore`:

```typescript
const { data } = useLeads();
// Uses current filters from filterStore
// Updates pagination after successful query
```

### Optimistic Updates

Show changes immediately while the request is in flight:

```typescript
const updateLead = useUpdateLead({ 
  optimistic: true 
});
```

### Dependent Queries

Fetch data based on other data:

```typescript
const { data: lead } = useLead(leadId, {
  enabled: !!leadId // Only fetch if ID exists
});
```

### Error Callbacks

Handle errors beyond the default toast:

```typescript
const { data } = useLead(leadId, {
  onError: (error) => {
    navigate('/leads'); // Custom error handling
  }
});
```

## Store Integration

### filterStore
- Provides current filter/sort/pagination state
- Automatically updated with server pagination info

### uiStore  
- Shows loading states (via `isLoading` from queries)
- Displays error toasts automatically
- Manages confirmation modals

### authStore
- Provides initiative context for all queries
- Queries disabled if user not authenticated

## Best Practices

### DO ✅

- Let TanStack Query handle loading states
- Use optimistic updates for better UX
- Invalidate queries after mutations
- Include initiative in all query keys
- Use centralized error handling

### DON'T ❌

- Store query data in Zustand stores
- Use `useEffect` for query side effects
- Retry on 4xx errors
- Create duplicate loading states
- Forget initiative in query keys

## Adding New Queries

1. **Create Query Key Factory**
   ```typescript
   export const userKeys = {
     all: ['users'] as const,
     list: (initiative: string) => [...userKeys.all, 'list', initiative] as const,
   };
   ```

2. **Create Hook**
   ```typescript
   export const useUsers = () => {
     const { initiative } = useAuthStore();
     const { showToast } = useUIStore();
     
     return useQuery({
       queryKey: userKeys.list(initiative!),
       queryFn: () => api.get('/users'),
       ...standardDataOptions,
       enabled: !!initiative,
     });
   };
   ```

3. **Export from Index**
   ```typescript
   // hooks/queries/index.ts
   export * from './users';
   ```

## Troubleshooting

**Query not refetching?**
- Check if query key includes all dependencies
- Verify `enabled` condition is true

**Optimistic update not working?**
- Ensure `optimistic: true` is set
- Check cache key matches exactly

**Error toast not showing?**
- Verify error includes proper status code
- Check `fetchStatus === 'idle'`

**Data not updating after mutation?**
- Invalidate the correct query keys
- Check initiative matches in all keys