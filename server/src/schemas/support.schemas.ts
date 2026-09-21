import { z } from 'zod';

export const createTicketSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().optional(),
  memberId: z.string().optional(),
  category: z.string().min(2, 'Department or category is required'),
  subject: z.string().min(3, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters long'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium').optional(),
});
