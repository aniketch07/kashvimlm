import { Router } from 'express';
import { MlmTreeController } from '../controllers/mlmTree.controller';
import { validate } from '../middleware/validate';
import { getTreeQuerySchema, nextSlotQuerySchema, placeDistributorSchema } from '../validators/mlmTree.validators';

const router = Router();

// Place a distributor in the binary tree
router.post('/place', validate({ body: placeDistributorSchema }), MlmTreeController.place);

// Retrieve visual binary tree by Node ID or Business Center ID
router.get('/binary/:rootId', validate({ query: getTreeQuerySchema }), MlmTreeController.getBinaryTree);

// Retrieve unilevel sponsor genealogy tree
router.get('/sponsor/:distributorId', validate({ query: getTreeQuerySchema }), MlmTreeController.getSponsorTree);

// Recommend next available placement slot
router.get('/next-slot/:nodeId', validate({ query: nextSlotQuerySchema }), MlmTreeController.getNextAvailableSlot);

// Seed exact requested model tree: A -> LEFT (B -> C) & RIGHT (D -> E)
router.post('/seed-model', MlmTreeController.seedModelTree);

export const mlmTreeRouter = router;
