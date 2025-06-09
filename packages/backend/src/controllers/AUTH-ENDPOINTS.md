# Authentication Endpoints Documentation

## Overview
The authentication endpoints provide comprehensive user context by combining data from Microsoft Entra ID, D365, and initiative configurations. This enables the frontend to render a fully personalized experience with proper theming and access control.

## Endpoints

### GET /api/auth/me
Returns current authenticated user information with enhanced context.

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "azureId": "azure-object-id",
    "roles": ["Admin", "FosterPartner"],
    "permissions": ["leads.view", "leads.update"]
  },
  "initiative": {
    "id": "ec-arkansas",
    "name": "EC Arkansas",
    "code": "AR",
    "displayName": "Arkansas"
  },
  "organization": {
    "id": "account-id",
    "name": "Organization Name",
    "type": "Foster",
    "attributes": {
      "leadType": "Foster",
      "createdOn": "2024-01-01T00:00:00Z"
    }
  },
  "groups": ["Partner Portal - EC Arkansas", "Admin Group"],
  "theme": {
    "primaryColor": "#00B274",
    "secondaryColor": "#313E48",
    "logo": "/logos/arkansas.svg",
    "favicon": "/favicons/arkansas.ico",
    "name": "Arkansas Partner Portal"
  }
}
```

### GET /api/auth/profile
Returns complete user profile with all context data needed for the frontend.

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "azureId": "azure-object-id"
  },
  "initiative": {
    "id": "ec-arkansas",
    "name": "EC Arkansas",
    "displayName": "Arkansas"
  },
  "organization": {
    "id": "account-id",
    "name": "Organization Name",
    "type": "Foster",
    "attributes": {
      "leadType": "Foster",
      "createdOn": "2024-01-01T00:00:00Z",
      "modifiedOn": "2024-01-02T00:00:00Z"
    }
  },
  "theme": {
    "primaryColor": "#00B274",
    "secondaryColor": "#313E48",
    "logo": "/logos/arkansas.svg",
    "favicon": "/favicons/arkansas.ico",
    "name": "Arkansas Partner Portal"
  },
  "roles": ["Admin", "FosterPartner"],
  "groups": ["Partner Portal - EC Arkansas"],
  "permissions": ["leads.view", "leads.update", "reports.view"],
  "metadata": {
    "tokenIssuedAt": "2025-01-09T10:00:00.000Z",
    "tokenExpiresAt": "2025-01-09T10:15:00.000Z"
  }
}
```

## Key Features

### 1. Initiative-Based Theming
Both endpoints return theme configuration based on the user's initiative (derived from Entra ID security groups). This enables dynamic UI theming without hardcoding themes in the frontend.

### 2. Organization Context
When D365 integration is enabled (`D365_ORG_DATA_ENABLED=true`), the endpoints include the user's organization data fetched from D365. This is optional and won't block authentication if unavailable.

### 3. Security Groups & Roles
The endpoints expose the user's Entra ID security groups and app roles, enabling fine-grained access control in the frontend.

### 4. Token Metadata
The profile endpoint includes token metadata to help the frontend manage token refresh timing.

## Usage Examples

### Frontend Integration
```typescript
// Fetch user profile on app initialization
const response = await fetch('/api/auth/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const profile = await response.json();

// Apply theme
document.documentElement.style.setProperty('--primary-color', profile.theme.primaryColor);
document.documentElement.style.setProperty('--secondary-color', profile.theme.secondaryColor);

// Update favicon
const favicon = document.querySelector('link[rel="icon"]');
favicon.href = profile.theme.favicon;

// Store in auth store
authStore.setProfile(profile);
```

### Checking Permissions
```typescript
// Check if user has specific role
const isAdmin = profile.roles.includes('Admin');

// Check if user has specific permission
const canViewReports = profile.permissions.includes('reports.view');

// Check organization type
const isFosterOrg = profile.organization?.type === 'Foster';
```

## Error Handling

Both endpoints return consistent error responses:

- **401 Unauthorized**: Missing or invalid token
- **403 Forbidden**: Valid token but missing required groups/roles
- **500 Internal Server Error**: Unexpected server error

Example error response:
```json
{
  "error": "User not authenticated",
  "code": "UNAUTHORIZED"
}
```

## Notes

1. **Organization Data**: The organization field may be null if D365 is not configured or if the user has no associated D365 Contact/Account.

2. **Theme Fallback**: If no theme is configured for an initiative, the theme field will be null. Frontend should have default theme values.

3. **Performance**: The profile endpoint combines multiple data sources. The JWT already contains most data, so performance impact is minimal.

4. **Caching**: Frontend should cache profile data and only refresh when tokens are refreshed or on explicit user action.