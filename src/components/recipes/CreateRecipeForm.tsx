import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Card } from '../ui';
import { PaintSearchInput } from '../paint/PaintSearchInput';
import { RecipeStepList } from './RecipeStepList';
import { useAuth } from '../../hooks/useAuth';
import { saveRecipeWithSteps } from '../../services/recipe';
import {
  createRecipeSchema,
  type CreateRecipeFormData,
} from '../../lib/validation/recipeSchemas';
import type { LocalRecipeStep } from './SortableStepItem';
import type { PaintAutocompleteSuggestion } from '../../types/paintSearch';

interface CreateRecipeFormProps {
  onSuccess?: (recipeId: string) => void;
  onCancel?: () => void;
}

/**
 * Form for creating a new paint recipe with drag-and-drop step ordering
 */
export function CreateRecipeForm({ onSuccess, onCancel }: CreateRecipeFormProps) {
  const { user } = useAuth();
  const [steps, setSteps] = useState<LocalRecipeStep[]>([]);
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
      name: '',
      description: '',
    },
  });

  const handlePaintSelect = (paint: PaintAutocompleteSuggestion) => {
    // Clear steps error when user adds a step
    setStepsError(null);

    const newStep: LocalRecipeStep = {
      localId: crypto.randomUUID(),
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

    // Validate at least one step
    if (steps.length === 0) {
      setStepsError('At least one paint step is required');
      return;
    }

    setSubmitError(null);
    setStepsError(null);
    setIsSubmitting(true);

    try {
      const recipeId = await saveRecipeWithSteps(
        user.uid,
        {
          name: data.name,
          description: data.description || null,
        },
        steps.map((step) => ({
          paintId: step.paintId,
          method: step.method,
          notes: step.notes,
        }))
      );

      reset();
      setSteps([]);
      onSuccess?.(recipeId);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to save recipe'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card variant="outlined">
      <Card.Header title="Create Recipe" />
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
            Save Recipe
          </Button>
        </Card.Footer>
      </form>
    </Card>
  );
}
