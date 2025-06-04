import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { JWTPayload, User, Initiative } from '@partner-portal/shared';
import { AccountInfo } from '@azure/msal-node';

/**
 * JWT Service for generating and validating application tokens
 * CRITICAL: Always includes initiative claims for security boundary enforcement
 */
export class JWTService {
  private readonly secret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.secret = config.JWT_SECRET;
    this.accessTokenExpiry = config.JWT_EXPIRES_IN;
    this.refreshTokenExpiry = config.JWT_REFRESH_EXPIRES_IN;
  }

  /**
   * Generate access token with user info and initiative
   * CRITICAL: Initiative must always be included in the payload
   */
  generateAccessToken(
    user: User,
    initiative: Initiative,
    azureAccount: AccountInfo
  ): string {
    if (!initiative || !initiative.id) {
      throw new Error('Cannot generate token without initiative - security boundary violation');
    }

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      permissions: user.permissions,
      initiative: initiative.id,
      initiativeName: initiative.name,
      initiativeCode: initiative.code,
      azureId: azureAccount.homeAccountId,
      iat: Math.floor(Date.now() / 1000),
      iss: 'partner-portal-api',
      aud: 'partner-portal-frontend',
    };

    return jwt.sign(payload, this.secret, {
      expiresIn: this.accessTokenExpiry,
      algorithm: 'HS256',
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
      algorithm: 'HS256',
    });
  }

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
        issuer: 'partner-portal-api',
        audience: 'partner-portal-frontend',
      }) as JWTPayload;

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
      }) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      if (!decoded.initiative) {
        throw new Error('Invalid token: missing initiative claim');
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
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
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