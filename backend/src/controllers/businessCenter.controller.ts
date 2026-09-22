import { NextFunction, Request, Response } from 'express';
import { BusinessCenterService } from '../services/businessCenter.service';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';
import {
  businessCenterQuerySchema,
  businessCenterTreeQuerySchema,
} from '../validators/businessCenter.validators';

export class BusinessCenterController {
  /**
   * Retrieves all Business Centers for the authenticated distributor.
   * GET /api/v1/business-centers
   */
  public static async getBusinessCenters(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.', 'AUTH_REQUIRED');
      }

      const query = businessCenterQuerySchema.parse(req.query);
      const centers = await BusinessCenterService.getBusinessCenters(
        req.user.id,
        query,
        req.user.role
      );

      sendSuccess(res, {
        message: 'Business centers retrieved successfully.',
        data: centers,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves single Business Center by UUID or centerCode.
   * GET /api/v1/business-centers/:id
   */
  public static async getBusinessCenterById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.', 'AUTH_REQUIRED');
      }

      const center = await BusinessCenterService.getBusinessCenterById(
        req.user.id,
        req.params.id,
        req.user.role
      );

      sendSuccess(res, {
        message: 'Business center retrieved successfully.',
        data: center,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves the independent binary tree rooted at the specified Business Center.
   * Tree queries strictly never mix different business centers.
   * GET /api/v1/business-centers/:id/tree
   */
  public static async getBusinessCenterTree(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.', 'AUTH_REQUIRED');
      }

      const query = businessCenterTreeQuerySchema.parse(req.query);
      const result = await BusinessCenterService.getBusinessCenterTree(
        req.user.id,
        req.params.id,
        query.depth,
        req.user.role
      );

      sendSuccess(res, {
        message: 'Business center tree retrieved successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves volume metrics and team summary for the specified Business Center.
   * GET /api/v1/business-centers/:id/summary
   */
  public static async getBusinessCenterSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.', 'AUTH_REQUIRED');
      }

      const summary = await BusinessCenterService.getBusinessCenterSummary(
        req.user.id,
        req.params.id,
        req.user.role
      );

      sendSuccess(res, {
        message: 'Business center summary retrieved successfully.',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}
