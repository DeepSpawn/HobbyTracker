import { z } from 'zod';

/**
 * Schema for a recipe step
 */
export const recipeStepSchema = z.object({
  paintId: z.string().min(1, 'Paint is required'),
  method: z
    .string()
    .max(200, 'Method must be 200 characters or less')
    .nullable()
    .optional(),
  notes: z
    .string()
    .max(500, 'Notes must be 500 characters or less')
    .nullable()
    .optional(),
});

/**
 * Schema for creating a new recipe
 */
export const createRecipeSchema = z.object({
  name: z
    .string()
    .min(1, 'Recipe name is required')
    .max(100, 'Recipe name must be 100 characters or less'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .nullable()
    .optional(),
});

/**
 * Schema for recipe form with steps validation
 * Note: Steps are managed separately in form state since they involve
 * drag-and-drop reordering, but we validate minimum count on submit
 */
export const recipeFormSchema = createRecipeSchema;

/**
 * Inferred types for form data
 */
export type RecipeStepFormData = z.infer<typeof recipeStepSchema>;
export type CreateRecipeFormData = z.infer<typeof createRecipeSchema>;
