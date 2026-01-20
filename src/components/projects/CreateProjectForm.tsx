import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { createProject } from '../../services/project';
import {
  createProjectSchema,
  type CreateProjectFormData,
} from '../../lib/validation/projectSchemas';

interface CreateProjectFormProps {
  onSuccess?: (projectId: string) => void;
  onCancel?: () => void;
}

export function CreateProjectForm({ onSuccess, onCancel }: CreateProjectFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      faction: '',
      gameSystem: '',
      targetPoints: 0,
    },
  });

  const onSubmit = async (data: CreateProjectFormData) => {
    if (!user) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const projectId = await createProject(user.uid, {
        name: data.name,
        faction: data.faction,
        gameSystem: data.gameSystem,
        targetPoints: data.targetPoints,
      });

      if (onSuccess) {
        onSuccess(projectId);
      } else {
        navigate(`/projects/${projectId}`);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to create project'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card variant="elevated">
      <Card.Header title="Create New Project" />
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
              label="Project Name"
              placeholder="e.g., Space Marines 2000pts"
              error={errors.name?.message}
              fullWidth
              required
            />

            <Input
              {...register('faction')}
              label="Faction"
              placeholder="e.g., Ultramarines, Orks, Necrons"
              helperText="The army faction for this project"
              error={errors.faction?.message}
              fullWidth
            />

            <Input
              {...register('gameSystem')}
              label="Game System"
              placeholder="e.g., Warhammer 40K, Age of Sigmar"
              helperText="The game system or ruleset"
              error={errors.gameSystem?.message}
              fullWidth
            />

            <Input
              {...register('targetPoints', { valueAsNumber: true })}
              type="number"
              label="Target Points"
              placeholder="e.g., 2000"
              helperText="Optional target points for the army list"
              error={errors.targetPoints?.message}
              min={0}
              fullWidth
            />
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
            Create Project
          </Button>
        </Card.Footer>
      </form>
    </Card>
  );
}
