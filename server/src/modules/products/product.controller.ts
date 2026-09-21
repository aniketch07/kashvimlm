import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service.js';
import { AuthRequest } from '../../middleware/auth.js';

export class ProductController {
  private static verifyIdOwner(req: AuthRequest): boolean {
    const memberId = req.user?.memberId;
    const role = req.user?.role;
    return memberId === '88767139' || role === 'admin';
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, search } = req.query;
      const products = await ProductService.getAll(category as string, search as string);
      res.status(200).json({ success: true, count: products.length, data: products });
    } catch (err) {
      next(err);
    }
  }

  static async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const product = await ProductService.getById(id);
      res.status(200).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!ProductController.verifyIdOwner(req)) {
        res.status(403).json({
          success: false,
          message: 'Access Denied. Only the verified ID Owner (88767139 / Rahul Kaushal) or Admin can add products.',
        });
        return;
      }
      const newProduct = await ProductService.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Product created and published to wholesale catalog.',
        data: newProduct,
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!ProductController.verifyIdOwner(req)) {
        res.status(403).json({
          success: false,
          message: 'Access Denied. Only the verified ID Owner (88767139) can update product pricing.',
        });
        return;
      }
      const { id } = req.params;
      const updated = await ProductService.updatePricingAndDetails(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Product price and volume points updated.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteOne(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!ProductController.verifyIdOwner(req)) {
        res.status(403).json({
          success: false,
          message: 'Access Denied. Only the verified ID Owner (88767139) can delete products.',
        });
        return;
      }
      const { id } = req.params;
      await ProductService.deleteProduct(id);
      res.status(200).json({ success: true, message: `Product ${id} removed from catalog.` });
    } catch (err) {
      next(err);
    }
  }

  static async bulkDelete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!ProductController.verifyIdOwner(req)) {
        res.status(403).json({
          success: false,
          message: 'Access Denied. Only the verified ID Owner (88767139) can delete products.',
        });
        return;
      }
      const { ids } = req.body;
      await ProductService.bulkDelete(ids);
      res.status(200).json({ success: true, message: `Successfully deleted ${ids.length} products.` });
    } catch (err) {
      next(err);
    }
  }

  static async resetZero(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!ProductController.verifyIdOwner(req)) {
        res.status(403).json({
          success: false,
          message: 'Access Denied. Only ID Owner (88767139) can reset catalog data.',
        });
        return;
      }
      const result = await ProductService.resetZero();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async loadPlaceholders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!ProductController.verifyIdOwner(req)) {
        res.status(403).json({
          success: false,
          message: 'Access Denied. Only ID Owner (88767139) can load placeholders.',
        });
        return;
      }
      const result = await ProductService.loadPlaceholders();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
