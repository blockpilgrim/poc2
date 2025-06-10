# Frontend Authentication Flow

## Overview

The frontend authentication is implemented using a server-side OAuth flow where the backend handles all Azure AD/MSAL complexity. The frontend manages JWT tokens and provides a seamless user experience.

## Authentication Flow

1. **User clicks login** → Frontend calls `POST /api/auth/login`
2. **Backend returns Azure AD URL** → Frontend redirects to Microsoft login
3. **User authenticates** → Azure AD redirects to backend callback
4. **Backend validates** → Generates JWT tokens and redirects to `/auth/callback`
5. **Frontend extracts tokens** → Stores in sessionStorage and loads user profile
6. **Frontend applies theme** → Theme provider applies initiative-specific branding
7. **Authenticated requests** → Include JWT in Authorization header

## Key Components

### Auth Store (`/src/stores/authStore.ts`)
- Manages authentication state using Zustand
- Stores user info, initiative, roles, and groups
- Provides actions for setting/clearing auth data

### Token Storage (`/src/services/tokenStorage.ts`)
- Secure token management using sessionStorage
- Token extraction from URL query params
- JWT decoding and expiration checking
- Automatic URL cleaning after token extraction

### Auth Service (`/src/services/authService.ts`)
- Interfaces with backend auth endpoints
- Handles login/logout flows
- Manages user profile loading
- Token refresh logic (when backend implements it)

### Protected Routes (`/src/components/ProtectedRoute.tsx`)
- Route guard component
- Checks authentication status
- Supports role-based access control
- Redirects to login with return URL

### API Client (`/src/services/api.ts`)
- Axios interceptors for automatic token inclusion
- Token expiration checking
- Automatic token refresh attempts
- Queue management for concurrent requests during refresh

### Theme Provider (`/src/providers/ThemeProvider.tsx`)
- Applies initiative-specific branding and colors
- Dynamically loads theme based on user's initiative
- Updates favicon and document title
- Provides theme context to all components

## Security Features

1. **Session Storage**: Tokens cleared when browser closes
2. **Token Expiration**: Automatic checking with 30-second buffer
3. **URL Cleaning**: Tokens removed from URL immediately after extraction
4. **Role-Based Access**: Routes can require specific roles
5. **Initiative Isolation**: All data requests include initiative context

## Usage Examples

### Check Authentication Status
```typescript
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { isAuthenticated, user, hasRole } = useAuth();
  
  if (isAuthenticated && hasRole('Admin')) {
    // Show admin features
  }
}
```

### Protected Route with Roles
```tsx
<Route element={<ProtectedRoute requiredRoles={['Admin', 'Foster Partner']} />}>
  <Route path="/admin" element={<AdminDashboard />} />
</Route>
```

### Manual Login/Logout
```typescript
const { login, logout } = useAuth();

// Login with redirect URL
await login('/dashboard');

// Logout
await logout();
```

## Error Handling

- **Login Failures**: Display error message on login page
- **Auth Callback Errors**: Dedicated error page with details
- **Token Refresh Failures**: Automatic redirect to login
- **Network Errors**: User-friendly error messages
- **Redirect URL Handling**: Backend ensures proper redirect to `/auth/callback` even if user navigates directly to a protected route

## Testing the Flow

1. Start backend: `cd packages/backend && npm run dev`
2. Start frontend: `cd packages/frontend && npm run dev`
3. Navigate to protected route → Redirected to login
4. Click "Sign in with Microsoft" → Azure AD login
5. After successful auth → Redirected back to intended page
6. Check sessionStorage for tokens
7. Test logout → Clears tokens and redirects

## Next Steps

- Implement token refresh endpoint in backend
- Add multi-tab synchronization
- Add comprehensive E2E tests
- Enhance theme customization options