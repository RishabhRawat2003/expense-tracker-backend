import 'dotenv/config';
import { z } from 'zod';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    DATABASE_URL: z.string().min(1),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET should be at least 32 characters'),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),
    COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  })
  .refine((v) => v.COOKIE_SAMESITE !== 'none' || v.COOKIE_SECURE !== 'false', {
    message: 'COOKIE_SAMESITE=none requires COOKIE_SECURE=true',
    path: ['COOKIE_SECURE'],
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

const isProd = parsed.data.NODE_ENV === 'production';
const sameSite = parsed.data.COOKIE_SAMESITE ?? (isProd ? 'none' : 'lax');
const secure = parsed.data.COOKIE_SECURE ? parsed.data.COOKIE_SECURE === 'true' : isProd || sameSite === 'none';

export const env = {
  ...parsed.data,
  isProd,
  corsOrigins: parsed.data.CORS_ORIGIN.split(',').map((o) => o.trim().replace(/\/$/, '')),
  cookie: {
    sameSite,
    secure,
    partitioned: sameSite === 'none',
  },
};
