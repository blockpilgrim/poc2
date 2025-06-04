import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

// Health check endpoint
router.get('/', healthController.check);

// Detailed health check (could include DB, external services, etc.)
router.get('/detailed', healthController.detailed);

export default router;