import { Response, NextFunction } from 'express';
import { SupportService } from './support.service.js';
import { AuthRequest } from '../../middleware/auth.js';

export class SupportController {
  static async getTickets(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = req.user?.role === 'admin' ? undefined : req.user?.memberId;
      const tickets = await SupportService.getTicketsByUser(memberId);
      res.status(200).json({ success: true, count: tickets.length, data: tickets });
    } catch (err) {
      next(err);
    }
  }

  static async createTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = req.user?.memberId || '88767139';
      const { subject, category, priority } = req.body;
      const description = req.body.description || req.body.message;

      if (!subject || !category || !description) {
        res.status(400).json({ success: false, message: 'subject, category, and message/description are required.' });
        return;
      }

      const ticket = await SupportService.createTicket(memberId, { subject, category, priority, description });
      res.status(201).json({ success: true, message: 'Support ticket submitted successfully.', data: ticket });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { status, adminResponse } = req.body;

      if (!status) {
        res.status(400).json({ success: false, message: 'status is required.' });
        return;
      }

      const updated = await SupportService.updateTicketStatus(ticketId, status, adminResponse);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Ticket not found.' });
        return;
      }

      res.status(200).json({ success: true, message: 'Ticket updated successfully.', data: updated });
    } catch (err) {
      next(err);
    }
  }
}
