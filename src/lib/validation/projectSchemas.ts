import { z } from 'zod';

/**
 * Schema for creating a new project
 */
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be 100 characters or less'),
  faction: z.string().max(100, 'Faction must be 100 characters or less'),
  gameSystem: z.string().max(100, 'Game system must be 100 characters or less'),
  targetPoints: z.number().int().min(0, 'Target points must be a positive number'),
});

/**
 * Inferred type for form data
 */
export type CreateProjectFormData = z.infer<typeof createProjectSchema>;
