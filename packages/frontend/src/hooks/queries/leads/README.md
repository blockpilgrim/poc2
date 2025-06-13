# Lead Query Hooks Usage Examples

## Key Security Requirement

All query hooks automatically include the user's initiative in query keys to ensure proper data segregation. This is a critical security boundary - users can only access data within their assigned initiative.

## Basic Usage

### Fetching Leads with Filters

```tsx
import { useLeads } from '@/hooks/queries/leads';

function LeadsList() {
  const { data, isLoading, error } = useLeads();

  if (isLoading) return <div>Loading leads...</div>;
  if (error) return <div>Error loading leads</div>;

  return (
    <div>
      {data?.data.map((lead) => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}
```

### Fetching a Single Lead

```tsx
import { useLead } from '@/hooks/queries/leads';

function LeadDetail({ leadId }: { leadId: string }) {
  const { data: lead, isLoading } = useLead(leadId);

  if (isLoading) return <div>Loading lead details...</div>;
  if (!lead) return <div>Lead not found</div>;

  return (
    <div>
      <h1>{lead.displayName}</h1>
      <p>Status: {lead.status}</p>
      <p>Type: {lead.type}</p>
    </div>
  );
}
```

### Updating a Lead

```tsx
import { useUpdateLead } from '@/hooks/queries/leads';

function LeadEditForm({ lead }: { lead: Lead }) {
  const updateLead = useUpdateLead({
    onSuccess: () => {
      // Navigate back or show success message
    },
  });

  const handleSubmit = (formData: Partial<Lead>) => {
    updateLead.mutate({
      id: lead.id,
      data: formData,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={updateLead.isPending}>
        {updateLead.isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
```

### Using Lead Status Update with Confirmation

```tsx
import { useUpdateLeadStatus } from '@/hooks/queries/leads';

function LeadStatusDropdown({ lead }: { lead: Lead }) {
  const { updateStatus, isPending } = useUpdateLeadStatus();

  return (
    <select
      value={lead.status}
      onChange={(e) => updateStatus(lead.id, e.target.value as Lead['status'])}
      disabled={isPending}
    >
      <option value="new">New</option>
      <option value="contacted">Contacted</option>
      <option value="qualified">Qualified</option>
      <option value="in_progress">In Progress</option>
      <option value="converted">Converted</option>
      <option value="closed">Closed</option>
    </select>
  );
}
```

### Bulk Operations

```tsx
import { useBulkUpdateLeadStatus } from '@/hooks/queries/leads';

function BulkActions({ selectedLeadIds }: { selectedLeadIds: string[] }) {
  const { updateStatus, isPending } = useBulkUpdateLeadStatus();

  const handleBulkStatusChange = (status: Lead['status']) => {
    updateStatus(selectedLeadIds, status);
  };

  return (
    <div>
      <button
        onClick={() => handleBulkStatusChange('contacted')}
        disabled={isPending || selectedLeadIds.length === 0}
      >
        Mark as Contacted ({selectedLeadIds.length})
      </button>
    </div>
  );
}
```

### Dashboard with Statistics

```tsx
import { useLeadStats } from '@/hooks/queries/leads';

function LeadsDashboard() {
  const { data: stats, isLoading } = useLeadStats();

  if (isLoading) return <div>Loading statistics...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard title="Total Leads" value={stats?.total || 0} />
      <StatCard title="New Leads" value={stats?.byStatus.new || 0} />
      <StatCard title="Converted" value={stats?.byStatus.converted || 0} />
    </div>
  );
}
```

## Store Integration

The hooks automatically integrate with:

- **filterStore**: Reads current filters and updates pagination after queries
- **uiStore**: Shows toast notifications for errors and success messages
- **authStore**: Uses initiative context from auth (handled by API interceptor)

## Query Keys

All query keys are centralized in `queryKeys.ts` for consistent cache management:

```tsx
import { leadKeys } from '@/hooks/queries/queryKeys';
import { useQueryClient } from '@tanstack/react-query';

// Invalidate all lead queries
queryClient.invalidateQueries({ queryKey: leadKeys.all });

// Invalidate specific lead
queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadId) });

// Invalidate lead lists
queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
```