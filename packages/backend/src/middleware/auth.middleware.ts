import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../services/jwt.service';
import { JWTPayload } from '@poc-portal/shared';
import { AppError } from '../utils/errors';

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      token?: string;
    }
  }
}

/**
 * Middleware to validate JWT tokens and enforce initiative-based security
 * Extracts and validates the JWT from the Authorization header
 * Attaches the decoded user context to the request for downstream use
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    // Validate the access token
    const decoded = jwtService.validateAccessToken(token);
    
    if (!decoded) {
      throw new AppError('Invalid or expired token', 401);
    }

    // Verify initiative claim is present (critical security boundary)
    if (!decoded.initiative) {
      throw new AppError('Token missing required initiative claim', 403);
    }

    // Attach user context and token to request
    req.user = decoded;
    req.token = token;

    // Log successful authentication for audit trail
    console.log('User authenticated:', {
      userId: decoded.sub,
      email: decoded.email,
      initiative: decoded.initiative,
      roles: decoded.roles,
      path: req.path,
      method: req.method
    });

    next();
  } catch (error) {
    // Handle different error types gracefully
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
      });
    }

    // Handle JWT-specific errors
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
    }

    // Generic error
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional middleware for routes that can work with or without authentication
 * If a valid token is present, it will be validated and user attached
 * If no token is present, the request continues without user context
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  if (!token) {
    // No token provided, continue without user context
    return next();
  }

  try {
    const decoded = jwtService.validateAccessToken(token);
    
    if (decoded && decoded.initiative) {
      req.user = decoded;
      req.token = token;
    }
  } catch (error) {
    // Token validation failed, but this is optional auth
    // Log the error but continue without user context
    console.warn('Optional auth token validation failed:', error);
  }

  next();
};

/**
 * Middleware to enforce specific roles
 * Must be used after authenticateToken middleware
 * @param allowedRoles - Array of roles that are allowed access
 */
export const requireRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      console.warn('Access denied - insufficient roles:', {
        userId: req.user.sub,
        userRoles,
        requiredRoles: allowedRoles,
        path: req.path
      });

      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

/**
 * Middleware to enforce specific initiatives
 * Must be used after authenticateToken middleware
 * Useful for initiative-specific admin routes
 * @param allowedInitiatives - Array of initiatives that are allowed access
 */
export const requireInitiatives = (...allowedInitiatives: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    if (!allowedInitiatives.includes(req.user.initiative)) {
      console.warn('Access denied - wrong initiative:', {
        userId: req.user.sub,
        userInitiative: req.user.initiative,
        requiredInitiatives: allowedInitiatives,
        path: req.path
      });

      return res.status(403).json({
        error: 'Access denied for this initiative',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

/**
 * Middleware to refresh tokens that are close to expiration
 * If token expires in less than 5 minutes, a new token is generated
 * and sent in the response header
 */
export const refreshTokenIfNeeded = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.token) {
    return next();
  }

  try {
    const tokenData = jwtService.decodeToken(req.token);
    if (!tokenData) {
      return next();
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = tokenData.exp - now;

    // If token expires in less than 5 minutes, refresh it
    if (expiresIn < 300) {
      const newToken = jwtService.generateAccessToken({
        sub: req.user.sub,
        email: req.user.email,
        initiative: req.user.initiative,
        roles: req.user.roles
      });

      // Send new token in response header
      res.setHeader('X-New-Token', newToken);
      console.log('Token refreshed for user:', req.user.email);
    }
  } catch (error) {
    // Log error but don't fail the request
    console.error('Error checking token expiration:', error);
  }

  next();
};