import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';

const router = Router();

// Mount route modules
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// API info endpoint
router.get('/', (_req, res) => {
  res.json({
    name: 'Partner Portal v2.0 API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: {
        login: 'POST /api/auth/login',
        callback: 'GET /api/auth/callback',
        logout: 'POST /api/auth/logout',
        refresh: 'POST /api/auth/refresh',
        me: 'GET /api/auth/me',
        config: 'GET /api/auth/config'
      },
      profile: '/api/profile (coming soon)',
      leads: '/api/leads (coming soon)'
    }
  });
});

export default router;