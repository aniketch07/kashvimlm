import { Router } from 'express';
import { treeRateLimiter } from '../config/rateLimiter';
import { NetworkTreeController } from '../controllers/networkTree.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { distributorIdParamSchema, treeDepthQuerySchema, treeSearchQuerySchema } from '../validators/networkTree.validators';

const router = Router();

// Apply rate limiting (Requirement 15)
router.use(treeRateLimiter);

/**
 * GET /api/v1/network-tree/search?q=Rahul
 * Search authorized distributors by name or distributor ID.
 * Authentication required; non-admins can only search within their own organization.
 */
router.get(
  '/search',
  authenticate,
  validate({ query: treeSearchQuerySchema }),
  NetworkTreeController.searchDistributors
);

/**
 * GET /api/v1/network-tree?depth=3
 * Authenticated distributor's binary MLM network tree.
 * Authentication required; returns requester's own tree.
 */
router.get(
  '/',
  authenticate,
  validate({ query: treeDepthQuerySchema }),
  NetworkTreeController.getMyTree
);

/**
 * GET /api/v1/network-tree/summary
 * Authenticated distributor's network summary statistics.
 */
router.get('/summary', authenticate, NetworkTreeController.getMySummary);

/**
 * GET /api/v1/network-tree/member/:distributorId/summary
 * Summary statistics for a specific member's network.
 * Authentication required; authorized only for self, downline, or admin.
 */
router.get(
  '/member/:distributorId/summary',
  authenticate,
  validate({ params: distributorIdParamSchema }),
  NetworkTreeController.getMemberSummary
);

/**
 * GET /api/v1/network-tree/member/:distributorId?depth=3
 * Specific member's binary MLM network tree.
 * Authentication required; authorized only for self, downline, or admin.
 */
router.get(
  '/member/:distributorId',
  authenticate,
  validate({ params: distributorIdParamSchema, query: treeDepthQuerySchema }),
  NetworkTreeController.getMemberTree
);

export const networkTreeRouter = router;

