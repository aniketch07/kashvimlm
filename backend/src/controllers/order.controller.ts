import { NextFunction, Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import { sendSuccess } from '../utils/apiResponse';

export class OrderController {
  /**
   * Creates an order with strict 10-step transactional flow.
   * POST /api/v1/orders
   */
  public static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await OrderService.createOrder(req.user!.id, req.body);
      sendSuccess(res, {
        statusCode: 201,
        message: 'Order created successfully.',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lists orders for authenticated user (or all if admin).
   * GET /api/v1/orders
   */
  public static async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await OrderService.getOrders(req.user!.id, req.user!.role, req.query as any);
      sendSuccess(res, {
        message: 'Orders retrieved successfully.',
        data: result.items,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves single order by ID or order number.
   * GET /api/v1/orders/:id
   */
  public static async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await OrderService.getOrderById(req.user!.id, req.user!.role, req.params.id);
      sendSuccess(res, {
        message: 'Order retrieved.',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancels an order, restocks products, reverses BV ledger, and updates status.
   * POST /api/v1/orders/:id/cancel
   */
  public static async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cancelled = await OrderService.cancelOrder(req.user!.id, req.user!.role, req.params.id);
      sendSuccess(res, {
        message: 'Order cancelled and restocked successfully.',
        data: cancelled,
      });
    } catch (error) {
      next(error);
    }
  }
}
