import { z } from 'zod';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email').max(255));

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(72),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
