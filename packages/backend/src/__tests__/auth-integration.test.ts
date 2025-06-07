import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authController } from '../controllers/auth.controller';
import { authService } from '../services/auth.service';
import { sessionService } from '../services/session.service';
import { jwtService } from '../services/jwt.service';
import { d365Service } from '../services/d365.service';
import { initiativeMappingService } from '../services/initiative-mapping.service';
import { authenticateToken, requireRoles, enforceInitiative } from '../middleware/auth.middleware';
import { config } from '../config';
import type { ExtendedJWTPayload } from '../types/auth';

// Mock all services to control their behavior
vi.mock('../services/auth.service');
vi.mock('../services/session.service');
vi.mock('../services/jwt.service');
vi.mock('../services/d365.service');
vi.mock('../services/initiative-mapping.service');
vi.mock('../config');

describe('Authentication Integration Tests', () => {
  let app: express.Application;
  let mockConfig: any;

  beforeAll(() => {
    // Set up Express app with auth routes
    app = express();
    app.use(express.json());
    
    // Auth routes
    app.post('/api/auth/login', (req, res, next) => {
      authController.login(req, res).catch(next);
    });
    
    app.get('/api/auth/callback', (req, res, next) => {
      authController.callback(req, res).catch(next);
    });
    
    app.post('/api/auth/logout', (req, res, next) => {
      authController.logout(req, res).catch(next);
    });
    
    app.get('/api/auth/me', authenticateToken, (req, res, next) => {
      authController.me(req, res).catch(next);
    });
    
    // Protected routes for testing middleware
    app.get('/api/protected', authenticateToken, enforceInitiative(), (req, res) => {
      res.json({ success: true, user: (req as any).user });
    });
    
    app.get('/api/admin-only', authenticateToken, requireRoles('Admin'), (req, res) => {
      res.json({ success: true, message: 'Admin access granted' });
    });
    
    app.get('/api/foster-only', authenticateToken, requireRoles('FosterPartner'), (req, res) => {
      res.json({ success: true, message: 'Foster partner access granted' });
    });
    
    // Error handler
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(err.statusCode || 500).json({
        error: err.message || 'Internal server error',
        code: err.code || 'INTERNAL_ERROR'
      });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default config mock
    mockConfig = {
      ENTRA_GROUPS_ENABLED: true,
      D365_ORG_DATA_ENABLED: true,
      AZURE_GROUP_CLAIM_TYPE: 'securityGroup',
      FRONTEND_URL: 'http://localhost:5173',
      PORT: '3000',
      JWT_SECRET: 'test-secret-key-for-testing-only'
    };
    
    vi.mocked(config).ENTRA_GROUPS_ENABLED = true;
    vi.mocked(config).D365_ORG_DATA_ENABLED = true;
    vi.mocked(config).FRONTEND_URL = 'http://localhost:5173';
    Object.assign(config, mockConfig);

    // Default mocks for initiative mapping service to prevent errors
    vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockImplementation((groups: string[]) => {
      if (groups && groups.length > 0) {
        if (groups.includes('EC Arkansas')) return 'ec-arkansas';
        if (groups.includes('EC Tennessee')) return 'ec-tennessee';
      }
      throw new Error('No initiative found');
    });

    vi.mocked(initiativeMappingService.getAllUserInitiatives).mockImplementation((groups: string[]) => {
      const initiatives = [];
      if (groups && groups.includes('EC Arkansas')) {
        initiatives.push({ groupName: 'EC Arkansas', initiativeId: 'ec-arkansas', displayName: 'Arkansas' });
      }
      if (groups && groups.includes('EC Tennessee')) {
        initiatives.push({ groupName: 'EC Tennessee', initiativeId: 'ec-tennessee', displayName: 'Tennessee' });
      }
      return initiatives;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Full Authentication Flow with Mock Entra ID', () => {
    it('should initiate login flow with PKCE', async () => {
      // Mock PKCE generation
      const mockPkceCodes = {
        verifier: 'mock-verifier',
        challenge: 'mock-challenge'
      };
      
      vi.mocked(authService.generatePkceCodes).mockResolvedValue(mockPkceCodes);
      vi.mocked(jwtService.generateState).mockReturnValue('mock-state');
      vi.mocked(authService.getAuthCodeUrl).mockResolvedValue(
        'https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize?response_type=code&client_id=test&scope=openid&state=mock-state'
      );
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({ redirectUrl: 'http://localhost:5173/dashboard' })
        .expect(200);

      expect(response.body).toEqual({
        authUrl: expect.stringContaining('login.microsoftonline.com'),
        state: 'mock-state'
      });

      expect(sessionService.storeSession).toHaveBeenCalledWith(
        'mock-state',
        'mock-verifier',
        'mock-challenge',
        'http://localhost:5173/dashboard'
      );
    });

    it('should handle OAuth callback with Entra ID groups and roles', async () => {
      const mockSession = {
        pkceVerifier: 'mock-verifier',
        redirectUrl: 'http://localhost:5173/dashboard'
      };
      
      const mockAuthResult = {
        account: {
          username: 'user@example.com',
          name: 'Test User',
          homeAccountId: 'user-123'
        },
        idToken: 'mock-id-token',
        accessToken: 'mock-access-token'
      };

      const mockGroups = ['EC Arkansas', 'Other Group'];
      const mockRoles = ['Admin'];
      const mockClaims = {
        oid: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        sub: 'user-123'
      };

      const mockOrganization = {
        id: 'org-123',
        name: 'Test Organization',
        type: 'Foster',
        attributes: {
          leadType: 'Foster',
          createdOn: '2024-01-01T00:00:00Z',
          modifiedOn: '2024-01-02T00:00:00Z'
        }
      };

      // Mock service responses
      vi.mocked(sessionService.getAndRemoveSession).mockReturnValue(mockSession);
      vi.mocked(authService.acquireTokenByCode).mockResolvedValue(mockAuthResult as any);
      vi.mocked(authService.extractGroupsAndRoles).mockReturnValue({
        groups: mockGroups,
        roles: mockRoles,
        claims: mockClaims as any
      });
      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockReturnValue('ec-arkansas');
      vi.mocked(initiativeMappingService.getInitiativeDisplayName).mockReturnValue('Arkansas Partner Portal');
      vi.mocked(authService.getD365AccessToken).mockResolvedValue('d365-token');
      vi.mocked(d365Service.getUserOrganization).mockResolvedValue(mockOrganization);
      vi.mocked(jwtService.generateAccessToken).mockReturnValue('mock-jwt-token');
      vi.mocked(jwtService.generateRefreshToken).mockReturnValue('mock-refresh-token');

      const response = await request(app)
        .get('/api/auth/callback')
        .query({
          code: 'mock-auth-code',
          state: 'mock-state'
        })
        .expect(302);

      // Should redirect to frontend with tokens
      expect(response.headers.location).toContain('http://localhost:5173/dashboard');
      expect(response.headers.location).toContain('token=mock-jwt-token');
      expect(response.headers.location).toContain('refresh=mock-refresh-token');

      // Verify service calls
      expect(authService.acquireTokenByCode).toHaveBeenCalledWith(
        'mock-auth-code',
        'mock-state',
        'mock-verifier'
      );
      expect(authService.extractGroupsAndRoles).toHaveBeenCalledWith('mock-id-token');
      expect(initiativeMappingService.extractInitiativeFromGroups).toHaveBeenCalledWith(mockGroups);
      expect(d365Service.getUserOrganization).toHaveBeenCalledWith(
        'user@example.com',
        'd365-token'
      );
    });

    it('should handle callback with no initiative group assignment', async () => {
      const mockSession = {
        pkceVerifier: 'mock-verifier',
        redirectUrl: 'http://localhost:5173/dashboard'
      };
      
      const mockAuthResult = {
        account: {
          username: 'user@example.com',
          name: 'Test User',
          homeAccountId: 'user-123'
        },
        idToken: 'mock-id-token',
        accessToken: 'mock-access-token'
      };

      vi.mocked(sessionService.getAndRemoveSession).mockReturnValue(mockSession);
      vi.mocked(authService.acquireTokenByCode).mockResolvedValue(mockAuthResult as any);
      vi.mocked(authService.extractGroupsAndRoles).mockReturnValue({
        groups: ['Random Group'],
        roles: ['Admin'],
        claims: {} as any
      });
      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockImplementation(() => {
        throw new Error('User is not assigned to any initiative group');
      });

      const response = await request(app)
        .get('/api/auth/callback')
        .query({
          code: 'mock-auth-code',
          state: 'mock-state'
        })
        .expect(302);

      // Should redirect to error page
      expect(response.headers.location).toContain('/auth/error');
      const decodedLocation = decodeURIComponent(response.headers.location.replace(/\+/g, ' '));
      expect(decodedLocation).toContain('User is not assigned to any initiative group');
    });

    it('should handle OAuth errors gracefully', async () => {
      const response = await request(app)
        .get('/api/auth/callback')
        .query({
          error: 'access_denied',
          error_description: 'User cancelled authentication'
        })
        .expect(302);

      expect(response.headers.location).toContain('/auth/error');
      expect(decodeURIComponent(response.headers.location.replace(/\+/g, ' '))).toContain('Authentication failed');
    });
  });

  describe('Initiative Boundary Enforcement', () => {
    const createMockJWT = (initiative: string, groups: string[] = [], roles: string[] = ['FosterPartner']): ExtendedJWTPayload => ({
      sub: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
      groups,
      roles,
      permissions: [],
      initiative,
      initiativeName: 'Test Initiative',
      initiativeCode: 'TEST',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    });

    beforeEach(() => {
      // Mock JWT verification to return our test payload
      vi.mocked(jwtService.verifyAccessToken).mockImplementation((token: string) => {
        if (token === 'arkansas-token') {
          return createMockJWT('ec-arkansas', ['EC Arkansas']);
        }
        if (token === 'tennessee-token') {
          return createMockJWT('ec-tennessee', ['EC Tennessee']);
        }
        if (token === 'multi-initiative-token') {
          return createMockJWT('ec-arkansas', ['EC Arkansas', 'EC Tennessee']);
        }
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockImplementation((groups: string[]) => {
        if (groups.includes('EC Arkansas')) return 'ec-arkansas';
        if (groups.includes('EC Tennessee')) return 'ec-tennessee';
        throw new Error('No initiative found');
      });

      vi.mocked(initiativeMappingService.getAllUserInitiatives).mockImplementation((groups: string[]) => {
        const initiatives = [];
        if (groups.includes('EC Arkansas')) {
          initiatives.push({ groupName: 'EC Arkansas', initiativeId: 'ec-arkansas', displayName: 'Arkansas' });
        }
        if (groups.includes('EC Tennessee')) {
          initiatives.push({ groupName: 'EC Tennessee', initiativeId: 'ec-tennessee', displayName: 'Tennessee' });
        }
        return initiatives;
      });
    });

    it('should allow access when user has correct initiative', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer arkansas-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.initiative).toBe('ec-arkansas');
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
      expect(response.body.code).toBe('INVALID_TOKEN');
    });

    it('should deny access without authorization header', async () => {
      const response = await request(app)
        .get('/api/protected')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should handle users with multiple initiative groups', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer multi-initiative-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.initiative).toBe('ec-arkansas');
    });

    it('should log cross-initiative access attempts', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock cross-initiative detection
      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockImplementation((groups: string[]) => {
        if (groups.includes('EC Tennessee')) return 'ec-tennessee';
        throw new Error('Cross-initiative access detected');
      });

      await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer tennessee-token')
        .expect(200);

      consoleSpy.mockRestore();
    });
  });

  describe('Role-Based Access Control', () => {
    beforeEach(() => {
      vi.mocked(jwtService.verifyAccessToken).mockImplementation((token: string) => {
        const basePayload = {
          sub: 'user-123',
          email: 'user@example.com',
          name: 'Test User',
          groups: ['EC Arkansas'],
          permissions: [],
          initiative: 'ec-arkansas',
          initiativeName: 'Arkansas Partner Portal',
          initiativeCode: 'AR',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        };

        if (token === 'admin-token') {
          return { ...basePayload, roles: ['Admin'] };
        }
        if (token === 'foster-token') {
          return { ...basePayload, roles: ['FosterPartner'] };
        }
        if (token === 'volunteer-token') {
          return { ...basePayload, roles: ['VolunteerPartner'] };
        }
        if (token === 'network-foster-token') {
          return { ...basePayload, roles: ['FosterNetworkWidePartner'] };
        }
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockReturnValue('ec-arkansas');
      vi.mocked(initiativeMappingService.getAllUserInitiatives).mockReturnValue([
        { groupName: 'EC Arkansas', initiativeId: 'ec-arkansas', displayName: 'Arkansas' }
      ]);
    });

    it('should allow admin access to admin-only routes', async () => {
      const response = await request(app)
        .get('/api/admin-only')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.message).toBe('Admin access granted');
    });

    it('should allow admin access to foster routes through hierarchy', async () => {
      const response = await request(app)
        .get('/api/foster-only')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.message).toBe('Foster partner access granted');
    });

    it('should allow foster partner access to foster routes', async () => {
      const response = await request(app)
        .get('/api/foster-only')
        .set('Authorization', 'Bearer foster-token')
        .expect(200);

      expect(response.body.message).toBe('Foster partner access granted');
    });

    it('should allow network-wide foster access to foster routes', async () => {
      const response = await request(app)
        .get('/api/foster-only')
        .set('Authorization', 'Bearer network-foster-token')
        .expect(200);

      expect(response.body.message).toBe('Foster partner access granted');
    });

    it('should deny volunteer partner access to foster routes', async () => {
      const response = await request(app)
        .get('/api/foster-only')
        .set('Authorization', 'Bearer volunteer-token')
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('should deny foster partner access to admin routes', async () => {
      const response = await request(app)
        .get('/api/admin-only')
        .set('Authorization', 'Bearer foster-token')
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('should require authentication for role-based routes', async () => {
      const response = await request(app)
        .get('/api/admin-only')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Graceful Handling of D365 Failures', () => {
    beforeEach(() => {
      const mockSession = {
        pkceVerifier: 'mock-verifier',
        redirectUrl: 'http://localhost:5173/dashboard'
      };
      
      const mockAuthResult = {
        account: {
          username: 'user@example.com',
          name: 'Test User',
          homeAccountId: 'user-123'
        },
        idToken: 'mock-id-token',
        accessToken: 'mock-access-token'
      };

      vi.mocked(sessionService.getAndRemoveSession).mockReturnValue(mockSession);
      vi.mocked(authService.acquireTokenByCode).mockResolvedValue(mockAuthResult as any);
      vi.mocked(authService.extractGroupsAndRoles).mockReturnValue({
        groups: ['EC Arkansas'],
        roles: ['FosterPartner'],
        claims: {
          oid: 'user-123',
          email: 'user@example.com',
          name: 'Test User',
          sub: 'user-123'
        } as any
      });
      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockReturnValue('ec-arkansas');
      vi.mocked(initiativeMappingService.getInitiativeDisplayName).mockReturnValue('Arkansas Partner Portal');
      vi.mocked(jwtService.generateAccessToken).mockReturnValue('mock-jwt-token');
      vi.mocked(jwtService.generateRefreshToken).mockReturnValue('mock-refresh-token');
    });

    it('should continue authentication when D365 token acquisition fails', async () => {
      vi.mocked(authService.getD365AccessToken).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/callback')
        .query({
          code: 'mock-auth-code',
          state: 'mock-state'
        })
        .expect(302);

      // Should still redirect successfully without D365 data
      expect(response.headers.location).toContain('http://localhost:5173/dashboard');
      expect(response.headers.location).toContain('token=mock-jwt-token');
      
      expect(d365Service.getUserOrganization).not.toHaveBeenCalled();
    });

    it('should continue authentication when D365 user organization query fails', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      vi.mocked(authService.getD365AccessToken).mockResolvedValue('d365-token');
      vi.mocked(d365Service.getUserOrganization).mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/auth/callback')
        .query({
          code: 'mock-auth-code',
          state: 'mock-state'
        })
        .expect(302);

      // Should still redirect successfully
      expect(response.headers.location).toContain('http://localhost:5173/dashboard');
      expect(response.headers.location).toContain('token=mock-jwt-token');
      
      expect(d365Service.getUserOrganization).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should continue authentication when D365 service throws error', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      vi.mocked(authService.getD365AccessToken).mockResolvedValue('d365-token');
      vi.mocked(d365Service.getUserOrganization).mockRejectedValue(new Error('D365 connection timeout'));

      const response = await request(app)
        .get('/api/auth/callback')
        .query({
          code: 'mock-auth-code',
          state: 'mock-state'
        })
        .expect(302);

      // Should still redirect successfully
      expect(response.headers.location).toContain('http://localhost:5173/dashboard');
      expect(response.headers.location).toContain('token=mock-jwt-token');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH] Failed to fetch organization data from D365:'),
        expect.objectContaining({
          error: 'D365 connection timeout',
          impact: 'Continuing without organization data'
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should work with D365_ORG_DATA_ENABLED=false', async () => {
      vi.mocked(config).D365_ORG_DATA_ENABLED = false;

      const response = await request(app)
        .get('/api/auth/callback')
        .query({
          code: 'mock-auth-code',
          state: 'mock-state'
        })
        .expect(302);

      // Should redirect successfully without trying D365
      expect(response.headers.location).toContain('http://localhost:5173/dashboard');
      expect(response.headers.location).toContain('token=mock-jwt-token');
      
      expect(authService.getD365AccessToken).not.toHaveBeenCalled();
      expect(d365Service.getUserOrganization).not.toHaveBeenCalled();
    });

    it('should log organization data fetch success when D365 is available', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const mockOrganization = {
        id: 'org-123',
        name: 'Test Organization',
        type: 'Foster',
        attributes: {
          leadType: 'Foster',
          createdOn: '2024-01-01T00:00:00Z',
          modifiedOn: '2024-01-02T00:00:00Z'
        }
      };

      vi.mocked(authService.getD365AccessToken).mockResolvedValue('d365-token');
      vi.mocked(d365Service.getUserOrganization).mockResolvedValue(mockOrganization);

      await request(app)
        .get('/api/auth/callback')
        .query({
          code: 'mock-auth-code',
          state: 'mock-state'
        })
        .expect(302);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AUTH] Organization data fetched:',
        expect.objectContaining({
          userId: 'user-123',
          orgId: 'org-123',
          orgName: 'Test Organization'
        })
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('/api/auth/me endpoint', () => {
    it('should return user info when authenticated', async () => {
      const mockUser: ExtendedJWTPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        groups: ['EC Arkansas'],
        roles: ['FosterPartner'],
        permissions: ['read:leads'],
        initiative: 'ec-arkansas',
        initiativeName: 'Arkansas Partner Portal',
        initiativeCode: 'AR',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      vi.mocked(jwtService.verifyAccessToken).mockReturnValue(mockUser);
      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockReturnValue('ec-arkansas');

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        user: {
          id: 'user-123',
          email: 'user@example.com',
          name: 'Test User',
          roles: ['FosterPartner'],
          permissions: ['read:leads']
        },
        initiative: {
          id: 'ec-arkansas',
          name: 'Arkansas Partner Portal',
          code: 'AR'
        }
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('Logout endpoint', () => {
    it('should return logout URL', async () => {
      vi.mocked(authService.getLogoutUrl).mockReturnValue(
        'https://login.microsoftonline.com/tenant/oauth2/v2.0/logout?post_logout_redirect_uri=http://localhost:5173'
      );

      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.logoutUrl).toContain('login.microsoftonline.com');
      expect(response.body.logoutUrl).toContain('logout');
    });

    it('should handle logout with valid token', async () => {
      vi.mocked(jwtService.verifyAccessToken).mockReturnValue({
        sub: 'user-123',
        email: 'user@example.com'
      } as any);
      
      vi.mocked(authService.getLogoutUrl).mockReturnValue(
        'https://login.microsoftonline.com/tenant/oauth2/v2.0/logout'
      );

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.logoutUrl).toBeDefined();
    });

    it('should handle logout with invalid token gracefully', async () => {
      vi.mocked(jwtService.verifyAccessToken).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      vi.mocked(authService.getLogoutUrl).mockReturnValue(
        'https://login.microsoftonline.com/tenant/oauth2/v2.0/logout'
      );

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200);

      expect(response.body.logoutUrl).toBeDefined();
    });
  });
});