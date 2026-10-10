import { z } from 'zod';
import { monthString } from '../../lib/validation';

export const reportQuerySchema = z.discriminatedUnion('period', [
  z.object({ period: z.literal('monthly'), month: monthString }),
  z.object({ period: z.literal('yearly'), year: z.coerce.number().int().min(2000).max(2100) }),
]);

export type ReportQuery = z.infer<typeof reportQuerySchema>;
