import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import { httpLogger } from './middleware/logging.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { setupSwagger } from './config/swagger.js';

// Module Route Imports
import authRoutes from './modules/auth/auth.routes.js';
import distributorRoutes from './modules/distributor/distributor.routes.js';
import enrollmentRoutes from './modules/enrollment/enrollment.routes.js';
import productRoutes from './modules/products/product.routes.js';
import orderRoutes from './modules/orders/order.routes.js';
import mlmTreeRoutes from './modules/mlmTree/mlmTree.routes.js';
import bvEngineRoutes from './modules/bvEngine/bvEngine.routes.js';
import commissionEngineRoutes from './modules/commissionEngine/commissionEngine.routes.js';
import walletRoutes from './modules/wallet/wallet.routes.js';
import payoutRoutes from './modules/payouts/payout.routes.js';
import { trainingRoutes } from './modules/training/training.routes.js';
import { supportRoutes } from './modules/support/support.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';

export const app: Express = express();

// 1. Hardened HTTP Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Swagger UI and local preview assets
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Cross-Origin Resource Sharing
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. High-Performance Pino Structured HTTP Request Logging
app.use(httpLogger);

// 4. Rate Limiting for DoS Protection
app.use('/api/', globalLimiter);

// 5. Payload Parsers (Supports up to 50MB for image gallery uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 6. Interactive OpenAPI / Swagger UI
setupSwagger(app);

// 7. Health Check & Root Route
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'KashviMLM Enterprise REST API',
    version: '1.0.0',
    status: 'ONLINE',
    timestamp: new Date().toISOString(),
    documentation: '/api/docs',
    endpoints: {
      swagger: '/api/docs',
      auth: '/api/v1/auth',
      distributors: '/api/v1/distributors',
      enrollment: '/api/v1/enrollment',
      products: '/api/v1/products',
      orders: '/api/v1/orders',
      mlmTree: '/api/v1/tree',
      bvEngine: '/api/v1/bv',
      commissionEngine: '/api/v1/commissions',
      wallet: '/api/v1/wallet',
      payouts: '/api/v1/payouts',
      training: '/api/v1/training',
      support: '/api/v1/support',
      notifications: '/api/v1/notifications',
      admin: '/api/v1/admin',
    },
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 8. API v1 Routing Table (14 Modules)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/distributors', distributorRoutes);
app.use('/api/v1/enrollment', enrollmentRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/tree', mlmTreeRoutes);
app.use('/api/v1/bv', bvEngineRoutes);
app.use('/api/v1/commissions', commissionEngineRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/payouts', payoutRoutes);
app.use('/api/v1/training', trainingRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);

// 9. 404 Catch-All Route
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found on KashviMLM REST API server. Refer to /api/docs for API specification.',
  });
});

// 10. Global Centralized Error Handler Middleware
app.use(errorHandler);
