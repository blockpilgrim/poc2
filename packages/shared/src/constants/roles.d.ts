import { RoleName, Permission } from '../types/user';
/**
 * Role definitions and their associated permissions
 */
export declare const ROLE_PERMISSIONS: Record<RoleName, Permission[]>;
/**
 * Check if a role has a specific permission
 */
export declare function hasPermission(role: RoleName, resource: string, action: string, scope?: 'own' | 'organization' | 'initiative' | 'all'): boolean;
//# sourceMappingURL=roles.d.ts.map