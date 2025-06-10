# ThemeProvider Implementation

## Overview

The ThemeProvider component implements dynamic initiative-based theming for the Partner Portal. It automatically applies the correct theme based on the user's assigned initiative from their Entra ID groups.

## Features

- **Dynamic Theme Application**: Applies CSS variables and branding based on user's initiative
- **Document Updates**: Updates page title and favicon
- **Theme Persistence**: Stores theme in localStorage for fast loading on refresh
- **Graceful Fallback**: Reverts to default theme when user logs out

## How It Works

1. **Authentication Flow**:
   - User logs in via Azure AD
   - Backend extracts initiative from Entra ID groups (e.g., "Partner Portal - EC Oregon")
   - `/api/auth/me` endpoint returns theme configuration

2. **Theme Application**:
   - ThemeProvider listens to auth state changes
   - When authenticated, it applies the theme from the auth store
   - Updates CSS variables, document title, and favicon

3. **CSS Variables Updated**:
   - `--primary-color`: Initiative's primary brand color (hex)
   - `--secondary-color`: Initiative's secondary color (hex)
   - `--primary`: OKLCH version for shadcn/ui components
   - `--secondary`: OKLCH version for shadcn/ui components

## Supported Initiatives

- **Arkansas** (`ec-arkansas`): Green theme (#00B274)
- **Oregon** (`ec-oregon`): Green/Gold theme (#00843D / #FFC72C)
- **Tennessee** (`ec-tennessee`): Orange theme (#F38359)
- **Kentucky** (`ec-kentucky`): Purple theme (#7B68EE)
- **Oklahoma** (`ec-oklahoma`): Red theme (#DC143C)

## Usage

The ThemeProvider is automatically included in the App component:

```tsx
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
```

## Theme Assets

Theme assets are located in:
- Logos: `/public/logos/{initiative}.svg`
- Favicons: `/public/favicons/{initiative}.ico`

## Edge Cases Handled

1. **Missing Theme**: Falls back to default styling
2. **Logout**: Resets to default theme
3. **Page Refresh**: Restores theme from localStorage
4. **Invalid Initiative**: Continues with default theme

## Future Enhancements

1. Replace placeholder .ico files with actual favicon files
2. Implement proper OKLCH color conversion library
3. Add theme transition animations
4. Support for custom CSS per initiative
5. Dark mode support per initiative preference