import { RecipeCard } from './RecipeCard';
import { EmptyState } from '../ui';
import type { Recipe } from '../../types/recipe';

interface PaintSwatch {
  id: string;
  name: string;
  hexColor: string;
}

interface RecipeListProps {
  recipes: Recipe[];
  recipeSwatches?: Record<string, PaintSwatch[]>;
  onCreateRecipe?: () => void;
}

/**
 * List component for displaying recipe cards
 */
export function RecipeList({
  recipes,
  recipeSwatches = {},
  onCreateRecipe,
}: RecipeListProps) {
  if (recipes.length === 0) {
    return (
      <EmptyState
        icon="recipes"
        title="No recipes yet"
        description="Create recipes to define paint schemes for your miniatures"
        action={
          onCreateRecipe
            ? { label: 'Create Recipe', onClick: onCreateRecipe }
            : undefined
        }
      />
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
