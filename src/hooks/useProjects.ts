import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscribeToProjects } from '../services/project';
import type { Project } from '../types/project';

interface UseProjectsReturn {
  projects: Project[];
  isLoading: boolean;
  error: Error | null;
}

export function useProjects(): UseProjectsReturn {
  const { user, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
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

    const unsubscribe = subscribeToProjects(user.uid, (projectList) => {
      setProjects(projectList);
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
