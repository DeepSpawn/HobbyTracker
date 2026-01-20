import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Card, ProgressBar } from '../components/ui';
import { AddUnitForm, BulkActionToolbar, UnitList } from '../components/projects';
import { useAuth } from '../hooks/useAuth';
import { useProjectDetail } from '../hooks/useProjectDetail';
import { updateProjectUnit, batchUpdateUnitStatus } from '../services/project';
import type { UnitStatus } from '../types/project';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { project, units, unitCounts, completionPercentage, isLoading, error } =
    useProjectDetail(id);
  const [showAddUnitForm, setShowAddUnitForm] = useState(false);

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
            <p className="mt-2 text-gray-500">Loading project...</p>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Card variant="outlined" className="border-error/20 bg-error/10">
            <Card.Body>
              <p className="text-error">{error?.message || 'Project not found'}</p>
            </Card.Body>
            <Card.Footer>
              <Link to="/projects">
                <Button variant="outline">Back to Projects</Button>
              </Link>
            </Card.Footer>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
                <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  {project.faction && <span>{project.faction}</span>}
                  {project.gameSystem && (
                    <>
                      {project.faction && <span className="text-gray-300">|</span>}
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
                    variant={completionPercentage === 100 ? 'success' : 'default'}
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
              <Button variant="primary" size="sm" onClick={() => setShowAddUnitForm(true)}>
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
          emptyMessage="No units yet. Add your first unit to get started!"
          onStatusChange={handleStatusChange}
          selectionMode={selectionMode}
          selectedUnitIds={selectedUnitIds}
          onSelectionChange={handleSelectionChange}
        />
      </main>
    </div>
  );
}

// Header component extracted for reuse in loading/error states
function Header({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <h1 className="text-xl font-bold text-gray-900">HobbyTracker</h1>
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              Home
            </Button>
          </Link>
          <Link to="/projects">
            <Button variant="ghost" size="sm">
              Projects
            </Button>
          </Link>
          <Link to="/profile">
            <Button variant="ghost" size="sm">
              {user?.displayName || user?.email || 'Profile'}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
