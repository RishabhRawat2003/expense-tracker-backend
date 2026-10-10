import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env';
import { notFound, unauthorized } from '../../lib/errors';
import { parse } from '../../lib/validation';
import { currentUserId } from '../../middleware/auth';
import { loginSchema, registerSchema } from './auth.schemas';
import * as authService from './auth.service';

export const REFRESH_COOKIE = 'refresh_token';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  partitioned: env.cookie.partitioned,
  path: '/api/auth',
};

function sendSession(res: Response, result: authService.AuthResult, status = 200) {
  res
    .cookie(REFRESH_COOKIE, result.refreshToken, { ...cookieOptions, expires: result.refreshExpiresAt })
    .status(status)
    .json({ user: result.user, accessToken: result.accessToken });
}

export async function register(req: Request, res: Response) {
  const input = parse(registerSchema, req.body);
  sendSession(res, await authService.register(input, req.get('user-agent')), 201);
}

export async function login(req: Request, res: Response) {
  const input = parse(loginSchema, req.body);
  sendSession(res, await authService.login(input, req.get('user-agent')));
}

export async function refresh(req: Request, res: Response) {
  const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw unauthorized('No session');

  try {
    sendSession(res, await authService.refresh(token, req.get('user-agent')));
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw err;
  }
}

export async function logout(req: Request, res: Response) {
  const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
  if (token) await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE, cookieOptions).status(204).end();
}

export async function me(req: Request, res: Response) {
  const user = await authService.getUser(currentUserId(req));
  if (!user) throw notFound('User not found');
  res.json({ user });
}
