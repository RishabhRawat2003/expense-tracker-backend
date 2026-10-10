import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../modules/auth/tokens';
import { unauthorized } from '../lib/errors';

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(unauthorized('Missing access token'));
  }

  try {
    req.userId = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(unauthorized('Invalid or expired access token'));
  }
}

export function currentUserId(req: Request): number {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
