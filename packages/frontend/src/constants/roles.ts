/**
 * Entra ID Role Constants
 * 
 * These constants match the exact role names from Azure AD/Entra ID.
 * Using constants prevents typos and makes role checks consistent across the application.
 */

export const ENTRA_ID_ROLES = {
  ADMIN: 'Admin',
  FOSTER_PARTNER: 'Foster-Partner',
  FOSTER_NETWORK_WIDE_PARTNER: 'Foster-Network-Wide-Partner',
  VOLUNTEER_PARTNER: 'Volunteer-Partner',
  VOLUNTEER_NETWORK_WIDE_PARTNER: 'Volunteer-Network-Wide-Partner',
} as const;

export type EntraIdRole = typeof ENTRA_ID_ROLES[keyof typeof ENTRA_ID_ROLES];

/**
 * Helper functions for role checks
 */
export function hasAdminRole(roles: string[]): boolean {
  return roles.includes(ENTRA_ID_ROLES.ADMIN);
}

export function hasFosterRole(roles: string[]): boolean {
  return roles.includes(ENTRA_ID_ROLES.FOSTER_PARTNER) || 
         roles.includes(ENTRA_ID_ROLES.FOSTER_NETWORK_WIDE_PARTNER);
}

export function hasVolunteerRole(roles: string[]): boolean {
  return roles.includes(ENTRA_ID_ROLES.VOLUNTEER_PARTNER) || 
         roles.includes(ENTRA_ID_ROLES.VOLUNTEER_NETWORK_WIDE_PARTNER);
}

export function hasAnyLeadRole(roles: string[]): boolean {
  return hasAdminRole(roles) || hasFosterRole(roles) || hasVolunteerRole(roles);
}