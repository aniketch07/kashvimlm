import { Router } from 'express';
import { DistributorController } from '../controllers/distributor.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateDistributorProfileSchema } from '../validators/distributor.validators';

const router = Router();

// Current authenticated distributor profile
router.get('/me', authenticate, DistributorController.getMe);
router.patch(
  '/me',
  authenticate,
  validate({ body: updateDistributorProfileSchema }),
  DistributorController.updateMe
);

// Distributor lookups by ID or code
router.get('/:id', authenticate, DistributorController.getById);
router.get('/:id/upline', authenticate, DistributorController.getUpline);
router.get('/:id/downline', authenticate, DistributorController.getDownline);
router.get('/:id/tree', authenticate, DistributorController.getTree);
router.get('/:id/team', authenticate, DistributorController.getTeam);

export const distributorRouter = router;
