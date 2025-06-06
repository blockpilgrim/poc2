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
        // Map group IDs to names if needed (when groups are GUIDs)
        let groupNames = groups;
        if (groups.length > 0 && groups[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          // Groups are GUIDs, need to fetch names
          const groupMap = await authService.getGroupNamesFromIds(groups, authResult.accessToken);
          groupNames = groups.map(id => groupMap.get(id) || id);
        }

        // Extract initiative from Entra ID groups
        try {
          initiative = initiativeMappingService.extractInitiativeFromGroups(groupNames);
          initiativeName = initiativeMappingService.getInitiativeDisplayName(initiative);
        } catch (error) {
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
              organization = await d365Service.getUserOrganization(
                authResult.account.username,
                d365Token
              );
              
              // Log successful org data fetch
              console.log('[AUTH] Organization data fetched:', {
                userId: authResult.account.homeAccountId,
                orgId: organization?.id,
                orgName: organization?.name
              });
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
        // Legacy: Fetch initiative from D365
        const d365Token = await authService.getD365AccessToken();
        if (!d365Token) {
          throw new AppError('Failed to acquire D365 access token', 500);
        }

        const { initiative: d365Initiative } = await d365Service.getUserWithInitiative(
          authResult.account.username,
          d365Token
        );

        if (!d365Initiative || !d365Initiative.id) {
          throw new AppError(
            'User does not have an assigned initiative. Access denied.',
            403
          );
        }

        initiative = d365Initiative.id;
        initiativeName = d365Initiative.name;
      }

      // Build user object from Entra ID claims
      const user = {
        id: claims.oid || claims.sub,
        email: claims.email || claims.preferred_username || authResult.account.username,
        name: claims.name || authResult.account.name || '',
        azureId: claims.oid,
      };

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
      const frontendRedirect = new URL(
        session.redirectUrl || config.FRONTEND_URL
      );
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
   * Return current user with initiative
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      // The auth middleware should have already validated the token
      // and attached the user to the request
      const user = (req as any).user as ExtendedJWTPayload;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      // Return user info including initiative
      res.json({
        user: {
          id: user.sub,
          email: user.email,
          name: user.name,
          roles: user.roles,
          permissions: user.permissions,
        },
        initiative: {
          id: user.initiative,
          name: user.initiativeName,
          code: user.initiativeCode,
        },
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