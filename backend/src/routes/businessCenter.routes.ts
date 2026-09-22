import { Router } from 'express';
import { BusinessCenterController } from '../controllers/businessCenter.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  businessCenterIdParamSchema,
  businessCenterQuerySchema,
  businessCenterTreeQuerySchema,
} from '../validators/businessCenter.validators';

export const businessCenterRouter = Router();

businessCenterRouter.use(authenticate);

// GET /api/v1/business-centers - Retrieve all business centers for distributor
businessCenterRouter.get(
  '/',
  validate({ query: businessCenterQuerySchema }),
  BusinessCenterController.getBusinessCenters
);

// GET /api/v1/business-centers/:id - Retrieve specific business center details
businessCenterRouter.get(
  '/:id',
  validate({ params: businessCenterIdParamSchema }),
  BusinessCenterController.getBusinessCenterById
);

// GET /api/v1/business-centers/:id/tree - Retrieve independent binary tree for this center
businessCenterRouter.get(
  '/:id/tree',
  validate({ params: businessCenterIdParamSchema, query: businessCenterTreeQuerySchema }),
  BusinessCenterController.getBusinessCenterTree
);

// GET /api/v1/business-centers/:id/summary - Retrieve volume & team summary for this center
businessCenterRouter.get(
  '/:id/summary',
  validate({ params: businessCenterIdParamSchema }),
  BusinessCenterController.getBusinessCenterSummary
);
