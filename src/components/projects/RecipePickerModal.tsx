import { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Input } from '../ui';
import type { Recipe } from '../../types/recipe';
import type { PaintSwatch } from './UnitRecipeDisplay';

interface RecipePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRecipeId: string | null;
  onSelect: (recipeId: string | null) => void;
  recipes: Recipe[];
  recipeSwatches: Record<string, PaintSwatch[]>;
  isLoading?: boolean;
  isSaving?: boolean;
}

export function RecipePickerModal({
  isOpen,
  onClose,
  currentRecipeId,
  onSelect,
  recipes,
  recipeSwatches,
  isLoading = false,
  isSaving = false,
}: RecipePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(
    currentRecipeId
  );

  // Reset selection when modal opens with new currentRecipeId
  // This is intentional - we want to sync local state with props when opening
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      setSelectedRecipeId(currentRecipeId);
      setSearchQuery('');
    }
  }, [isOpen, currentRecipeId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Filter recipes by search query
  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;
    const query = searchQuery.toLowerCase();
    return recipes.filter((recipe) =>
      recipe.name.toLowerCase().includes(query)
    );
  }, [recipes, searchQuery]);

  const handleConfirm = () => {
    onSelect(selectedRecipeId);
  };

  const handleClear = () => {
    setSelectedRecipeId(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Recipe"
      size="md"
      closeOnBackdropClick={!isSaving}
      closeOnEsc={!isSaving}
      showCloseButton={!isSaving}
      footer={
        <div className="flex w-full items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleClear}
            disabled={isSaving || selectedRecipeId === null}
          >
            Clear Selection
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              isLoading={isSaving}
              disabled={selectedRecipeId === currentRecipeId}
            >
              Confirm
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search Input */}
        <Input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          aria-label="Search recipes"
        />

        {/* Recipe List */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-primary-600" />
              <p className="mt-2 text-sm text-gray-500">Loading recipes...</p>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">
                {recipes.length === 0
                  ? 'No recipes yet. Create a recipe first!'
                  : 'No recipes match your search.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredRecipes.map((recipe) => {
                const swatches = recipeSwatches[recipe.id] || [];
                const isSelected = selectedRecipeId === recipe.id;

                return (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => setSelectedRecipeId(recipe.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">
                          {recipe.name}
                        </p>
                        {recipe.description && (
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {recipe.description}
                          </p>
                        )}
                      </div>
                      {swatches.length > 0 && (
                        <div className="ml-3 flex shrink-0 items-center gap-0.5">
                          {swatches.slice(0, 5).map((swatch) => (
                            <span
                              key={swatch.id}
                              className="h-5 w-5 rounded-full border border-gray-200"
                              style={{ backgroundColor: swatch.hexColor }}
                              title={swatch.name}
                            />
                          ))}
                          {swatches.length > 5 && (
                            <span className="ml-1 text-xs text-gray-400">
                              +{swatches.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
