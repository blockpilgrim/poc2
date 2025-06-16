# Lead Management Quick Reference

## Common Development Tasks

### Adding a New Lead Field to the Table

1. **Update Column Definition** in `/components/data/LeadTable/columns.tsx`:
```typescript
{
  accessorKey: "newField",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="New Field" />
  ),
  cell: ({ row }) => row.getValue("newField") || "-",
}
```

2. **Ensure Field Exists** in Lead type (`@partner-portal/shared`)

### Adding a New Filter

1. **Update Filter Store** (`/stores/filterStore.ts`):
   - Add to `LeadFilters` interface
   - Create setter action
   - Reset in `resetLeadFilters`

2. **Add UI Control** in `LeadTableFilters.tsx`

3. **Include in Query** (`/hooks/queries/leads/useLeads.ts`)

### Creating a New Lead Badge/Status

1. **Create Component** in `/components/leads/`:
```typescript
const config = {
  value1: { label: "Label", variant: "default" },
  value2: { label: "Label", variant: "secondary" },
}

export function NewBadge({ value }) {
  const { label, variant } = config[value]
  return <Badge variant={variant}>{label}</Badge>
}
```

2. **Export** from `/components/leads/index.ts`

### Customizing Lead Card for Mobile

Edit `/components/leads/LeadCard.tsx` to:
- Add/remove fields
- Change layout
- Modify click behavior

## Key File Locations

| Purpose | File Path |
|---------|-----------|
| Lead list page | `/pages/leads/index.tsx` |
| Lead detail page | `/pages/leads/[id].tsx` |
| Table columns | `/components/data/LeadTable/columns.tsx` |
| Filter controls | `/components/data/LeadTable/LeadTableFilters.tsx` |
| Lead components | `/components/leads/` |
| Data fetching | `/hooks/queries/leads/` |
| Filter state | `/stores/filterStore.ts` |

## Filter Store Integration

### Reading Filters
```typescript
const { leadFilters } = useFilterStore()
const { search, filters } = leadFilters
```

### Setting Filters
```typescript
const { setLeadStatus, setLeadType } = useFilterStore()
setLeadStatus('new')
setLeadType('foster')
```

### Resetting Filters
```typescript
const { resetLeadFilters } = useFilterStore()
```

## Query Hooks

### Fetch Lead List
```typescript
const { data, isLoading, error } = useLeads()
// data.data = Lead[]
// Filters automatically applied from filterStore
```

### Fetch Single Lead
```typescript
const { data: lead, isLoading } = useLead(leadId)
```

### Update Lead
```typescript
const { mutate: updateLead } = useUpdateLead()
updateLead({ id: leadId, data: updates })
```

## Navigation Patterns

### Internal Navigation (SPA)
```typescript
const navigate = useNavigate()
navigate(`/leads/${leadId}`)
```

### External Links
```typescript
window.location.href = `mailto:${email}`
window.location.href = `tel:${phone}`
```

## Component Composition

### Table with Filters
```typescript
<Card>
  <CardHeader>
    <CardTitle>All Leads</CardTitle>
  </CardHeader>
  <CardContent>
    <LeadTable />
  </CardContent>
</Card>
```

### Empty State
```typescript
<EmptyLeadsState
  hasFilters={hasActiveFilters}
  onResetFilters={resetLeadFilters}
/>
```

## Debugging Tips

### Check Active Filters
```typescript
console.log(useFilterStore.getState().leadFilters)
```

### Monitor Query State
- Install React Query DevTools
- Check query keys include initiative
- Verify filter parameters

### Common Issues

**Filters not working**
- Ensure `useLeads()` is reading from filterStore
- Check filter values are valid (not undefined)
- Verify API accepts filter parameters

**Table not updating**
- Check query key includes all dependencies
- Ensure pagination updates after data changes
- Verify no stale closures in callbacks

**Navigation not working**
- Use React Router for internal routes
- Check route definitions in App.tsx
- Ensure protected route wrapper is applied