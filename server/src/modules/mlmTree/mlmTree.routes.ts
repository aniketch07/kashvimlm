import { Router } from 'express';
import { MlmTreeController } from './mlmTree.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.get('/structure/:memberId?', authenticateToken, MlmTreeController.getTree);
router.get('/node/:memberId?', authenticateToken, MlmTreeController.getTree);
router.get('/placement-suggest', authenticateToken, MlmTreeController.getPlacementSuggestion);

export default router;
