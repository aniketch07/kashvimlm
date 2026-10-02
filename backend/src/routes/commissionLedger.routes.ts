import { Router } from 'express';
import { CommissionLedgerController } from '../controllers/commissionLedger.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';

const router = Router();

// All ledger routes require authentication
router.use(authenticate);

// Distributor routes
// GET /api/v1/commissions/ledger/me - View authenticated distributor's ledger
router.get('/me', CommissionLedgerController.getMyLedger);

// GET /api/v1/commissions/ledger/order/:orderId - View ledger transactions for an order
router.get('/order/:orderId', CommissionLedgerController.getByOrder);

// GET /api/v1/commissions/ledger/:id/audit - View full 8-dimensional audit trail
router.get('/:id/audit', CommissionLedgerController.getAuditTrail);

// Admin-only financial posting & lifecycle management
// POST /api/v1/commissions/ledger/approve-order/:orderId - Batch approve transactions
router.post(
  '/approve-order/:orderId',
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  CommissionLedgerController.approveOrderCommissions
);

// POST /api/v1/commissions/ledger/:id/credit-wallet - Post commission to wallet
router.post(
  '/:id/credit-wallet',
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  CommissionLedgerController.creditToWallet
);

// POST /api/v1/commissions/ledger/:id/reverse - Reversal workflow
router.post(
  '/:id/reverse',
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  CommissionLedgerController.reverseCommission
);

export default router;
