/**
 * Secure token storage service
 * Uses sessionStorage for security (tokens cleared on browser close)
 * Provides methods for token management with proper error handling
 */

const TOKEN_KEY = 'poc_portal_token';
const REFRESH_TOKEN_KEY = 'poc_portal_refresh_token';

class TokenStorageService {
  /**
   * Store access token
   */
  setToken(token: string): void {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store token:', error);
    }
  }

  /**
   * Store refresh token
   */
  setRefreshToken(token: string): void {
    try {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store refresh token:', error);
    }
  }

  /**
   * Get access token
   */
  getToken(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      return null;
    }
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    try {
      return sessionStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve refresh token:', error);
      return null;
    }
  }

  /**
   * Store both tokens at once
   */
  setTokens(accessToken: string, refreshToken: string): void {
    this.setToken(accessToken);
    this.setRefreshToken(refreshToken);
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Check if tokens exist
   */
  hasToken(): boolean {
    return !!this.getToken();
  }

  /**
   * Extract tokens from URL query parameters and clean URL
   */
  extractTokensFromUrl(): { token: string | null; refreshToken: string | null } {
    // Also check hash in case tokens are in fragment
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    // Check both query and hash for tokens
    const token = urlParams.get('token') || hashParams.get('token');
    const refreshToken = urlParams.get('refresh') || hashParams.get('refresh');


    // Clean URL to remove tokens from history
    if (token || refreshToken) {
      urlParams.delete('token');
      urlParams.delete('refresh');
      
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      
      // Clear both query and hash
      window.history.replaceState({}, '', newUrl);
    }

    return { token, refreshToken };
  }

  /**
   * Decode JWT token without verification (frontend validation only)
   */
  decodeToken(token: string): any | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    // Check if token expires in next 30 seconds
    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    const bufferTime = 30 * 1000; // 30 seconds buffer
    
    return currentTime + bufferTime >= expirationTime;
  }
}

export const tokenStorage = new TokenStorageService();