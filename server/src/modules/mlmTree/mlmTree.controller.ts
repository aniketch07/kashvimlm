import { Request, Response, NextFunction } from 'express';
import { MlmTreeService } from './mlmTree.service.js';
import { AuthRequest } from '../../middleware/auth.js';
import { DistributorService } from '../distributor/distributor.service.js';
import { TreeValidationService } from './treeValidation.service.js';

export class MlmTreeController {
  static async getMyNetworkTree(req: any, res: Response): Promise<void> {
    const memberId = req.user?.distributorId || req.user?.memberId || 'KV-1001';
    const rawDepth = parseInt(req.query.depth as string, 10);
    const depth = isNaN(rawDepth) ? 3 : Math.min(Math.max(1, rawDepth), 6);
    const tree = await MlmTreeService.getNetworkTree(memberId, depth);
    res.status(200).json({ success: true, data: tree });
  }

  static async getMemberNetworkTree(req: Request, res: Response): Promise<void> {
    const memberId = req.params.distributorId;
    const rawDepth = parseInt(req.query.depth as string, 10);
    const depth = isNaN(rawDepth) ? 3 : Math.min(Math.max(1, rawDepth), 6);
    const tree = await MlmTreeService.getNetworkTree(memberId, depth);
    res.status(200).json({ success: true, data: tree });
  }

  static async getMemberNetworkSummary(req: Request, res: Response): Promise<void> {
    const memberId = req.params.distributorId;
    const summary = await MlmTreeService.getNetworkSummary(memberId);
    res.status(200).json({ success: true, data: summary });
  }

  static async searchNetworkTree(req: Request, res: Response): Promise<void> {
    const q = ((req.query.q as string) || '').trim();
    const results = await MlmTreeService.searchDistributors(q);
    res.status(200).json({ success: true, data: results });
  }

  static async getTree(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = req.params.memberId || req.user?.memberId;
      if (!memberId) {
        res.status(400).json({ success: false, message: 'Member ID required.' });
        return;
      }
      const rawDepth = parseInt(req.query.depth as string, 10);
      const depth = isNaN(rawDepth) ? 3 : Math.min(Math.max(1, rawDepth), 6);
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

  /**
   * POST /api/v1/tree/move
   * Admin Move Distributor (Prompt 16)
   * Mandatory requirements: Reason, Old Parent, Old Position, New Parent, New Position, Admin ID, Timestamp
   */
  static async moveDistributor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user && req.user.role && !['admin', 'super_admin'].includes(req.user.role.toLowerCase())) {
        res.status(403).json({ success: false, message: '403 Forbidden: Admin role required to move a distributor.' });
        return;
      }

      const memberId = req.params.memberId || req.body.memberId;
      const { oldParent, oldPosition, newParent, newPosition, reason, timestamp } = req.body;
      const adminId = req.user?.id || req.user?.memberId || req.body.adminId;

      if (!reason || !reason.trim()) {
        res.status(400).json({ success: false, message: 'Reason is required to move a distributor.' });
        return;
      }
      if (!oldParent || !oldParent.trim()) {
        res.status(400).json({ success: false, message: 'Old Parent is required to move a distributor.' });
        return;
      }
      if (!oldPosition || !oldPosition.trim()) {
        res.status(400).json({ success: false, message: 'Old Position is required to move a distributor.' });
        return;
      }
      if (!newParent || !newParent.trim()) {
        res.status(400).json({ success: false, message: 'New Parent is required to move a distributor.' });
        return;
      }
      if (!newPosition || !newPosition.trim()) {
        res.status(400).json({ success: false, message: 'New Position is required to move a distributor.' });
        return;
      }
      const upperNewPos = (newPosition || '').trim().toUpperCase();
      if (upperNewPos !== 'LEFT' && upperNewPos !== 'RIGHT') {
        res.status(400).json({ success: false, message: 'New Position must be either LEFT or RIGHT.' });
        return;
      }
      if (!adminId || !adminId.trim()) {
        res.status(400).json({ success: false, message: 'Admin ID is required to move a distributor.' });
        return;
      }
      if (!memberId || !memberId.trim()) {
        res.status(400).json({ success: false, message: 'Member ID is required to move a distributor.' });
        return;
      }

      const ip =
        req.ip ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket?.remoteAddress ||
        '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'KashviMLM-Admin-Console';

      const result = await MlmTreeService.moveDistributor({
        adminId: adminId.trim(),
        memberId: memberId.trim(),
        oldParent: oldParent.trim(),
        oldPosition: oldPosition.trim(),
        newParent: newParent.trim(),
        newPosition: newPosition.trim(),
        reason: reason.trim(),
        timestamp: timestamp || new Date().toISOString(),
        ip,
        userAgent,
      });

      res.status(200).json(result);
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes('required') ||
          err.message.includes('Circular') ||
          err.message.includes('cannot be placed') ||
          err.message.includes('occupied') ||
          err.message.includes('violation'))
      ) {
        res.status(400).json({ success: false, message: err.message });
        return;
      }
      next(err);
    }
  }

  /**
   * POST /api/v1/tree/place
   */
  static async placeMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { memberId, sponsorId, placementParentId, position, reason } = req.body;
      const actorId = req.user?.id || req.user?.memberId || 'system';
      const ip =
        req.ip ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket?.remoteAddress ||
        '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'KashviMLM-Tree-Client';

      const result = await MlmTreeService.placeMember({
        memberId,
        sponsorId,
        placementParentId,
        position,
        actorId,
        reason,
        ip,
        userAgent,
      });

      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Tree placement failed.' });
    }
  }

  /**
   * POST /api/v1/tree/change-position
   */
  static async changePosition(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { memberId, oldPosition, newPosition, reason } = req.body;
      const actorId = req.user?.id || req.user?.memberId || 'system';
      const ip =
        req.ip ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket?.remoteAddress ||
        '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'KashviMLM-Tree-Client';

      const result = await MlmTreeService.changePosition({
        memberId,
        oldPosition,
        newPosition,
        reason,
        actorId,
        ip,
        userAgent,
      });

      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Position change failed.' });
    }
  }

  /**
   * POST /api/v1/tree/remove
   */
  static async removeMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user && req.user.role && !['admin', 'super_admin'].includes(req.user.role.toLowerCase())) {
        res.status(403).json({ success: false, message: '403 Forbidden: Admin role required to remove a distributor.' });
        return;
      }

      const { memberId, reason } = req.body;
      const actorId = req.user?.id || req.user?.memberId || 'admin';
      const ip =
        req.ip ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket?.remoteAddress ||
        '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'KashviMLM-Tree-Client';

      const result = await MlmTreeService.removeMember({
        memberId,
        reason,
        actorId,
        ip,
        userAgent,
      });

      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Removal failed.' });
    }
  }

  /**
   * POST /api/v1/tree/sponsor
   */
  static async assignSponsor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user && req.user.role && !['admin', 'super_admin'].includes(req.user.role.toLowerCase())) {
        res.status(403).json({ success: false, message: '403 Forbidden: Admin role required to assign sponsor.' });
        return;
      }

      const { memberId, newSponsorId, oldSponsorId, reason } = req.body;
      const actorId = req.user?.id || req.user?.memberId || 'admin';
      const ip =
        req.ip ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket?.remoteAddress ||
        '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'KashviMLM-Tree-Client';

      const result = await MlmTreeService.assignSponsor({
        memberId,
        newSponsorId,
        oldSponsorId,
        reason,
        actorId,
        ip,
        userAgent,
      });

      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Sponsor assignment failed.' });
    }
  }

  /**
   * GET /api/v1/tree/audit-logs
   * GET /api/v1/tree/audit-logs/:memberId
   */
  static async getTreeAuditLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = (req.params.memberId || req.query.memberId) as string;
      const event = (req.query.event || req.query.action) as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await MlmTreeService.getTreeAuditLogs({
        memberId,
        event,
        limit,
        offset,
      });

      res.status(200).json({
        success: true,
        total: result.total,
        count: result.logs.length,
        offset,
        limit,
        data: result.logs,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/tree/:distributorId/children
   * Retrieve direct LEFT and RIGHT children of a distributor.
   */
  static async getChildren(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const distributorId = req.params.distributorId;
      if (!distributorId) {
        res.status(400).json({ success: false, message: 'Distributor ID required.' });
        return;
      }

      const children = await DistributorService.getChildren(distributorId);
      res.status(200).json({ success: true, data: children });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/tree/:distributorId/downline
   * Retrieve full downline hierarchy of a distributor.
   */
  static async getDownline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const distributorId = req.params.distributorId;
      if (!distributorId) {
        res.status(400).json({ success: false, message: 'Distributor ID required.' });
        return;
      }

      const rawDepth = parseInt(req.query.depth as string, 10);
      const depth = isNaN(rawDepth) ? 5 : Math.min(Math.max(1, rawDepth), 10);
      const downline = await DistributorService.getDownline(distributorId, depth);
      res.status(200).json({ success: true, data: downline });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/tree/validate/integrity
   * Run full audit and tree validation check across all nodes.
   */
  static async validateIntegrity(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await TreeValidationService.validateTreeIntegrity();
      res.status(200).json({
        success: report.isValid,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
}

