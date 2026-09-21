import { Request, Response, NextFunction } from 'express';
import { MlmTreeService } from './mlmTree.service.js';
import { AuthRequest } from '../../middleware/auth.js';

export class MlmTreeController {
  static async getTree(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = req.params.memberId || req.user?.memberId;
      if (!memberId) {
        res.status(400).json({ success: false, message: 'Member ID required.' });
        return;
      }
      const depth = parseInt(req.query.depth as string) || 3;
      const tree = await MlmTreeService.getTreeByDistributor(memberId, depth);
      res.status(200).json({ success: true, data: tree });
    } catch (err) {
      next(err);
    }
  }

  static async getPlacementSuggestion(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorMemberId = req.user?.memberId || (req.query.sponsorId as string);
      const preferredLeg = (req.query.leg as 'auto' | 'left' | 'right') || 'auto';
      if (!sponsorMemberId) {
        res.status(400).json({ success: false, message: 'Sponsor ID required.' });
        return;
      }
      const suggestion = await MlmTreeService.findNextPlacement(sponsorMemberId, preferredLeg);
      res.status(200).json({ success: true, data: suggestion });
    } catch (err) {
      next(err);
    }
  }
}
