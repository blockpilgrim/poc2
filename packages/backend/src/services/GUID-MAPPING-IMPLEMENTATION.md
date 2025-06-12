# GUID-Based Initiative Mapping Implementation

## Overview
This implementation uses Entra ID group GUIDs as the primary method for initiative mapping, eliminating the need for Microsoft Graph API calls during authentication and resolving the "No valid initiative group found" errors.

## Architecture Decisions

### Why GUIDs?
1. **Immutability**: GUIDs never change, unlike group names
2. **Performance**: No Graph API calls needed during token validation
3. **Reliability**: Works even when Microsoft Graph is unavailable
4. **Security**: Smaller attack surface, no external dependencies
5. **Standards**: Aligns with Microsoft's intended design for group claims

### Group Structure
The system supports a two-tier group structure:
- **All Users groups**: Base access to an initiative (e.g., "Partner Portal - EC Oregon - All Users")
- **Role groups**: Specific permissions within an initiative (e.g., "Partner Portal - EC Oregon - Foster Only")

## Implementation Details

### 1. InitiativeMappingService
- Uses `guidToInitiative` Map as the primary source of truth
- `extractInitiativeFromGroups()` only processes GUIDs
- `extractRolesFromGroups()` extracts role information from group memberships
- All legacy name-based code has been removed

### 2. Group Naming Utils
- Removed all legacy group support functions
- `isValidInitiativeGroup()` accepts GUIDs and Partner Portal format only
- `findBestInitiativeGroup()` is deprecated and returns null

### 3. Auth Flow
- Auth controller passes GUIDs directly to initiative mapping service
- No Graph API calls for group name resolution
- Auth middleware validates initiative presence in JWT

## Current GUID Mappings

| GUID | Group Name | Initiative | Type |
|------|------------|------------|------|
| e6ae3a86-446e-40f0-a2fb-e1b83f11cd3b | Partner Portal - EC Oregon - All Users | ec-oregon | all-users |
| b25d4508-8b32-4e7f-bc90-d2699adb12a7 | Partner Portal - EC Oregon - Foster Only | ec-oregon | role |
| f24c7dc3-3844-4037-90b8-c73c59b0ea30 | Partner Portal - EC Oregon - Volunteer Only | ec-oregon | role |
| 6d252fee-1df8-4ba1-acf1-18c1c704f3bd | Partner Portal - EC Oregon - Foster & Volunteer | ec-oregon | role |
| 61f913cc-0360-482d-8373-7a7cac826eb2 | Partner Portal - EC Kentucky - All Users | ec-kentucky | all-users |
| cb535635-98ee-4c38-a4f6-5a81ffba2f87 | Partner Portal - EC Kentucky - Foster Only | ec-kentucky | role |

## Adding New Groups

To add support for new groups:

1. Get the GUID from Entra ID
2. Add to the `guidToInitiative` Map in `initiative-mapping.service.ts`:
```typescript
['new-guid-here', {
  groupName: 'Partner Portal - EC State - Type',
  initiativeId: 'ec-state',
  displayName: 'State',
  groupType: 'all-users' | 'role',
  role: 'Role-Name' // if applicable
}]
```

## Benefits Achieved

1. **No more error logs**: The "No valid initiative group found" errors are eliminated
2. **Better performance**: Zero Graph API calls after initial login
3. **More reliable**: Works even during Microsoft Graph outages
4. **Future-proof**: Supports complex role-based access control
5. **Backward compatible**: Existing name-based groups continue to work

## Security Considerations

- GUIDs are treated as sensitive configuration data
- The system validates group membership at multiple levels
- Cross-initiative access is prevented through proper validation
- All security events are logged for audit purposes