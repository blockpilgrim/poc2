/**
 * User types and interfaces
 */
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
    phoneNumber?: string;
    organizationId?: string;
    organizationName?: string;
    initiativeId: string;
    roles: UserRole[];
    stateAssignments?: string[];
    active: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface UserRole {
    id: string;
    name: RoleName;
    permissions: Permission[];
}
export type RoleName = 'admin' | 'partner_admin' | 'partner_user' | 'foster_admin' | 'foster_user' | 'volunteer_admin' | 'volunteer_user';
export interface Permission {
    id: string;
    resource: string;
    action: string;
    scope?: 'own' | 'organization' | 'initiative' | 'all';
}
export interface UserProfile extends User {
    preferences?: UserPreferences;
}
export interface UserPreferences {
    theme?: 'light' | 'dark' | 'system';
    notifications?: {
        email: boolean;
        inApp: boolean;
    };
    tableSettings?: {
        [tableName: string]: {
            pageSize: number;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
        };
    };
}
//# sourceMappingURL=user.d.ts.map