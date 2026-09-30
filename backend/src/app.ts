import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { globalRateLimiter } from './config/rateLimiter';
import { errorHandler, notFoundHandler, requestLogger } from './middleware';
import apiRouter from './routes';

const app: Application = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexibility with API consumers
    crossOriginEmbedderPolicy: false,
  })
);

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      const allowedOrigins = [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'];
      if (allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(new Error('CORS policy does not allow access from this origin'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id'],
  })
);

// Rate Limiting
app.use('/api', globalRateLimiter);

// Request Logging
app.use(requestLogger);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Zero-Trust Security Guard: Block any client injection of bb, matching, level, rank, or financial fields
import { protectMlmFields } from './middleware/protectMlmFields';
app.use('/api', protectMlmFields);

// API v1 and Root API Routes
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);

// 404 Handler
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

export default app;
