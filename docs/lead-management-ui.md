# Lead Management UI Documentation

## Overview

The Lead Management UI provides a comprehensive interface for viewing, filtering, and managing leads within the Partner Portal. Built on top of our established state management (Phase 1) and data fetching (Phase 2) infrastructure, it demonstrates key patterns used throughout the application.

> **Note:** This document covers the technical implementation. For understanding role-based access and how leads are filtered by type, see [Lead Access and Filtering Guide](./lead-access-and-filtering.md)

## Architecture

### Component Structure

```
components/
├── data/                    # Generic data display components
│   ├── DataTable/          # Reusable table component
│   └── LeadTable/          # Lead-specific table implementation
├── leads/                   # Lead-specific UI components
│   ├── LeadStatusBadge     # Visual status indicators
│   ├── LeadTypeBadge       # Type categorization
│   ├── LeadPriorityIndicator # Priority visualization
│   ├── LeadCard            # Mobile-friendly card view
│   └── EmptyLeadsState     # Empty state messaging
└── pages/leads/            # Route components
    ├── index.tsx           # List page (/leads)
    └── [id].tsx           # Detail page (/leads/:id)
```

### Key Design Principles

1. **Separation of Concerns**
   - Generic components (`DataTable`) are reusable across different data types
   - Domain-specific components (`LeadTable`) compose generic ones with business logic
   - Visual components (`badges`, `indicators`) are pure and stateless

2. **State Management Integration**
   - Filter state lives in `filterStore` - components read and update it
   - Server state managed by TanStack Query - no local state duplication
   - Loading/error states come from query hooks

3. **Type Safety**
   - All components use TypeScript with proper typing
   - Shared types from `@partner-portal/shared` ensure consistency
   - No `any` types - explicit typing throughout

## Data Flow

### List View Flow
```
LeadsPage → LeadTable → useLeads() → API
                ↓
         filterStore (filters/pagination)
                ↓
         DataTable (presentation)
```

1. `useLeads()` hook automatically reads filters from `filterStore`
2. When filters change, the query re-fetches with new parameters
3. Pagination updates after successful queries
4. Error handling shows toasts automatically

### Detail View Flow
```
LeadDetailPage → useLead(id) → API
        ↓
   Lead data display
```

## Component Patterns

### Generic Table Pattern
The `DataTable` component provides:
- Sorting, pagination, and row selection
- Loading skeletons
- Keyboard navigation
- Customizable toolbar
- Row click handlers

Usage:
```typescript
<DataTable
  columns={columns}
  data={data}
  isLoading={isLoading}
  toolbar={<CustomFilters />}
  onRowClick={handleRowClick}
/>
```

### Filter Integration Pattern
Filters are managed centrally in `filterStore`:
- Components call actions like `setLeadStatus()`
- The `useLeads()` hook automatically uses current filters
- No need to pass filters as props

### Column Definition Pattern
Table columns are defined as functions to access navigation:
```typescript
export const getColumns = (navigate: NavigateFunction) => [
  // Column definitions with access to navigate
]
```

## Accessibility Features

- **Keyboard Navigation**: Tables support Enter/Space for row selection
- **Screen Reader Support**: Proper ARIA labels and roles
- **Focus Management**: Logical tab order through interactive elements
- **Status Indicators**: Both visual and textual representations

## Common Tasks

### Adding a New Filter
1. Add filter field to `filterStore` state
2. Create setter action in `filterStore`
3. Add UI control in `LeadTableFilters`
4. Include parameter in `useLeads` query

### Creating a New Badge/Indicator
1. Define configuration object with variants
2. Map values to visual properties
3. Include screen reader text
4. Export from leads components index

### Adding Table Actions
1. Define action in column definition
2. Handle navigation with React Router
3. Stop event propagation for nested interactions
4. Add appropriate ARIA labels

## Performance Considerations

- **Virtual Scrolling**: Not implemented - consider for 1000+ rows
- **Pagination**: Server-side pagination reduces data transfer
- **Memoization**: Column definitions are recreated on each render
- **Filter Debouncing**: Search input updates immediately (consider debouncing for API load)

## Security Notes

- **Initiative Filtering**: Enforced server-side - UI cannot bypass
- **Role-Based Access**: UI checks roles for feature visibility
- **Data Sanitization**: All user inputs sanitized before display

## Testing Approach

When testing Lead Management UI:
1. Mock `useLeads()` and other query hooks
2. Test filter interactions update `filterStore`
3. Verify accessibility with keyboard navigation
4. Ensure error states display appropriately

## Future Enhancements

Consider these improvements as the application scales:
- Bulk operations UI
- Advanced filtering (date ranges, custom fields)
- Saved filter presets
- Export functionality
- Real-time updates via WebSocket

## Related Documentation

- [State Management Patterns](./state-management-patterns.md) - Filter store architecture
- [Data Fetching](./data-fetching.md) - Query hook patterns
- [Initiative-Based Theming](./initiative-based-theming.md) - Visual customization