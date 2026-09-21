import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

export const notificationRoutes = Router();

notificationRoutes.use(authenticateToken);

notificationRoutes.get('/', NotificationController.getNotifications);
notificationRoutes.patch('/:id/read', NotificationController.markAsRead);
notificationRoutes.post('/read-all', NotificationController.markAllAsRead);
