import rateLimit from 'express-rate-limit';

/**
 * Standard Global API Rate Limiter
 * 300 requests per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Global rate limit exceeded. Please try again after 15 minutes.',
  },
});

/**
 * Strict Rate Limiter for Authentication & Security-Critical Endpoints
 * 15 requests per 15 minutes per IP
 * Protects login, registration, and support ticket spam.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many authentication attempts. Please wait 15 minutes before retrying.',
  },
});
