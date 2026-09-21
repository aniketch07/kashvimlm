import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { loginSchema, registerSchema } from '../../schemas/auth.schemas.js';

const router = Router();

router.post('/register', authLimiter, validateRequest({ body: registerSchema }), AuthController.register);
router.post('/login', authLimiter, validateRequest({ body: loginSchema }), AuthController.login);
router.get('/me', authenticateToken, AuthController.getMe);
router.post('/logout', authenticateToken, AuthController.logout);

export default router;
