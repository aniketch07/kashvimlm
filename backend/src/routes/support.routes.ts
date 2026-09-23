import { Router } from 'express';
import { SupportController } from '../controllers/support.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  addTicketMessageSchema,
  createSupportTicketSchema,
  supportTicketIdParamSchema,
  supportTicketQuerySchema,
} from '../validators/support.validators';

const router = Router();

// All support endpoints require authentication
router.use(authenticate);

// POST /api/v1/support - Create a new support ticket
router.post(
  '/',
  validate({ body: createSupportTicketSchema }),
  SupportController.createTicket
);

// GET /api/v1/support - List user's support tickets
router.get(
  '/',
  validate({ query: supportTicketQuerySchema }),
  SupportController.getMyTickets
);

// GET /api/v1/support/:id - View ticket details & message thread
router.get(
  '/:id',
  validate({ params: supportTicketIdParamSchema }),
  SupportController.getTicketById
);

// POST /api/v1/support/:id/messages - Reply to support ticket
router.post(
  '/:id/messages',
  validate({ params: supportTicketIdParamSchema, body: addTicketMessageSchema }),
  SupportController.addMessage
);

// PATCH /api/v1/support/:id/close - Close ticket
router.patch(
  '/:id/close',
  validate({ params: supportTicketIdParamSchema }),
  SupportController.closeTicket
);

export const supportRouter = router;
