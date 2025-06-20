# D365 tc_everychildlead Integration Guide

This document explains the Partner Portal's integration with Microsoft Dynamics 365, specifically focusing on the `tc_everychildlead` entity used for lead management and clarifying the distinct uses of the Contact entity.

## Why tc_everychildlead?

The Partner Portal uses the custom `tc_everychildlead` entity as the primary data source for lead management. This is a **critical architectural decision** based on the following requirements:

1. **Custom Business Logic**: The tc_everychildlead entity contains partner-specific fields and relationships
2. **Initiative Support**: Built-in support for state-based filtering via initiative fields
3. **Organization Relationships**: Proper linkage to Foster and Volunteer organizations
4. **Lead Lifecycle**: Custom state codes and status reasons for partner workflows
5. **Security Model**: Designed for partner access with appropriate field-level security

## Entity Distinction: Contact vs tc_everychildlead

### Contact Entity - User Authentication Only

The Contact entity is used **exclusively** for mapping authenticated users to their D365 organizations:

```typescript
// CORRECT USE: Finding user's organization during login
const contact = await d365Service.queryContactByAzureId(userAzureId);
const organization = contact._tc_organizationid_value;
```

**When Contact is Used:**
- During user authentication to find their associated Account (organization)
- Mapping Entra ID (AAD Object ID) to D365 user context
- Retrieving user's organization for security filtering

**Key Contact Fields Used:**
- `msevtmgt_aadobjectid`: Links to Entra ID user
- `_tc_organizationid_value`: Links to Account (organization)
- `fullname`: User's display name

### tc_everychildlead Entity - Lead Management

The tc_everychildlead entity contains all partner portal leads:

```typescript
// CORRECT USE: Querying leads for display
const leads = await d365Service.query('tc_everychildleads', {
  select: ['tc_name', 'tc_firstname', 'tc_lastname', ...],
  filter: 'statecode eq 0',
  expand: 'tc_InitiativeId,tc_tc_ecfosterorg_ECLead_tc_everychild'
});
```

**When tc_everychildlead is Used:**
- All lead listing and search operations
- Individual lead detail retrieval
- Lead updates and status changes
- Statistics and reporting

**Key tc_everychildlead Fields:**
- `tc_everychildleadid`: Unique lead identifier
- `tc_name`: Lead title/name
- `tc_firstname`, `tc_lastname`: Person's name
- `tc_email`, `tc_phone`: Contact information
- `tc_InitiativeId`: Links to Initiative (state)
- `tc_tc_ecfosterorg_ECLead_tc_everychild`: Foster organization
- `tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi`: Volunteer organization

## Common Integration Patterns

### 1. User Login Flow

```typescript
// Step 1: Authenticate user with Entra ID
const token = await msalClient.acquireToken(userCredentials);

// Step 2: Find user's D365 Contact (CORRECT Contact usage)
const contact = await d365Service.queryContactByAzureId(token.uniqueId);

// Step 3: Extract organization for filtering
const userOrganization = {
  id: contact._tc_organizationid_value,
  name: contact['_tc_organizationid_value@OData.Community.Display.V1.FormattedValue']
};

// Step 4: Use organization to filter leads (tc_everychildlead)
const leads = await leadService.getLeads({
  organizationId: userOrganization.id,
  organizationType: 'Foster'
});
```

### 2. Lead Query with Organization Filter

```typescript
// Building secure OData filter for tc_everychildlead
const filter = buildODataFilter([
  // Active records only
  'statecode eq 0',
  
  // Initiative filter (state-based)
  `_tc_initiativeid_value eq '${initiativeGuid}'`,
  
  // Organization filter (Foster example)
  `_tc_tc_ecfosterorg_ECLead_tc_everychild_value eq '${organizationId}'`
]);
```

### 3. Expanding Related Entities

```typescript
// Expand to include related entity data
const expandClause = [
  'tc_InitiativeId($select=tc_initiativesid,tc_name)',
  'tc_tc_ecfosterorg_ECLead_tc_everychild($select=accountid,name)',
  'tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi($select=accountid,name)'
].join(',');
```

## Field Mappings

### Frontend → D365 Field Names

| Frontend Field | D365 Field | Type | Notes |
|----------------|------------|------|-------|
| id | tc_everychildleadid | Guid | Primary key |
| name | tc_name | String | Lead title |
| firstName | tc_firstname | String | Person's first name |
| lastName | tc_lastname | String | Person's last name |
| email | tc_email | String | Contact email |
| phone | tc_phone | String | Contact phone |
| status | statuscode | OptionSet | Lead status |
| stage | tc_stage | OptionSet | Lead stage |
| engagementInterest | tc_engagementinterest | String | Multi-select as CSV |
| createdOn | createdon | DateTime | Record creation |
| modifiedOn | modifiedon | DateTime | Last modification |

### Organization Relationships

```typescript
// Foster Organization
interface FosterOrganization {
  d365Field: '_tc_tc_ecfosterorg_ECLead_tc_everychild_value';
  expandField: 'tc_tc_ecfosterorg_ECLead_tc_everychild';
  relatedEntity: 'account';
}

// Volunteer Organization  
interface VolunteerOrganization {
  d365Field: '_tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi_value';
  expandField: 'tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi';
  relatedEntity: 'account';
}
```

## Security Considerations

### Initiative-Based Filtering

Every query MUST include initiative filtering:

```typescript
// Required in every tc_everychildlead query
const initiativeFilter = `_tc_initiativeid_value eq '${userInitiativeGuid}'`;
```

### Organization-Based Access

Users can only see leads from their organization:

```typescript
// Network-wide users: No organization filter needed
if (hasNetworkWideRole(user)) {
  // Can see all organizations of their type
  return typeFilter; // Foster or Volunteer only
}

// Organization-specific users: Must filter by org
return `${typeFilter} and ${organizationFilter}`;
```

## Common Pitfalls and Solutions

### ❌ Wrong: Using Contact for Leads

```typescript
// NEVER DO THIS - Contact doesn't contain leads
const leads = await d365Service.query('contacts', {
  filter: 'tc_leadstatus eq 1' // This field doesn't exist!
});
```

### ✅ Correct: Using tc_everychildlead

```typescript
// ALWAYS use tc_everychildlead for leads
const leads = await d365Service.query('tc_everychildleads', {
  filter: 'statuscode eq 1'
});
```

### ❌ Wrong: Missing Initiative Filter

```typescript
// SECURITY VIOLATION - No initiative boundary
const leads = await d365Service.query('tc_everychildleads', {
  filter: 'statecode eq 0'
});
```

### ✅ Correct: Including Initiative Filter

```typescript
// SECURE - Initiative boundary enforced
const leads = await d365Service.query('tc_everychildleads', {
  filter: `statecode eq 0 and _tc_initiativeid_value eq '${initiativeGuid}'`
});
```

## Example OData Queries

### 1. Get Active Leads for Foster Organization

```
GET /api/data/v9.2/tc_everychildleads?
  $select=tc_everychildleadid,tc_name,tc_firstname,tc_lastname,statuscode
  &$filter=statecode eq 0 
    and _tc_initiativeid_value eq 'GUID-HERE'
    and _tc_tc_ecfosterorg_ECLead_tc_everychild_value eq 'ORG-GUID'
  &$orderby=createdon desc
  &$top=50
```

### 2. Get Lead with Expanded Relationships

```
GET /api/data/v9.2/tc_everychildleads(LEAD-GUID)?
  $select=tc_everychildleadid,tc_name,tc_firstname,tc_lastname,tc_email
  &$expand=tc_InitiativeId($select=tc_name),
    tc_tc_ecfosterorg_ECLead_tc_everychild($select=name)
```

### 3. Search Leads by Name

```
GET /api/data/v9.2/tc_everychildleads?
  $select=tc_everychildleadid,tc_name,tc_firstname,tc_lastname
  &$filter=statecode eq 0
    and _tc_initiativeid_value eq 'GUID-HERE'
    and (contains(tc_firstname, 'John') or contains(tc_lastname, 'John'))
  &$orderby=tc_lastname asc, tc_firstname asc
```

## Testing and Validation

### Verify Correct Entity Usage

```bash
# Check for incorrect Contact usage in lead queries
grep -r "contacts.*lead" --include="*.ts" src/

# Verify tc_everychildleads usage
grep -r "tc_everychildleads" --include="*.ts" src/
```

### Validate Security Filters

```typescript
// Test helper to ensure queries include security filters
function validateLeadQuery(query: string): boolean {
  const required = [
    '_tc_initiativeid_value eq',  // Initiative filter
    'statecode eq'                 // Active records
  ];
  
  return required.every(filter => query.includes(filter));
}
```

## Migration Notes

If migrating from a Contact-based implementation:

1. **Data Model**: tc_everychildlead has completely different fields
2. **Relationships**: Organization links use different navigation properties  
3. **Security**: Initiative filtering is mandatory, not optional
4. **Field Names**: No direct mapping between Contact and tc_everychildlead fields
5. **Query Structure**: Different expand syntax for related entities

## Conclusion

The distinction between Contact and tc_everychildlead usage is fundamental to the Partner Portal's architecture:

- **Contact**: User authentication and organization mapping only
- **tc_everychildlead**: All lead management functionality

This separation ensures proper security boundaries, maintains data integrity, and aligns with the custom business logic required for partner lead management. Any attempt to use Contact for lead management will fail due to incompatible data models.