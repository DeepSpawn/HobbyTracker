import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { AppHeader } from '../components/layout';
import { CreateRecipeForm, RecipeList } from '../components/recipes';
import { useAuth } from '../hooks/useAuth';
import { useRecipes } from '../hooks/useRecipes';
import { getRecipeSteps } from '../services/recipe';
import { getPaintById } from '../services/paint';

interface PaintSwatch {
  id: string;
  name: string;
  hexColor: string;
}

export function RecipesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { recipes, isLoading, error } = useRecipes();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [recipeSwatches, setRecipeSwatches] = useState<Record<string, PaintSwatch[]>>({});

  // Fetch swatches for each recipe
  useEffect(() => {
    if (!user || recipes.length === 0) return;

    const fetchSwatches = async () => {
      const swatchesMap: Record<string, PaintSwatch[]> = {};

      await Promise.all(
        recipes.map(async (recipe) => {
          try {
            const steps = await getRecipeSteps(user.uid, recipe.id);
            const swatches: PaintSwatch[] = [];

            // Fetch paint details for first 5 steps
            for (const step of steps.slice(0, 5)) {
              const paint = await getPaintById(step.paintId);
              if (paint) {
                swatches.push({
                  id: paint.id,
                  name: paint.name,
                  hexColor: paint.hexColor,
                });
              }
            }

            swatchesMap[recipe.id] = swatches;
          } catch (err) {
            console.error(`Failed to fetch swatches for recipe ${recipe.id}:`, err);
          }
        })
      );

      setRecipeSwatches(swatchesMap);
    };

    fetchSwatches();
  }, [user, recipes]);

  const handleRecipeCreated = (recipeId: string) => {
    navigate(`/recipes/${recipeId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} />

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page header with action */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Recipes</h2>
            <p className="mt-1 text-sm text-gray-500">
              {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
            </p>
          </div>
          {!showCreateForm && (
            <Button variant="primary" onClick={() => setShowCreateForm(true)}>
              New Recipe
            </Button>
          )}
        </div>

        {/* Error state */}
        {error && (
          <Card variant="outlined" className="mb-6 border-error/20 bg-error/10">
            <Card.Body>
              <p className="text-error">Error loading recipes: {error.message}</p>
            </Card.Body>
          </Card>
        )}

        {/* Create form (conditionally shown) */}
        {showCreateForm && (
          <div className="mb-6">
            <CreateRecipeForm
              onSuccess={handleRecipeCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
            <p className="mt-2 text-gray-500">Loading recipes...</p>
          </div>
        ) : (
          <RecipeList
            recipes={recipes}
            recipeSwatches={recipeSwatches}
            emptyMessage="No recipes yet. Create your first recipe to get started!"
          />
        )}
      </main>
    </div>
  );
}
