import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import { useCallback } from 'react';

/**
 * Hook for authentication functionality
 * Provides convenient access to auth state and actions
 */
export function useAuth() {
  const {
    user,
    initiative,
    roles,
    groups,
    isAuthenticated,
    isLoading,
    error,
  } = useAuthStore();

  const login = useCallback(async (redirectUrl?: string) => {
    try {
      await authService.login(redirectUrl);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);

  const hasRole = useCallback((role: string) => {
    return roles.includes(role);
  }, [roles]);

  const hasAnyRole = useCallback((rolesToCheck: string[]) => {
    return rolesToCheck.some(role => roles.includes(role));
  }, [roles]);

  const hasAllRoles = useCallback((rolesToCheck: string[]) => {
    return rolesToCheck.every(role => roles.includes(role));
  }, [roles]);

  const isInGroup = useCallback((group: string) => {
    return groups.includes(group);
  }, [groups]);

  return {
    // State
    user,
    initiative,
    roles,
    groups,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    login,
    logout,
    
    // Helpers
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isInGroup,
  };
}