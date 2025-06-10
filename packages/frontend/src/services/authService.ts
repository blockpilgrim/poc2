import axios from 'axios';
import { tokenStorage } from './tokenStorage';
import { useAuthStore } from '../stores/authStore';

interface JWTPayloadFrontend {
  sub: string;
  email: string;
  displayName?: string;
  name?: string;
  initiative?: string;
  groups?: string[];
  roles?: string[];
  organizationId?: string;
  organizationName?: string;
  exp: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface LoginResponse {
  authUrl: string;
  state: string;
}

interface LogoutResponse {
  logoutUrl: string;
}


class AuthService {
  /**
   * Initiate login flow - redirects to Azure AD
   */
  async login(redirectUrl?: string): Promise<void> {
    try {
      const response = await axios.post<LoginResponse>(`${API_URL}/auth/login`, {
        redirectUrl: redirectUrl || window.location.origin,
      });

      // Redirect to Azure AD
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Failed to initiate login');
    }
  }

  /**
   * Handle auth callback - extract tokens from URL and store them
   */
  async handleCallback(): Promise<void> {
    const { token, refreshToken } = tokenStorage.extractTokensFromUrl();
    
    if (!token) {
      // Check for error in URL
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      if (error) {
        throw new Error(error);
      }
      throw new Error('No token received from authentication');
    }

    // Store tokens
    tokenStorage.setTokens(token, refreshToken || '');

    // Decode token and update auth store
    const decoded = tokenStorage.decodeToken(token) as JWTPayloadFrontend;
    if (decoded) {
      useAuthStore.getState().setAuthData(decoded);
    }

    // Load full user profile
    await this.loadUserProfile();
  }

  /**
   * Load user profile from backend
   */
  async loadUserProfile(): Promise<void> {
    const token = tokenStorage.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const authStore = useAuthStore.getState();
      
      // Use the new setProfileData method to store all profile data including theme
      authStore.setProfileData(response.data);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      throw new Error('Failed to load user profile');
    }
  }

  /**
   * Logout - clear tokens and redirect to Azure AD logout
   */
  async logout(): Promise<void> {
    try {
      const token = tokenStorage.getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const response = await axios.post<LogoutResponse>(
        `${API_URL}/auth/logout`,
        {},
        { headers }
      );

      // Clear local auth state
      tokenStorage.clearTokens();
      useAuthStore.getState().clearAuth();

      // Redirect to Azure AD logout
      window.location.href = response.data.logoutUrl;
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local state even if backend call fails
      tokenStorage.clearTokens();
      useAuthStore.getState().clearAuth();
      // Redirect to home
      window.location.href = '/';
    }
  }

  /**
   * Check if user is authenticated and load profile if token exists
   */
  async checkAuth(): Promise<boolean> {
    const token = tokenStorage.getToken();
    if (!token) {
      useAuthStore.getState().setLoading(false);
      return false;
    }

    // Check if token is expired
    if (tokenStorage.isTokenExpired(token)) {
      tokenStorage.clearTokens();
      useAuthStore.getState().clearAuth();
      useAuthStore.getState().setLoading(false);
      return false;
    }

    try {
      await this.loadUserProfile();
      return true;
    } catch (error) {
      console.error('Failed to verify authentication:', error);
      tokenStorage.clearTokens();
      useAuthStore.getState().clearAuth();
      return false;
    } finally {
      useAuthStore.getState().setLoading(false);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string | null> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken,
      });

      const { token, refresh } = response.data;
      tokenStorage.setTokens(token, refresh);

      // Update auth store with new token data
      const decoded = tokenStorage.decodeToken(token) as JWTPayloadFrontend;
      if (decoded) {
        useAuthStore.getState().setAuthData(decoded);
      }

      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear auth on refresh failure
      tokenStorage.clearTokens();
      useAuthStore.getState().clearAuth();
      return null;
    }
  }

  /**
   * Get authorization config from backend
   */
  async getAuthConfig(): Promise<any> {
    try {
      const response = await axios.get(`${API_URL}/auth/config`);
      return response.data;
    } catch (error) {
      console.error('Failed to get auth config:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();