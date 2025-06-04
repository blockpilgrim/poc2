import { Initiative } from './initiative';
import { UserRole } from './user';

/**
 * JWT token payload structure
 * Initiative is embedded in the token for security enforcement
 */
export interface JWTPayload {
  sub: string; // User ID
  email: string;
  name: string;
  initiative: string; // CRITICAL: User's initiative (e.g., "EC Arkansas")
  roles: UserRole[];
  permissions: string[];
  iat: number; // Issued at
  exp: number; // Expiration
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