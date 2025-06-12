# Group GUID Identification and Mapping

## Current Implementation

The application uses hardcoded GUID-to-initiative mappings in the `InitiativeMappingService` for security and performance. Group names are NOT fetched from Microsoft Graph API.

## How It Works

1. **User Authentication**: When a user logs in via Entra ID, their group memberships are included as GUIDs in the ID token
2. **Initiative Extraction**: The `InitiativeMappingService` maps these GUIDs to initiatives using hardcoded mappings
3. **No External API Calls**: The system does not make any Microsoft Graph API calls to resolve group names

## Current Mappings

See `/src/services/initiative-mapping.service.ts` for the complete list of GUID mappings:

```typescript
// Example mappings
['e6ae3a86-446e-40f0-a2fb-e1b83f11cd3b', { 
  groupName: 'Partner Portal - EC Oregon - All Users',
  initiativeId: 'ec-oregon',
  displayName: 'Oregon',
  groupType: 'all-users'
}],
['61f913cc-0360-482d-8373-7a7cac826eb2', {
  groupName: 'Partner Portal - EC Kentucky - All Users',
  initiativeId: 'ec-kentucky',
  displayName: 'Kentucky',
  groupType: 'all-users'
}],
// ... more mappings
```

## Adding New Groups

To add support for a new group:

1. **Get the Group's Object ID (GUID)** from Azure Portal:
   - Go to Azure AD > Groups
   - Find your group
   - Copy the Object ID

2. **Add the mapping** to `InitiativeMappingService`:
   ```typescript
   ['your-group-guid-here', {
     groupName: 'Your Group Display Name',
     initiativeId: 'your-initiative-id',
     displayName: 'Display Name',
     groupType: 'all-users' // or 'role' or 'standard'
   }],
   ```

3. **Test** with a user who has this group membership

## Benefits of This Approach

- **Performance**: No external API calls during authentication
- **Reliability**: No dependency on Microsoft Graph API availability
- **Security**: Controlled access based on immutable GUIDs
- **Simplicity**: All mappings in one place

## Utilities

The `/scripts/identify-group-guid.js` script can still be used to identify group GUIDs if needed, but note that the application no longer uses Microsoft Graph API at runtime.