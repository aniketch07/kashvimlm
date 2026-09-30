import { Router } from 'express';
import { LevelController } from '../controllers/level.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';

const router = Router();

// ==========================================
// MEMBER LEVEL ENDPOINTS
// ==========================================

// GET /api/v1/levels/me - Current distributor's level, BB, matching volume, and progression metrics
router.get('/me', authenticate, LevelController.getMyLevel);

// GET /api/v1/levels/history - Promotion history for current distributor
router.get('/history', authenticate, LevelController.getMyHistory);

// GET /api/v1/levels/config - Public configuration of all 6 ordered levels (Starter to Ruby)
router.get('/config', optionalAuth, LevelController.getLevelsConfig);

// GET /api/v1/levels/member/:idOrCode - Lookup level & qualification status for any team member
router.get('/member/:idOrCode', authenticate, LevelController.getMemberLevel);

// ==========================================
// ADMIN LEVEL ENDPOINTS
// ==========================================

// POST /api/v1/levels/admin/recalculate - Admin trigger for network or single-member level recalculation
router.post(
  '/admin/recalculate',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  LevelController.recalculateNetworkLevels
);

// GET /api/v1/levels/admin/distribution - Member demographic counts across all 6 levels
router.get(
  '/admin/distribution',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  LevelController.getLevelDistribution
);

export const levelRouter = router;
