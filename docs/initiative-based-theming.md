# Initiative-Based Theming

## Overview

The Partner Portal dynamically applies visual themes based on a user's assigned initiative (state) from their Entra ID security group membership. Each initiative has its own color scheme, logo, and branding.

## How It Works

### 1. Authentication Flow
1. User logs in via Azure AD
2. Backend extracts initiative from Entra ID groups (e.g., "Partner Portal - EC Oregon")
3. Initiative is mapped to theme configuration (colors, logo, favicon, name)
4. Theme data is returned in `/api/auth/me` endpoint response
5. After successful authentication, frontend redirects to dashboard via `/auth/callback`

### 2. Theme Application
1. `ThemeProvider` component wraps the entire app
2. When authentication completes, theme is automatically applied:
   - CSS variables updated for colors
   - Document title changed to initiative name
   - Favicon updated to initiative-specific icon
   - Logo displayed in navigation bar

### 3. Theme Persistence
- Themes are cached per user ID in localStorage
- On page refresh, theme persists until auth is verified
- When user logs out, theme resets to defaults

## Supported Initiatives

| Initiative | ID | Primary Color | Secondary Color |
|------------|----|--------------:|----------------:|
| Arkansas | `ec-arkansas` | #00B274 | #313E48 |
| Oregon | `ec-oregon` | #00843D | #FFC72C |
| Tennessee | `ec-tennessee` | #F38359 | #313E48 |
| Kentucky | `ec-kentucky` | #7B68EE | #313E48 |
| Oklahoma | `ec-oklahoma` | #DC143C | #313E48 |

## Technical Implementation

### CSS Variables
```css
--primary-color: #00843D;    /* Initiative primary color */
--secondary-color: #FFC72C;  /* Initiative secondary color */
--primary-hex: #00843D;      /* For Tailwind utilities */
--secondary-hex: #FFC72C;    /* For Tailwind utilities */
```

### Theme Assets
- Logos: `/public/logos/{initiative}.svg`
- Favicons: `/public/favicons/{initiative}.ico`

### Tailwind Classes
- `bg-theme-primary` - Uses initiative's primary color
- `bg-theme-secondary` - Uses initiative's secondary color
- `text-theme-primary` - Text in primary color
- `text-theme-secondary` - Text in secondary color

## Testing Instructions

### Local Development Testing

1. **Start the backend:**
   ```bash
   cd packages/backend
   npm run dev
   ```

2. **Start the frontend:**
   ```bash
   cd packages/frontend
   npm run dev
   ```

3. **Login with a test account:**
   - Navigate to http://localhost:5173
   - Click "Login" 
   - Use an Entra ID account assigned to one of these groups:
     - "Partner Portal - EC Oregon"
     - "Partner Portal - EC Arkansas"
     - "Partner Portal - EC Tennessee"
     - "Partner Portal - EC Kentucky"
     - "Partner Portal - EC Oklahoma"
   - After successful authentication, you'll be redirected to the dashboard

4. **Verify theme application:**
   - ✓ Navigation bar background matches initiative's primary color
   - ✓ Initiative logo appears in navigation
   - ✓ Browser tab title shows "{State} Partner Portal"
   - ✓ Favicon updates (if actual .ico files are present)

### Testing Different Initiatives

1. **Test user switching:**
   - Log out (clears theme)
   - Log in with different initiative user
   - Verify new theme applies correctly

2. **Test persistence:**
   - Log in with any initiative
   - Refresh the page (F5)
   - Theme should persist during auth check

3. **Test edge cases:**
   - User with no initiative group → default theme
   - User with multiple initiative groups → uses first valid one
   - Invalid theme data → gracefully falls back to defaults

### Backend Verification

The backend processes authentication and initiative extraction through the `/api/auth/me` endpoint. User initiative is determined from their Entra ID security group membership.

### API Response Example

`GET /api/auth/me` returns:
```json
{
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "name": "Test User"
  },
  "initiative": {
    "id": "ec-oregon",
    "name": "Oregon",
    "displayName": "Oregon Partner Portal"
  },
  "theme": {
    "primaryColor": "#00843D",
    "secondaryColor": "#FFC72C",
    "logo": "/logos/oregon.svg",
    "favicon": "/favicons/oregon.ico",
    "name": "Oregon Partner Portal"
  }
}
```

## Troubleshooting

### Theme not applying?
1. Verify `/api/auth/me` returns theme data
2. Ensure user's Entra ID group matches supported initiatives
3. Check Network tab for 404s on logo/favicon assets
4. Verify authentication redirects properly through `/auth/callback`

### Wrong theme showing?
1. Clear localStorage: `localStorage.clear()`
2. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. Log out and log back in

### Adding new initiatives
1. Update `initiativeThemes` map in `/packages/backend/src/services/initiative-mapping.service.ts`
2. Add logo SVG to `/packages/frontend/public/logos/`
3. Add favicon to `/packages/frontend/public/favicons/`
4. Update group mappings for new Entra ID security groups