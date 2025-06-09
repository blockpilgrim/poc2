import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User, JWTPayload } from '@partner-portal/shared';

interface AuthState {
  // State
  user: User | null;
  initiative: string | null;
  roles: string[];
  groups: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
  
  // Derived from JWT claims
  setAuthData: (payload: JWTPayload) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      // Initial state
      user: null,
      initiative: null,
      roles: [],
      groups: [],
      isAuthenticated: false,
      isLoading: true, // Start as loading to check existing tokens
      error: null,

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      setError: (error) =>
        set({ error }),

      clearAuth: () =>
        set({
          user: null,
          initiative: null,
          roles: [],
          groups: [],
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }),

      setAuthData: (payload) => {
        const user: User = {
          id: payload.sub,
          email: payload.email,
          displayName: payload.displayName || payload.email,
          organizationId: payload.organizationId,
          organizationName: payload.organizationName,
        };

        set({
          user,
          initiative: payload.initiative,
          roles: payload.roles || [],
          groups: payload.groups || [],
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'auth-store',
    }
  )
);