import { db } from '../../db/knex';
import { conflict, notFound } from '../../lib/errors';
import { monthToDate } from '../../lib/dates';
import { findOwned as findCategory } from '../categories/categories.service';
import type { BudgetInput } from './budgets.schemas';

export interface Budget {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  month: string;
  amount: number;
  spent: number;
}

const spentInMonth = `(
  SELECT coalesce(sum(e.amount), 0)
  FROM expenses e
  WHERE e.user_id = b.user_id
    AND e.category_id = b.category_id
    AND e.spent_on >= b.month
    AND e.spent_on < b.month + interval '1 month'
) as spent`;

function selectBudgets(userId: number) {
  return db('budgets as b')
    .join('categories as c', 'c.id', 'b.category_id')
    .where('b.user_id', userId)
    .select<Budget[]>(
      'b.id',
      'b.category_id as categoryId',
      'c.name as categoryName',
      'c.color as categoryColor',
      db.raw(`to_char(b.month, 'YYYY-MM') as month`),
      'b.amount',
      db.raw(spentInMonth),
    );
}

export function list(userId: number, month: string): Promise<Budget[]> {
  return selectBudgets(userId).where('b.month', monthToDate(month)).orderBy('c.name');
}

async function findOne(userId: number, id: number): Promise<Budget> {
  const budget = await selectBudgets(userId).where('b.id', id).first();
  if (!budget) throw notFound('Budget not found');
  return budget;
}

export async function create(userId: number, input: BudgetInput): Promise<Budget> {
  await findCategory(userId, input.categoryId);

  const [row] = await db('budgets')
    .insert({
      user_id: userId,
      category_id: input.categoryId,
      month: monthToDate(input.month),
      amount: input.amount,
    })
    .onConflict(['user_id', 'category_id', 'month'])
    .ignore()
    .returning<{ id: number }[]>('id');

  if (!row) throw conflict('A budget for this category and month already exists');
  return findOne(userId, row.id);
}

export async function update(userId: number, id: number, amount: number): Promise<Budget> {
  const updated = await db('budgets')
    .where({ id, user_id: userId })
    .update({ amount, updated_at: db.fn.now() });
  if (!updated) throw notFound('Budget not found');
  return findOne(userId, id);
}

export async function remove(userId: number, id: number): Promise<void> {
  const deleted = await db('budgets').where({ id, user_id: userId }).del();
  if (!deleted) throw notFound('Budget not found');
}

export async function copyMonth(userId: number, fromMonth: string, toMonth: string): Promise<number> {
  const result = await db.raw(
    `INSERT INTO budgets (user_id, category_id, month, amount)
     SELECT user_id, category_id, ?::date, amount
     FROM budgets
     WHERE user_id = ? AND month = ?::date
     ON CONFLICT (user_id, category_id, month) DO NOTHING`,
    [monthToDate(toMonth), userId, monthToDate(fromMonth)],
  );
  return result.rowCount ?? 0;
}
