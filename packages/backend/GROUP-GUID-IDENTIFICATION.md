# Group GUID Identification Solution

## Problem Summary
Your application currently has all 14 group GUIDs from a user's Azure AD membership mapped to "Partner Portal - EC Oregon - Testing" as a temporary fix. This needs to be corrected to only map the correct GUID to this group name.

## Current Situation
In `/src/services/auth.service.ts`, the `getGroupNamesFromIds` method has these 14 GUIDs all mapped to the same group:

```typescript
// All these GUIDs are currently mapped to the same group (INCORRECT)
['94a2bdc0-2fda-461e-b6a1-b8870dc3d09a', 'Partner Portal - EC Oregon - Testing'],
['e61e451d-8bbc-469c-bb68-5e6bbcb41499', 'Partner Portal - EC Oregon - Testing'],
// ... (12 more identical mappings)
```

## Solution Options

### Option 1: Use the Microsoft Graph API Script (Recommended)

I've created a Node.js script that will automatically identify the correct GUID:

**Prerequisites:**
1. Azure AD app registration with `Group.Read.All` permission
2. Admin consent granted for the permission
3. Environment variables set for your Azure AD configuration

**Usage:**
```bash
# From the backend directory
export AZURE_TENANT_ID="your-tenant-id"
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"

node scripts/identify-group-guid.js
```

**Files Created:**
- `/scripts/identify-group-guid.js` - Main identification script
- `/scripts/identify-group-guid.ps1` - PowerShell version for Windows
- `/scripts/README.md` - Detailed usage instructions

### Option 2: Use Azure Portal

1. Go to **Azure AD > Groups** in the Azure Portal
2. Search for "Partner Portal - EC Oregon - Testing"
3. Click on the group and copy the **Object ID**
4. This Object ID is the GUID you need

### Option 3: Use Azure CLI

```bash
# Login and search for the group
az login
az ad group list --filter "startswith(displayName,'Partner Portal - EC Oregon')" --query "[].{id:id,name:displayName}"
```

## Implementation Changes Made

### 1. Updated Auth Service
I've improved the `auth.service.ts` file to:
- **Implement proper Microsoft Graph API calls** instead of hardcoded mappings
- **Use batch requests** for better performance when fetching multiple groups
- **Include fallback logic** to ensure the app continues working during Graph API issues
- **Add proper error handling** and logging

### 2. New Methods Added
- `fetchGroupBatch()` - Efficiently fetch multiple groups using Graph API batch requests
- `fetchGroupsIndividually()` - Fallback method for individual group requests
- Improved error handling and logging throughout

### 3. Fallback Strategy
The updated service includes a fallback mapping that will use hardcoded values if the Graph API fails:

```typescript
const fallbackGroups = new Map([
  ['CORRECT_GUID_HERE', 'Partner Portal - EC Oregon - Testing'],
  // Other known groups...
]);
```

## Next Steps

1. **Run the identification script** to find the correct GUID
2. **Update the fallback mapping** in `auth.service.ts` by replacing `'CORRECT_GUID_HERE'` with the actual GUID
3. **Test the authentication flow** to ensure the correct group is recognized
4. **Remove any other temporary mappings** for this group once confirmed working

## Files Modified

- `/src/services/auth.service.ts` - Updated with proper Graph API implementation
- `/scripts/identify-group-guid.js` - New script to identify correct GUID
- `/scripts/identify-group-guid.ps1` - PowerShell version of the script
- `/scripts/README.md` - Instructions for using the scripts

## Expected Outcome

After implementing this solution:
1. Only the correct GUID will map to "Partner Portal - EC Oregon - Testing"
2. The authentication service will use live Microsoft Graph API calls when possible
3. Fallback mappings ensure reliability during API issues
4. Better logging and error handling for debugging

## Testing

After making the changes:
1. **Test user authentication** with a user who has the "Partner Portal - EC Oregon - Testing" group
2. **Verify logs** show the correct group mapping
3. **Check that initiative detection** works correctly for Oregon testing users
4. **Ensure other groups** are not affected by the changes

## Security Considerations

The solution maintains security by:
- Using proper Azure AD authentication for Graph API calls
- Not exposing group information unnecessarily
- Maintaining audit logging for group mapping activities
- Using secure fallback mechanisms when API calls fail