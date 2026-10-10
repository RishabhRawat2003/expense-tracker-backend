import { db } from '../../db/knex';
import { conflict, notFound } from '../../lib/errors';
import type { CategoryInput } from './categories.schemas';

export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', color: '#f97316' },
  { name: 'Transport', color: '#0ea5e9' },
  { name: 'Housing', color: '#8b5cf6' },
  { name: 'Utilities', color: '#14b8a6' },
  { name: 'Shopping', color: '#ec4899' },
  { name: 'Health', color: '#22c55e' },
  { name: 'Entertainment', color: '#eab308' },
  { name: 'Other', color: '#64748b' },
];

export interface Category {
  id: number;
  name: string;
  color: string;
}

const columns = ['id', 'name', 'color'];

export function list(userId: number): Promise<Category[]> {
  return db('categories').where('user_id', userId).orderBy('name').select(columns);
}

export async function findOwned(userId: number, id: number): Promise<Category> {
  const category = await db('categories').where({ id, user_id: userId }).first<Category | undefined>(columns);
  if (!category) throw notFound('Category not found');
  return category;
}

export async function create(userId: number, input: CategoryInput): Promise<Category> {
  try {
    const [row] = await db('categories')
      .insert({ ...input, user_id: userId })
      .returning<Category[]>(columns);
    return row;
  } catch (err) {
    throw isUniqueViolation(err) ? conflict('A category with this name already exists') : err;
  }
}

export async function update(userId: number, id: number, input: Partial<CategoryInput>): Promise<Category> {
  try {
    const [row] = await db('categories')
      .where({ id, user_id: userId })
      .update(input)
      .returning<Category[]>(columns);
    if (!row) throw notFound('Category not found');
    return row;
  } catch (err) {
    throw isUniqueViolation(err) ? conflict('A category with this name already exists') : err;
  }
}

export async function remove(userId: number, id: number): Promise<void> {
  const inUse = await db('expenses').where({ user_id: userId, category_id: id }).first(db.raw('1'));
  if (inUse) throw conflict('This category has expenses. Move or delete them first.');

  const deleted = await db('categories').where({ id, user_id: userId }).del();
  if (!deleted) throw notFound('Category not found');
}

const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === '23505';
