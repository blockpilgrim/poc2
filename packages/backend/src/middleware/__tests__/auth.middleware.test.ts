import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { 
  authenticateToken,
  requireRoles,
  enforceInitiativeFromGroups,
  enforceInitiative
} from '../auth.middleware';
import { jwtService } from '../../services/jwt.service';
import { config } from '../../config';

// Mock dependencies
vi.mock('../../services/jwt.service');
vi.mock('../../services/initiative-mapping.service', () => ({
  initiativeMappingService: {
    extractInitiativeFromGroups: vi.fn(),
    hasAccessToInitiative: vi.fn(),
    getAllUserInitiatives: vi.fn()
  }
}));

// Mock config with feature flags
vi.mock('../../config', () => ({
  config: {
    ENTRA_GROUPS_ENABLED: true,
    D365_ORG_DATA_ENABLED: true,
    AZURE_GROUP_CLAIM_TYPE: 'securityGroup'
  }
}));

// Import mocked service after mocking
import { initiativeMappingService } from '../../services/initiative-mapping.service';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      path: '/test',
      method: 'GET'
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn()
    };
    
    mockNext = vi.fn();
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should reject requests without authorization header', () => {
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate token and extract initiative from groups when ENTRA_GROUPS_ENABLED', () => {
      const mockToken = 'valid-token';
      const mockDecoded = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: ['EC Arkansas', 'Other Group'],
        roles: ['Admin'],
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      };

      mockReq.headers!.authorization = `Bearer ${mockToken}`;
      vi.mocked(jwtService.verifyAccessToken).mockReturnValue(mockDecoded as any);
      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockReturnValue('ec-arkansas');

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(jwtService.verifyAccessToken).toHaveBeenCalledWith(mockToken);
      expect(initiativeMappingService.extractInitiativeFromGroups).toHaveBeenCalledWith(['EC Arkansas', 'Other Group']);
      expect(mockReq.user).toEqual({
        ...mockDecoded,
        initiative: 'ec-arkansas'
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use legacy initiative field when groups are not available', () => {
      const mockToken = 'valid-token';
      const mockDecoded = {
        sub: 'user-123',
        email: 'user@example.com',
        initiative: 'legacy-initiative',
        roles: ['FosterPartner'],
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      };

      mockReq.headers!.authorization = `Bearer ${mockToken}`;
      vi.mocked(jwtService.verifyAccessToken).mockReturnValue(mockDecoded as any);

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockDecoded);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle expired tokens', () => {
      mockReq.headers!.authorization = 'Bearer expired-token';
      vi.mocked(jwtService.verifyAccessToken).mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    });
  });

  describe('requireRoles', () => {
    it('should allow access when user has required role', () => {
      mockReq.user = {
        sub: 'user-123',
        email: 'user@example.com',
        roles: ['Admin', 'FosterPartner'],
        initiative: 'ec-arkansas'
      } as any;

      const middleware = requireRoles('FosterPartner');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow access through role hierarchy (Admin has all permissions)', () => {
      mockReq.user = {
        sub: 'user-123',
        email: 'user@example.com',
        roles: ['Admin'],
        initiative: 'ec-arkansas'
      } as any;

      const middleware = requireRoles('FosterPartner', 'VolunteerPartner');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when user lacks required roles', () => {
      mockReq.user = {
        sub: 'user-123',
        email: 'user@example.com',
        roles: ['VolunteerPartner'],
        groups: ['EC Arkansas'],
        initiative: 'ec-arkansas'
      } as any;

      const middleware = requireRoles('FosterPartner', 'Admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should require authentication', () => {
      const middleware = requireRoles('Admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    });
  });

  describe('enforceInitiativeFromGroups', () => {
    it('should extract and validate initiative from groups', () => {
      mockReq.user = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: ['EC Tennessee', 'Other Group'],
        roles: ['Admin']
      } as any;

      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockReturnValue('ec-tennessee');

      const middleware = enforceInitiativeFromGroups();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(initiativeMappingService.extractInitiativeFromGroups).toHaveBeenCalledWith(['EC Tennessee', 'Other Group']);
      expect(mockReq.user!.initiative).toBe('ec-tennessee');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should enforce specific initiative access', () => {
      mockReq.user = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: ['EC Arkansas'],
        roles: ['FosterPartner']
      } as any;

      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockReturnValue('ec-arkansas');

      const middleware = enforceInitiativeFromGroups('ec-tennessee');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied for this initiative',
        code: 'FORBIDDEN'
      });
    });

    it('should handle users with no initiative groups', () => {
      mockReq.user = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: ['Random Group'],
        roles: ['Admin']
      } as any;

      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockImplementation(() => {
        throw new Error('User is not assigned to any initiative');
      });

      const middleware = enforceInitiativeFromGroups();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User is not assigned to any initiative',
        code: 'FORBIDDEN'
      });
    });
  });

  describe('enforceInitiative (backward compatible)', () => {
    it('should use group-based approach when ENTRA_GROUPS_ENABLED is true', () => {
      // Config is already mocked with ENTRA_GROUPS_ENABLED = true
      mockReq.user = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: ['EC Oregon'],
        roles: ['Admin']
      } as any;

      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockReturnValue('ec-oregon');

      const middleware = enforceInitiative();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(initiativeMappingService.extractInitiativeFromGroups).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use legacy approach when ENTRA_GROUPS_ENABLED is false', () => {
      // Temporarily override config
      (config as any).ENTRA_GROUPS_ENABLED = false;

      mockReq.user = {
        sub: 'user-123',
        email: 'user@example.com',
        initiative: 'legacy-initiative',
        roles: ['Admin']
      } as any;

      const middleware = enforceInitiative();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      
      // Restore config
      (config as any).ENTRA_GROUPS_ENABLED = true;
    });
  });
});

describe('Group Security Utilities', () => {
  describe('Role Hierarchy', () => {
    it('should validate role hierarchy correctly', async () => {
      const { hasRequiredRole, AppRole } = await import('../../utils/group-security.utils');

      // Admin should have access to all roles
      expect(hasRequiredRole([AppRole.Admin], [AppRole.FosterPartner])).toBe(true);
      expect(hasRequiredRole([AppRole.Admin], [AppRole.VolunteerPartner])).toBe(true);
      expect(hasRequiredRole([AppRole.Admin], [AppRole.FosterNetworkWidePartner])).toBe(true);

      // Network-wide roles should have access to their specific partner roles
      expect(hasRequiredRole([AppRole.FosterNetworkWidePartner], [AppRole.FosterPartner])).toBe(true);
      expect(hasRequiredRole([AppRole.VolunteerNetworkWidePartner], [AppRole.VolunteerPartner])).toBe(true);

      // Partner roles should not have access to network-wide roles
      expect(hasRequiredRole([AppRole.FosterPartner], [AppRole.FosterNetworkWidePartner])).toBe(false);
      expect(hasRequiredRole([AppRole.VolunteerPartner], [AppRole.VolunteerNetworkWidePartner])).toBe(false);
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events with proper context', async () => {
      const { logSecurityEvent } = await import('../../utils/group-security.utils');
      const consoleSpy = vi.spyOn(console, 'warn');

      logSecurityEvent('CROSS_INITIATIVE_ATTEMPT', {
        userId: 'user-123',
        email: 'user@example.com',
        groups: ['EC Arkansas'],
        initiative: 'ec-arkansas',
        requestedResource: 'GET /api/leads',
        reason: 'Attempted to access ec-tennessee from ec-arkansas'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SECURITY]',
        expect.stringContaining('CROSS_INITIATIVE_ATTEMPT')
      );

      consoleSpy.mockRestore();
    });
  });
});