import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { getRecipe, subscribeToRecipeSteps } from '../services/recipe';
import { getPaintById } from '../services/paint';
import type { Recipe, RecipeStep, RecipeStepWithPaint } from '../types/recipe';

interface UseRecipeDetailReturn {
  recipe: Recipe | null;
  steps: RecipeStepWithPaint[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch a recipe and its steps with paint details
 */
export function useRecipeDetail(recipeId: string | undefined): UseRecipeDetailReturn {
  const { user, isAuthenticated } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [steps, setSteps] = useState<RecipeStepWithPaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch recipe data
  useEffect(() => {
    if (!isAuthenticated || !user || !recipeId) {
      setRecipe(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    getRecipe(user.uid, recipeId)
      .then((rec) => {
        setRecipe(rec);
        if (!rec) {
          setError(new Error('Recipe not found'));
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load recipe'));
      });
  }, [user, isAuthenticated, recipeId]);

  // Subscribe to steps (real-time) and fetch paint details
  useEffect(() => {
    if (!isAuthenticated || !user || !recipeId) {
      setSteps([]);
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToRecipeSteps(
      user.uid,
      recipeId,
      async (stepList: RecipeStep[]) => {
        // Fetch paint details for each step
        const stepsWithPaints = await Promise.all(
          stepList.map(async (step) => {
            const paint = await getPaintById(step.paintId);
            return {
              ...step,
              paint: paint
                ? {
                    id: paint.id,
                    name: paint.name,
                    brand: paint.brand,
                    productLine: paint.productLine,
                    hexColor: paint.hexColor,
                  }
                : null,
            } as RecipeStepWithPaint;
          })
        );
        setSteps(stepsWithPaints);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isAuthenticated, recipeId]);

  return {
    recipe,
    steps,
    isLoading,
    error,
  };
}
