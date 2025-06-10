import { Router } from 'express';
import { leadController } from '../controllers/lead.controller';
import { authenticateToken, enforceInitiative } from '../middleware/auth.middleware';

const router = Router();

/**
 * Lead Routes
 * All routes require authentication and initiative enforcement
 * Initiative filtering is automatically applied via middleware
 */

// Get lead statistics (must come before /:id route)
router.get(
  '/stats',
  authenticateToken,
  enforceInitiative(),
  leadController.getLeadStats.bind(leadController)
);

// Get all leads with pagination and filtering
router.get(
  '/',
  authenticateToken,
  enforceInitiative(),
  leadController.getLeads.bind(leadController)
);

// Get a single lead by ID
router.get(
  '/:id',
  authenticateToken,
  enforceInitiative(),
  leadController.getLeadById.bind(leadController)
);

// Update a lead
router.patch(
  '/:id',
  authenticateToken,
  enforceInitiative(),
  leadController.updateLead.bind(leadController)
);

// Admin-only routes (if needed in future)
// router.delete(
//   '/:id',
//   authenticateToken,
//   enforceInitiative(),
//   requireRoles('Admin'),
//   leadController.deleteLead.bind(leadController)
// );

export default router;