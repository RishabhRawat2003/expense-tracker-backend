import { Router, type Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth';
import * as ctrl from './auth.controller';

const attemptKey = (req: Request) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `${ipKeyGenerator(req.ip ?? '')}:${email}`;
};

const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator: attemptKey,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' },
});

export const authRouter = Router()
  .post('/register', credentialsLimiter, ctrl.register)
  .post('/login', credentialsLimiter, ctrl.login)
  .post('/refresh', ctrl.refresh)
  .post('/logout', ctrl.logout)
  .get('/me', requireAuth, ctrl.me);
