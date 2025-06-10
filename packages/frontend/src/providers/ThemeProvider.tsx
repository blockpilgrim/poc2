import { useEffect } from 'react';
import { useAuthStore, Theme } from '../stores/authStore';

// Cache the last applied theme to avoid unnecessary DOM updates
let lastAppliedTheme: string | null = null;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, theme, user } = useAuthStore();

  // Component mount/unmount effect
  useEffect(() => {
    return () => {
      // Reset the cache when provider unmounts (e.g., during hot reload)
      lastAppliedTheme = null;
    };
  }, []);

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

  return <>{children}</>;
}

/**
 * Apply theme configuration to the DOM
 */
function applyThemeToDOM(theme: Theme) {
  try {
    // Validate theme object
    if (!theme || typeof theme !== 'object') {
      // Invalid theme object, exit early
      return;
    }

    const root = document.documentElement;

    // Update CSS variables
    if (theme.primaryColor) {
      const isValid = isValidHexColor(theme.primaryColor);
      
      if (isValid) {
        root.style.setProperty('--primary-color', theme.primaryColor);
        root.style.setProperty('--primary-hex', theme.primaryColor);
      }
    }

    if (theme.secondaryColor) {
      const isValid = isValidHexColor(theme.secondaryColor);
      
      if (isValid) {
        root.style.setProperty('--secondary-color', theme.secondaryColor);
        root.style.setProperty('--secondary-hex', theme.secondaryColor);
      }
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
      const storageKey = `portal-theme-${user.id}`;
      localStorage.setItem(storageKey, JSON.stringify(theme));
    }
  } catch (error) {
    // Error applying theme - fail silently in production
    if (import.meta.env.DEV) {
      console.error('[ThemeProvider] Error applying theme:', error);
    }
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
      const storageKey = `portal-theme-${user.id}`;
      localStorage.removeItem(storageKey);
    }
    
    // Also clear any legacy theme storage
    localStorage.removeItem('portal-theme');
  } catch (error) {
    // Error resetting theme - fail silently in production
    if (import.meta.env.DEV) {
      console.error('[ThemeProvider] Error resetting theme:', error);
    }
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
    // Error updating favicon - fail silently in production
    if (import.meta.env.DEV) {
      console.error('[ThemeProvider] Error updating favicon:', error);
    }
  }
}

/**
 * Validate hex color format
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}