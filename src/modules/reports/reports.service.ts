import { db } from '../../db/knex';
import { monthRange, yearRange, type DateRange } from '../../lib/dates';
import { selectExpenses } from '../expenses/expenses.service';
import type { ReportQuery } from './reports.schemas';

export interface CategorySummary {
  categoryId: number;
  name: string;
  color: string;
  spent: number;
  budget: number;
  expenseCount: number;
}

export interface TrendPoint {
  label: string;
  total: number;
}

export interface Report {
  period: 'monthly' | 'yearly';
  label: string;
  from: string;
  to: string;
  totalSpent: number;
  totalBudget: number;
  expenseCount: number;
  categories: CategorySummary[];
  trend: TrendPoint[];
}

export async function categorySummary(userId: number, { from, to }: DateRange): Promise<CategorySummary[]> {
  const { rows } = await db.raw(
    `SELECT category_id AS "categoryId", name, color, spent, budget, expense_count AS "expenseCount"
     FROM fn_category_summary(?, ?, ?)`,
    [userId, from, to],
  );
  return rows;
}

export async function dailyTotals(userId: number, { from, to }: DateRange): Promise<TrendPoint[]> {
  const rows: { day: string; total: number }[] = await db('expenses')
    .where('user_id', userId)
    .whereBetween('spent_on', [from, to])
    .groupBy('spent_on')
    .select('spent_on as day')
    .sum({ total: 'amount' });

  const byDay = new Map(rows.map((r) => [r.day, r.total]));
  const points: TrendPoint[] = [];
  const lastDay = Number(to.slice(8, 10));
  for (let d = 1; d <= lastDay; d++) {
    const day = `${from.slice(0, 8)}${String(d).padStart(2, '0')}`;
    points.push({ label: day, total: byDay.get(day) ?? 0 });
  }
  return points;
}

async function monthlyTotals(userId: number, year: number): Promise<TrendPoint[]> {
  const { from, to } = yearRange(year);
  const rows: { month: number; total: number }[] = await db('expenses')
    .where('user_id', userId)
    .whereBetween('spent_on', [from, to])
    .groupByRaw('1')
    .select(db.raw('extract(month from spent_on)::int as month'))
    .sum({ total: 'amount' });

  const byMonth = new Map(rows.map((r) => [r.month, r.total]));
  return Array.from({ length: 12 }, (_, i) => ({
    label: `${year}-${String(i + 1).padStart(2, '0')}`,
    total: byMonth.get(i + 1) ?? 0,
  }));
}

export function resolveRange(q: ReportQuery): DateRange & { label: string } {
  return q.period === 'monthly'
    ? { ...monthRange(q.month), label: q.month }
    : { ...yearRange(q.year), label: String(q.year) };
}

export async function getReport(userId: number, q: ReportQuery): Promise<Report> {
  const range = resolveRange(q);

  const [categories, trend] = await Promise.all([
    categorySummary(userId, range),
    q.period === 'monthly' ? dailyTotals(userId, range) : monthlyTotals(userId, q.year),
  ]);

  let totalSpent = 0;
  let totalBudget = 0;
  let expenseCount = 0;
  for (const c of categories) {
    totalSpent += c.spent;
    totalBudget += c.budget;
    expenseCount += c.expenseCount;
  }

  return {
    period: q.period,
    label: range.label,
    from: range.from,
    to: range.to,
    totalSpent: round2(totalSpent),
    totalBudget: round2(totalBudget),
    expenseCount,
    categories,
    trend,
  };
}

export async function buildCsv(userId: number, q: ReportQuery): Promise<{ filename: string; csv: string }> {
  const range = resolveRange(q);

  const [expenses, categories] = await Promise.all([
    selectExpenses(userId)
      .whereBetween('e.spent_on', [range.from, range.to])
      .orderBy('e.spent_on')
      .orderBy('e.id'),
    categorySummary(userId, range),
  ]);

  const lines: string[] = [];
  const row = (...cells: (string | number)[]) => lines.push(cells.map(csvCell).join(','));

  row('Date', 'Category', 'Description', 'Amount');
  let total = 0;
  for (const e of expenses) {
    row(e.spentOn, e.categoryName, e.description, e.amount.toFixed(2));
    total += e.amount;
  }
  row('', '', 'Total', total.toFixed(2));

  lines.push('');
  row('Category', 'Spent', 'Budget', 'Remaining', 'Transactions');
  for (const c of categories) {
    row(c.name, c.spent.toFixed(2), c.budget.toFixed(2), (c.budget - c.spent).toFixed(2), c.expenseCount);
  }

  return {
    filename: `expenses-${q.period}-${range.label}.csv`,
    csv: '\uFEFF' + lines.join('\r\n'),
  };
}

function csvCell(value: string | number): string {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
