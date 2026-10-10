import type { Knex } from 'knex';
import { db } from '../../db/knex';
import { notFound } from '../../lib/errors';
import { findOwned as findCategory } from '../categories/categories.service';
import type { ExpenseInput, ExpenseQuery, ExpenseUpdate } from './expenses.schemas';

export interface Expense {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  amount: number;
  description: string;
  spentOn: string;
  createdAt: string;
}

export interface ExpensePage {
  items: Expense[];
  total: number;
  totalAmount: number;
  page: number;
  pageSize: number;
}

const SORT_COLUMNS = { date: 'e.spent_on', amount: 'e.amount' } as const;

export function selectExpenses(userId: number) {
  return db('expenses as e')
    .join('categories as c', 'c.id', 'e.category_id')
    .where('e.user_id', userId)
    .select<Expense[]>(
      'e.id',
      'e.category_id as categoryId',
      'c.name as categoryName',
      'c.color as categoryColor',
      'e.amount',
      'e.description',
      'e.spent_on as spentOn',
      'e.created_at as createdAt',
    );
}

function applyFilters(qb: Knex.QueryBuilder, q: ExpenseQuery) {
  if (q.from) qb.where('e.spent_on', '>=', q.from);
  if (q.to) qb.where('e.spent_on', '<=', q.to);
  if (q.categoryId) qb.where('e.category_id', q.categoryId);
  if (q.minAmount !== undefined) qb.where('e.amount', '>=', q.minAmount);
  if (q.maxAmount !== undefined) qb.where('e.amount', '<=', q.maxAmount);
  if (q.search) {
    const escaped = q.search.replace(/[\\%_]/g, (ch) => `\\${ch}`);
    qb.whereILike('e.description', `%${escaped}%`);
  }
  return qb;
}

export async function list(userId: number, q: ExpenseQuery): Promise<ExpensePage> {
  const rowsQuery = applyFilters(selectExpenses(userId), q)
    .orderBy(SORT_COLUMNS[q.sortBy], q.order)
    .orderBy('e.id', q.order)
    .limit(q.pageSize)
    .offset((q.page - 1) * q.pageSize);

  const totalsQuery = applyFilters(
    db('expenses as e').where('e.user_id', userId),
    q,
  ).first<{ total: number; totalAmount: number }>(
    db.raw('count(*)::int as total'),
    db.raw('coalesce(sum(e.amount), 0) as "totalAmount"'),
  );

  const [items, totals] = await Promise.all([rowsQuery, totalsQuery]);
  return { items, ...totals, page: q.page, pageSize: q.pageSize };
}

export async function findOne(userId: number, id: number): Promise<Expense> {
  const expense = await selectExpenses(userId).where('e.id', id).first();
  if (!expense) throw notFound('Expense not found');
  return expense;
}

export async function create(userId: number, input: ExpenseInput): Promise<Expense> {
  const category = await findCategory(userId, input.categoryId);

  const [row] = await db('expenses')
    .insert({
      user_id: userId,
      category_id: category.id,
      amount: input.amount,
      description: input.description,
      spent_on: input.spentOn,
    })
    .returning(['id', 'amount', 'description', 'spent_on as spentOn', 'created_at as createdAt']);

  return { ...row, categoryId: category.id, categoryName: category.name, categoryColor: category.color };
}

export async function update(userId: number, id: number, input: ExpenseUpdate): Promise<Expense> {
  if (input.categoryId) await findCategory(userId, input.categoryId);

  const updated = await db('expenses')
    .where({ id, user_id: userId })
    .update({
      category_id: input.categoryId,
      amount: input.amount,
      description: input.description,
      spent_on: input.spentOn,
      updated_at: db.fn.now(),
    });
  if (!updated) throw notFound('Expense not found');

  return findOne(userId, id);
}

export async function remove(userId: number, id: number): Promise<void> {
  const deleted = await db('expenses').where({ id, user_id: userId }).del();
  if (!deleted) throw notFound('Expense not found');
}
