import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscribeToRecipes } from '../services/recipe';
import type { Recipe } from '../types/recipe';

interface UseRecipesReturn {
  recipes: Recipe[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to subscribe to user's recipes (real-time updates)
 */
export function useRecipes(): UseRecipesReturn {
  const { user, isAuthenticated } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setRecipes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToRecipes(user.uid, (recipeList) => {
      setRecipes(recipeList);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAuthenticated]);

  return {
    recipes,
    isLoading,
    error,
  };
}
