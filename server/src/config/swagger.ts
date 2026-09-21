import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'KashviMLM Enterprise REST API',
    version: '1.0.0',
    description:
      'Enterprise multi-level marketing platform backend powered by Node.js, Express, TypeScript, PostgreSQL, and Prisma ORM.\n\nFeaturing Dual-Leg Binary MLM matrix, 10% matching bonuses, wholesale e-commerce store, and ID Owner (Rahul Kaushal: 88767139) catalog controls.',
    contact: {
      name: 'KashviMLM Engineering Team',
      email: 'kashvicustomercare@gmail.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your signed JWT token obtained from `/api/v1/auth/login`.',
      },
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['username', 'password', 'sponsorId'],
        properties: {
          username: { type: 'string', example: '88767139' },
          password: { type: 'string', example: 'SecurePassword123!' },
          sponsorId: { type: 'string', example: '88767139' },
          rememberMe: { type: 'boolean', example: true },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['fullName', 'email', 'phone', 'password', 'confirmPassword'],
        properties: {
          fullName: { type: 'string', example: 'Rahul Kaushal' },
          email: { type: 'string', example: 'rahul.kaushal@kashvimlm.com' },
          phone: { type: 'string', example: '+91 98765 43210' },
          username: { type: 'string', example: 'rahul_kaushal' },
          password: { type: 'string', example: 'SecurePass2026!' },
          confirmPassword: { type: 'string', example: 'SecurePass2026!' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'prod-001' },
          sku: { type: 'string', example: 'KASH-HOZ-001' },
          name: { type: 'string', example: "Men's Combed Cotton Hosiery T-Shirt" },
          category: { type: 'string', example: 'Clothes & Hosiery (Hozri)' },
          distributorPrice: { type: 'number', example: 1299.0 },
          mrp: { type: 'number', example: 1899.0 },
          volumeBv: { type: 'number', example: 25.0 },
          stockQuantity: { type: 'integer', example: 100 },
          status: { type: 'string', example: 'In Stock' },
          imageUrl: { type: 'string' },
          sizeSpec: { type: 'string', example: 'Size: M / L / XL / XXL' },
          shortDesc: { type: 'string' },
          benefits: { type: 'array', items: { type: 'string' } },
        },
      },
      OrderCheckoutRequest: {
        type: 'object',
        required: ['items', 'shippingAddress'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['productId', 'quantity'],
              properties: {
                productId: { type: 'string', example: 'prod-001' },
                quantity: { type: 'integer', example: 2 },
              },
            },
          },
          shippingAddress: { type: 'string', example: 'Flat 402, Green Valley, Andheri West, Mumbai' },
          paymentMethod: { type: 'string', example: 'Online Payment' },
        },
      },
      SupportTicketRequest: {
        type: 'object',
        required: ['fullName', 'email', 'category', 'subject', 'message'],
        properties: {
          fullName: { type: 'string', example: 'Vikas Sharma' },
          email: { type: 'string', example: 'vikas@example.com' },
          phone: { type: 'string', example: '+91 98201 54321' },
          memberId: { type: 'string', example: '88767139' },
          category: { type: 'string', example: 'Distributor Commission & BV Inquiries' },
          subject: { type: 'string', example: 'Weekly payout inquiry' },
          message: { type: 'string', example: 'Requesting confirmation on Week 38 binary matching bonus.' },
        },
      },
    },
  },
  paths: {
    '/api/v1/auth/login': {
      post: {
        tags: ['1. Authentication'],
        summary: 'Authenticate Distributor or Admin',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: { description: 'Successful login. Returns JWT token and distributor profile.' },
          400: { description: 'Validation error.' },
          401: { description: 'Invalid credentials or inactive account.' },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['1. Authentication'],
        summary: 'Register new Distributor Account',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
        },
        responses: {
          201: { description: 'Distributor registered successfully with Member ID.' },
          400: { description: 'Validation error or password mismatch.' },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['1. Authentication'],
        summary: 'Get Authenticated User Profile',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Current authenticated session profile.' },
          401: { description: 'Unauthorized.' },
        },
      },
    },
    '/api/v1/distributors/profile/{memberId}': {
      get: {
        tags: ['2. Distributor Management'],
        summary: 'Retrieve Distributor Profile & Business Center Overview',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'memberId', in: 'path', required: false, schema: { type: 'string', default: '88767139' } },
        ],
        responses: {
          200: { description: 'Distributor details, rank, PSV, team size, and balances.' },
        },
      },
    },
    '/api/v1/enrollment/enroll': {
      post: {
        tags: ['3. Enrollment'],
        summary: 'Enroll New Downline Brand Partner or Customer',
        security: [{ BearerAuth: [] }],
        responses: {
          201: { description: 'New distributor registered and placed into binary tree.' },
        },
      },
    },
    '/api/v1/products': {
      get: {
        tags: ['4. Products & Wholesale Store'],
        summary: 'Get Active Product Catalog with DP, MRP, and BV Points',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['featured', 'price_low', 'price_high', 'bv_high'] } },
        ],
        responses: {
          200: { description: 'List of wholesale products.' },
        },
      },
      post: {
        tags: ['4. Products & Wholesale Store'],
        summary: 'Add New Product (ID Owner / Admin Only)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
        },
        responses: {
          201: { description: 'Product created successfully.' },
          403: { description: 'Forbidden. Requires ID Owner (88767139) or Admin role.' },
        },
      },
    },
    '/api/v1/orders/checkout': {
      post: {
        tags: ['5. Orders'],
        summary: 'Distributor Wholesale Cart Checkout',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderCheckoutRequest' } } },
        },
        responses: {
          201: { description: 'Order created, stock decremented, and BV credited.' },
        },
      },
    },
    '/api/v1/tree/structure/{memberId}': {
      get: {
        tags: ['6. MLM Binary Tree'],
        summary: 'Get Binary Matrix Topology & Leg Volumes',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'memberId', in: 'path', required: false, schema: { type: 'string', default: '88767139' } },
        ],
        responses: {
          200: { description: 'Binary tree visual representation with Left/Right legs.' },
        },
      },
    },
    '/api/v1/bv/summary/{memberId}': {
      get: {
        tags: ['7. BV Volume Engine'],
        summary: 'Get Personal & Binary Leg Volumes with 100 PSV Qualification',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'memberId', in: 'path', required: false, schema: { type: 'string', default: '88767139' } },
        ],
        responses: {
          200: { description: 'Volume breakdown for BC 001/002/003 and carryover.' },
        },
      },
    },
    '/api/v1/commissions/history/{memberId}': {
      get: {
        tags: ['8. Commission Engine'],
        summary: 'Get 10% Weaker-Leg Matching Bonus Statements & TDS Deductions',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'memberId', in: 'path', required: false, schema: { type: 'string', default: '88767139' } },
        ],
        responses: {
          200: { description: 'Weekly matching bonuses, statutory TDS 5%, and net pay.' },
        },
      },
    },
    '/api/v1/wallet/balance/{memberId}': {
      get: {
        tags: ['9. Wallet'],
        summary: 'Get Distributor e-Wallet Balances & Statement',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'memberId', in: 'path', required: false, schema: { type: 'string', default: '88767139' } },
        ],
        responses: {
          200: { description: 'Available balance, pending balance, and lifetime earnings.' },
        },
      },
    },
    '/api/v1/payouts/member/{memberId}': {
      get: {
        tags: ['10. Payouts'],
        summary: 'Get Bank Direct Deposit Settlement History & UTRs',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'memberId', in: 'path', required: false, schema: { type: 'string', default: '88767139' } },
        ],
        responses: {
          200: { description: 'Settled bank transfers with reference numbers.' },
        },
      },
    },
    '/api/v1/training/modules': {
      get: {
        tags: ['11. Training'],
        summary: 'Get Distributor Curriculum & JumpStart Tasks',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Modules and completion status.' },
        },
      },
    },
    '/api/v1/support': {
      post: {
        tags: ['12. Support & Grievances'],
        summary: 'Submit Support Ticket or Consumer Grievance',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SupportTicketRequest' } } },
        },
        responses: {
          201: { description: 'Support ticket registered with KV-TKT reference.' },
        },
      },
      get: {
        tags: ['12. Support & Grievances'],
        summary: 'List Support Inquiries',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'List of support tickets.' },
        },
      },
    },
    '/api/v1/notifications': {
      get: {
        tags: ['13. Notifications'],
        summary: 'Get Member Notifications & Unread Count',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Notification feed.' },
        },
      },
    },
    '/api/v1/admin/metrics': {
      get: {
        tags: ['14. Admin'],
        summary: 'System Overview Metrics (Total Members, Sales Turnover, Pool)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Executive system health dashboard.' },
          403: { description: 'Forbidden. Requires Admin role.' },
        },
      },
    },
  },
};

export function setupSwagger(app: Express): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
}
