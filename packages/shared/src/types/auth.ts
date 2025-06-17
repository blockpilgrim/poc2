import { Initiative } from './initiative';
import { UserRole } from './user';

/**
 * JWT token payload structure
 * Initiative is embedded in the token for security enforcement
 */
export interface JWTPayload {
  sub: string; // User ID (Azure AD Object ID)
  email: string;
  name: string;
  initiative: string; // CRITICAL: User's initiative derived from Entra ID groups
  groups: string[]; // Entra ID security groups (e.g., ["EC Arkansas", "EC Oregon"])
  roles: string[]; // Entra ID app roles (e.g., ["Admin", "FosterPartner"])
  appRoles?: UserRole[]; // Legacy: Mapped app roles for backward compatibility
  permissions: string[];
  organization?: OrganizationData; // Optional: D365 organization data
  iat: number; // Issued at
  exp: number; // Expiration
}

/**
 * Organization data from D365
 */
export interface OrganizationData {
  id: string;
  name: string;
  type?: string;
  organizationLeadType?: string; // Comma-separated values like "948010000,948010001"
  attributes?: Record<string, any>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  tokens: AuthTokens;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  initiative: Initiative;
  roles: UserRole[];
  permissions: string[];
}