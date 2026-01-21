import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Card } from '../ui';
import { PaintSearchInput } from '../paint/PaintSearchInput';
import { RecipeStepList } from './RecipeStepList';
import { useAuth } from '../../hooks/useAuth';
import {
  updateRecipe,
  createRecipeStep,
  deleteRecipeStep,
  reorderRecipeSteps,
} from '../../services/recipe';
import {
  createRecipeSchema,
  type CreateRecipeFormData,
} from '../../lib/validation/recipeSchemas';
import type { LocalRecipeStep } from './SortableStepItem';
import type { Recipe, RecipeStepWithPaint } from '../../types/recipe';
import type { PaintAutocompleteSuggestion } from '../../types/paintSearch';

interface EditRecipeFormProps {
  recipe: Recipe;
  steps: RecipeStepWithPaint[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Form for editing an existing paint recipe
 */
export function EditRecipeForm({
  recipe,
  steps: initialSteps,
  onSuccess,
  onCancel,
}: EditRecipeFormProps) {
  const { user } = useAuth();

  // Convert RecipeStepWithPaint to LocalRecipeStep for the drag-and-drop list
  const [steps, setSteps] = useState<LocalRecipeStep[]>(() =>
    initialSteps.map((step) => ({
      localId: step.id, // Use actual ID as localId for existing steps
      paintId: step.paintId,
      paintName: step.paint?.name || 'Unknown',
      paintBrand: step.paint?.brand || '',
      paintProductLine: step.paint?.productLine || '',
      paintHexColor: step.paint?.hexColor || '#ccc',
      method: step.method,
      notes: step.notes,
    }))
  );

  // Track original step IDs to detect deletions
  const [originalStepIds] = useState(() => new Set(initialSteps.map((s) => s.id)));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepsError, setStepsError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateRecipeFormData>({
    resolver: zodResolver(createRecipeSchema),
    defaultValues: {
      name: recipe.name,
      description: recipe.description || '',
    },
  });

  // Reset form when recipe changes
  useEffect(() => {
    reset({
      name: recipe.name,
      description: recipe.description || '',
    });
  }, [recipe, reset]);

  const handlePaintSelect = (paint: PaintAutocompleteSuggestion) => {
    setStepsError(null);

    const newStep: LocalRecipeStep = {
      localId: crypto.randomUUID(), // New steps get random IDs
      paintId: paint.id,
      paintName: paint.name,
      paintBrand: paint.brand,
      paintProductLine: paint.productLine,
      paintHexColor: paint.hexColor,
      method: null,
      notes: null,
    };
    setSteps((prev) => [...prev, newStep]);
  };

  const handleReorder = (reorderedSteps: LocalRecipeStep[]) => {
    setSteps(reorderedSteps);
  };

  const handleRemoveStep = (localId: string) => {
    setSteps((prev) => prev.filter((s) => s.localId !== localId));
  };

  const onSubmit = async (data: CreateRecipeFormData) => {
    if (!user) return;

    if (steps.length === 0) {
      setStepsError('At least one paint step is required');
      return;
    }

    setSubmitError(null);
    setStepsError(null);
    setIsSubmitting(true);

    try {
      // 1. Update recipe metadata
      await updateRecipe(user.uid, recipe.id, {
        name: data.name,
        description: data.description || null,
      });

      // 2. Find steps to delete (original steps no longer in the list)
      const currentStepIds = new Set(
        steps.filter((s) => originalStepIds.has(s.localId)).map((s) => s.localId)
      );
      const stepsToDelete = [...originalStepIds].filter(
        (id) => !currentStepIds.has(id)
      );

      // Delete removed steps
      for (const stepId of stepsToDelete) {
        await deleteRecipeStep(user.uid, recipe.id, stepId);
      }

      // 3. Find new steps (steps with random UUIDs, not in original)
      const newSteps = steps.filter((s) => !originalStepIds.has(s.localId));

      // Create new steps with correct stepOrder
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (newSteps.includes(step)) {
          await createRecipeStep(user.uid, recipe.id, {
            stepOrder: i,
            paintId: step.paintId,
            method: step.method,
            notes: step.notes,
          });
        }
      }

      // 4. Reorder existing steps
      const existingStepIds = steps
        .filter((s) => originalStepIds.has(s.localId))
        .map((s) => s.localId);

      if (existingStepIds.length > 0) {
        await reorderRecipeSteps(user.uid, recipe.id, existingStepIds);
      }

      onSuccess?.();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to update recipe'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card variant="outlined">
      <Card.Header title="Edit Recipe" />
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card.Body>
          {submitError && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-error"
            >
              {submitError}
            </div>
          )}

          <div className="space-y-6">
            {/* Recipe name */}
            <Input
              {...register('name')}
              label="Recipe Name"
              placeholder="e.g., Ultramarine Blue Armor"
              error={errors.name?.message}
              fullWidth
              required
            />

            {/* Description (optional) */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                {...register('description')}
                placeholder="Optional notes about this recipe..."
                rows={2}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-base placeholder:text-gray-400 transition-colors duration-fast focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {errors.description && (
                <p className="mt-1.5 text-sm text-error">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Paint search */}
            <div>
              <PaintSearchInput
                label="Add Paints"
                placeholder="Search paints to add..."
                onSelect={handlePaintSelect}
              />
            </div>

            {/* Steps list */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Recipe Steps{' '}
                {steps.length > 0 && (
                  <span className="font-normal text-gray-500">
                    ({steps.length} {steps.length === 1 ? 'step' : 'steps'})
                  </span>
                )}
              </label>
              <RecipeStepList
                steps={steps}
                onReorder={handleReorder}
                onRemove={handleRemoveStep}
              />
              {stepsError && (
                <p className="mt-2 text-sm text-error">{stepsError}</p>
              )}
            </div>
          </div>
        </Card.Body>

        <Card.Footer align="right">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </Card.Footer>
      </form>
    </Card>
  );
}
