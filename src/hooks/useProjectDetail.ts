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
  const [error, setError] = useState<Error | null>(null);

  // Track loading state for both data sources to prevent flash of error
  const [projectLoaded, setProjectLoaded] = useState(false);
  const [unitsLoaded, setUnitsLoaded] = useState(false);

  // Reset loading flags when projectId changes
  useEffect(() => {
    setProjectLoaded(false);
    setUnitsLoaded(false);
    setProject(null);
    setUnits([]);
    setError(null);
  }, [projectId]);

  // Fetch project data
  useEffect(() => {
    if (!isAuthenticated || !user || !projectId) {
      setProject(null);
      setProjectLoaded(true);
      return;
    }

    getProject(user.uid, projectId)
      .then((proj) => {
        setProject(proj);
        if (!proj) {
          setError(new Error('Project not found'));
        }
        setProjectLoaded(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load project'));
        setProjectLoaded(true);
      });
  }, [user, isAuthenticated, projectId]);

  // Subscribe to units (real-time)
  useEffect(() => {
    if (!isAuthenticated || !user || !projectId) {
      setUnits([]);
      setUnitsLoaded(true);
      return;
    }

    const unsubscribe = subscribeToProjectUnits(user.uid, projectId, (unitList) => {
      setUnits(unitList);
      setUnitsLoaded(true);
    });

    return () => unsubscribe();
  }, [user, isAuthenticated, projectId]);

  // Only mark as loaded when BOTH project and units have loaded
  const isLoading = !projectLoaded || !unitsLoaded;

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
