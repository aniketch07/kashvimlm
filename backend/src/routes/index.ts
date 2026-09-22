import { Router } from 'express';
import { authRouter } from './auth.routes';
import { dashboardRouter } from './dashboard.routes';
import { distributorRouter } from './distributor.routes';
import { enrollmentRouter } from './enrollment.routes';
import { healthRouter } from './health.routes';
import { mlmTreeRouter } from './mlmTree.routes';

import { bvRouter } from './bv.routes';
import { cartRouter } from './cart.routes';
import { categoryRouter } from './category.routes';
import { orderRouter } from './order.routes';
import { productRouter } from './product.routes';

const apiRouter = Router();

// Health Check Endpoint: GET /api/v1/health
apiRouter.use('/health', healthRouter);

// Authentication Endpoints: /api/v1/auth
apiRouter.use('/auth', authRouter);

// Distributor Management Endpoints: /api/v1/distributors
apiRouter.use('/distributors', distributorRouter);

// Dashboard Endpoint: GET /api/v1/dashboard
apiRouter.use('/dashboard', dashboardRouter);

// MLM Binary & Sponsor Tree Endpoints: /api/v1/tree
apiRouter.use('/tree', mlmTreeRouter);

// Distributor & Customer Enrollment Pipeline: /api/v1/enrollments
apiRouter.use('/enrollments', enrollmentRouter);

// Product Catalog & Categories: /api/v1/products & /api/v1/categories
apiRouter.use('/products', productRouter);
apiRouter.use('/categories', categoryRouter);

// Shopping Cart: /api/v1/cart
apiRouter.use('/cart', cartRouter);

// Order Management: /api/v1/orders
apiRouter.use('/orders', orderRouter);

// Business Volume (BV) Ledger: /api/v1/bv
apiRouter.use('/bv', bvRouter);

// Commission Engine & Rules: /api/v1/commissions
import { commissionRouter } from './commission.routes';
apiRouter.use('/commissions', commissionRouter);

// Admin Commission Periods: /api/v1/admin/commission-periods
import { adminCommissionPeriodRouter } from './adminCommissionPeriod.routes';
apiRouter.use('/admin/commission-periods', adminCommissionPeriodRouter);

// Distributor Wallet & Admin Adjustments: /api/v1/wallet & /api/v1/admin/wallet
import { walletRouter, adminWalletRouter } from './wallet.routes';
apiRouter.use('/wallet', walletRouter);
apiRouter.use('/admin/wallet', adminWalletRouter);

// Payout System & Admin Approvals: /api/v1/payouts & /api/v1/admin/payouts
import { payoutRouter, adminPayoutRouter } from './payout.routes';
apiRouter.use('/payouts', payoutRouter);
apiRouter.use('/admin/payouts', adminPayoutRouter);

// Multi-Center Business Architecture: /api/v1/business-centers
import { businessCenterRouter } from './businessCenter.routes';
apiRouter.use('/business-centers', businessCenterRouter);

// Training System & Progress Tracking: /api/v1/training
import { trainingRouter } from './training.routes';
apiRouter.use('/training', trainingRouter);

// Replicated Storefront & Navigation Links: /api/v1/my-website
import { websiteRouter } from './website.routes';
apiRouter.use('/my-website', websiteRouter);

// Public Endpoints (Replicated Distributor Storefronts, etc.): /api/v1/public
import { publicRouter } from './public.routes';
apiRouter.use('/public', publicRouter);

// News Management: /api/v1/news & /api/v1/admin/news
import { newsRouter, adminNewsRouter } from './news.routes';
apiRouter.use('/news', newsRouter);
apiRouter.use('/admin/news', adminNewsRouter);

export default apiRouter;
