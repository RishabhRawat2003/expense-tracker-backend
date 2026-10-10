import { z } from 'zod';
import { isoDate, money } from '../../lib/validation';

export const expenseSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  amount: money,
  description: z.string().trim().max(255).default(''),
  spentOn: isoDate,
});

export const expenseUpdateSchema = z
  .object({
    categoryId: z.coerce.number().int().positive(),
    amount: money,
    description: z.string().trim().max(255),
    spentOn: isoDate,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const expenseQuerySchema = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    minAmount: z.coerce.number().nonnegative().optional(),
    maxAmount: z.coerce.number().nonnegative().optional(),
    search: z.string().trim().max(100).optional(),
    sortBy: z.enum(['date', 'amount']).default('date'),
    order: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: '"from" must be before "to"', path: ['from'] })
  .refine((q) => q.minAmount === undefined || q.maxAmount === undefined || q.minAmount <= q.maxAmount, {
    message: 'minAmount must not exceed maxAmount',
    path: ['minAmount'],
  });

export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ExpenseUpdate = z.infer<typeof expenseUpdateSchema>;
export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;
