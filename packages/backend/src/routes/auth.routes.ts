import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * Authentication Routes
 * Handle Azure AD OAuth flow and token management
 */

// Public endpoints
router.post('/login', asyncHandler(authController.login));
router.get('/callback', asyncHandler(authController.callback));
router.get('/config', asyncHandler(authController.getConfig));

// Protected endpoints
router.post('/logout', optionalAuth, asyncHandler(authController.logout));
router.post('/refresh', asyncHandler(authController.refresh));
router.get('/me', authenticateToken, asyncHandler(authController.me));
router.get('/profile', authenticateToken, asyncHandler(authController.profile));

export default router;