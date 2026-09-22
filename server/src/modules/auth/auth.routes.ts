import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../schemas/auth.schemas.js';

const router = Router();

// 1. User Registration with Argon2id & Zod validation
router.post('/register', authLimiter, validateRequest({ body: registerSchema }), AuthController.register);

// 2. User Login with Brute-Force Rate Limiting & Lockout Protection
router.post('/login', authLimiter, validateRequest({ body: loginSchema }), AuthController.login);

// 3. Refresh Token Rotation (Supports HTTP-Only Cookie or Request Body)
router.post('/refresh', validateRequest({ body: refreshTokenSchema }), AuthController.refreshToken);

// 4. Password Reset Flow with Expiring Cryptographic Tokens
router.post('/forgot-password', authLimiter, validateRequest({ body: forgotPasswordSchema }), AuthController.forgotPassword);
router.post('/reset-password', authLimiter, validateRequest({ body: resetPasswordSchema }), AuthController.resetPassword);

// 5. Authenticated User Profile & Session Termination
router.get('/me', authenticateToken, AuthController.getMe);
router.post('/logout', authenticateToken, AuthController.logout);

export default router;
