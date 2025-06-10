import { useEffect } from 'react';
import { useAuthStore, Theme } from '../stores/authStore';

// Cache the last applied theme to avoid unnecessary DOM updates
let lastAppliedTheme: string | null = null;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, theme, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !theme) {
      // Reset to default theme when not authenticated or no theme
      resetToDefaultTheme();
      lastAppliedTheme = null;
      return;
    }

    // Only apply theme if it's different from the last applied one
    const themeKey = `${user?.id}-${theme.name}`;
    if (themeKey !== lastAppliedTheme) {
      applyThemeToDOM(theme);
      lastAppliedTheme = themeKey;
    }
  }, [isAuthenticated, theme, user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Reset the cache when provider unmounts (e.g., during hot reload)
      lastAppliedTheme = null;
    };
  }, []);

  return <>{children}</>;
}

/**
 * Apply theme configuration to the DOM
 */
function applyThemeToDOM(theme: Theme) {
  try {
    // Validate theme object
    if (!theme || typeof theme !== 'object') {
      console.error('Invalid theme object');
      return;
    }

    const root = document.documentElement;

    // Update CSS variables
    if (theme.primaryColor && isValidHexColor(theme.primaryColor)) {
      root.style.setProperty('--primary-color', theme.primaryColor);
      // For POC, use hex colors directly with shadcn/ui
      // The design system can handle hex colors via Tailwind's opacity modifiers
      root.style.setProperty('--primary-hex', theme.primaryColor);
    }

    if (theme.secondaryColor && isValidHexColor(theme.secondaryColor)) {
      root.style.setProperty('--secondary-color', theme.secondaryColor);
      root.style.setProperty('--secondary-hex', theme.secondaryColor);
    }

    // Update document title
    if (theme.name && typeof theme.name === 'string') {
      document.title = theme.name;
    }

    // Update favicon
    if (theme.favicon && typeof theme.favicon === 'string') {
      updateFavicon(theme.favicon);
    }

    // Store user-specific theme in localStorage
    const user = useAuthStore.getState().user;
    if (user?.id) {
      localStorage.setItem(`portal-theme-${user.id}`, JSON.stringify(theme));
    }
  } catch (error) {
    console.error('Error applying theme:', error);
  }
}

/**
 * Reset to default theme
 */
function resetToDefaultTheme() {
  try {
    const root = document.documentElement;
    
    // Reset CSS variables to defaults
    root.style.removeProperty('--primary-color');
    root.style.removeProperty('--secondary-color');
    root.style.removeProperty('--primary-hex');
    root.style.removeProperty('--secondary-hex');

    // Reset document title
    document.title = 'Partner Portal';

    // Reset favicon to default
    updateFavicon('/favicon.ico');

    // Clear all user-specific themes from localStorage
    const user = useAuthStore.getState().user;
    if (user?.id) {
      localStorage.removeItem(`portal-theme-${user.id}`);
    }
    
    // Also clear any legacy theme storage
    localStorage.removeItem('portal-theme');
  } catch (error) {
    console.error('Error resetting theme:', error);
  }
}

/**
 * Update the favicon
 */
function updateFavicon(faviconUrl: string) {
  try {
    // Find existing favicon or create new one
    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    
    // Update href to new favicon
    link.href = faviconUrl;
  } catch (error) {
    console.error('Error updating favicon:', error);
  }
}

/**
 * Validate hex color format
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}