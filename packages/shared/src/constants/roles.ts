import { RoleName, Permission } from '../types/user';

/**
 * Role definitions and their associated permissions
 */
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  admin: [
    { id: 'all', resource: '*', action: '*', scope: 'all' }
  ],
  
  partner_admin: [
    { id: 'leads.read', resource: 'leads', action: 'read', scope: 'organization' },
    { id: 'leads.update', resource: 'leads', action: 'update', scope: 'organization' },
    { id: 'leads.assign', resource: 'leads', action: 'assign', scope: 'organization' },
    { id: 'users.read', resource: 'users', action: 'read', scope: 'organization' },
    { id: 'users.create', resource: 'users', action: 'create', scope: 'organization' },
    { id: 'users.update', resource: 'users', action: 'update', scope: 'organization' },
    { id: 'reports.read', resource: 'reports', action: 'read', scope: 'organization' }
  ],
  
  partner_user: [
    { id: 'leads.read', resource: 'leads', action: 'read', scope: 'own' },
    { id: 'leads.update', resource: 'leads', action: 'update', scope: 'own' },
    { id: 'profile.read', resource: 'profile', action: 'read', scope: 'own' },
    { id: 'profile.update', resource: 'profile', action: 'update', scope: 'own' }
  ],
  
  foster_admin: [
    { id: 'leads.read', resource: 'leads', action: 'read', scope: 'organization' },
    { id: 'leads.update', resource: 'leads', action: 'update', scope: 'organization' },
    { id: 'leads.assign', resource: 'leads', action: 'assign', scope: 'organization' },
    { id: 'users.read', resource: 'users', action: 'read', scope: 'organization' },
    { id: 'reports.read', resource: 'reports', action: 'read', scope: 'organization' }
  ],
  
  foster_user: [
    { id: 'leads.read', resource: 'leads', action: 'read', scope: 'own' },
    { id: 'leads.update', resource: 'leads', action: 'update', scope: 'own' },
    { id: 'profile.read', resource: 'profile', action: 'read', scope: 'own' },
    { id: 'profile.update', resource: 'profile', action: 'update', scope: 'own' }
  ],
  
  volunteer_admin: [
    { id: 'leads.read', resource: 'leads', action: 'read', scope: 'organization' },
    { id: 'leads.update', resource: 'leads', action: 'update', scope: 'organization' },
    { id: 'users.read', resource: 'users', action: 'read', scope: 'organization' },
    { id: 'reports.read', resource: 'reports', action: 'read', scope: 'organization' }
  ],
  
  volunteer_user: [
    { id: 'leads.read', resource: 'leads', action: 'read', scope: 'own' },
    { id: 'leads.update', resource: 'leads', action: 'update', scope: 'own' },
    { id: 'profile.read', resource: 'profile', action: 'read', scope: 'own' },
    { id: 'profile.update', resource: 'profile', action: 'update', scope: 'own' }
  ]
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: RoleName,
  resource: string,
  action: string,
  scope?: 'own' | 'organization' | 'initiative' | 'all'
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  
  return permissions.some(permission => {
    // Admin has all permissions
    if (permission.resource === '*' && permission.action === '*') {
      return true;
    }
    
    // Check exact match
    const resourceMatch = permission.resource === resource;
    const actionMatch = permission.action === action || permission.action === '*';
    const scopeMatch = !scope || permission.scope === scope || permission.scope === 'all';
    
    return resourceMatch && actionMatch && scopeMatch;
  });
}