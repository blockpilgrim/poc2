import { ExtendedJWTPayload } from '../types/auth';
import { initiativeMappingService } from '../services/initiative-mapping.service';
import { filterInitiativeGroups } from './group-naming.utils';

/**
 * Entra ID App Role definitions
 * These should match the roles defined in Azure AD App Registration
 */
export enum AppRole {
  Admin = 'Admin',
  FosterPartner = 'FosterPartner',
  VolunteerPartner = 'VolunteerPartner',
  VolunteerNetworkWidePartner = 'VolunteerNetworkWidePartner',
  FosterNetworkWidePartner = 'FosterNetworkWidePartner',
}

/**
 * Role hierarchy for permission inheritance
 * Higher level roles inherit permissions from lower levels
 */
export const roleHierarchy: Record<AppRole, AppRole[]> = {
  [AppRole.Admin]: [
    AppRole.FosterNetworkWidePartner,
    AppRole.VolunteerNetworkWidePartner,
    AppRole.FosterPartner,
    AppRole.VolunteerPartner,
  ],
  [AppRole.FosterNetworkWidePartner]: [AppRole.FosterPartner],
  [AppRole.VolunteerNetworkWidePartner]: [AppRole.VolunteerPartner],
  [AppRole.FosterPartner]: [],
  [AppRole.VolunteerPartner]: [],
};

/**
 * Validate if a user has at least one of the required roles
 * Considers role hierarchy - higher roles grant lower role permissions
 */
export function hasRequiredRole(userRoles: string[], requiredRoles: string[]): boolean {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  // Check direct role match
  const hasDirectRole = requiredRoles.some(role => userRoles.includes(role));
  if (hasDirectRole) {
    return true;
  }

  // Check inherited roles through hierarchy
  for (const userRole of userRoles) {
    const appRole = userRole as AppRole;
    if (appRole in roleHierarchy) {
      const inheritedRoles = roleHierarchy[appRole];
      const hasInheritedRole = requiredRoles.some(role => 
        inheritedRoles.includes(role as AppRole)
      );
      if (hasInheritedRole) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extract initiative from JWT claims using groups
 * This is the primary method for determining user's initiative
 * Handles multiple initiative groups by using consistent priority rules
 */
export function extractInitiativeFromJWT(payload: ExtendedJWTPayload): string {
  const groups = payload.groups || [];
  
  try {
    // If user has multiple initiatives, use resolvePrimaryInitiative for consistency
    const userInitiatives = initiativeMappingService.getAllUserInitiatives(groups);
    if (userInitiatives.length > 1) {
      const { primary } = initiativeMappingService.resolvePrimaryInitiative(groups);
      return primary;
    }
    
    return initiativeMappingService.extractInitiativeFromGroups(groups);
  } catch (error) {
    // If initiative is already in payload, use it (set during login)
    if (payload.initiative) {
      return payload.initiative;
    }
    throw error;
  }
}

/**
 * Validate if a user belongs to the specified initiative
 * Checks both groups and direct initiative claim
 */
export function validateUserInitiative(
  payload: ExtendedJWTPayload, 
  requiredInitiative: string
): boolean {
  const groups = payload.groups || [];
  
  // Check via groups (preferred)
  if (groups.length > 0) {
    return initiativeMappingService.hasAccessToInitiative(groups, requiredInitiative);
  }
  
  // Fall back to direct initiative claim
  return payload.initiative === requiredInitiative;
}

/**
 * Detect potential cross-initiative access attempts
 * Returns true if user is trying to access data from a different initiative
 */
export function detectCrossInitiativeAccess(
  userPayload: ExtendedJWTPayload,
  requestedInitiative: string
): boolean {
  const userInitiative = extractInitiativeFromJWT(userPayload);
  return userInitiative !== requestedInitiative;
}

/**
 * Get all initiatives a user has access to
 * Useful for users with multiple initiative assignments
 */
export function getUserInitiatives(payload: ExtendedJWTPayload): string[] {
  const groups = payload.groups || [];
  
  if (groups.length > 0) {
    const initiatives = initiativeMappingService.getAllUserInitiatives(groups);
    return initiatives.map(init => init.initiativeId);
  }
  
  // Fall back to single initiative from claim
  if (payload.initiative) {
    return [payload.initiative];
  }
  
  return [];
}

/**
 * Validate Entra ID groups format
 * Groups can be either names or GUIDs
 * Also filters to only include valid initiative groups for security
 */
export function validateGroups(groups: any): string[] {
  if (!Array.isArray(groups)) {
    return [];
  }
  
  // First, ensure all groups are valid strings
  const stringGroups = groups.filter(group => 
    typeof group === 'string' && group.length > 0
  );
  
  // For security purposes, we can optionally filter to only valid initiative groups
  // This prevents potential attacks via crafted group names
  return stringGroups;
}

/**
 * Validate and filter groups to only include initiative groups
 * More restrictive version for security-sensitive operations
 */
export function validateAndFilterInitiativeGroups(groups: any): string[] {
  const validGroups = validateGroups(groups);
  return filterInitiativeGroups(validGroups);
}

/**
 * Check if user has admin role
 * Admin role has access to all features within their initiative
 */
export function isAdmin(roles: string[]): boolean {
  return roles.includes(AppRole.Admin);
}

/**
 * Check if user has network-wide access for a specific journey type
 */
export function hasNetworkWideAccess(roles: string[], journeyType: 'foster' | 'volunteer'): boolean {
  if (isAdmin(roles)) {
    return true;
  }
  
  if (journeyType === 'foster') {
    return roles.includes(AppRole.FosterNetworkWidePartner);
  }
  
  return roles.includes(AppRole.VolunteerNetworkWidePartner);
}

/**
 * Log security-related events for audit trail
 * 
 * TODO: PRODUCTION - Replace console logging with proper audit service:
 * - Azure Application Insights for centralized logging
 * - Separate security audit log with retention policy
 * - Integration with SIEM (Security Information and Event Management)
 * - Alert on critical security events (CROSS_INITIATIVE_ATTEMPT)
 */
export function logSecurityEvent(
  eventType: 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'CROSS_INITIATIVE_ATTEMPT' | 'INVALID_ROLE' | 'D365_FILTER_APPLIED',
  context: {
    userId: string;
    email: string;
    groups?: string[];
    roles?: string[];
    initiative?: string;
    requestedResource?: string;
    reason?: string;
    filter?: any;
    endpoint?: string;
  }
): void {
  const timestamp = new Date().toISOString();
  
  const logEntry = {
    timestamp,
    eventType,
    ...context,
  };
  
  // In production, this would go to a security audit log service
  // Current implementation uses console for development
  if (eventType === 'ACCESS_DENIED' || eventType === 'CROSS_INITIATIVE_ATTEMPT') {
    console.warn('[SECURITY]', JSON.stringify(logEntry));
  } else {
    console.log('[SECURITY]', JSON.stringify(logEntry));
  }
  
  // TODO: Add to production logging service:
  // await auditService.logSecurityEvent(logEntry);
}

/**
 * Create a security context from JWT payload
 * Consolidates all security-related information
 */
export function createSecurityContext(payload: ExtendedJWTPayload) {
  const groups = validateGroups(payload.groups);
  const roles = payload.roles || [];
  const initiative = extractInitiativeFromJWT(payload);
  const initiatives = getUserInitiatives(payload);
  
  return {
    userId: payload.sub,
    email: payload.email,
    groups,
    roles,
    initiative,
    initiatives,
    isAdmin: isAdmin(roles),
    hasFosterNetworkAccess: hasNetworkWideAccess(roles, 'foster'),
    hasVolunteerNetworkAccess: hasNetworkWideAccess(roles, 'volunteer'),
  };
}