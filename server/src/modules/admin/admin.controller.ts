import { Response, NextFunction } from 'express';
import { AdminService } from './admin.service.js';
import { AuthRequest } from '../../middleware/auth.js';
import { CommissionEngineService } from '../commissionEngine/commissionEngine.service.js';
import { PayoutService } from '../payouts/payout.service.js';

export class AdminController {
  static async getMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await AdminService.getSystemMetrics();
      res.status(200).json({ success: true, data: metrics });
    } catch (err) {
      next(err);
    }
  }

  static async getAuditLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await AdminService.getAuditLogs(limit);
      res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (err) {
      next(err);
    }
  }

  static async triggerWeeklyCommissionCalculation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cycleWeek = parseInt(req.body.cycleWeek) || 38;
      const cycleYear = parseInt(req.body.cycleYear) || 2026;
      const results = await CommissionEngineService.runWeeklyCalculation(cycleWeek, cycleYear);

      await AdminService.logAction(
        req.user?.id || null,
        req.user?.role || 'admin',
        'COMMISSION_CYCLE_CALCULATED_MANUAL',
        'COMMISSION_ENGINE',
        `CYCLE-${cycleYear}-W${cycleWeek}`,
        { cycleWeek, cycleYear, recordsCalculated: results.length }
      );

      res.status(200).json({
        success: true,
        message: `Commission calculation cycle Week ${cycleWeek} - ${cycleYear} completed successfully.`,
        data: results
      });
    } catch (err) {
      next(err);
    }
  }

  static async triggerPayoutSettlement(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { batchCode } = req.body;
      if (!batchCode) {
        res.status(400).json({ success: false, message: 'batchCode is required.' });
        return;
      }

      const result = await PayoutService.settlePayoutBatch(batchCode);
      await AdminService.logAction(
        req.user?.id || null,
        req.user?.role || 'admin',
        'PAYOUT_BATCH_APPROVED',
        'PAYOUT_GATEWAY',
        batchCode,
        result
      );

      res.status(200).json({
        success: true,
        message: `Payout batch ${batchCode} settled successfully.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateMemberStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { memberId } = req.params;
      const { status } = req.body;

      if (!status || !['Active', 'Inactive', 'Grace Period'].includes(status)) {
        res.status(400).json({ success: false, message: 'Valid status is required (Active, Inactive, Grace Period).' });
        return;
      }

      const result = await AdminService.toggleMemberStatus(memberId, status);
      res.status(200).json({ success: true, message: `Distributor ${memberId} status set to ${status}.`, data: result });
    } catch (err) {
      next(err);
    }
  }
}
