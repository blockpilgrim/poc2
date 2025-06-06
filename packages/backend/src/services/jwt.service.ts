import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { User, Initiative, OrganizationData } from '@partner-portal/shared';
import { ExtendedJWTPayload } from '../types/auth';
import { AccountInfo } from '@azure/msal-node';

/**
 * JWT Service for generating and validating application tokens
 * CRITICAL: Always includes initiative claims for security boundary enforcement
 */
export class JWTService {
  private readonly secret: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.secret = config.JWT_SECRET;
    this.refreshTokenExpiry = config.JWT_REFRESH_EXPIRES_IN;
  }

  /**
   * Generate access token with user info and initiative
   * CRITICAL: Initiative must always be included in the payload
   * Updated to support both legacy User model and new Entra ID-based auth
   */
  generateAccessToken(params: {
    user: User | {
      id: string;
      email: string;
      name: string;
      azureId?: string;
    };
    initiative: Initiative | string;
    initiativeName?: string;
    groups?: string[];
    roles?: string[];
    organization?: OrganizationData;
    account: AccountInfo;
  }): string {
    const { user, initiative, initiativeName, groups = [], roles = [], organization, account } = params;
    
    const initiativeId = typeof initiative === 'string' ? initiative : initiative.id;
    
    if (!initiativeId) {
      throw new Error('Cannot generate token without initiative - security boundary violation');
    }

    const now = Math.floor(Date.now() / 1000);
    
    // Handle both legacy User model and new simple user object
    const isLegacyUser = 'roles' in user && Array.isArray(user.roles);
    
    const payload: ExtendedJWTPayload = {
      sub: user.id,
      email: user.email,
      name: isLegacyUser ? (user as User).displayName : (user as any).name || '',
      groups: groups,
      roles: roles,
      appRoles: isLegacyUser ? (user as User).roles : undefined, // Legacy compatibility
      permissions: isLegacyUser 
        ? (user as User).roles.flatMap(r => r.permissions.map(p => `${p.resource}.${p.action}`))
        : [], // Will be derived from roles in middleware
      initiative: initiativeId,
      initiativeName: initiativeName || (typeof initiative === 'object' ? initiative.name : undefined),
      initiativeCode: typeof initiative === 'object' ? initiative.stateCode : undefined,
      azureId: 'azureId' in user ? user.azureId : account.homeAccountId,
      organization,
      iat: now,
      exp: now + 900, // 15 minutes
      iss: 'partner-portal-api',
      aud: 'partner-portal-frontend',
    };

    return jwt.sign(payload, this.secret, {
      algorithm: 'HS256', // TODO: SECURITY - Migrate to RS256 with public/private key pairs for production
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId: string, initiativeId: string): string {
    const payload = {
      sub: userId,
      initiative: initiativeId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, this.secret, {
      expiresIn: this.refreshTokenExpiry,
      algorithm: 'HS256', // TODO: SECURITY - Migrate to RS256 with public/private key pairs for production
    } as jwt.SignOptions);
  }

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): ExtendedJWTPayload {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
        issuer: 'partner-portal-api',
        audience: 'partner-portal-frontend',
      }) as ExtendedJWTPayload;

      // CRITICAL: Ensure initiative is present
      if (!decoded.initiative) {
        throw new Error('Invalid token: missing initiative claim');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): { sub: string; initiative: string } {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
      }) as jwt.JwtPayload & { type?: string; sub?: string; initiative?: string };

      if (!decoded || typeof decoded === 'string') {
        throw new Error('Invalid token format');
      }

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      if (!decoded.sub || !decoded.initiative) {
        throw new Error('Invalid token: missing required claims');
      }

      return {
        sub: decoded.sub,
        initiative: decoded.initiative,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): ExtendedJWTPayload | null {
    try {
      return jwt.decode(token) as ExtendedJWTPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true;
      }
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return null;
      }
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Generate a secure state parameter for OAuth flows
   */
  generateState(): string {
    return jwt.sign(
      {
        random: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
      },
      this.secret,
      {
        expiresIn: '10m', // State should be short-lived
      }
    );
  }

  /**
   * Verify state parameter
   */
  verifyState(state: string): boolean {
    try {
      jwt.verify(state, this.secret);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const jwtService = new JWTService();