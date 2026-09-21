import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { AuthRequest } from '../../middleware/auth.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fullName, email, phone, username, password, sponsorId } = req.body;
      if (!fullName || !email || !phone || !username || !password) {
        res.status(400).json({
          success: false,
          message: 'All fields (fullName, email, phone, username, password) are required.',
        });
        return;
      }

      const result = await AuthService.register({
        fullName,
        email,
        phone,
        username,
        password,
        sponsorId,
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful! Welcome to Kashvimlm.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password, sponsorId } = req.body;
      if (!username || !password || !sponsorId) {
        res.status(400).json({
          success: false,
          message: 'Username, password, and Sponsor ID are required to log in.',
        });
        return;
      }

      const result = await AuthService.login({
        username,
        password,
        sponsorId,
      });

      res.status(200).json({
        success: true,
        message: 'Login successful. Welcome back!',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthenticated.' });
        return;
      }
      const profile = await AuthService.getMe(req.user.id);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  }
}
