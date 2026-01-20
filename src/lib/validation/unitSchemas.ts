import { z } from 'zod';

/**
 * Schema for creating/editing a unit
 */
export const createUnitSchema = z.object({
  name: z
    .string()
    .min(1, 'Unit name is required')
    .max(100, 'Unit name must be 100 characters or less'),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
  status: z.enum(['to_buy', 'owned', 'complete']),
  pointsCost: z
    .number()
    .int('Points must be a whole number')
    .min(0, 'Points cannot be negative'),
});

/**
 * Inferred type for form data
 */
export type CreateUnitFormData = z.infer<typeof createUnitSchema>;
