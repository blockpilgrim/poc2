import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { sessionService } from '../services/session.service';
import { jwtService } from '../services/jwt.service';
import { d365Service } from '../services/d365.service';
import { initiativeMappingService } from '../services/initiative-mapping.service';
import { AppError } from '../utils/errors';
import { config } from '../config';
import type { ExtendedJWTPayload } from '../types/auth';
import type { OrganizationData } from '@partner-portal/shared';

/**
 * Authentication Controller
 * Handles Azure AD OAuth flow and JWT token management
 */
export class AuthController {
  /**
   * POST /api/auth/login
   * Initiate Azure AD login with PKCE
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { redirectUrl } = req.body;

      // Generate PKCE codes and state
      const { verifier, challenge } = await authService.generatePkceCodes();
      const state = jwtService.generateState();

      // Store session data
      sessionService.storeSession(state, verifier, challenge, redirectUrl);

      // Get Azure AD authorization URL
      const authUrl = await authService.getAuthCodeUrl(state, challenge);

      res.json({
        authUrl,
        state,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw new AppError('Failed to initiate login', 500);
    }
  }

  /**
   * GET /api/auth/callback
   * Handle OAuth callback from Azure AD
   */
  async callback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state, error, error_description } = req.query;

      // Handle OAuth errors
      if (error) {
        throw new AppError(
          `Authentication failed: ${error_description || error}`,
          401
        );
      }

      if (!code || !state) {
        throw new AppError('Missing authorization code or state', 400);
      }

      // Retrieve and validate session
      const session = sessionService.getAndRemoveSession(state as string);
      if (!session) {
        throw new AppError('Invalid or expired session state', 401);
      }

      // Exchange code for tokens
      const authResult = await authService.acquireTokenByCode(
        code as string,
        state as string,
        session.pkceVerifier
      );

      if (!authResult.account || !authResult.idToken) {
        throw new AppError('No account information received', 401);
      }

      // Extract groups and roles from ID token
      const { groups, roles, claims } = authService.extractGroupsAndRoles(authResult.idToken);

      // If feature flag is enabled, use Entra ID groups
      let initiative: string;
      let initiativeName: string | undefined;
      let organization: OrganizationData | undefined;

      if (config.ENTRA_GROUPS_ENABLED) {
        // Extract initiative from Entra ID groups (using GUIDs directly)
        try {
          initiative = initiativeMappingService.extractInitiativeFromGroups(groups);
          initiativeName = initiativeMappingService.getInitiativeDisplayName(initiative);
          
        } catch (error) {
          console.error('[AUTH] Initiative extraction failed:', {
            error: error instanceof Error ? error.message : error,
            email: authResult.account?.username,
            groupCount: groups.length,
            groups: groups
          });
          
          throw new AppError(
            'User is not assigned to any initiative group. Please contact your administrator.',
            403
          );
        }

        // Optionally fetch organization data from D365
        if (config.D365_ORG_DATA_ENABLED) {
          try {
            const d365Token = await authService.getD365AccessToken();
            if (d365Token) {
              // Use Azure AD Object ID for reliable contact lookup
              const azureObjectId = claims.oid;
              organization = await d365Service.getUserOrganization(
                azureObjectId,
                d365Token
              );
              
            }
          } catch (error) {
            // Log the error with context for troubleshooting
            console.warn('[AUTH] Failed to fetch organization data from D365:', {
              error: error instanceof Error ? error.message : 'Unknown error',
              userId: authResult.account.homeAccountId,
              email: authResult.account.username,
              impact: 'Continuing without organization data'
            });
            
            // TODO: Consider making organization data required for certain roles
            // For now, organization data is optional to avoid blocking authentication
            // In production, implement retry logic with exponential backoff
          }
        }
      } else {
        // Groups are required when ENTRA_GROUPS_ENABLED is true
        throw new AppError(
          'User is not assigned to any initiative group. Please contact your administrator.',
          403
        );
      }

      // Build user object from Entra ID claims
      console.log('[AUTH] Building user object from claims:', {
        claims_name: claims.name,
        account_name: authResult.account.name,
        account_username: authResult.account.username,
        claims_email: claims.email,
        claims_preferred_username: claims.preferred_username,
      });
      
      const user = {
        id: claims.oid || claims.sub,
        email: claims.email || claims.preferred_username || authResult.account.username,
        name: claims.name || authResult.account.name || '',
        azureId: claims.oid,
      };
      
      console.log('[AUTH] Created user object:', user);

      // Generate application JWT tokens with Entra ID data
      const accessToken = jwtService.generateAccessToken({
        user,
        initiative,
        initiativeName,
        groups: config.ENTRA_GROUPS_ENABLED ? groups : [],
        roles: config.ENTRA_GROUPS_ENABLED ? roles : [],
        organization,
        account: authResult.account,
      });
      
      const refreshToken = jwtService.generateRefreshToken(
        user.id,
        initiative
      );

      // Prepare redirect URL with tokens
      const baseUrl = session.redirectUrl || config.FRONTEND_URL;
      const callbackUrl = baseUrl.endsWith('/auth/callback') 
        ? baseUrl 
        : `${config.FRONTEND_URL}/auth/callback`;
      
      const frontendRedirect = new URL(callbackUrl);
      frontendRedirect.searchParams.set('token', accessToken);
      frontendRedirect.searchParams.set('refresh', refreshToken);


      res.redirect(frontendRedirect.toString());
    } catch (error) {
      console.error('Callback error:', error);
      
      // Redirect to frontend with error
      const errorRedirect = new URL(`${config.FRONTEND_URL}/auth/error`);
      errorRedirect.searchParams.set(
        'error',
        error instanceof AppError ? error.message : 'Authentication failed'
      );
      
      res.redirect(errorRedirect.toString());
    }
  }

  /**
   * POST /api/auth/logout
   * Clear sessions and redirect to Azure AD logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // Get user info from token if available
      const token = req.headers.authorization?.replace('Bearer ', '');
      let account = null;

      if (token) {
        try {
          jwtService.verifyAccessToken(token);
          // Clear MSAL cache for the user
          // Note: We don't have direct access to AccountInfo here
          // In production, you might want to store this mapping
        } catch (error) {
          // Token might be invalid, continue with logout
        }
      }

      // Get Azure AD logout URL
      const logoutUrl = authService.getLogoutUrl(account || undefined);

      res.json({
        logoutUrl,
      });
    } catch (error) {
      console.error('Logout error:', error);
      throw new AppError('Failed to process logout', 500);
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  async refresh(req: Request, _res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token required', 400);
      }

      // Verify refresh token
      jwtService.verifyRefreshToken(refreshToken);

      // For now, we'll generate a new token with the same user data
      // In production, you might want to re-fetch user data from D365
      // to ensure permissions are up to date
      
      // Fetch fresh user data
      const d365Token = await authService.getD365AccessToken();
      if (!d365Token) {
        throw new AppError('Failed to acquire D365 access token', 500);
      }

      // Note: We need the user's email to fetch from D365
      // In production, you'd store this mapping or include it in the refresh token
      // For now, we'll throw an error indicating this needs to be implemented
      throw new AppError(
        'Refresh token implementation incomplete - needs user email mapping',
        501
      );

      // TODO: Complete implementation when we have proper user session storage
      // const { user, initiative } = await d365Service.getUserWithInitiative(
      //   userEmail,
      //   d365Token
      // );
      
      // const newAccessToken = jwtService.generateAccessToken(
      //   user,
      //   initiative,
      //   azureAccount
      // );
      
      // res.json({
      //   accessToken: newAccessToken,
      //   refreshToken, // Return same refresh token
      // });
    } catch (error) {
      console.error('Token refresh error:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to refresh token', 401);
    }
  }

  /**
   * GET /api/auth/me
   * Return current user with initiative and theme configuration
   * Enhanced to include organization data and theme for complete user context
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      // The auth middleware should have already validated the token
      // and attached the user to the request
      const user = (req as any).user as ExtendedJWTPayload;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      // Get theme configuration for the user's initiative
      const theme = initiativeMappingService.getThemeForInitiative(user.initiative);
      

      // Return enhanced user info including initiative, theme, and organization
      res.json({
        user: {
          id: user.sub,
          email: user.email,
          name: user.name,
          displayName: user.name, // Add displayName field for frontend compatibility
          azureId: user.azureId,
          roles: user.roles,
          permissions: user.permissions,
        },
        initiative: {
          id: user.initiative,
          name: user.initiativeName,
          code: user.initiativeCode,
          displayName: initiativeMappingService.getInitiativeDisplayName(user.initiative),
        },
        organization: user.organization || null, // D365 org data if available
        groups: user.groups || [],
        roles: user.roles || [], // Include roles at root level for frontend
        theme: theme || null, // Theme configuration for dynamic UI
      });
    } catch (error) {
      console.error('Get user error:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get user info', 500);
    }
  }

  /**
   * GET /api/auth/profile
   * Return complete user profile with all context data
   * Combines Entra ID identity, D365 organization data, initiative, and theme configuration
   * This endpoint provides everything the frontend needs to render a personalized experience
   */
  async profile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user as ExtendedJWTPayload;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      // Get theme configuration for the user's initiative
      const theme = initiativeMappingService.getThemeForInitiative(user.initiative);
      
      
      if (!theme) {
        console.warn(`[AUTH /profile] No theme configured for initiative: ${user.initiative}`);
      }

      // Build comprehensive profile response
      const profile = {
        // User identity from Entra ID
        user: {
          id: user.sub,
          email: user.email,
          name: user.name,
          azureId: user.azureId,
        },
        
        // Initiative assignment from Entra ID groups
        initiative: {
          id: user.initiative,
          name: user.initiativeName || initiativeMappingService.getInitiativeDisplayName(user.initiative),
          displayName: initiativeMappingService.getInitiativeDisplayName(user.initiative),
        },
        
        // Organization data from D365 (optional)
        organization: user.organization || null,
        
        // Theme configuration for dynamic UI
        theme: theme ? {
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          logo: theme.logo,
          favicon: theme.favicon,
          name: theme.name,
        } : null,
        
        // Access control from Entra ID
        roles: user.roles || [],
        groups: user.groups || [],
        permissions: user.permissions || [],
        
        // Additional metadata
        metadata: {
          tokenIssuedAt: new Date(user.iat * 1000).toISOString(),
          tokenExpiresAt: new Date(user.exp * 1000).toISOString(),
        }
      };


      res.json(profile);
    } catch (error) {
      console.error('[AUTH] Profile fetch error:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get user profile', 500);
    }
  }

  /**
   * GET /api/auth/config
   * Return auth configuration for frontend
   */
  async getConfig(_req: Request, res: Response): Promise<void> {
    res.json({
      clientId: config.AZURE_CLIENT_ID,
      tenantId: config.AZURE_TENANT_ID,
      redirectUri: config.AZURE_REDIRECT_URI,
      frontendUrl: config.FRONTEND_URL,
    });
  }
}

// Export singleton instance
export const authController = new AuthController();