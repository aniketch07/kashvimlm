import { Response, NextFunction } from 'express';
import { NotificationService } from './notification.service.js';
import { AuthRequest } from '../../middleware/auth.js';

export class NotificationController {
  static async getNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = req.user?.memberId;
      const data = await NotificationService.getNotifications(memberId);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await NotificationService.markAsRead(id);
      res.status(200).json({ success: true, message: 'Notification marked as read.' });
    } catch (err) {
      next(err);
    }
  }

  static async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = req.user?.memberId;
      await NotificationService.markAllAsRead(memberId);
      res.status(200).json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
      next(err);
    }
  }
}
