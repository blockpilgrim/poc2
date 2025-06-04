import { Initiative } from './initiative';
import { UserRole } from './user';
/**
 * JWT token payload structure
 * Initiative is embedded in the token for security enforcement
 */
export interface JWTPayload {
    sub: string;
    email: string;
    name: string;
    initiative: string;
    roles: UserRole[];
    permissions: string[];
    iat: number;
    exp: number;
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
//# sourceMappingURL=auth.d.ts.map