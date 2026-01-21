import { RecipeCard } from './RecipeCard';
import type { Recipe } from '../../types/recipe';

interface PaintSwatch {
  id: string;
  name: string;
  hexColor: string;
}

interface RecipeListProps {
  recipes: Recipe[];
  recipeSwatches?: Record<string, PaintSwatch[]>;
  emptyMessage?: string;
}

/**
 * List component for displaying recipe cards
 */
export function RecipeList({
  recipes,
  recipeSwatches = {},
  emptyMessage = 'No recipes yet.',
}: RecipeListProps) {
  if (recipes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          swatches={recipeSwatches[recipe.id]}
        />
      ))}
    </div>
  );
}
