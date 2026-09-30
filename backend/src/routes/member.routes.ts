import { Router } from 'express';
import { MemberLevelController } from '../controllers/memberLevel.controller';
import { authenticate } from '../middleware/auth';

/**
 * ============================================================================
 * MEMBER LEVEL & VOLUME ROUTES
 * ============================================================================
 * Routes mounted at:
 * /api/members and /api/v1/members
 *
 * Endpoints:
 * - GET /:memberId/level
 * - GET /:memberId/level/progress
 * - GET /:memberId/level/history
 * - GET /:memberId/bb
 * - GET /:memberId/bb/history
 * - GET /:memberId/matching
 * - GET /:memberId/matching/history
 */

const router = Router();

// Enforce standard authentication for member data lookups
router.use(authenticate);

// MEMBER LEVEL & PROGRESS
router.get('/:memberId/level/progress', MemberLevelController.getMemberLevelProgress);
router.get('/:memberId/level/history', MemberLevelController.getMemberLevelHistory);
router.get('/:memberId/level', MemberLevelController.getMemberLevel);

// BB SUMMARY & LEDGER HISTORY
router.get('/:memberId/bb/history', MemberLevelController.getMemberBBHistory);
router.get('/:memberId/bb', MemberLevelController.getMemberBB);

// MATCHING VOLUME METRICS & TRANSACTION HISTORY
router.get('/:memberId/matching/history', MemberLevelController.getMemberMatchingHistory);
router.get('/:memberId/matching', MemberLevelController.getMemberMatching);

export const memberRouter = router;
