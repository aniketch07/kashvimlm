import { Router } from 'express';
import { SupportController } from './support.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { createTicketSchema } from '../../schemas/support.schemas.js';

export const supportRoutes = Router();

// Public inquiry submission from Screen E (Contact page) with rate limiting
supportRoutes.post('/', authLimiter, validateRequest({ body: createTicketSchema }), SupportController.createTicket);

// Authenticated ticket listing and status updates
supportRoutes.get('/', authenticateToken, SupportController.getTickets);
supportRoutes.patch('/:ticketId/status', authenticateToken, SupportController.updateStatus);

export default supportRoutes;
