import { z } from 'zod';

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}

export const idParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const isoDate = z.iso.date();

export const monthString = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected YYYY-MM');

export const money = z.coerce
  .number()
  .positive()
  .max(9_999_999_999.99)
  .transform((n) => Math.round(n * 100) / 100);
