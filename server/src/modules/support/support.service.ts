import { query } from '../../config/db.js';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  distributorId?: string;
  subject: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  description: string;
  adminResponse?: string;
  createdAt: string;
  resolvedAt?: string;
}

export class SupportService {
  private static demoTickets: SupportTicket[] = [
    {
      id: 'tick-001',
      ticketNumber: 'TICKET-2026-9041',
      subject: 'NEFT Payout confirmation inquiry for Week 37',
      category: 'Commission & Payout',
      priority: 'High',
      status: 'Resolved',
      description: 'Requesting bank acknowledgement receipt for the recent weekly matching commission payout.',
      adminResponse: 'UTR reference CMS8819230914 generated and settled on Monday 11:30 AM.',
      createdAt: '2026-09-15T10:00:00Z',
      resolvedAt: '2026-09-15T14:30:00Z'
    },
    {
      id: 'tick-002',
      ticketNumber: 'TICKET-2026-9102',
      subject: 'Order shipment tracking update for Hozri bulk bundle',
      category: 'Order Delivery',
      priority: 'Medium',
      status: 'Open',
      description: 'Order KASH-ORD-781923 tracking status shows in transit from Delhi hub.',
      createdAt: '2026-09-20T12:00:00Z'
    }
  ];

  static async getTicketsByUser(memberId?: string): Promise<SupportTicket[]> {
    try {
      const sql = `
        SELECT st.*, d.member_id 
        FROM support_tickets st
        JOIN distributors d ON st.distributor_id = d.id
        WHERE d.member_id = $1 OR $1 IS NULL
        ORDER BY st.created_at DESC
      `;
      const res = await query(sql, [memberId || null]);
      if (res && res.rows.length > 0) {
        return res.rows.map((row: any) => ({
          id: row.id,
          ticketNumber: row.ticket_number,
          distributorId: row.distributor_id,
          subject: row.subject,
          category: row.category,
          priority: row.priority,
          status: row.status,
          description: row.description,
          adminResponse: row.admin_response,
          createdAt: row.created_at,
          resolvedAt: row.resolved_at
        }));
      }
    } catch (e) {
      // Fallback
    }

    return this.demoTickets;
  }

  static async createTicket(
    memberId: string,
    data: { subject: string; category: string; priority?: 'Low' | 'Medium' | 'High' | 'Urgent'; description: string }
  ): Promise<SupportTicket> {
    const ticketNumber = `TICKET-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: SupportTicket = {
      id: `tick-${Date.now()}`,
      ticketNumber,
      subject: data.subject,
      category: data.category,
      priority: data.priority || 'Medium',
      status: 'Open',
      description: data.description,
      createdAt: new Date().toISOString()
    };

    try {
      const distRes = await query(`SELECT id FROM distributors WHERE member_id = $1`, [memberId]);
      if (distRes && distRes.rows.length > 0) {
        const distId = distRes.rows[0].id;
        const insertRes = await query(
          `INSERT INTO support_tickets (ticket_number, distributor_id, subject, category, priority, status, description)
           VALUES ($1, $2, $3, $4, $5, 'Open', $6)
           RETURNING *`,
          [ticketNumber, distId, data.subject, data.category, data.priority || 'Medium', data.description]
        );
        if (insertRes && insertRes.rows.length > 0) {
          const row = insertRes.rows[0];
          return {
            id: row.id,
            ticketNumber: row.ticket_number,
            distributorId: row.distributor_id,
            subject: row.subject,
            category: row.category,
            priority: row.priority,
            status: row.status,
            description: row.description,
            createdAt: row.created_at
          };
        }
      }
    } catch (e) {
      // Fallback
    }

    this.demoTickets.unshift(newTicket);
    return newTicket;
  }

  static async updateTicketStatus(
    ticketId: string,
    status: 'Open' | 'In Progress' | 'Resolved' | 'Closed',
    adminResponse?: string
  ): Promise<SupportTicket | null> {
    try {
      const sql = `
        UPDATE support_tickets
        SET status = $1, admin_response = COALESCE($2, admin_response), resolved_at = CASE WHEN $1 = 'Resolved' THEN NOW() ELSE resolved_at END
        WHERE id = $3 OR ticket_number = $3
        RETURNING *
      `;
      const res = await query(sql, [status, adminResponse || null, ticketId]);
      if (res && res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          ticketNumber: row.ticket_number,
          subject: row.subject,
          category: row.category,
          priority: row.priority,
          status: row.status,
          description: row.description,
          adminResponse: row.admin_response,
          createdAt: row.created_at,
          resolvedAt: row.resolved_at
        };
      }
    } catch (e) {
      // Fallback
    }

    const t = this.demoTickets.find(item => item.id === ticketId || item.ticketNumber === ticketId);
    if (t) {
      t.status = status;
      if (adminResponse) t.adminResponse = adminResponse;
      if (status === 'Resolved') t.resolvedAt = new Date().toISOString();
      return t;
    }
    return null;
  }
}
