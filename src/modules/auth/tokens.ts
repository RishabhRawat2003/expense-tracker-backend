import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';

interface AccessPayload {
  sub: string;
}

export function signAccessToken(userId: number): string {
  return jwt.sign({ sub: String(userId) } satisfies AccessPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): number {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
  const id = Number(payload.sub);
  if (!Number.isSafeInteger(id)) throw new Error('Malformed subject');
  return id;
}

export function generateRefreshToken() {
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, hash: hashToken(token), expiresAt };
}

export const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');
