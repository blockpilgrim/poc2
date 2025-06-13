# Data Fetching Patterns

Quick reference for common data fetching scenarios in the Partner Portal.

## Query Patterns

### Basic List Query
```typescript
function LeadsList() {
  const { data, isLoading } = useLeads();
  return isLoading ? <Skeleton /> : <Table data={data} />;
}
```

### Query with Custom Options
```typescript
const { data } = useLeads({
  enabled: hasPermission('view_leads')
});
```

### Single Item Query
```typescript
function LeadDetail({ id }: { id: string }) {
  const { data: lead } = useLead(id);
  return lead ? <Detail lead={lead} /> : null;
}
```

### Dependent Queries
```typescript
function TeamLeads({ teamId }: { teamId?: string }) {
  const { data: team } = useTeam(teamId);
  const { data: leads } = useTeamLeads(team?.id, {
    enabled: !!team?.id
  });
}
```

## Mutation Patterns

### Basic Update
```typescript
function EditButton({ lead }: { lead: Lead }) {
  const updateLead = useUpdateLead();
  
  return (
    <button onClick={() => updateLead.mutate({
      id: lead.id,
      data: { status: 'contacted' }
    })}>
      Mark Contacted
    </button>
  );
}
```

### With Success Handler
```typescript
const updateLead = useUpdateLead({
  onSuccess: (data) => {
    navigate(`/leads/${data.id}`);
    showToast('Lead updated!', 'success');
  }
});
```

### Optimistic Updates
```typescript
const updateLead = useUpdateLead({ 
  optimistic: true // UI updates immediately
});
```

### Bulk Operations
```typescript
function BulkActions({ selectedIds }: { selectedIds: string[] }) {
  const { updateStatus } = useBulkUpdateLeadStatus();
  
  return (
    <button onClick={() => updateStatus(selectedIds, 'qualified')}>
      Qualify Selected ({selectedIds.length})
    </button>
  );
}
```

## Filter Integration

### Automatic Filter Sync
```typescript
// Filters come from filterStore automatically
function FilteredLeads() {
  const { data } = useLeads(); // Uses current filters
  const { setLeadStatus } = useFilterStore();
  
  return (
    <>
      <StatusFilter onChange={setLeadStatus} />
      <LeadTable leads={data?.data} />
    </>
  );
}
```

### Manual Filter Control
```typescript
function CustomLeadsList() {
  const { leadFilters } = useFilterStore();
  const { data } = useLeadsWithCustomFilters({
    ...leadFilters,
    customParam: 'value'
  });
}
```

## Error Handling

### Default Error Handling
```typescript
// Errors show as toasts automatically
const { data, error } = useLeads();
// No need to handle error - toast will show
```

### Custom Error Handling
```typescript
const { data } = useLead(id, {
  onError: (error) => {
    if (error.message.includes('404')) {
      navigate('/leads');
    }
  }
});
```

### Silent Errors
```typescript
// For non-critical features like stats
const { data: stats } = useLeadStats();
// Errors logged but no toast shown
```

## Cache Management

### Invalidate After Mutation
```typescript
const createLead = useCreateLead({
  onSuccess: () => {
    // Automatically invalidates lead lists
    queryClient.invalidateQueries({ 
      queryKey: leadKeys.lists() 
    });
  }
});
```

### Prefetch on Hover
```typescript
function LeadLink({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { initiative } = useAuthStore();
  
  return (
    <Link 
      to={`/leads/${id}`}
      onMouseEnter={() => {
        queryClient.prefetchQuery({
          queryKey: leadKeys.detail(initiative!, id),
          queryFn: () => fetchLead(id)
        });
      }}
    >
      View Lead
    </Link>
  );
}
```

### Update Cache Directly
```typescript
// After creating a lead, add it to cache
queryClient.setQueryData(
  leadKeys.detail(initiative, newLead.id), 
  newLead
);
```

## Performance Tips

### Use Select for Derived Data
```typescript
const { data: leadCount } = useLeads({
  select: (data) => data.pagination.totalItems
});
```

### Stale While Revalidate
```typescript
const { data } = useLeads(); 
// Shows stale data immediately while fetching fresh data
```

### Placeholder Data
```typescript
const { data = [] } = useLeads({
  placeholderData: []
}); 
// No undefined checks needed
```

## Testing Patterns

### Mock Query in Tests
```typescript
const mockLeads = [{ id: '1', name: 'Test Lead' }];

jest.mock('@/hooks/queries/leads', () => ({
  useLeads: () => ({
    data: { data: mockLeads },
    isLoading: false,
    error: null
  })
}));
```

### Test Error States
```typescript
const { result } = renderHook(() => useLeads());

// Trigger error
await waitFor(() => {
  expect(result.current.error).toBeTruthy();
});

// Verify toast shown
expect(mockShowToast).toHaveBeenCalledWith(
  expect.stringContaining('error'),
  'error'
);
```