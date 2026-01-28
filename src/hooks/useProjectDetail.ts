import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { getProject, subscribeToProjectUnits } from '../services/project';
import type { Project, ProjectUnit } from '../types/project';
import type { ProjectUnitCounts } from '../services/project';

interface UseProjectDetailReturn {
  project: Project | null;
  units: ProjectUnit[];
  unitCounts: ProjectUnitCounts;
  completionPercentage: number | null;
  isLoading: boolean;
  error: Error | null;
}

export function useProjectDetail(projectId: string | undefined): UseProjectDetailReturn {
  const { user, isAuthenticated } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [units, setUnits] = useState<ProjectUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch project data
  useEffect(() => {
    if (!isAuthenticated || !user || !projectId) {
      setProject(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    getProject(user.uid, projectId)
      .then((proj) => {
        setProject(proj);
        if (!proj) {
          setError(new Error('Project not found'));
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load project'));
      });
  }, [user, isAuthenticated, projectId]);

  // Subscribe to units (real-time)
  useEffect(() => {
    if (!isAuthenticated || !user || !projectId) {
      setUnits([]);
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToProjectUnits(user.uid, projectId, (unitList) => {
      setUnits(unitList);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAuthenticated, projectId]);

  // Calculate unit counts and completion percentage from units
  // 'based' is the final status in the 6-step workflow
  const unitCounts: ProjectUnitCounts = {
    total: units.reduce((sum, unit) => sum + unit.quantity, 0),
    complete: units
      .filter((unit) => unit.status === 'based')
      .reduce((sum, unit) => sum + unit.quantity, 0),
  };

  const completionPercentage =
    unitCounts.total > 0
      ? Math.round((unitCounts.complete / unitCounts.total) * 100)
      : null;

  return {
    project,
    units,
    unitCounts,
    completionPercentage,
    isLoading,
    error,
  };
}
