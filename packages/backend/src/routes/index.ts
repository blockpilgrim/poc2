import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

// Mount route modules
router.use('/health', healthRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Partner Portal v2.0 API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth (coming soon)',
      profile: '/api/profile (coming soon)',
      leads: '/api/leads (coming soon)'
    }
  });
});

export default router;