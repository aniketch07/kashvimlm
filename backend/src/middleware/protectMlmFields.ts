import { NextFunction, Request, Response } from 'express';
import { MLMSecurityService } from '../services/mlmSecurity.service';

/**
 * ============================================================================
 * PROTECT MLM FIELDS MIDDLEWARE (PROMPT 8)
 * ============================================================================
 * Intercepts incoming requests and verifies that no untrusted client attempts
 * to inject or override protected MLM volume, rank, level, or financial fields.
 *
 * Example rejected payload:
 * {
 *   "bb": 100000,
 *   "matching": 1000000,
 *   "level": "RUBY"
 * }
 */
export const protectMlmFields = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;

    // Check request body
    if (req.body && typeof req.body === 'object') {
      MLMSecurityService.validatePayloadForProtectedFields(req.body, {
        userId,
        userRole,
        path: req.originalUrl || req.path,
        ipAddress: req.ip,
      });
    }

    // Check query params
    if (req.query && typeof req.query === 'object') {
      MLMSecurityService.validatePayloadForProtectedFields(req.query, {
        userId,
        userRole,
        path: req.originalUrl || req.path,
        ipAddress: req.ip,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
