# Data Components

This directory contains reusable data display components for the Partner Portal.

## DataTable

A generic, reusable table component built on top of TanStack Table v8 that provides:

- Column sorting
- Row selection
- Pagination
- Filtering
- Responsive design
- Loading states
- Empty states

### Usage

```tsx
import { DataTable, DataTablePagination, DataTableToolbar } from '@/components/data/DataTable';

<DataTable
  columns={columns}
  data={data}
  isLoading={isLoading}
  onRowClick={handleRowClick}
  toolbar={<DataTableToolbar {...toolbarProps} />}
/>
```

## LeadTable

A specialized implementation of DataTable for displaying leads with:

- Lead-specific columns (status badges, type badges, priority indicators)
- Integrated filter controls
- Automatic integration with filterStore
- Responsive card view for mobile
- Bulk actions support

### Features

- **Automatic Filter Integration**: Pulls filters from the global filterStore
- **Server-side Pagination**: Updates pagination state after queries
- **Optimistic Updates**: Instant UI feedback on mutations
- **Security**: All queries include initiative ID for data segregation
- **Responsive**: Table view on desktop, card view on mobile

### Usage

```tsx
import { LeadTable } from '@/components/data/LeadTable';
import { useLeads } from '@/hooks/queries/leads';

function LeadsPage() {
  const { data, isLoading } = useLeads();
  
  return (
    <LeadTable
      data={data}
      isLoading={isLoading}
      onCreateLead={handleCreate}
      canCreateLead={hasPermission}
    />
  );
}
```

## Components

### Core DataTable Components

- `DataTable` - Main table wrapper with TanStack Table integration
- `DataTablePagination` - Pagination controls with page size selector
- `DataTableToolbar` - Search bar and filter controls container
- `DataTableColumnHeader` - Sortable column headers with dropdown menus
- `DataTableSkeleton` - Loading skeleton for table data

### Lead-Specific Components

- `LeadTable` - Complete lead table with filters and actions
- `LeadTableFilters` - Status, type, and priority filter dropdowns
- `columns.tsx` - Column definitions with formatters and actions

## Integration with State Management

The LeadTable automatically integrates with:

- **filterStore**: For filter state, search, sorting, and pagination
- **authStore**: For user permissions and initiative context
- **uiStore**: For loading states and error toasts

No manual state management required - just use the hooks!