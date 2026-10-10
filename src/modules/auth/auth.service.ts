import bcrypt from 'bcryptjs';
import type { Knex } from 'knex';
import { db } from '../../db/knex';
import { conflict, unauthorized } from '../../lib/errors';
import { DEFAULT_CATEGORIES } from '../categories/categories.service';
import { generateRefreshToken, hashToken, signAccessToken } from './tokens';
import type { LoginInput, RegisterInput } from './auth.schemas';

const BCRYPT_ROUNDS = 10;
const DUMMY_HASH = bcrypt.hashSync('timing-safe-placeholder', BCRYPT_ROUNDS);

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const userColumns = ['id', 'name', 'email', 'created_at as createdAt'];

async function issueTokens(trx: Knex | Knex.Transaction, userId: number, userAgent?: string) {
  const refresh = generateRefreshToken();
  await trx('refresh_tokens').insert({
    user_id: userId,
    token_hash: refresh.hash,
    expires_at: refresh.expiresAt,
    user_agent: userAgent?.slice(0, 255) ?? null,
  });
  return {
    accessToken: signAccessToken(userId),
    refreshToken: refresh.token,
    refreshExpiresAt: refresh.expiresAt,
  };
}

export async function register(input: RegisterInput, userAgent?: string): Promise<AuthResult> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  return db.transaction(async (trx) => {
    const existing = await trx('users').whereRaw('lower(email) = ?', [input.email]).first('id');
    if (existing) throw conflict('An account with this email already exists');

    const [user] = await trx('users')
      .insert({ name: input.name, email: input.email, password_hash: passwordHash })
      .returning<PublicUser[]>(userColumns);

    await trx('categories').insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: user.id })));

    const tokens = await issueTokens(trx, user.id, userAgent);
    return { user, ...tokens };
  });
}

export async function login(input: LoginInput, userAgent?: string): Promise<AuthResult> {
  const row = await db('users')
    .whereRaw('lower(email) = ?', [input.email])
    .first<(PublicUser & { passwordHash: string }) | undefined>([...userColumns, 'password_hash as passwordHash']);

  const valid = await bcrypt.compare(input.password, row?.passwordHash ?? DUMMY_HASH);
  if (!row || !valid) throw unauthorized('Invalid email or password');

  const { passwordHash: _omit, ...user } = row;

  await db('refresh_tokens').where('user_id', user.id).andWhere('expires_at', '<', db.fn.now()).del();

  const tokens = await issueTokens(db, user.id, userAgent);
  return { user, ...tokens };
}

export async function refresh(token: string, userAgent?: string): Promise<AuthResult> {
  return db.transaction(async (trx) => {
    const [consumed] = await trx('refresh_tokens')
      .where('token_hash', hashToken(token))
      .del()
      .returning<{ user_id: number; expires_at: Date }[]>(['user_id', 'expires_at']);

    if (!consumed || consumed.expires_at.getTime() < Date.now()) {
      throw unauthorized('Session expired, please log in again');
    }

    const user = await trx('users').where('id', consumed.user_id).first<PublicUser | undefined>(userColumns);
    if (!user) throw unauthorized('Account no longer exists');

    const tokens = await issueTokens(trx, user.id, userAgent);
    return { user, ...tokens };
  });
}

export async function logout(token: string): Promise<void> {
  await db('refresh_tokens').where('token_hash', hashToken(token)).del();
}

export async function getUser(userId: number): Promise<PublicUser | undefined> {
  return db('users').where('id', userId).first(userColumns);
}
