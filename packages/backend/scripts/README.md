# Group GUID Identification Script

This directory contains scripts to help identify the correct Azure AD group GUIDs for Partner Portal groups.

## identify-group-guid.js

This script uses the Microsoft Graph API to fetch the actual names of the 14 GUIDs currently mapped to "Partner Portal - EC Oregon - Testing" to identify which one is correct.

### Prerequisites

1. **Azure AD App Registration** with the following API permissions:
   - Microsoft Graph: `Group.Read.All` (Application permission)
   - The app registration must be granted admin consent for these permissions

2. **Environment Variables** set with your Azure AD configuration:
   ```bash
   export AZURE_TENANT_ID="your-tenant-id"
   export AZURE_CLIENT_ID="your-client-id" 
   export AZURE_CLIENT_SECRET="your-client-secret"
   ```

### Usage

From the backend directory, run:

```bash
# Set environment variables
export AZURE_TENANT_ID="your-tenant-id"
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"

# Run the script
node scripts/identify-group-guid.js
```

### What the script does

1. **Authenticates** with Azure AD using client credentials flow
2. **Fetches group information** for all 14 GUIDs using Microsoft Graph API
3. **Identifies** which GUID corresponds to "Partner Portal - EC Oregon - Testing"
4. **Provides** the exact GUID and code snippet to update the auth service

### Expected Output

The script will show:
- ✅ Successful group lookups with names
- ❌ Groups that don't exist or have errors
- 🎯 The exact match for "Partner Portal - EC Oregon - Testing" (if found)
- 🔍 Potential partial matches (groups containing "Oregon", "Testing", etc.)
- 💡 Code snippet to update `auth.service.ts`

### After identifying the correct GUID

1. **Update the auth service** by replacing the placeholder in the fallback mapping:
   ```typescript
   // In auth.service.ts, replace this line:
   ['CORRECT_GUID_HERE', 'Partner Portal - EC Oregon - Testing'],
   
   // With the actual GUID found by the script:
   ['actual-guid-from-script', 'Partner Portal - EC Oregon - Testing'],
   ```

2. **Remove the temporary mappings** - delete all the other hardcoded mappings for this group

3. **Test the authentication flow** to ensure the correct group is being recognized

### Troubleshooting

**Error: "Missing required environment variables"**
- Ensure all three environment variables are set and accessible

**Error: "Insufficient privileges to complete the operation"**
- Verify the Azure AD app has `Group.Read.All` permission
- Ensure admin consent has been granted for the app permissions

**Error: "Invalid client secret"**
- Check that the client secret is correct and hasn't expired
- Generate a new client secret if needed

**Groups showing as "GROUP_NOT_FOUND"**
- The GUID may not correspond to an actual Azure AD group
- The group may have been deleted or the GUID may be incorrect

### Alternative: Using Azure Portal

If the script doesn't work, you can also identify the correct GUID through the Azure Portal:

1. Go to **Azure AD > Groups**
2. Search for "Partner Portal - EC Oregon - Testing"
3. Click on the group and copy the **Object ID** from the overview page
4. This Object ID is the GUID you need to use in the auth service

### Alternative: Using Azure CLI

You can also use Azure CLI to query groups:

```bash
# Login to Azure
az login

# List groups containing "Oregon"
az ad group list --filter "startswith(displayName,'Partner Portal - EC Oregon')" --query "[].{id:id,name:displayName}"

# Get specific group by ID
az ad group show --group "your-guid-here" --query "{id:id,name:displayName}"
```