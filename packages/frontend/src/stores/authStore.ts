import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Frontend User type - simplified version
export interface User {
  id: string;
  email: string;
  displayName?: string;
  name?: string;
  organizationId?: string;
  organizationName?: string;
  azureId?: string;
}

export interface Theme {
  primaryColor: string;
  secondaryColor: string;
  logo: string;
  favicon: string;
  name: string;
}

export interface Organization {
  id: string;
  name: string;
  type?: string;
  attributes?: Record<string, any>;
}

interface AuthState {
  // State
  user: User | null;
  initiative: string | null;
  initiativeName?: string;
  initiativeDisplayName?: string;
  organization: Organization | null;
  theme: Theme | null;
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
  setProfileData: (data: any) => void;
  
  // Derived from JWT claims
  setAuthData: (payload: any) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      // Initial state
      user: null,
      initiative: null,
      initiativeName: undefined,
      initiativeDisplayName: undefined,
      organization: null,
      theme: null,
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
          initiativeName: undefined,
          initiativeDisplayName: undefined,
          organization: null,
          theme: null,
          roles: [],
          groups: [],
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }),

      setProfileData: (data) => {
        set({
          user: data.user,
          initiative: data.initiative?.id || null,
          initiativeName: data.initiative?.name,
          initiativeDisplayName: data.initiative?.displayName,
          organization: data.organization || null,
          theme: data.theme || null,
          roles: data.roles || [],
          groups: data.groups || [],
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      setAuthData: (payload) => {
        const user: User = {
          id: payload.sub,
          email: payload.email,
          displayName: payload.displayName || payload.name || payload.email,
          name: payload.name,
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