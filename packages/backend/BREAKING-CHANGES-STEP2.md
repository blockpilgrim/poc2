# Breaking Changes - Step 2: Shared Types Update

## Overview
Step 2 of the Lead Data Source Realignment updates the shared Lead interface to match the D365 `tc_everychildlead` entity structure. This is a **breaking change** that affects the API response format.

## Breaking Changes

### Lead Interface Properties

#### Removed Properties
- `d365Id` - Now just use `id`
- `firstName` - Use `subjectName` instead (full name)
- `lastName` - Use `subjectName` instead (full name)
- `displayName` - Use `name` (lead title) or `subjectName` (person's name)
- `email` - Use `subjectEmail` instead
- `phoneNumber` - Not available in tc_everychildlead
- `alternatePhone` - Not available in tc_everychildlead
- `address` - Not available in tc_everychildlead
- `source` - Not available in tc_everychildlead
- `priority` - Not available in tc_everychildlead
- `assignedToId` - Not available in tc_everychildlead
- `assignedToName` - Use `leadOwnerName` instead
- `notes` - Not available in tc_everychildlead
- `tags` - Not available in tc_everychildlead
- `customFields` - Not available in tc_everychildlead
- `lastContactedAt` - Not available in tc_everychildlead
- `assignedAt` - Not available in tc_everychildlead

#### New/Changed Properties
- `name` (string) - The lead title from tc_name
- `subjectName` (string?) - The lead subject's full name
- `subjectEmail` (string?) - The lead subject's email
- `leadOwnerName` (string?) - The internal owner of the lead
- `leadScore` (number?) - Lead scoring metric

### Type Enum Changes

#### LeadStatus
**Old values:** 'new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'nurturing', 'won', 'lost', 'disqualified'

**New values:** 'assigned', 'in-progress', 'certified', 'on-hold', 'closed', 'other'

#### LeadType  
**Old values:** 'foster_parent', 'adoptive_parent', 'relative_caregiver', 'social_worker', 'case_manager', 'therapist', 'agency', 'nonprofit', 'government', 'volunteer', 'donor', 'other'

**New values:** 'foster', 'volunteer', 'other'

### LeadFilters Interface
All filter properties have been removed except for `search`. Filtering by status, type, priority, etc. is no longer supported in the API.

## API Response Changes

### GET /api/v1/leads
**Old response structure:**
```json
{
  "data": [{
    "id": "123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "status": "new",
    "type": "foster_parent",
    "priority": "high",
    // ... other fields
  }]
}
```

**New response structure:**
```json
{
  "data": [{
    "id": "123",
    "name": "Foster Family Inquiry - Smith",
    "subjectName": "John Doe",
    "subjectEmail": "john@example.com",
    "leadOwnerName": "Jane Smith",
    "status": "assigned",
    "type": "foster",
    "leadScore": 85,
    // ... other fields
  }]
}
```

### PATCH /api/v1/leads/:id
Currently returns 501 Not Implemented. Will be re-enabled after frontend updates (Step 3).

## Migration Notes

1. **Frontend Impact**: The frontend will need significant updates to handle the new data structure. This is planned for Step 3.

2. **Contact Information**: The lead subject's contact info is now in `subjectName` and `subjectEmail` fields instead of direct properties.

3. **Organization Context**: Organization assignment (`assignedOrganizationId`, `assignedOrganizationName`) comes from JWT claims, not D365.

4. **Filtering**: Most filtering is now done server-side based on JWT claims (initiative, organization). Client-side filtering options are limited to search only.

5. **Status/Type Values**: Applications using the old status/type values will need to map them to the new simplified values.

## Backward Compatibility
There is **NO** backward compatibility maintained in this update. All API consumers must update to use the new Lead structure.

## Next Steps
Step 3 will update the frontend to consume the new API structure and complete the migration.