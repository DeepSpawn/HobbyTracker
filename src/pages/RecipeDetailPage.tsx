import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { AppHeader } from '../components/layout';
import {
  RecipeStepDisplay,
  EditRecipeForm,
  DeleteRecipeModal,
} from '../components/recipes';
import { useAuth } from '../hooks/useAuth';
import { useRecipeDetail } from '../hooks/useRecipeDetail';
import { deleteRecipe } from '../services/recipe';

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { recipe, steps, isLoading, error } = useRecipeDetail(id);

  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user || !recipe) return;

    setIsDeleting(true);
    try {
      await deleteRecipe(user.uid, recipe.id);
      navigate('/recipes');
    } catch (err) {
      console.error('Failed to delete recipe:', err);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader user={user} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
            <p className="mt-2 text-gray-500">Loading recipe...</p>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader user={user} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Card variant="outlined" className="border-error/20 bg-error/10">
            <Card.Body>
              <p className="text-error">{error?.message || 'Recipe not found'}</p>
            </Card.Body>
            <Card.Footer>
              <Link to="/recipes">
                <Button variant="outline">Back to Recipes</Button>
              </Link>
            </Card.Footer>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <div className="mb-4">
          <Link
            to="/recipes"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <svg
              className="mr-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Recipes
          </Link>
        </div>

        {/* Edit Form Mode */}
        {showEditForm ? (
          <EditRecipeForm
            recipe={recipe}
            steps={steps}
            onSuccess={() => setShowEditForm(false)}
            onCancel={() => setShowEditForm(false)}
          />
        ) : (
          <>
            {/* Recipe Header Card */}
            <Card variant="elevated" className="mb-6">
              <Card.Body>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{recipe.name}</h2>
                    {recipe.description && (
                      <p className="mt-2 text-gray-600">{recipe.description}</p>
                    )}
                    <p className="mt-2 text-sm text-gray-400">
                      Created {recipe.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditForm(true)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteModal(true)}
                      className="text-error hover:bg-error/10"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Steps Section */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Steps{' '}
                <span className="font-normal text-gray-500">
                  ({steps.length} {steps.length === 1 ? 'step' : 'steps'})
                </span>
              </h3>
            </div>

            {steps.length === 0 ? (
              <Card variant="outlined">
                <Card.Body>
                  <p className="text-center text-gray-500">
                    No steps in this recipe yet.
                  </p>
                </Card.Body>
              </Card>
            ) : (
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <RecipeStepDisplay
                    key={step.id}
                    step={step}
                    stepNumber={index + 1}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteRecipeModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          recipeName={recipe.name}
          isDeleting={isDeleting}
        />
      </main>
    </div>
  );
}
