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
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(), // Can come from body or HTTP-only cookie
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid registered email address is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Valid reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});
