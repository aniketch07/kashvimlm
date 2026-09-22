import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/apiResponse';

export class AuthController {
  /**
   * Registers a new distributor or customer.
   * POST /api/v1/auth/register
   */
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metadata = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      };

      const result = await AuthService.register(req.body, metadata);

      sendSuccess(res, {
        statusCode: 201,
        message: 'Registration successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Authenticates user and issues access + rotated refresh tokens.
   * POST /api/v1/auth/login
   */
  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metadata = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      };

      const result = await AuthService.login(req.body, metadata);

      sendSuccess(res, {
        statusCode: 200,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refreshes access token with Refresh Token Rotation.
   * POST /api/v1/auth/refresh
   */
  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metadata = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      };

      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken, metadata);

      sendSuccess(res, {
        statusCode: 200,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revokes session refresh token.
   * POST /api/v1/auth/logout
   */
  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.body?.refreshToken;
      const userId = req.user?.id;

      await AuthService.logout(refreshToken, userId);

      sendSuccess(res, {
        statusCode: 200,
        message: 'Logged out successfully',
        data: {},
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves profile of authenticated user.
   * GET /api/v1/auth/me
   */
  public static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const profile = await AuthService.getMe(userId);

      sendSuccess(res, {
        statusCode: 200,
        message: 'User profile retrieved',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Requests password reset link/token.
   * POST /api/v1/auth/forgot-password
   */
  public static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);

      sendSuccess(res, {
        statusCode: 200,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resets password using token.
   * POST /api/v1/auth/reset-password
   */
  public static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.resetPassword(req.body);

      sendSuccess(res, {
        statusCode: 200,
        message: result.message,
        data: {},
      });
    } catch (error) {
      next(error);
    }
  }
}
