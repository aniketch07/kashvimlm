import { Response, NextFunction } from 'express';
import { AdminService } from './admin.service.js';
import { AuthRequest } from '../../middleware/auth.js';
import { CommissionEngineService } from '../commissionEngine/commissionEngine.service.js';
import { PayoutService } from '../payouts/payout.service.js';
import { SupportService } from '../support/support.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/audit.types.js';

export class AdminController {
  static async getAdminOverview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await AdminService.getSystemMetrics();
      const isAdmin = req.user?.role === 'admin';

      res.status(200).json({
        success: true,
        name: 'KashviMLM Executive Admin Panel API',
        version: '1.0.0',
        status: 'ONLINE',
        timestamp: new Date().toISOString(),
        authenticatedUser: req.user
          ? {
              id: req.user.id,
              username: req.user.username,
              email: req.user.email,
              role: req.user.role,
              isAdmin,
            }
          : null,
        systemMetrics: metrics,
        endpoints: {
          metrics: {
            method: 'GET',
            path: '/api/v1/admin/metrics',
            description: 'System overview: total members, sales turnover, total commissions distributed, BV turnover, active commission cycle',
            access: 'Admin Role Required',
          },
          auditLogs: {
            method: 'GET',
            path: '/api/v1/admin/audit-logs',
            description: 'Security, financial, and catalog change audit trail with actor IDs and metadata',
            access: 'Admin Role Required',
            query: { limit: 'number (default: 50)' },
          },
          calculateCommissions: {
            method: 'POST',
            path: '/api/v1/admin/calculate-commissions',
            description: 'Trigger weekly commission calculation cycle (binary match, direct referral, rank bonuses)',
            access: 'Admin Role Required',
            body: { cycleWeek: 'number', cycleYear: 'number' },
          },
          settlePayouts: {
            method: 'POST',
            path: '/api/v1/admin/settle-payouts',
            description: 'Approve and disburse queued weekly bank payout batch',
            access: 'Admin Role Required',
            body: { batchCode: 'string (e.g., BATCH-2026-W38)' },
          },
          memberStatus: {
            method: 'PATCH',
            path: '/api/v1/admin/distributors/:memberId/status',
            description: 'Update member qualification/account status (Active, Inactive, Grace Period)',
            access: 'Admin Role Required',
            body: { status: 'Active | Inactive | Grace Period' },
          },
          supportTickets: {
            list: {
              method: 'GET',
              path: '/api/v1/admin/support/tickets',
              description: 'View and filter all distributor support tickets',
              access: 'Admin Role Required',
              query: { status: 'string', department: 'string', distributorId: 'string', userId: 'string' },
            },
            update: {
              method: 'PATCH',
              path: '/api/v1/admin/support/tickets/:id',
              description: 'Update ticket status, priority, department, or add admin response',
              access: 'Admin Role Required',
              body: { status: 'string', priority: 'string', department: 'string', adminResponse: 'string' },
            },
            reply: {
              method: 'POST',
              path: '/api/v1/admin/support/tickets/:id/reply',
              description: 'Post official administrator reply in ticket thread and update status',
              access: 'Admin Role Required',
              body: { message: 'string (required)', status: 'string (optional)' },
            },
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

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
      const { action, entityType, entityId, actorId } = req.query;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await AdminService.getAuditLogs({
        action: action as string,
        entityType: entityType as string,
        entityId: entityId as string,
        actorId: actorId as string,
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

  static async blockAuditDeletion(_req: AuthRequest, res: Response): Promise<void> {
    res.status(403).json({
      success: false,
      message: 'Audit logs are immutable compliance records. Deletion or tampering is strictly prohibited.',
    });
  }

  static async triggerWeeklyCommissionCalculation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cycleWeek = parseInt(req.body.cycleWeek) || 38;
      const cycleYear = parseInt(req.body.cycleYear) || 2026;
      const results = await CommissionEngineService.runWeeklyCalculation(cycleWeek, cycleYear);

      // Immutable Audit Log: COMMISSION_CREATED
      await AuditService.recordFromRequest(
        req,
        AuditAction.COMMISSION_CREATED,
        'CommissionEngine',
        `CYCLE-${cycleYear}-W${cycleWeek}`,
        null,
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

      // Immutable Audit Log: PAYOUT_APPROVED
      await AuditService.recordFromRequest(
        req,
        AuditAction.PAYOUT_APPROVED,
        'PayoutBatch',
        batchCode,
        { status: 'Queued' },
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

      // Immutable Audit Log: USER_UPDATED
      await AuditService.recordFromRequest(
        req,
        AuditAction.USER_UPDATED,
        'Distributor',
        memberId,
        null,
        { status }
      );

      res.status(200).json({ success: true, message: `Distributor ${memberId} status set to ${status}.`, data: result });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/admin/support/tickets
  static async getSupportTickets(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, department, distributorId, userId } = req.query as Record<string, string>;
      const tickets = await SupportService.getTickets({
        status,
        department,
        distributorId,
        userId,
      });

      res.status(200).json({
        success: true,
        count: tickets.length,
        data: tickets,
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/v1/admin/support/tickets/:id
  static async updateSupportTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id || req.params.ticketId;
      const { status, priority, department, adminResponse } = req.body;

      if (!status && !priority && !department && !adminResponse) {
        res.status(400).json({ success: false, message: 'At least one field to update is required.' });
        return;
      }

      const updated = await SupportService.updateTicket(id, {
        status,
        priority,
        department,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Ticket not found.' });
        return;
      }

      if (adminResponse) {
        await SupportService.addMessage(id, {
          senderId: req.user?.id || 'admin',
          message: adminResponse,
        });
      }

      // Immutable Audit Log: ADMIN_ACTION
      await AuditService.recordFromRequest(
        req,
        AuditAction.ADMIN_ACTION,
        'SupportTicket',
        id,
        null,
        { status, priority, department, hasAdminResponse: !!adminResponse }
      );

      const refreshed = await SupportService.getTicketById(id);
      res.status(200).json({
        success: true,
        message: 'Support ticket updated successfully by admin.',
        data: refreshed || updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/admin/support/tickets/:id/reply
  static async replySupportTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id || req.params.ticketId;
      const { message, status } = req.body;
      const senderId = req.body.senderId || req.user?.id || 'Admin Support';

      if (!message || !message.trim()) {
        res.status(400).json({ success: false, message: 'Reply message is required.' });
        return;
      }

      const newMsg = await SupportService.addMessage(id, {
        senderId,
        message,
      });

      if (!newMsg) {
        res.status(404).json({ success: false, message: 'Ticket not found.' });
        return;
      }

      if (status) {
        await SupportService.updateTicket(id, { status });
      }

      // Immutable Audit Log: ADMIN_ACTION
      await AuditService.recordFromRequest(
        req,
        AuditAction.ADMIN_ACTION,
        'SupportTicket',
        id,
        null,
        { replySender: senderId, newStatus: status || 'unchanged' }
      );

      const refreshedTicket = await SupportService.getTicketById(id);

      res.status(200).json({
        success: true,
        message: 'Admin reply posted successfully.',
        data: {
          reply: newMsg,
          ticket: refreshedTicket,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
