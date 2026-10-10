import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/knex';
import { currentUserId } from '../../middleware/auth';
import { currentMonth, monthRange } from '../../lib/dates';
import { monthString, parse } from '../../lib/validation';
import { selectExpenses } from '../expenses/expenses.service';
import { categorySummary, dailyTotals } from '../reports/reports.service';

const querySchema = z.object({ month: monthString.optional() });

function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export const dashboardRouter = Router().get('/', async (req, res) => {
  const userId = currentUserId(req);
  const { month = currentMonth() } = parse(querySchema, req.query);
  const range = monthRange(month);
  const prev = monthRange(previousMonth(month));

  const [categories, daily, recent, prevTotal] = await Promise.all([
    categorySummary(userId, range),
    dailyTotals(userId, range),
    selectExpenses(userId).orderBy('e.spent_on', 'desc').orderBy('e.id', 'desc').limit(5),
    db('expenses')
      .where('user_id', userId)
      .whereBetween('spent_on', [prev.from, prev.to])
      .first(db.raw('coalesce(sum(amount), 0) as total')),
  ]);

  const totalSpent = categories.reduce((sum, c) => sum + c.spent, 0);
  const totalBudget = categories.reduce((sum, c) => sum + c.budget, 0);

  res.json({
    month,
    totalSpent,
    totalBudget,
    remainingBudget: totalBudget - totalSpent,
    previousMonthSpent: prevTotal?.total ?? 0,
    overBudgetCount: categories.filter((c) => c.budget > 0 && c.spent > c.budget).length,
    categories,
    daily,
    recent,
  });
});
