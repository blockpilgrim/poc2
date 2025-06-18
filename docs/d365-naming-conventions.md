# D365 Web API Naming Conventions Guide

## Overview

The Microsoft Dynamics 365 Web API has specific naming conventions that must be followed for different query contexts. This guide explains these conventions and how they're implemented in the Partner Portal.

## Key Naming Rules

### 1. Entity Set Names (Plural)
- **Rule**: Use plural entity set names in URLs
- **Example**: `/api/data/v9.2/tc_everychildleads` (not `tc_everychildlead`)

### 2. Navigation Properties ($expand)
- **Rule**: Use PascalCase for navigation properties
- **Examples**:
  - ✅ `tc_Contact` (correct)
  - ❌ `tc_contact` (incorrect)
  - ✅ `tc_LeadOwner` (correct)
  - ❌ `tc_leadowner` (incorrect)

### 3. Field Names ($select and $filter)
- **Rule**: Use lowercase for field names
- **Examples**:
  - `tc_name`
  - `tc_everychildleadid`
  - `createdon`
  - `statecode`

### 4. Lookup Field Values
- **Rule**: Use `_value` suffix for lookup field references
- **Examples**:
  - `_tc_contact_value` (GUID of the related contact)
  - `_tc_initiative_value` (GUID of the related initiative)
  - `_tc_fosterorganization_value` (GUID of the related organization)

## Query Examples

### Correct $expand Usage
```
GET /tc_everychildleads?$expand=tc_Contact($select=fullname,emailaddress1),tc_LeadOwner($select=fullname)
                                  ^^^^^^^^^                               ^^^^^^^^^^^
                                  PascalCase                              PascalCase
```

### Correct $select Usage
```
GET /tc_everychildleads?$select=tc_name,_tc_contact_value,createdon
                                 ^^^^^^^  ^^^^^^^^^^^^^^^^^  ^^^^^^^^
                                lowercase  lookup value     lowercase
```

### Correct $filter Usage
```
GET /tc_everychildleads?$filter=_tc_initiative_value eq 'guid' and statecode eq 0
                                 ^^^^^^^^^^^^^^^^^^^^               ^^^^^^^^^
                                 lookup value                       lowercase
```

## Implementation in Code

### Field Constants Structure

```typescript
export const D365_LEAD_FIELDS = {
  // Base fields (lowercase for $select and $filter)
  ID: 'tc_everychildleadid',
  NAME: 'tc_name',
  
  // Lookup values (with _value suffix)
  CONTACT_VALUE: '_tc_contact_value',
  INITIATIVE: '_tc_initiative_value',
  
  // Navigation properties (PascalCase for $expand)
  CONTACT_NAV: 'tc_Contact',
  LEAD_OWNER_NAV: 'tc_LeadOwner',
  
  // Fields within expanded entities
  CONTACT_FIELDS: {
    FULLNAME: 'fullname',
    EMAIL: 'emailaddress1'
  }
};
```

### Query Construction Examples

#### Building an Expand Clause
```typescript
const expandParts = [
  `${D365_LEAD_FIELDS.CONTACT_NAV}($select=${D365_LEAD_FIELDS.CONTACT_FIELDS.FULLNAME})`,
  `${D365_LEAD_FIELDS.LEAD_OWNER_NAV}($select=${D365_LEAD_FIELDS.CONTACT_FIELDS.FULLNAME})`
];
const expandClause = `$expand=${expandParts.join(',')}`;
// Result: $expand=tc_Contact($select=fullname),tc_LeadOwner($select=fullname)
```

#### Building a Select Clause
```typescript
const selectFields = [
  D365_LEAD_FIELDS.ID,
  D365_LEAD_FIELDS.NAME,
  D365_LEAD_FIELDS.CONTACT_VALUE
];
const selectClause = `$select=${selectFields.join(',')}`;
// Result: $select=tc_everychildleadid,tc_name,_tc_contact_value
```

## Common Pitfalls

### ❌ Using lowercase for navigation properties
```
// WRONG
$expand=tc_contact($select=fullname)
        ^^^^^^^^^^
        Should be tc_Contact
```

### ❌ Using PascalCase for field names
```
// WRONG
$select=tc_Name,CreatedOn
        ^^^^^^^  ^^^^^^^^^
        Should be tc_name,createdon
```

### ❌ Missing _value suffix for lookups
```
// WRONG
$filter=tc_initiative eq 'guid'
        ^^^^^^^^^^^^^
        Should be _tc_initiative_value
```

## Response Structure

D365 responses will use the same naming conventions:

```json
{
  "tc_everychildleadid": "guid",
  "tc_name": "Lead Name",
  "_tc_contact_value": "contact-guid",
  "_tc_leadowner_value": "owner-guid",
  "tc_Contact": {
    "fullname": "John Doe",
    "emailaddress1": "john@example.com"
  },
  "tc_LeadOwner": {
    "fullname": "Jane Smith"
  }
}
```

Note how expanded entities use PascalCase in the response.

## Testing

Always test your queries against the actual D365 API to verify field names:

1. Use Postman or similar tool
2. Authenticate with a valid D365 token
3. Test individual query components
4. Verify response structure matches expectations

## References

- [Microsoft Docs: Query Data using the Web API](https://docs.microsoft.com/en-us/powerapps/developer/data-platform/webapi/query-data-web-api)
- [OData Query Options](https://docs.microsoft.com/en-us/powerapps/developer/data-platform/webapi/query-data-web-api#odata-query-options)