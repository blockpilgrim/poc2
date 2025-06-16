# Data Table Pattern Guide

## Overview

The `DataTable` component is a reusable, accessible, and feature-rich table implementation built on TanStack Table. This guide explains how to use it for different data types.

## Core Features

- **Sorting**: Click column headers to sort
- **Pagination**: Integrated with `filterStore`
- **Row Selection**: Checkbox selection with bulk operations
- **Loading States**: Skeleton UI during data fetching
- **Keyboard Navigation**: Full keyboard support
- **Responsive**: Adapts to different screen sizes
- **Customizable**: Toolbar, columns, and actions

## Basic Implementation

### 1. Define Your Columns

```typescript
import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/data/DataTable"

export const getColumns = (navigate: NavigateFunction): ColumnDef<YourType>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  // Add more columns...
]
```

### 2. Create Table Component

```typescript
export function YourTable() {
  const navigate = useNavigate()
  const { data, isLoading } = useYourData()
  const columns = getColumns(navigate)
  
  const handleRowClick = (item: YourType) => {
    navigate(`/your-route/${item.id}`)
  }
  
  return (
    <DataTable
      columns={columns}
      data={data?.items || []}
      isLoading={isLoading}
      toolbar={<YourTableFilters />}
      onRowClick={handleRowClick}
    />
  )
}
```

### 3. Implement Filters

```typescript
export function YourTableFilters() {
  const { filters, setFilter } = useFilterStore()
  
  return (
    <div className="flex items-center space-x-2">
      <Input
        placeholder="Search..."
        value={filters.search}
        onChange={(e) => setFilter(e.target.value)}
      />
      {/* Add more filter controls */}
    </div>
  )
}
```

## Column Patterns

### Text Column
```typescript
{
  accessorKey: "title",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Title" />
  ),
}
```

### Status Column with Badge
```typescript
{
  accessorKey: "status",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Status" />
  ),
  cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
}
```

### Date Column
```typescript
{
  accessorKey: "createdAt",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Created" />
  ),
  cell: ({ row }) => {
    const date = row.getValue("createdAt") as Date
    return <span>{format(new Date(date), "MMM d, yyyy")}</span>
  },
}
```

### Action Column
```typescript
{
  id: "actions",
  cell: ({ row }) => {
    const item = row.original
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Add menu items */}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
}
```

## Filter Integration

The DataTable integrates with `filterStore` for pagination. To add custom filters:

1. Extend the filter store with your entity's filters
2. Create filter UI components
3. Connect filters to your data fetching hook

## Accessibility Checklist

- ✓ Column headers have sort indicators
- ✓ Sort buttons have descriptive ARIA labels
- ✓ Rows support keyboard navigation (when clickable)
- ✓ Loading states announced to screen readers
- ✓ Empty states provide clear messaging

## Performance Tips

1. **Virtualization**: For large datasets (1000+ rows), consider implementing virtualization
2. **Memoization**: Memoize column definitions if they don't change
3. **Debouncing**: Debounce search inputs to reduce API calls
4. **Pagination**: Use server-side pagination for large datasets

## Common Customizations

### Custom Empty State
```typescript
if (!isLoading && data.length === 0) {
  return <CustomEmptyState />
}
```

### Conditional Row Styling
```typescript
<DataTable
  // ...
  getRowClassName={(row) => 
    row.status === 'urgent' ? 'bg-red-50' : ''
  }
/>
```

### Fixed Columns
Configure in column definition:
```typescript
{
  id: "name",
  // ...
  meta: {
    sticky: true
  }
}
```

## Troubleshooting

**Table not updating when filters change**
- Ensure your data fetching hook reads from filterStore
- Check that filter changes trigger new queries

**Performance issues with large datasets**
- Implement server-side pagination
- Consider virtualization for client-side rendering
- Reduce the number of columns displayed

**Accessibility warnings**
- Ensure all interactive elements have proper ARIA labels
- Test keyboard navigation flow
- Verify screen reader announcements