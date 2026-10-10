import { z } from 'zod';
import { money, monthString } from '../../lib/validation';

export const budgetSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  month: monthString,
  amount: money,
});

export const budgetUpdateSchema = z.object({ amount: money });

export const budgetQuerySchema = z.object({ month: monthString.optional() });

export const copyBudgetsSchema = z
  .object({ fromMonth: monthString, toMonth: monthString })
  .refine((v) => v.fromMonth !== v.toMonth, { message: 'Pick two different months', path: ['toMonth'] });

export type BudgetInput = z.infer<typeof budgetSchema>;
