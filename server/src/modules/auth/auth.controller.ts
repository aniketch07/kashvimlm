import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { AuthRequest } from '../../middleware/auth.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/audit.types.js';

export class AuthController {
  private static setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie('kashvi_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

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

      // Set HTTP-Only Secure Cookie for Refresh Token
      AuthController.setRefreshTokenCookie(res, result.refreshToken);

      // Immutable Audit Log: USER_CREATED
      await AuditService.recordFromRequest(
        req,
        AuditAction.USER_CREATED,
        'User',
        result.user?.id || null,
        null,
        { username: result.user?.username, email: result.user?.email, memberId: result.user?.memberId }
      );

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

      const clientIp =
        req.ip ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket?.remoteAddress ||
        '127.0.0.1';

      const result = await AuthService.login(
        { username, password, sponsorId },
        clientIp
      );

      // Set HTTP-Only Secure Cookie for Refresh Token
      AuthController.setRefreshTokenCookie(res, result.refreshToken);

      // Immutable Audit Log: LOGIN
      await AuditService.recordFromRequest(
        req,
        AuditAction.LOGIN,
        'User',
        result.user?.id || null,
        null,
        { username: result.user?.username, role: result.user?.role, memberId: result.user?.memberId }
      );

      res.status(200).json({
        success: true,
        message: 'Login successful. Welcome back!',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Accept refresh token from HTTP-only cookie OR request body
      const rawToken = req.cookies?.['kashvi_refresh_token'] || req.body?.refreshToken;

      if (!rawToken) {
        res.status(401).json({
          success: false,
          message: 'Refresh token not provided in cookie or request body.',
        });
        return;
      }

      const rotated = await AuthService.refreshToken(rawToken);

      // Update HTTP-only cookie with newly rotated token
      AuthController.setRefreshTokenCookie(res, rotated.refreshToken);

      res.status(200).json({
        success: true,
        message: 'Tokens rotated successfully.',
        data: {
          token: rotated.accessToken,
          accessToken: rotated.accessToken,
          refreshToken: rotated.refreshToken,
          expiresIn: rotated.expiresIn,
          user: rotated.user,
        },
      });
    } catch (err: any) {
      res.clearCookie('kashvi_refresh_token', { path: '/api/v1/auth' });
      res.status(401).json({
        success: false,
        message: err.message || 'Token refresh failed.',
      });
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      const result = await AuthService.resetPassword(token, newPassword);

      // Clear any session cookies upon password reset
      res.clearCookie('kashvi_refresh_token', { path: '/api/v1/auth' });

      // Immutable Audit Log: USER_UPDATED
      await AuditService.recordFromRequest(
        req,
        AuditAction.USER_UPDATED,
        'User',
        null,
        null,
        { actionDetail: 'PASSWORD_RESET_EXECUTED' }
      );

      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Password reset failed.',
      });
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
    // Clear HTTP-Only Refresh Token Cookie
    res.clearCookie('kashvi_refresh_token', { path: '/api/v1/auth' });

    // Immutable Audit Log: LOGOUT
    await AuditService.recordFromRequest(
      req,
      AuditAction.LOGOUT,
      'User',
      (req as any).user?.id || null,
      null,
      { status: 'Logged Out' }
    );

    res.status(200).json({
      success: true,
      message: 'Logged out successfully. All sessions cleared.',
    });
  }
}
