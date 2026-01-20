import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscribeToProjects, getProjectUnitCounts } from '../services/project';
import type { Project } from '../types/project';
import type { ProjectUnitCounts } from '../services/project';

export interface ProjectWithCompletion extends Project {
  unitCounts: ProjectUnitCounts | null;
  completionPercentage: number | null;
}

interface UseProjectsWithCompletionReturn {
  projects: ProjectWithCompletion[];
  isLoading: boolean;
  error: Error | null;
}

export function useProjectsWithCompletion(): UseProjectsWithCompletionReturn {
  const { user, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<ProjectWithCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToProjects(user.uid, async (projectList) => {
      // Fetch unit counts for each project in parallel
      const projectsWithCounts = await Promise.all(
        projectList.map(async (project) => {
          try {
            const unitCounts = await getProjectUnitCounts(user.uid, project.id);
            const completionPercentage =
              unitCounts.total > 0
                ? Math.round((unitCounts.complete / unitCounts.total) * 100)
                : null;

            return {
              ...project,
              unitCounts,
              completionPercentage,
            };
          } catch {
            return {
              ...project,
              unitCounts: null,
              completionPercentage: null,
            };
          }
        })
      );

      setProjects(projectsWithCounts);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAuthenticated]);

  return {
    projects,
    isLoading,
    error,
  };
}
