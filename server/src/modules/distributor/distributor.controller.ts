import { Request, Response, NextFunction } from 'express';
import { DistributorService } from './distributor.service.js';
import { AuthRequest } from '../../middleware/auth.js';

export class DistributorController {
  static async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = req.params.memberId || req.user?.memberId;
      if (!memberId) {
        res.status(400).json({ success: false, message: 'Member ID required.' });
        return;
      }
      const profile = await DistributorService.getProfile(memberId);
      res.status(200).json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }

  static async getBusinessCenters(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = req.params.memberId || req.user?.memberId;
      if (!memberId) {
        res.status(400).json({ success: false, message: 'Member ID required.' });
        return;
      }
      const centers = await DistributorService.getBusinessCenters(memberId);
      res.status(200).json({ success: true, data: centers });
    } catch (err) {
      next(err);
    }
  }

  static async updateKycAndBank(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = req.user?.memberId;
      if (!memberId) {
        res.status(401).json({ success: false, message: 'Unauthenticated.' });
        return;
      }
      const updated = await DistributorService.updateKycAndBank(memberId, req.body);
      res.status(200).json({ success: true, message: 'KYC & Bank details updated successfully.', data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async listDistributors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const list = await DistributorService.getAll(limit, offset);
      res.status(200).json({ success: true, data: list });
    } catch (err) {
      next(err);
    }
  }
}
