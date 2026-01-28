import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Card } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { createProjectUnit } from '../../services/project';
import {
  createUnitSchema,
  type CreateUnitFormData,
} from '../../lib/validation/unitSchemas';

interface AddUnitFormProps {
  projectId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddUnitForm({ projectId, onSuccess, onCancel }: AddUnitFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateUnitFormData>({
    resolver: zodResolver(createUnitSchema),
    defaultValues: {
      name: '',
      quantity: 1,
      status: 'to_buy',
      pointsCost: 0,
    },
  });

  const onSubmit = async (data: CreateUnitFormData) => {
    if (!user) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await createProjectUnit(user.uid, projectId, {
        name: data.name,
        quantity: data.quantity,
        status: data.status,
        pointsCost: data.pointsCost,
        recipeId: null,
      });

      reset();
      onSuccess?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add unit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card variant="outlined">
      <Card.Header title="Add Unit" />
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

          <div className="space-y-4">
            <Input
              {...register('name')}
              label="Unit Name"
              placeholder="e.g., Intercessor Squad"
              error={errors.name?.message}
              fullWidth
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                {...register('quantity', { valueAsNumber: true })}
                type="number"
                label="Quantity"
                min={1}
                error={errors.quantity?.message}
                fullWidth
                required
              />

              <Input
                {...register('pointsCost', { valueAsNumber: true })}
                type="number"
                label="Points"
                min={0}
                error={errors.pointsCost?.message}
                fullWidth
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Status <span className="text-error">*</span>
              </label>
              <select
                {...register('status')}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-base transition-colors duration-fast focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="to_buy">To Buy</option>
                <option value="owned">Owned</option>
                <option value="assembled">Assembled</option>
                <option value="primed">Primed</option>
                <option value="painted">Painted</option>
                <option value="based">Based</option>
              </select>
              {errors.status && (
                <p className="mt-1.5 text-sm text-error">{errors.status.message}</p>
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
            Add Unit
          </Button>
        </Card.Footer>
      </form>
    </Card>
  );
}
