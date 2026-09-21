import { Request, Response, NextFunction } from 'express';
import { WalletService } from './wallet.service.js';
import { AuthRequest } from '../../middleware/auth.js';

export class WalletController {
  static async getBalance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = req.params.memberId || req.user?.memberId;
      if (!memberId) {
        res.status(400).json({ success: false, message: 'Member ID required.' });
        return;
      }
      const balance = await WalletService.getBalance(memberId);
      res.status(200).json({ success: true, data: balance });
    } catch (err) {
      next(err);
    }
  }

  static async getTransactions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = req.params.memberId || req.user?.memberId;
      if (!memberId) {
        res.status(400).json({ success: false, message: 'Member ID required.' });
        return;
      }
      const limit = parseInt(req.query.limit as string) || 20;
      const txs = await WalletService.getTransactions(memberId, limit);
      res.status(200).json({ success: true, count: txs.length, data: txs });
    } catch (err) {
      next(err);
    }
  }

  static async withdraw(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = req.user?.memberId;
      if (!memberId) {
        res.status(401).json({ success: false, message: 'Unauthenticated.' });
        return;
      }
      const amount = parseFloat(req.body.amount);
      if (!amount || isNaN(amount)) {
        res.status(400).json({ success: false, message: 'Valid withdrawal amount required.' });
        return;
      }
      const result = await WalletService.requestWithdrawal(memberId, amount);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
