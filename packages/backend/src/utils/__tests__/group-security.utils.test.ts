import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AppRole,
  hasRequiredRole,
  extractInitiativeFromJWT,
  validateUserInitiative,
  detectCrossInitiativeAccess,
  getUserInitiatives,
  validateGroups,
  isAdmin,
  hasNetworkWideAccess,
  createSecurityContext,
  roleHierarchy
} from '../group-security.utils';
import { ExtendedJWTPayload } from '../../types/auth';

// Mock initiative mapping service
vi.mock('../../services/initiative-mapping.service', () => ({
  initiativeMappingService: {
    extractInitiativeFromGroups: vi.fn(),
    hasAccessToInitiative: vi.fn(),
    getAllUserInitiatives: vi.fn()
  }
}));

import { initiativeMappingService } from '../../services/initiative-mapping.service';

describe('Group Security Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasRequiredRole', () => {
    it('should return true for direct role match', () => {
      const userRoles = ['Admin', 'FosterPartner'];
      const requiredRoles = ['FosterPartner'];
      
      expect(hasRequiredRole(userRoles, requiredRoles)).toBe(true);
    });

    it('should return true when admin has any required role through hierarchy', () => {
      const userRoles = ['Admin'];
      const requiredRoles = ['FosterPartner', 'VolunteerPartner'];
      
      expect(hasRequiredRole(userRoles, requiredRoles)).toBe(true);
    });

    it('should return true when network-wide role has partner role through hierarchy', () => {
      const userRoles = ['FosterNetworkWidePartner'];
      const requiredRoles = ['FosterPartner'];
      
      expect(hasRequiredRole(userRoles, requiredRoles)).toBe(true);
    });

    it('should return false when user lacks required roles', () => {
      const userRoles = ['VolunteerPartner'];
      const requiredRoles = ['FosterPartner', 'Admin'];
      
      expect(hasRequiredRole(userRoles, requiredRoles)).toBe(false);
    });

    it('should return false for empty user roles', () => {
      expect(hasRequiredRole([], ['Admin'])).toBe(false);
      expect(hasRequiredRole(null as any, ['Admin'])).toBe(false);
    });

    it('should handle unknown roles gracefully', () => {
      const userRoles = ['UnknownRole'];
      const requiredRoles = ['Admin'];
      
      expect(hasRequiredRole(userRoles, requiredRoles)).toBe(false);
    });
  });

  describe('extractInitiativeFromJWT', () => {
    it('should extract initiative from groups', () => {
      const payload: ExtendedJWTPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: ['EC Arkansas', 'Other Group'],
        roles: [],
        permissions: [],
        name: 'Test User',
        iat: 0,
        exp: 0,
        initiative: ''
      };

      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockReturnValue('ec-arkansas');

      const result = extractInitiativeFromJWT(payload);
      
      expect(result).toBe('ec-arkansas');
      expect(initiativeMappingService.extractInitiativeFromGroups).toHaveBeenCalledWith(['EC Arkansas', 'Other Group']);
    });

    it('should fall back to direct initiative claim when groups fail', () => {
      const payload: ExtendedJWTPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: [],
        roles: [],
        permissions: [],
        name: 'Test User',
        initiative: 'fallback-initiative',
        iat: 0,
        exp: 0
      };

      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockImplementation(() => {
        throw new Error('No groups');
      });

      const result = extractInitiativeFromJWT(payload);
      
      expect(result).toBe('fallback-initiative');
    });

    it('should throw error when no initiative available', () => {
      const payload: ExtendedJWTPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: [],
        roles: [],
        permissions: [],
        name: 'Test User',
        initiative: '',
        iat: 0,
        exp: 0
      };

      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockImplementation(() => {
        throw new Error('No groups');
      });

      expect(() => extractInitiativeFromJWT(payload)).toThrow();
    });
  });

  describe('validateUserInitiative', () => {
    it('should validate initiative through groups', () => {
      const payload: ExtendedJWTPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: ['EC Tennessee'],
        roles: [],
        permissions: [],
        name: 'Test User',
        initiative: '',
        iat: 0,
        exp: 0
      };

      vi.mocked(initiativeMappingService.hasAccessToInitiative).mockReturnValue(true);

      const result = validateUserInitiative(payload, 'ec-tennessee');
      
      expect(result).toBe(true);
      expect(initiativeMappingService.hasAccessToInitiative).toHaveBeenCalledWith(['EC Tennessee'], 'ec-tennessee');
    });

    it('should fall back to direct initiative comparison', () => {
      const payload: ExtendedJWTPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: [],
        roles: [],
        permissions: [],
        name: 'Test User',
        initiative: 'ec-oregon',
        iat: 0,
        exp: 0
      };

      const result = validateUserInitiative(payload, 'ec-oregon');
      
      expect(result).toBe(true);
    });
  });

  describe('detectCrossInitiativeAccess', () => {
    it('should detect cross-initiative access attempts', () => {
      const payload: ExtendedJWTPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: ['EC Arkansas'],
        roles: [],
        permissions: [],
        name: 'Test User',
        initiative: '',
        iat: 0,
        exp: 0
      };

      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockReturnValue('ec-arkansas');

      const result = detectCrossInitiativeAccess(payload, 'ec-tennessee');
      
      expect(result).toBe(true);
    });

    it('should return false for same initiative access', () => {
      const payload: ExtendedJWTPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: ['EC Kentucky'],
        roles: [],
        permissions: [],
        name: 'Test User',
        initiative: '',
        iat: 0,
        exp: 0
      };

      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockReturnValue('ec-kentucky');

      const result = detectCrossInitiativeAccess(payload, 'ec-kentucky');
      
      expect(result).toBe(false);
    });
  });

  describe('getUserInitiatives', () => {
    it('should return all user initiatives from groups', () => {
      const payload: ExtendedJWTPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: ['EC Arkansas', 'EC Tennessee'],
        roles: [],
        permissions: [],
        name: 'Test User',
        initiative: '',
        iat: 0,
        exp: 0
      };

      vi.mocked(initiativeMappingService.getAllUserInitiatives).mockReturnValue([
        { groupName: 'EC Arkansas', initiativeId: 'ec-arkansas', displayName: 'Arkansas' },
        { groupName: 'EC Tennessee', initiativeId: 'ec-tennessee', displayName: 'Tennessee' }
      ]);

      const result = getUserInitiatives(payload);
      
      expect(result).toEqual(['ec-arkansas', 'ec-tennessee']);
    });

    it('should fall back to single initiative from claim', () => {
      const payload: ExtendedJWTPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: [],
        roles: [],
        permissions: [],
        name: 'Test User',
        initiative: 'ec-oklahoma',
        iat: 0,
        exp: 0
      };

      const result = getUserInitiatives(payload);
      
      expect(result).toEqual(['ec-oklahoma']);
    });
  });

  describe('validateGroups', () => {
    it('should filter valid group strings', () => {
      const groups = ['EC Arkansas', '', 'EC Tennessee', null, 'EC Kentucky', 123];
      
      const result = validateGroups(groups);
      
      expect(result).toEqual(['EC Arkansas', 'EC Tennessee', 'EC Kentucky']);
    });

    it('should return empty array for non-array input', () => {
      expect(validateGroups(null)).toEqual([]);
      expect(validateGroups(undefined)).toEqual([]);
      expect(validateGroups('not an array')).toEqual([]);
    });
  });

  describe('isAdmin', () => {
    it('should identify admin role', () => {
      expect(isAdmin(['Admin', 'FosterPartner'])).toBe(true);
      expect(isAdmin(['FosterPartner', 'VolunteerPartner'])).toBe(false);
      expect(isAdmin([])).toBe(false);
    });
  });

  describe('hasNetworkWideAccess', () => {
    it('should grant network-wide access to admins', () => {
      const roles = ['Admin'];
      
      expect(hasNetworkWideAccess(roles, 'foster')).toBe(true);
      expect(hasNetworkWideAccess(roles, 'volunteer')).toBe(true);
    });

    it('should grant foster network-wide access correctly', () => {
      const roles = ['FosterNetworkWidePartner'];
      
      expect(hasNetworkWideAccess(roles, 'foster')).toBe(true);
      expect(hasNetworkWideAccess(roles, 'volunteer')).toBe(false);
    });

    it('should grant volunteer network-wide access correctly', () => {
      const roles = ['VolunteerNetworkWidePartner'];
      
      expect(hasNetworkWideAccess(roles, 'foster')).toBe(false);
      expect(hasNetworkWideAccess(roles, 'volunteer')).toBe(true);
    });

    it('should deny network-wide access to regular partners', () => {
      const roles = ['FosterPartner', 'VolunteerPartner'];
      
      expect(hasNetworkWideAccess(roles, 'foster')).toBe(false);
      expect(hasNetworkWideAccess(roles, 'volunteer')).toBe(false);
    });
  });

  describe('createSecurityContext', () => {
    it('should create comprehensive security context', () => {
      const payload: ExtendedJWTPayload = {
        sub: 'user-123',
        email: 'admin@example.com',
        groups: ['EC Arkansas', 'EC Tennessee'],
        roles: ['Admin'],
        permissions: [],
        name: 'Admin User',
        initiative: '',
        iat: 0,
        exp: 0
      };

      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockReturnValue('ec-arkansas');
      vi.mocked(initiativeMappingService.getAllUserInitiatives).mockReturnValue([
        { groupName: 'EC Arkansas', initiativeId: 'ec-arkansas', displayName: 'Arkansas' },
        { groupName: 'EC Tennessee', initiativeId: 'ec-tennessee', displayName: 'Tennessee' }
      ]);

      const context = createSecurityContext(payload);
      
      expect(context).toEqual({
        userId: 'user-123',
        email: 'admin@example.com',
        groups: ['EC Arkansas', 'EC Tennessee'],
        roles: ['Admin'],
        initiative: 'ec-arkansas',
        initiatives: ['ec-arkansas', 'ec-tennessee'],
        isAdmin: true,
        hasFosterNetworkAccess: true,
        hasVolunteerNetworkAccess: true
      });
    });

    it('should handle regular partner context', () => {
      const payload: ExtendedJWTPayload = {
        sub: 'user-456',
        email: 'partner@example.com',
        groups: ['EC Kentucky'],
        roles: ['FosterPartner'],
        permissions: [],
        name: 'Partner User',
        initiative: '',
        iat: 0,
        exp: 0
      };

      vi.mocked(initiativeMappingService.extractInitiativeFromGroups).mockReturnValue('ec-kentucky');
      vi.mocked(initiativeMappingService.getAllUserInitiatives).mockReturnValue([
        { groupName: 'EC Kentucky', initiativeId: 'ec-kentucky', displayName: 'Kentucky' }
      ]);

      const context = createSecurityContext(payload);
      
      expect(context).toEqual({
        userId: 'user-456',
        email: 'partner@example.com',
        groups: ['EC Kentucky'],
        roles: ['FosterPartner'],
        initiative: 'ec-kentucky',
        initiatives: ['ec-kentucky'],
        isAdmin: false,
        hasFosterNetworkAccess: false,
        hasVolunteerNetworkAccess: false
      });
    });
  });

  describe('roleHierarchy', () => {
    it('should define correct role inheritance', () => {
      expect(roleHierarchy[AppRole.Admin]).toContain(AppRole.FosterNetworkWidePartner);
      expect(roleHierarchy[AppRole.Admin]).toContain(AppRole.VolunteerNetworkWidePartner);
      expect(roleHierarchy[AppRole.Admin]).toContain(AppRole.FosterPartner);
      expect(roleHierarchy[AppRole.Admin]).toContain(AppRole.VolunteerPartner);

      expect(roleHierarchy[AppRole.FosterNetworkWidePartner]).toContain(AppRole.FosterPartner);
      expect(roleHierarchy[AppRole.FosterNetworkWidePartner]).not.toContain(AppRole.VolunteerPartner);

      expect(roleHierarchy[AppRole.VolunteerNetworkWidePartner]).toContain(AppRole.VolunteerPartner);
      expect(roleHierarchy[AppRole.VolunteerNetworkWidePartner]).not.toContain(AppRole.FosterPartner);

      expect(roleHierarchy[AppRole.FosterPartner]).toHaveLength(0);
      expect(roleHierarchy[AppRole.VolunteerPartner]).toHaveLength(0);
    });
  });
});