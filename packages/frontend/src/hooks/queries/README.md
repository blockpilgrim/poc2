# TanStack Query Hooks Architecture

## Overview

This directory contains all TanStack Query hooks for the Partner Portal v2.0. The implementation follows best practices for type safety, error handling, and security.

## Key Security Requirement

**CRITICAL**: All query keys MUST include the user's initiative ID to ensure proper data segregation. This is enforced throughout the codebase as a hard security boundary.

## Architecture Patterns

### 1. Query Key Factory Pattern

All query keys are centralized in `queryKeys.ts`:

```typescript
export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (initiative: string, filters: LeadQueryFilters) => 
    [...leadKeys.lists(), initiative, filters] as const,
  detail: (initiative: string, id: string) => 
    [...leadKeys.details(), initiative, id] as const,
};
```

### 2. Error Handling

Centralized error handling in `utils/errorHandling.ts`:

```typescript
handleApiError(error, showToast, 'Default message');
```

### 3. Query Options

Standardized query options in `utils/queryOptions.ts`:

```typescript
export const standardDataOptions = {
  staleTime: 1000 * 60 * 2, // 2 minutes
  gcTime: 1000 * 60 * 5, // 5 minutes
  retry: defaultRetry,
};
```

## Store Integration

### filterStore
- Hooks read filter state directly
- Pagination is updated after successful list queries
- Filters automatically reset pagination to page 1

### uiStore
- Error messages shown as toasts
- Loading states managed by TanStack Query (not duplicated in stores)
- Modal confirmations for destructive actions

### authStore
- Initiative context automatically included in all queries
- Queries disabled if no initiative is set

## Best Practices

1. **Type Safety**: All hooks are fully typed with TypeScript
2. **Error Handling**: User-friendly error messages with fallbacks
3. **Performance**: Smart retry logic, proper cache configuration
4. **Security**: Initiative-based query keys for data isolation
5. **UX**: Optimistic updates for immediate feedback

## Common Patterns

### List Query with Filters
```typescript
const { data, isLoading, error } = useLeads();
// Filters automatically synced from filterStore
// Pagination updated after successful query
```

### Single Item Query
```typescript
const { data: lead, isLoading } = useLead(leadId, {
  onSuccess: (lead) => console.log('Lead loaded:', lead),
});
```

### Mutations with Optimistic Updates
```typescript
const updateLead = useUpdateLead({
  optimistic: true,
  onSuccess: () => navigate('/leads'),
});
```

### Bulk Operations with Confirmation
```typescript
const { updateStatus } = useBulkUpdateLeadStatus();
updateStatus(selectedIds, 'contacted'); // Shows confirmation modal
```

## Error States

Errors are handled consistently across all hooks:

- **404**: "Resource not found or access denied"
- **403**: "You do not have permission for this action"
- **401**: Handled by auth interceptor (redirects to login)
- **Network**: "Connection error. Please check your internet connection"
- **500**: "Server error. Please try again later"

## Testing Considerations

When testing these hooks:

1. Mock the auth store to provide initiative context
2. Mock the API responses with proper types
3. Test error scenarios and retry logic
4. Verify cache invalidation patterns
5. Test optimistic update rollbacks