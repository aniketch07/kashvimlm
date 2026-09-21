import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username or Member ID is required'),
  password: z.string().min(1, 'Password is required'),
  sponsorId: z.string().min(1, 'Sponsor ID is compulsory to log in'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Valid email address is required'),
    phone: z.string().min(8, 'Valid phone number is required'),
    username: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
