import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Button, Input } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { updateProjectUnit } from '../../services/project';
import type { ProjectUnit } from '../../types/project';

const editUnitSchema = z.object({
  name: z
    .string()
    .min(1, 'Unit name is required')
    .max(100, 'Unit name must be 100 characters or less'),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
  pointsCost: z
    .number()
    .int('Points must be a whole number')
    .min(0, 'Points cannot be negative'),
});

type EditUnitFormData = z.infer<typeof editUnitSchema>;

interface EditUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: ProjectUnit | null;
  projectId: string;
}

export function EditUnitModal({
  isOpen,
  onClose,
  unit,
  projectId,
}: EditUnitModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditUnitFormData>({
    resolver: zodResolver(editUnitSchema),
    defaultValues: {
      name: '',
      quantity: 1,
      pointsCost: 0,
    },
  });

  // Reset form when unit changes
  useEffect(() => {
    if (unit) {
      reset({
        name: unit.name,
        quantity: unit.quantity,
        pointsCost: unit.pointsCost,
      });
    }
  }, [unit, reset]);

  // Clear error when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSubmitError(null);
    }
  }, [isOpen]);

  const onSubmit = async (data: EditUnitFormData) => {
    if (!user || !unit) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await updateProjectUnit(user.uid, projectId, unit.id, {
        name: data.name,
        quantity: data.quantity,
        pointsCost: data.pointsCost,
      });

      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update unit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Unit"
      size="sm"
      closeOnBackdropClick={!isSubmitting}
      closeOnEsc={!isSubmitting}
      showCloseButton={!isSubmitting}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
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
        </div>
      </form>
    </Modal>
  );
}
