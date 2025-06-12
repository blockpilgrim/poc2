import { 
  ConfidentialClientApplication, 
  AuthorizationCodeRequest,
  AuthorizationUrlRequest,
  ClientCredentialRequest,
  OnBehalfOfRequest,
  RefreshTokenRequest,
  AccountInfo,
  AuthenticationResult,
  CryptoProvider
} from '@azure/msal-node';
import { msalConfig, authConfig } from '../config/auth.config';
import { config } from '../config';
import type { Initiative } from '@partner-portal/shared';
import type { AzureADIdTokenClaims } from '../types/auth';
import jwt from 'jsonwebtoken';

/**
 * Authentication Service using MSAL Node
 * Handles Azure AD authentication flows and token management
 */
export class AuthService {
  private msalClient: ConfidentialClientApplication;
  private cryptoProvider: CryptoProvider;
  
  constructor() {
    this.msalClient = new ConfidentialClientApplication(msalConfig);
    this.cryptoProvider = new CryptoProvider();
  }

  /**
   * Generate PKCE codes for enhanced security in auth flow
   */
  async generatePkceCodes() {
    const { verifier, challenge } = await this.cryptoProvider.generatePkceCodes();
    return { verifier, challenge };
  }

  /**
   * Get the authorization URL for initiating login flow
   */
  async getAuthCodeUrl(state: string, pkceChallenge: string): Promise<string> {
    const authCodeUrlParameters: AuthorizationUrlRequest = {
      scopes: authConfig.graphScopes,
      redirectUri: authConfig.redirectUri,
      responseMode: 'query',
      state,
      codeChallenge: pkceChallenge,
      codeChallengeMethod: 'S256',
      prompt: 'select_account', // Force account selection
    };

    const authUrl = await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async acquireTokenByCode(
    code: string, 
    state: string,
    pkceVerifier: string
  ): Promise<AuthenticationResult> {
    const tokenRequest: AuthorizationCodeRequest = {
      code,
      scopes: authConfig.graphScopes,
      redirectUri: authConfig.redirectUri,
      codeVerifier: pkceVerifier,
      state,
    };

    try {
      const response = await this.msalClient.acquireTokenByCode(tokenRequest);
      return response;
    } catch (error) {
      console.error('Error acquiring token by code:', error);
      throw error;
    }
  }

  /**
   * Get a new access token using a refresh token
   */
  async acquireTokenByRefreshToken(
    refreshToken: string,
    _account?: AccountInfo
  ): Promise<AuthenticationResult | null> {
    const refreshTokenRequest: RefreshTokenRequest = {
      refreshToken,
      scopes: authConfig.graphScopes,
    };

    try {
      const response = await this.msalClient.acquireTokenByRefreshToken(refreshTokenRequest);
      return response;
    } catch (error) {
      console.error('Error acquiring token by refresh token:', error);
      throw error;
    }
  }

  /**
   * Get an access token for D365 API using client credentials flow
   * This is used for server-to-server authentication
   */
  async getD365AccessToken(): Promise<string | null> {
    if (!config.D365_URL || !config.D365_CLIENT_ID || !config.D365_CLIENT_SECRET) {
      console.warn('D365 configuration not complete, skipping D365 token acquisition');
      return null;
    }

    const clientCredentialRequest: ClientCredentialRequest = {
      scopes: authConfig.d365Scopes,
      skipCache: false,
    };

    try {
      const response = await this.msalClient.acquireTokenByClientCredential(clientCredentialRequest);
      return response?.accessToken || null;
    } catch (error) {
      console.error('Error acquiring D365 token:', error);
      throw error;
    }
  }

  /**
   * Get an access token for D365 on behalf of a user
   * This maintains the user's security context when accessing D365
   */
  async getD365TokenOnBehalfOf(userAccessToken: string): Promise<string | null> {
    if (!config.D365_URL) {
      return null;
    }

    const onBehalfOfRequest: OnBehalfOfRequest = {
      oboAssertion: userAccessToken,
      scopes: authConfig.d365Scopes,
    };

    try {
      const response = await this.msalClient.acquireTokenOnBehalfOf(onBehalfOfRequest);
      return response?.accessToken || null;
    } catch (error) {
      console.error('Error acquiring D365 token on behalf of user:', error);
      // Fallback to client credentials if OBO fails
      return this.getD365AccessToken();
    }
  }

  /**
   * Clear the token cache for a specific account
   */
  async clearCache(account?: AccountInfo): Promise<void> {
    if (account) {
      await this.msalClient.getTokenCache().removeAccount(account);
    } else {
      // Clear all cache if no account specified
      const cache = this.msalClient.getTokenCache();
      const accounts = await cache.getAllAccounts();
      for (const acc of accounts) {
        await cache.removeAccount(acc);
      }
    }
  }

  /**
   * Get logout URL for ending the session
   */
  getLogoutUrl(account?: AccountInfo): string {
    const logoutRequest = {
      account,
      postLogoutRedirectUri: authConfig.postLogoutRedirectUri,
    };

    return `https://login.microsoftonline.com/${config.AZURE_TENANT_ID}/oauth2/v2.0/logout?${new URLSearchParams({
      post_logout_redirect_uri: logoutRequest.postLogoutRedirectUri,
    }).toString()}`;
  }

  /**
   * Validate that the user has access to the specified initiative
   * This is a placeholder - actual implementation will query D365
   */
  async validateUserInitiative(
    account: AccountInfo,
    _d365Token: string
  ): Promise<Initiative | null> {
    // TODO: Implement D365 query to fetch user's Contact record
    // and extract the initiative field
    console.log('Validating user initiative for:', account.username);
    
    // Placeholder implementation
    // In real implementation, this would:
    // 1. Query D365 for the Contact record using the user's email
    // 2. Extract the initiative field from the Contact
    // 3. Validate that the initiative is active and valid
    // 4. Return the initiative or null if not found/invalid
    
    return {
      id: 'ec-arkansas',
      name: 'EC Arkansas',
      stateCode: 'AR',
      displayName: 'Arkansas Partner Portal',
      theme: {
        primaryColor: '#DA291C',
        secondaryColor: '#FFFFFF',
        logo: '/logos/arkansas.svg',
        favicon: '/favicons/arkansas.ico'
      },
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Extract account info from authentication result
   */
  extractAccountInfo(authResult: AuthenticationResult): AccountInfo | null {
    return authResult.account || null;
  }

  /**
   * Extract groups and roles from ID token
   * @param idToken The ID token from Azure AD
   * @returns Object containing groups and roles arrays
   */
  extractGroupsAndRoles(idToken: string): {
    groups: string[];
    roles: string[];
    claims: AzureADIdTokenClaims;
  } {
    try {
      // Decode the ID token without verification (verification happens in MSAL)
      const decodedToken = jwt.decode(idToken) as AzureADIdTokenClaims;
      
      if (!decodedToken) {
        throw new Error('Failed to decode ID token');
      }

      // Extract groups - these will be GUIDs from Entra ID
      const groups = decodedToken.groups || [];
      
      // Extract app roles - these are the role values defined in the app manifest
      const roles = decodedToken.roles || [];

      console.log('Extracted from ID token:', {
        sub: decodedToken.sub,
        email: decodedToken.email || decodedToken.preferred_username,
        name: decodedToken.name,
        groupCount: groups.length,
        roleCount: roles.length,
        groups: groups,
        roles: roles
      });

      return {
        groups,
        roles,
        claims: decodedToken
      };
    } catch (error) {
      console.error('Error extracting groups and roles from ID token:', error);
      return {
        groups: [],
        roles: [],
        claims: {} as AzureADIdTokenClaims
      };
    }
  }

  // Note: Group name resolution from Microsoft Graph has been removed.
  // The system now uses hardcoded GUID-to-initiative mappings in InitiativeMappingService
  // for better performance and reliability.
}

// Export singleton instance
export const authService = new AuthService();