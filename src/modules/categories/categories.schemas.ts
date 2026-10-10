import { z } from 'zod';

const fields = {
  name: z.string().trim().min(1, 'Name is required').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #22c55e'),
};

export const categorySchema = z.object({
  name: fields.name,
  color: fields.color.default('#64748b'),
});

export const categoryUpdateSchema = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export type CategoryInput = z.infer<typeof categorySchema>;
