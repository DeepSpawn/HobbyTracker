import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Card, ProgressBar, ConfirmationModal, Skeleton } from '../components/ui';
import {
  AddUnitForm,
  BulkActionToolbar,
  UnitList,
  UnitListSkeleton,
  EditUnitModal,
  RecipePickerModal,
} from '../components/projects';
import { useProjectDetail } from '../hooks/useProjectDetail';
import { useAuth } from '../hooks/useAuth';
import { useRecipes } from '../hooks/useRecipes';
import {
  updateProjectUnit,
  batchUpdateUnitStatus,
  deleteProjectUnit,
} from '../services/project';
import { getRecipeSteps } from '../services/recipe';
import { getPaintById } from '../services/paint';
import type { ProjectUnit, UnitStatus } from '../types/project';
import type { PaintSwatch } from '../components/projects/UnitRecipeDisplay';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { project, units, unitCounts, completionPercentage, isLoading, error } =
    useProjectDetail(id);
  const [showAddUnitForm, setShowAddUnitForm] = useState(false);

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(
    new Set()
  );
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  // Edit/Delete modal state
  const [editingUnit, setEditingUnit] = useState<ProjectUnit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<ProjectUnit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Recipe assignment state
  const [assigningRecipeUnit, setAssigningRecipeUnit] =
    useState<ProjectUnit | null>(null);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const { recipes } = useRecipes();
  const [recipeSwatches, setRecipeSwatches] = useState<
    Record<string, PaintSwatch[]>
  >({});

  // Track which recipe IDs we've already fetched to avoid redundant calls
  const fetchedRecipeIdsRef = useRef<Set<string>>(new Set());

  // Memoized fetch function to get swatches for a single recipe
  const fetchSwatchesForRecipe = useCallback(
    async (recipeId: string): Promise<PaintSwatch[]> => {
      if (!user) return [];
      try {
        const steps = await getRecipeSteps(user.uid, recipeId);
        const swatches: PaintSwatch[] = [];

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
        return swatches;
      } catch (err) {
        console.error(`Failed to fetch swatches for recipe ${recipeId}:`, err);
        return [];
      }
    },
    [user]
  );

  // Fetch swatches for recipes that are linked to units
  useEffect(() => {
    if (!user || recipes.length === 0) return;

    // Get unique recipe IDs that are linked to units
    const linkedRecipeIds = new Set(
      units.map((u) => u.recipeId).filter((rid): rid is string => rid !== null)
    );

    // Also include all recipes for the picker modal
    const allRecipeIds = new Set([
      ...linkedRecipeIds,
      ...recipes.map((r) => r.id),
    ]);

    // Filter to only recipes we haven't fetched yet
    const newRecipeIds = Array.from(allRecipeIds).filter(
      (rid) => !fetchedRecipeIdsRef.current.has(rid)
    );

    if (newRecipeIds.length === 0) return;

    const fetchSwatches = async () => {
      const swatchesMap: Record<string, PaintSwatch[]> = {};

      await Promise.all(
        newRecipeIds.map(async (recipeId) => {
          fetchedRecipeIdsRef.current.add(recipeId);
          swatchesMap[recipeId] = await fetchSwatchesForRecipe(recipeId);
        })
      );

      setRecipeSwatches((prev) => ({ ...prev, ...swatchesMap }));
    };

    fetchSwatches();
  }, [user, recipes, units, fetchSwatchesForRecipe]);

  // Build recipesData map for UnitList
  const recipesData = useMemo(() => {
    const data: Record<string, { name: string; swatches: PaintSwatch[] }> = {};
    for (const recipe of recipes) {
      data[recipe.id] = {
        name: recipe.name,
        swatches: recipeSwatches[recipe.id] || [],
      };
    }
    return data;
  }, [recipes, recipeSwatches]);

  // Individual status change handler (for clicking StatusBadge)
  const handleStatusChange = async (unitId: string, newStatus: UnitStatus) => {
    if (!user || !id) return;
    try {
      await updateProjectUnit(user.uid, id, unitId, { status: newStatus });
    } catch (err) {
      console.error('Failed to update unit status:', err);
    }
  };

  // Selection handlers
  const handleSelectionChange = (unitId: string, selected: boolean) => {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(unitId);
      } else {
        next.delete(unitId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedUnitIds(new Set(units.map((u) => u.id)));
  };

  const handleDeselectAll = () => {
    setSelectedUnitIds(new Set());
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedUnitIds(new Set());
  };

  const handleMarkAsOwned = async () => {
    if (!user || !id || selectedUnitIds.size === 0) return;

    setIsBatchUpdating(true);
    try {
      await batchUpdateUnitStatus(
        user.uid,
        id,
        Array.from(selectedUnitIds),
        'owned'
      );
      // Clear selection after successful update
      handleCancelSelection();
    } catch (err) {
      console.error('Failed to batch update units:', err);
    } finally {
      setIsBatchUpdating(false);
    }
  };

  // Edit/Delete handlers
  const handleEditUnit = (unit: ProjectUnit) => setEditingUnit(unit);
  const handleDeleteUnit = (unit: ProjectUnit) => setDeletingUnit(unit);
  const handleCloseEditModal = () => setEditingUnit(null);
  const handleCloseDeleteModal = () => setDeletingUnit(null);

  const handleConfirmDelete = async () => {
    if (!user || !id || !deletingUnit) return;

    setIsDeleting(true);
    try {
      await deleteProjectUnit(user.uid, id, deletingUnit.id);
      setDeletingUnit(null);
    } catch (err) {
      console.error('Failed to delete unit:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Recipe assignment handlers
  const handleAssignRecipe = (unit: ProjectUnit) => {
    setAssigningRecipeUnit(unit);
  };

  const handleRecipeSelected = async (recipeId: string | null) => {
    if (!user || !id || !assigningRecipeUnit) return;

    setIsSavingRecipe(true);
    try {
      await updateProjectUnit(user.uid, id, assigningRecipeUnit.id, {
        recipeId,
      });
      setAssigningRecipeUnit(null);
    } catch (err) {
      console.error('Failed to update unit recipe:', err);
    } finally {
      setIsSavingRecipe(false);
    }
  };

  // Loading state - show skeleton
  if (isLoading) {
    return (
      <>
        {/* Back navigation skeleton */}
        <div className="mb-4">
          <Skeleton height={16} width={120} rounded="sm" />
        </div>

        {/* Project Header Card skeleton */}
        <Card variant="elevated" className="mb-6">
          <Card.Body>
            <Skeleton height={28} width="40%" rounded="sm" />
            <div className="mt-2 flex gap-3">
              <Skeleton height={16} width={80} rounded="sm" />
              <Skeleton height={16} width={100} rounded="sm" />
              <Skeleton height={16} width={80} rounded="sm" />
            </div>
            <div className="mt-6">
              <div className="mb-2 flex justify-between">
                <Skeleton height={14} width={120} rounded="sm" />
                <Skeleton height={14} width={40} rounded="sm" />
              </div>
              <Skeleton height={8} width="100%" rounded="full" />
            </div>
          </Card.Body>
        </Card>

        {/* Units Section skeleton */}
        <div className="mb-4 flex items-center justify-between">
          <Skeleton height={22} width={60} rounded="sm" />
          <div className="flex gap-2">
            <Skeleton height={36} width={70} rounded="lg" />
            <Skeleton height={36} width={90} rounded="lg" />
          </div>
        </div>

        <UnitListSkeleton count={3} />
      </>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <Card variant="outlined" className="border-error/20 bg-error/10">
        <Card.Body>
          <p className="text-error">
            {error?.message || 'Project not found'}
          </p>
        </Card.Body>
        <Card.Footer>
          <Link to="/projects">
            <Button variant="outline">Back to Projects</Button>
          </Link>
        </Card.Footer>
      </Card>
    );
  }

  return (
    <>
      {/* Back navigation */}
        <div className="mb-4">
          <Link
            to="/projects"
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
            Back to Projects
          </Link>
        </div>

        {/* Project Header Card */}
        <Card variant="elevated" className="mb-6">
          <Card.Body>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {project.name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  {project.faction && <span>{project.faction}</span>}
                  {project.gameSystem && (
                    <>
                      {project.faction && (
                        <span className="text-gray-300">|</span>
                      )}
                      <span>{project.gameSystem}</span>
                    </>
                  )}
                  {project.targetPoints > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>{project.targetPoints} pts target</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Section */}
            <div className="mt-6">
              {unitCounts.total > 0 ? (
                <>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-gray-600">
                      {unitCounts.complete}/{unitCounts.total} units complete
                    </span>
                    <span className="font-semibold text-gray-900">
                      {completionPercentage}%
                    </span>
                  </div>
                  <ProgressBar
                    value={completionPercentage ?? 0}
                    size="md"
                    variant={
                      completionPercentage === 100 ? 'success' : 'default'
                    }
                  />
                </>
              ) : (
                <p className="text-sm text-gray-400">No units added yet</p>
              )}
            </div>
          </Card.Body>
        </Card>

        {/* Units Section */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Units</h3>
          <div className="flex items-center gap-2">
            {!selectionMode && units.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectionMode(true)}
              >
                Select
              </Button>
            )}
            {!showAddUnitForm && !selectionMode && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddUnitForm(true)}
              >
                Add Unit
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Action Toolbar - shown when in selection mode */}
        {selectionMode && (
          <div className="mb-4">
            <BulkActionToolbar
              selectedCount={selectedUnitIds.size}
              totalCount={units.length}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onMarkAsOwned={handleMarkAsOwned}
              onCancel={handleCancelSelection}
              isLoading={isBatchUpdating}
            />
          </div>
        )}

        {/* Add Unit Form */}
        {showAddUnitForm && (
          <div className="mb-4">
            <AddUnitForm
              projectId={project.id}
              onSuccess={() => setShowAddUnitForm(false)}
              onCancel={() => setShowAddUnitForm(false)}
            />
          </div>
        )}

        {/* Unit List */}
        <UnitList
          units={units}
          onAddUnit={() => setShowAddUnitForm(true)}
          onStatusChange={handleStatusChange}
          onEditUnit={handleEditUnit}
          onDeleteUnit={handleDeleteUnit}
          onAssignRecipe={handleAssignRecipe}
          recipesData={recipesData}
          selectionMode={selectionMode}
          selectedUnitIds={selectedUnitIds}
          onSelectionChange={handleSelectionChange}
        />

        {/* Edit Unit Modal */}
        <EditUnitModal
          isOpen={!!editingUnit}
          onClose={handleCloseEditModal}
          unit={editingUnit}
          projectId={id || ''}
        />

        {/* Delete Unit Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!deletingUnit}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          title="Delete Unit"
          message={
            <>
              Are you sure you want to delete{' '}
              <strong>{deletingUnit?.name}</strong>? This action cannot be
              undone.
            </>
          }
          confirmLabel="Delete"
          variant="danger"
          isLoading={isDeleting}
        />

      {/* Recipe Picker Modal */}
      <RecipePickerModal
        isOpen={!!assigningRecipeUnit}
        onClose={() => setAssigningRecipeUnit(null)}
        currentRecipeId={assigningRecipeUnit?.recipeId ?? null}
        onSelect={handleRecipeSelected}
        recipes={recipes}
        recipeSwatches={recipeSwatches}
        isSaving={isSavingRecipe}
      />
    </>
  );
}
