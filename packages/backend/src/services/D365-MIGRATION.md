# D365 Service Migration Guide

## Overview

This guide documents the Phase 4 refactoring of the D365 service, transitioning from using D365 for identity/RBAC to using it exclusively for organization and business data.

## Architecture Changes

### Before (Legacy)
- **D365 Contact Fields**: Used for identity, initiative assignment, and roles
  - `tc_initiative` → User's initiative (security boundary)
  - `crda6_portalroles` → User's portal roles
  - `msevtmgt_aadobjectid` → Azure AD Object ID linkage

### After (Current)
- **Microsoft Entra ID**: Identity and RBAC
  - Security Groups → Initiative assignment (e.g., "EC Arkansas")
  - App Roles → Permissions (Admin, Foster Partner, etc.)
- **D365**: Organization and business data only
  - Contact → User's business profile (queried by `msevtmgt_aadobjectid`)
  - Account → Organization details via `_parentcustomerid_value`
  - `tc_organizationleadtype` → Organization type (e.g., "Foster")

## API Changes

### Deprecated Method
```typescript
// DEPRECATED - Do not use in new code
getUserWithInitiative(email: string, d365Token: string): Promise<{
  user: User;
  initiative: Initiative;
}>
```

### New Method
```typescript
// Use this for fetching organization data
getUserOrganization(
  azureObjectId: string,  // User's Azure AD Object ID
  d365Token: string
): Promise<OrganizationData | undefined>
```

## Migration Steps

### 1. Update Environment Variables
```env
# Enable Entra ID groups/roles
ENTRA_GROUPS_ENABLED=true
D365_ORG_DATA_ENABLED=true

# Configure D365 (optional - org data will be undefined if not set)
D365_URL=https://your-org.crm.dynamics.com
D365_CLIENT_ID=your-client-id
D365_CLIENT_SECRET=your-client-secret
```

### 2. Update Authentication Flow
The auth controller automatically handles both legacy and new flows based on feature flags:

```typescript
if (config.ENTRA_GROUPS_ENABLED) {
  // New flow: Extract groups/roles from Entra ID
  const { groups, roles } = await authService.extractGroupsAndRoles(idToken);
  initiative = initiativeMappingService.getInitiativeFromGroups(groups);
  
  // Optionally fetch org data
  if (config.D365_ORG_DATA_ENABLED) {
    const azureObjectId = authResult.account.homeAccountId;
    organization = await d365Service.getUserOrganization(azureObjectId, d365Token);
  }
} else {
  // Legacy flow: Use getUserWithInitiative
  const { user, initiative } = await d365Service.getUserWithInitiative(email, d365Token);
}
```

### 3. Handle Organization Data
Organization data is **optional** - authentication should not fail if D365 is unavailable:

```typescript
// Organization data structure
interface OrganizationData {
  id: string;           // D365 Account ID
  name: string;         // Organization name
  type?: string;        // tc_organizationleadtype
  attributes?: {        // Additional D365 fields
    leadType?: string;
    createdOn?: string;
    modifiedOn?: string;
  };
}
```

### 4. Update JWT Claims
JWT tokens now include both identity and optional org data:

```typescript
interface ExtendedJWTPayload {
  // Identity from Entra ID
  sub: string;
  email: string;
  name: string;
  groups: string[];     // Entra ID security groups
  roles: string[];      // Entra ID app roles
  initiative: string;   // Derived from groups
  
  // Optional business data from D365
  organization?: OrganizationData;
}
```

## Testing

### Stub Mode (Development)
When `D365_URL` is not configured:
- `getUserOrganization` returns `undefined`
- No D365 API calls are made
- Authentication proceeds without org data

### Production Mode
When `D365_URL` is configured:
1. Query Contact by `msevtmgt_aadobjectid` (Azure AD Object ID)
2. Get Account via `_parentcustomerid_value`
3. Return organization details with `tc_organizationleadtype`
4. Handle failures gracefully (return `undefined`)

### Running Tests
```bash
cd packages/backend
npm test src/services/__tests__/d365.service.test.ts
```

## Error Handling

The service implements graceful degradation:

1. **D365 Unavailable**: Returns `undefined`, auth continues
2. **Contact Not Found**: Returns `undefined`, auth continues
3. **No Parent Account**: Returns `undefined`, auth continues
4. **Network Errors**: Logged but not thrown, returns `undefined`

## Production Checklist

- [ ] Configure Entra ID App Registration with groups/roles
- [ ] Enable feature flags in environment
- [ ] Configure D365 credentials (optional)
- [ ] Ensure D365 Contact records have `msevtmgt_aadobjectid` populated
- [ ] Verify `tc_organizationleadtype` field on Account entity for org type
- [ ] Test auth flow with both Entra ID and D365
- [ ] Monitor logs for D365 failures
- [ ] Verify JWT tokens include correct claims
- [ ] Test with users who have no D365 org data

## Rollback Plan

If issues arise, disable feature flags to revert to legacy flow:
```env
ENTRA_GROUPS_ENABLED=false
D365_ORG_DATA_ENABLED=false
```

## Future Considerations

1. **Caching**: Consider caching org data to reduce D365 API calls
2. **Retry Logic**: Implement exponential backoff for D365 failures
3. **Required Org Data**: Some roles may require org data in the future
4. **Performance**: Monitor D365 query performance and optimize as needed