import { Router } from 'express';
import { AdminController } from './admin.controller.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';

export const adminRoutes = Router();

adminRoutes.use(authenticateToken);
adminRoutes.use(requireAdmin);

adminRoutes.get('/metrics', AdminController.getMetrics);
adminRoutes.get('/audit-logs', AdminController.getAuditLogs);
adminRoutes.post('/calculate-commissions', AdminController.triggerWeeklyCommissionCalculation);
adminRoutes.post('/settle-payouts', AdminController.triggerPayoutSettlement);
adminRoutes.patch('/distributors/:memberId/status', AdminController.updateMemberStatus);
