import { Router } from 'express';
import { MlmTreeController } from './mlmTree.controller.js';
import { authenticateToken, optionalAuth } from '../../middleware/auth.js';

const router = Router();

// Binary Tree Hierarchy & Topology
router.get('/', optionalAuth, MlmTreeController.getMyNetworkTree);
router.get('/search', MlmTreeController.searchNetworkTree);
router.get('/validate/integrity', MlmTreeController.validateIntegrity);
router.get('/member/:distributorId/summary', optionalAuth, MlmTreeController.getMemberNetworkSummary);
router.get('/member/:distributorId', optionalAuth, MlmTreeController.getMemberNetworkTree);

router.get('/structure/:memberId?', optionalAuth, MlmTreeController.getTree);
router.get('/node/:memberId?', optionalAuth, MlmTreeController.getTree);
router.get('/placement-suggest', optionalAuth, MlmTreeController.getPlacementSuggestion);

// Direct Children, Downline, and Root Tree by Distributor ID
router.get('/:distributorId/children', MlmTreeController.getChildren);
router.get('/:distributorId/downline', MlmTreeController.getDownline);
router.get('/:distributorId', optionalAuth, MlmTreeController.getMemberNetworkTree);


// MLM Binary Tree Operations & Audit Logging (Prompt 16)
router.post('/move', optionalAuth, MlmTreeController.moveDistributor);
router.post('/place', optionalAuth, MlmTreeController.placeMember);
router.post('/change-position', optionalAuth, MlmTreeController.changePosition);
router.post('/remove', optionalAuth, MlmTreeController.removeMember);
router.post('/sponsor', optionalAuth, MlmTreeController.assignSponsor);
router.get('/audit-logs', optionalAuth, MlmTreeController.getTreeAuditLogs);
router.get('/audit-logs/:memberId', optionalAuth, MlmTreeController.getTreeAuditLogs);

export default router;
