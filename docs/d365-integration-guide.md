# D365 Integration Guide

## Overview
The Partner Portal integrates with Microsoft Dynamics 365 to manage lead data and organizational relationships. This guide covers the data model, query patterns, and best practices for D365 integration.

## Core Entities

### tc_everychildlead
The primary entity for lead management.

**Key Fields:**
- `tc_everychildleadid`: Unique identifier (GUID)
- `tc_name`: Lead title/name
- `tc_ecleadlifecyclestatus`: Status (option set)
- `tc_engagementinterest`: Type (option set)
- `tc_leadscore2`: Lead score (integer)
- `statecode`: Active/Inactive state

**Relationships:**
- `tc_contact`: The person who is the subject of the lead
- `tc_leadowner`: Internal user who owns the lead
- `_tc_initiative_value`: Initiative assignment
- `_tc_fosterorganization_value`: Foster organization assignment
- `tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi`: Volunteer organization assignments (1:N to junction entity)

### Contact
Represents users and lead subjects.

**Key Fields:**
- `contactid`: Unique identifier
- `fullname`: Display name
- `emailaddress1`: Primary email
- `msevtmgt_aadobjectid`: Azure AD object ID (for user mapping)
- `_parentcustomerid_value`: Related organization (Account)

### Account
Represents partner organizations.

**Key Fields:**
- `accountid`: Unique identifier
- `name`: Organization name
- `tc_organizationleadtype`: Organization type (Foster/Volunteer)

## Option Set Mappings

### Lead Status (tc_ecleadlifecyclestatus)
```
948010000 → 'assigned'
948010001 → 'in-progress'
948010002 → 'certified'
948010003 → 'on-hold'
948010004 → 'closed'
```

### Lead Type (tc_engagementinterest)
```
948010000 → 'foster'
948010001 → 'volunteer'
```

### Organization Type (tc_organizationleadtype)
```
948010000 → Foster organization
948010001 → Volunteer organization
```

## Query Patterns

### Basic Query Structure
```typescript
GET /api/data/v9.2/{entity}?{query}
```

### Security Filtering
All queries MUST include initiative filter with D365 GUID:
```
$filter=_tc_initiative_value eq '{initiativeGuid}'
```

**Important**: The `_tc_initiative_value` field expects a D365 Initiative entity GUID, not the application initiative ID. The system automatically converts between application IDs (e.g., 'ec-oregon') and D365 GUIDs. See [Initiative GUID Configuration Guide](./initiative-guid-configuration.md) for details.

### Organization-Based Filtering

**Foster Organizations:**
```
$filter=_tc_fosterorganization_value eq '{organizationId}'
```

**Volunteer Organizations (via Junction Entity):**
```
$filter=tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi/any(o:o/_tc_volunteerorganization_value eq '{organizationId}')
```

### Expanding Related Entities
```
$expand=tc_Contact($select=fullname,emailaddress1),tc_LeadOwner($select=fullname)
```

**Important**: Navigation properties for `$expand` must use PascalCase. See [D365 Naming Conventions](./d365-naming-conventions.md) for details.

### Field Selection
```
$select=tc_everychildleadid,tc_name,tc_ecleadlifecyclestatus,createdon
```

### Pagination
```
$top=50&$skip=100&$count=true
```

### Sorting
```
$orderby=modifiedon desc
```

**Field Name Mapping for Sorting:**
The system automatically maps frontend field names to D365 field names:
- `updatedAt` → `modifiedon`
- `createdAt` → `createdon`
- `name` → `tc_name`
- `status` → `tc_ecleadlifecyclestatus`
- `type` → `tc_engagementinterest`
- `leadScore` → `tc_leadscore2`

## Authentication

### Application Authentication
For server-to-server operations:
```typescript
const token = await getClientCredentialsToken({
  clientId: AZURE_CLIENT_ID,
  clientSecret: AZURE_CLIENT_SECRET,
  scope: `${D365_URL}/.default`
});
```

### On-Behalf-Of Flow
For user-specific operations:
```typescript
const token = await getOnBehalfOfToken({
  userToken: request.token,
  scope: `${D365_URL}/user_impersonation`
});
```

## Error Handling & Retry Logic

### Automatic Retry
All D365 API calls include automatic retry with exponential backoff:
- **Retryable errors**: 429 (rate limit), 500, 502, 503, 504
- **Network errors**: ECONNRESET, ETIMEDOUT, AbortError
- **Max attempts**: 3 (configurable)
- **Backoff**: 1s → 2s → 4s (with jitter)

### Error Parsing
D365 errors are automatically parsed to user-friendly messages:
```typescript
// Raw D365 error
{ error: { code: "0x80040265", message: "Entity not found" } }

// Parsed error
AppError: "The requested record was not found"
```

## Best Practices

### 1. Query Optimization
- Use `$select` to limit fields
- Avoid deep `$expand` operations
- Set reasonable `$top` limits
- Use server-side filtering, not client-side

### 2. Error Handling
```typescript
try {
  const response = await fetch(d365Url, options);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new D365Error(response.status);
  }
  return response.json();
} catch (error) {
  // Log and handle appropriately
}
```

### 3. Null Safety
Always check for null relationships:
```typescript
const contactName = lead.tc_contact?.fullname || 'Unknown';
```

### 4. Batch Operations
For multiple operations, use batch requests:
```
POST /api/data/v9.2/$batch
```

### 5. Change Tracking
Use ETags for optimistic concurrency:
```typescript
headers: {
  'If-Match': etag  // From previous GET
}
```

## Common Issues

### 1. Junction Entity Queries
The volunteer organization filter uses a 1:N relationship to a junction entity:
```
tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi/any(o:o/_tc_volunteerorganization_value eq '{id}')
```
- `tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi`: 1:N navigation property to junction entity
- `any()`: OData function for collections
- `o:`: Alias for the junction entity record

### 2. Option Set Values
Always map integers to strings:
```typescript
const status = LEAD_STATUS_MAP[lead.tc_ecleadlifecyclestatus] || 'other';
```

### 3. GUID Formatting
D365 accepts GUIDs with or without braces:
```
accountid eq '123e4567-e89b-12d3-a456-426614174000'
accountid eq '{123e4567-e89b-12d3-a456-426614174000}'
```

**Initiative GUIDs**: The `_tc_initiative_value` field stores D365 Initiative entity GUIDs. The application handles the mapping from friendly IDs (e.g., 'ec-oregon') to GUIDs automatically.

### 4. Date Filtering
Use ISO 8601 format:
```
createdon gt 2024-01-01T00:00:00Z
```

## Testing Queries

### Using Postman
1. Get access token via client credentials
2. Set Authorization header: `Bearer {token}`
3. Set OData headers:
   - `OData-MaxVersion: 4.0`
   - `OData-Version: 4.0`
   - `Accept: application/json`

### Query Builder Tool
D365 provides a query builder at:
```
{D365_URL}/tools/xquery
```

### Common Test Queries

**Get Active Leads for Initiative:**
```
/tc_everychildleads?$filter=statecode eq 0 and _tc_initiative_value eq 'b6ced3de-2993-ed11-aad1-6045bd006a3a'&$top=10
```
Note: Replace with actual Initiative GUID from D365

**Get Lead with Relationships:**
```
/tc_everychildleads({id})?$expand=tc_contact,tc_leadowner
```

**Search by Name:**
```
/tc_everychildleads?$filter=contains(tc_name,'Smith')
```

## Performance Monitoring

### Key Metrics
- Query response time
- Payload size
- Number of expanded entities
- Token refresh frequency

### Optimization Strategies
1. Cache access tokens (until expiry)
2. Use field selection ($select)
3. Implement pagination
4. Avoid N+1 queries
5. Batch related operations

## Security Considerations

### Data Access
- Always enforce initiative filtering
- Verify organization ownership
- Log all data access
- Use least-privilege tokens

### Token Management
- Store tokens securely
- Refresh before expiry
- Never log tokens
- Use short-lived tokens

### Audit Trail
Log all D365 operations with:
- User identity
- Operation type
- Entity accessed
- Filters applied
- Response status