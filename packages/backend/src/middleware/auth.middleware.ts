import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../services/jwt.service';
import { ExtendedJWTPayload } from '../types/auth';
import { AppError } from '../utils/errors';
import { 
  hasRequiredRole, 
  extractInitiativeFromJWT,
  detectCrossInitiativeAccess,
  logSecurityEvent,
  createSecurityContext
} from '../utils/group-security.utils';
import { config } from '../config';

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: ExtendedJWTPayload;
      token?: string;
    }
  }
}

/**
 * Middleware to validate JWT tokens and enforce initiative-based security
 * Extracts and validates the JWT from the Authorization header
 * Attaches the decoded user context to the request for downstream use
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
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
    const decoded = jwtService.verifyAccessToken(token);
    
    if (!decoded) {
      throw new AppError('Invalid or expired token', 401);
    }

    // Verify initiative claim is present (critical security boundary)
    // Handle both Entra ID groups and legacy D365-based initiatives
    if (config.ENTRA_GROUPS_ENABLED && decoded.groups && decoded.groups.length > 0) {
      // New approach: Extract initiative from Entra ID groups
      try {
        const userInitiative = extractInitiativeFromJWT(decoded);
        decoded.initiative = userInitiative;
      } catch (error) {
        throw new AppError('No valid initiative groups assigned', 403);
      }
    } else if (!decoded.initiative) {
      // Legacy approach: Initiative must be in JWT from D365
      throw new AppError('Token missing required initiative claim', 403);
    }

    // Attach user context and token to request
    req.user = decoded;
    req.token = token;

    // Log successful authentication for audit trail with groups
    const securityContext = createSecurityContext(decoded);
    logSecurityEvent('ACCESS_GRANTED', {
      userId: decoded.sub,
      email: decoded.email,
      groups: decoded.groups,
      roles: decoded.roles,
      initiative: securityContext.initiative,
      requestedResource: `${req.method} ${req.path}`
    });

    next();
  } catch (error) {
    // Handle different error types gracefully
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
      });
      return;
    }

    // Handle JWT-specific errors
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
        return;
      }
      if (error.name === 'JsonWebTokenError') {
        res.status(401).json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
        return;
      }
    }

    // Generic error
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
    return;
  }
};

/**
 * Optional middleware for routes that can work with or without authentication
 * If a valid token is present, it will be validated and user attached
 * If no token is present, the request continues without user context
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  if (!token) {
    // No token provided, continue without user context
    return next();
  }

  try {
    const decoded = jwtService.verifyAccessToken(token);
    
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
 * Middleware to enforce specific roles with Entra ID app roles support
 * Must be used after authenticateToken middleware
 * Supports role hierarchy (e.g., Admin has all permissions)
 * @param allowedRoles - Array of roles that are allowed access
 */
export const requireRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    const userRoles = req.user.roles || [];
    
    // Use Entra ID role hierarchy if enabled, otherwise simple array check
    const hasRole = config.ENTRA_GROUPS_ENABLED 
      ? hasRequiredRole(userRoles, allowedRoles)
      : allowedRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      logSecurityEvent('ACCESS_DENIED', {
        userId: req.user.sub,
        email: req.user.email,
        groups: req.user.groups,
        roles: userRoles,
        requestedResource: `${req.method} ${req.path}`,
        reason: `Missing required roles: ${allowedRoles.join(', ')}`
      });

      res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
      return;
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
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    if (!allowedInitiatives.includes(req.user.initiative)) {
      console.warn('Access denied - wrong initiative:', {
        userId: req.user.sub,
        userInitiative: req.user.initiative,
        requiredInitiatives: allowedInitiatives,
        path: req.path
      });

      res.status(403).json({
        error: 'Access denied for this initiative',
        code: 'FORBIDDEN'
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to enforce initiative based on Entra ID groups
 * Extracts initiative from security groups and validates access
 * Must be used after authenticateToken middleware
 * @param requiredInitiative - Optional specific initiative to enforce
 */
export const enforceInitiativeFromGroups = (requiredInitiative?: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    try {
      // Extract initiative from groups
      const userInitiative = extractInitiativeFromJWT(req.user);
      
      // If specific initiative is required, validate it
      if (requiredInitiative && userInitiative !== requiredInitiative) {
        const crossInitiativeAttempt = detectCrossInitiativeAccess(req.user, requiredInitiative);
        
        if (crossInitiativeAttempt) {
          logSecurityEvent('CROSS_INITIATIVE_ATTEMPT', {
            userId: req.user.sub,
            email: req.user.email,
            groups: req.user.groups,
            initiative: userInitiative,
            requestedResource: `${req.method} ${req.path}`,
            reason: `Attempted to access ${requiredInitiative} from ${userInitiative}`
          });
        }

        res.status(403).json({
          error: 'Access denied for this initiative',
          code: 'FORBIDDEN'
        });
        return;
      }

      // Attach derived initiative to request for downstream use
      req.user.initiative = userInitiative;
      next();
    } catch (error) {
      // Handle cases where user has no valid initiative groups
      logSecurityEvent('ACCESS_DENIED', {
        userId: req.user.sub,
        email: req.user.email,
        groups: req.user.groups,
        requestedResource: `${req.method} ${req.path}`,
        reason: error instanceof Error ? error.message : 'No valid initiative groups'
      });

      res.status(403).json({
        error: error instanceof Error ? error.message : 'No valid initiative assigned',
        code: 'FORBIDDEN'
      });
    }
  };
};

/**
 * Backward-compatible initiative enforcement middleware
 * Uses either Entra ID groups or legacy initiative field based on feature flag
 * @param requiredInitiative - Optional specific initiative to enforce
 */
export const enforceInitiative = (requiredInitiative?: string) => {
  // Use new group-based approach if enabled
  if (config.ENTRA_GROUPS_ENABLED) {
    return enforceInitiativeFromGroups(requiredInitiative);
  }
  
  // Fall back to legacy approach
  return requiredInitiative 
    ? requireInitiatives(requiredInitiative)
    : (req: Request, res: Response, next: NextFunction) => {
        // Just ensure initiative exists (already validated in authenticateToken)
        if (!req.user || !req.user.initiative) {
          res.status(403).json({
            error: 'No initiative assigned',
            code: 'FORBIDDEN'
          });
          return;
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
      // TODO: Implement token refresh with proper user/initiative/account data
      // This would require storing more context about the user session
      console.log('Token expiring soon for user:', req.user.email);
      
      // For now, just let the client handle token refresh via /auth/refresh endpoint
      res.setHeader('X-Token-Expiring-Soon', 'true');
    }
  } catch (error) {
    // Log error but don't fail the request
    console.error('Error checking token expiration:', error);
  }

  next();
};