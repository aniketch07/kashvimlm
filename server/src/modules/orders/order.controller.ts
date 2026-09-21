import { Request, Response, NextFunction } from 'express';
import { OrderService } from './order.service.js';
import { AuthRequest } from '../../middleware/auth.js';

export class OrderController {
  static async createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const distributorMemberId = req.user?.memberId || req.body.distributorMemberId;
      if (!distributorMemberId) {
        res.status(400).json({ success: false, message: 'Distributor member ID is required.' });
        return;
      }

      const orderResult = await OrderService.placeOrder({
        distributorMemberId,
        items: req.body.items,
        shippingAddress: req.body.shippingAddress || 'Registered Member Address, India',
        paymentMethod: req.body.paymentMethod,
      });

      res.status(201).json({
        success: true,
        message: 'Wholesale order confirmed and volume points credited to your account!',
        data: orderResult,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMyOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = req.user?.memberId;
      if (!memberId) {
        res.status(401).json({ success: false, message: 'Unauthenticated.' });
        return;
      }
      const orders = await OrderService.getOrdersByDistributor(memberId);
      res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (err) {
      next(err);
    }
  }

  static async getOrderDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderNumber } = req.params;
      const order = await OrderService.getOrderDetails(orderNumber);
      res.status(200).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }
}
