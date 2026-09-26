import { Router } from 'express';
import { DistributorController } from './distributor.controller.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';

const router = Router();

router.post('/register', DistributorController.register);
router.get('/me/referral-link', DistributorController.getMeReferralLink);
router.get('/referral-link/:memberId?', DistributorController.getReferralLink);
router.get('/profile/:memberId?', authenticateToken, DistributorController.getProfile);
router.get('/business-centers/:memberId?', authenticateToken, DistributorController.getBusinessCenters);
router.put('/kyc-bank', authenticateToken, DistributorController.updateKycAndBank);
router.get('/list', authenticateToken, requireAdmin, DistributorController.listDistributors);
router.get('/:id', DistributorController.getById);

export default router;

