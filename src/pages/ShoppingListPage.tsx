import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useShoppingList } from '../hooks/useShoppingList';

export function ShoppingListPage() {
  const { user } = useAuth();
  const { data, isLoading, error, markAsOwned } = useShoppingList();
  const [loadingUnitId, setLoadingUnitId] = useState<string | null>(null);

  const handleMarkAsOwned = async (projectId: string, unitId: string) => {
    setLoadingUnitId(unitId);
    try {
      await markAsOwned(projectId, unitId);
    } finally {
      setLoadingUnitId(null);
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
            <p className="mt-2 text-gray-500">Loading shopping list...</p>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Card variant="outlined" className="border-error/20 bg-error/10">
            <Card.Body>
              <p className="text-error">
                Error loading shopping list: {error.message}
              </p>
            </Card.Body>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page header with totals */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Shopping List</h2>
          <p className="mt-1 text-sm text-gray-500">
            {data?.totals.totalUnits ?? 0} units to buy
            {(data?.totals.totalPoints ?? 0) > 0 &&
              ` across ${data?.totals.projectCount ?? 0} project${(data?.totals.projectCount ?? 0) !== 1 ? 's' : ''}`}
            {(data?.totals.totalPoints ?? 0) > 0 &&
              ` (${data?.totals.totalPoints} pts total)`}
          </p>
        </div>

        {/* Empty state */}
        {!data || data.projectGroups.length === 0 ? (
          <Card variant="outlined" padding="lg">
            <p className="text-center text-gray-500">
              No models to buy. Add units with "To Buy" status to your projects
              to see them here!
            </p>
          </Card>
        ) : (
          // Project groups
          <div className="space-y-6">
            {data.projectGroups.map((group) => (
              <Card key={group.project.id} variant="elevated">
                <Card.Body>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      <Link
                        to={`/projects/${group.project.id}`}
                        className="hover:text-primary-600 hover:underline"
                      >
                        {group.project.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {group.totalUnits} unit{group.totalUnits !== 1 ? 's' : ''}{' '}
                      to buy
                      {group.totalPoints > 0 && ` (${group.totalPoints} pts)`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {group.units.map((unit) => (
                      <div
                        key={unit.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {unit.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Qty: {unit.quantity}
                            {unit.pointsCost > 0 && ` | ${unit.pointsCost} pts`}
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={loadingUnitId === unit.id}
                          onClick={() =>
                            handleMarkAsOwned(group.project.id, unit.id)
                          }
                        >
                          Mark as Owned
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Header component
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
