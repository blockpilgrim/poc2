# Zustand Persist Hydration Implementation

## Overview

This document describes the implementation of proper hydration handling for Zustand stores that use the `persist` middleware.

## Problem

When using Zustand's `persist` middleware, there's a delay between when the component first renders and when the persisted state is loaded from localStorage. This can cause:
- Flash of incorrect content (FOUC)
- Hydration mismatches in SSR environments
- Race conditions between hydration and data fetching

## Solution

We've implemented a hydration tracking system in the `filterStore`:

### 1. Added Hydration State

```typescript
interface FilterState {
  // Hydration state
  hasHydrated: boolean;
  // ... rest of the state
}
```

### 2. Implemented onRehydrateStorage Callback

```typescript
persist(
  (set) => ({
    // Initial state
    hasHydrated: false,
    // ... rest of the store
  }),
  {
    name: 'filter-store',
    onRehydrateStorage: () => (state) => {
      // Set hasHydrated to true after rehydration
      if (state) {
        state.hasHydrated = true;
      }
    },
    // ... rest of the config
  }
)
```

### 3. Added Hydration Selector

```typescript
export const useFilterStoreHasHydrated = () => useFilterStore((state) => state.hasHydrated);
```

## Usage Examples

### In Components

```typescript
import { useFilterStoreHasHydrated } from '@/stores/filterStore';

export function MyComponent() {
  const hasHydrated = useFilterStoreHasHydrated();

  // Show loading state while hydrating
  if (!hasHydrated) {
    return <LoadingSpinner />;
  }

  // Render component with hydrated state
  return <div>...</div>;
}
```

### In Data Fetching Hooks

```typescript
export const useLeads = (options?: UseLeadsOptions) => {
  const hasHydrated = useFilterStoreHasHydrated();
  
  const query = useQuery({
    // ... query config
    enabled: !!initiative && hasHydrated && (options?.enabled ?? true),
  });
  
  return query;
};
```

## Benefits

1. **Prevents FOUC**: Components wait for hydration before rendering filter-dependent content
2. **Consistent State**: Ensures persisted filters are loaded before data fetching begins
3. **Better UX**: Shows appropriate loading states during hydration
4. **SSR Compatibility**: Prevents hydration mismatches if using server-side rendering

## Future Considerations

If you add persistence to other stores, follow the same pattern:

1. Add `hasHydrated: boolean` to the store state
2. Implement `onRehydrateStorage` callback
3. Create a hydration selector
4. Use the selector in components that depend on persisted state