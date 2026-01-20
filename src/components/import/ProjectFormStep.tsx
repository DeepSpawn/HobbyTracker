import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../ui';
import {
  createProjectSchema,
  type CreateProjectFormData,
} from '../../lib/validation/projectSchemas';
import type { NewRecruitParseResult } from '../../types/newRecruit';

export interface ProjectFormStepProps {
  parseResult: NewRecruitParseResult;
  ownedCount: number;
  toBuyCount: number;
  onSubmit: (data: CreateProjectFormData) => void;
  isSubmitting: boolean;
  error: string | null;
}

export function ProjectFormStep({
  parseResult,
  ownedCount,
  toBuyCount,
  onSubmit,
  isSubmitting,
  error,
}: ProjectFormStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: parseResult.listName,
      faction: parseResult.faction,
      gameSystem: parseResult.gameSystem,
      targetPoints: parseResult.totalPoints,
    },
  });

  // Reset form when parseResult changes
  useEffect(() => {
    reset({
      name: parseResult.listName,
      faction: parseResult.faction,
      gameSystem: parseResult.gameSystem,
      targetPoints: parseResult.totalPoints,
    });
  }, [parseResult, reset]);

  const totalUnits = ownedCount + toBuyCount;

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="project-form" className="space-y-4">
      {/* Summary */}
      <div className="rounded-lg bg-primary-50 px-4 py-3">
        <p className="text-sm text-primary-800">
          Will create project with{' '}
          <span className="font-semibold">{totalUnits} units</span>
          {' ('}
          <span className="text-success">{ownedCount} owned</span>
          {', '}
          <span className="text-warning">{toBuyCount} to buy</span>
          {')'}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div role="alert" className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        <Input
          label="Project Name"
          {...register('name')}
          error={errors.name?.message}
          disabled={isSubmitting}
          fullWidth
        />

        <Input
          label="Faction"
          {...register('faction')}
          error={errors.faction?.message}
          disabled={isSubmitting}
          fullWidth
        />

        <Input
          label="Game System"
          {...register('gameSystem')}
          error={errors.gameSystem?.message}
          disabled={isSubmitting}
          fullWidth
        />

        <Input
          label="Target Points"
          type="number"
          {...register('targetPoints', { valueAsNumber: true })}
          error={errors.targetPoints?.message}
          disabled={isSubmitting}
          fullWidth
        />
      </div>
    </form>
  );
}

ProjectFormStep.displayName = 'ProjectFormStep';
