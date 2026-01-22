import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { AppHeader } from '../components/layout';
import { PaintShoppingListCard } from '../components/shopping';
import { useAuth } from '../hooks/useAuth';
import { useShoppingList } from '../hooks/useShoppingList';
import { usePaintShoppingList } from '../hooks/usePaintShoppingList';

type TabType = 'models' | 'paints';

export function ShoppingListPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('models');

  // Models shopping list
  const {
    data: modelsData,
    isLoading: modelsLoading,
    error: modelsError,
    markAsOwned: markUnitAsOwned,
  } = useShoppingList();
  const [loadingUnitId, setLoadingUnitId] = useState<string | null>(null);

  // Paints shopping list
  const {
    data: paintsData,
    isLoading: paintsLoading,
    error: paintsError,
    markAsOwned: markPaintAsOwned,
    isPending: isPaintPending,
  } = usePaintShoppingList();

  const handleMarkUnitAsOwned = async (projectId: string, unitId: string) => {
    setLoadingUnitId(unitId);
    try {
      await markUnitAsOwned(projectId, unitId);
    } finally {
      setLoadingUnitId(null);
    }
  };

  const isLoading = activeTab === 'models' ? modelsLoading : paintsLoading;
  const error = activeTab === 'models' ? modelsError : paintsError;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader user={user} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <PageHeader activeTab={activeTab} setActiveTab={setActiveTab} />
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
        <AppHeader user={user} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <PageHeader activeTab={activeTab} setActiveTab={setActiveTab} />
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
      <AppHeader user={user} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === 'models' ? (
          <ModelsTabContent
            data={modelsData}
            loadingUnitId={loadingUnitId}
            onMarkAsOwned={handleMarkUnitAsOwned}
          />
        ) : (
          <PaintsTabContent
            data={paintsData}
            isPending={isPaintPending}
            onMarkAsOwned={markPaintAsOwned}
          />
        )}
      </main>
    </div>
  );
}

// Page header with tabs
function PageHeader({
  activeTab,
  setActiveTab,
}: {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-gray-900">Shopping List</h2>
      <p className="mt-1 text-sm text-gray-500">
        Track what you need to buy for your projects
      </p>

      {/* Tab navigation */}
      <div className="mt-4 flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('models')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'models'
              ? 'border-b-2 border-primary-500 text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Models
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('paints')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'paints'
              ? 'border-b-2 border-primary-500 text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Paints
        </button>
      </div>
    </div>
  );
}

// Models tab content (existing functionality)
function ModelsTabContent({
  data,
  loadingUnitId,
  onMarkAsOwned,
}: {
  data: ReturnType<typeof useShoppingList>['data'];
  loadingUnitId: string | null;
  onMarkAsOwned: (projectId: string, unitId: string) => Promise<void>;
}) {
  // Summary
  const summaryText =
    data && data.totals.totalUnits > 0
      ? `${data.totals.totalUnits} units to buy across ${data.totals.projectCount} project${data.totals.projectCount !== 1 ? 's' : ''} (${data.totals.totalPoints} pts total)`
      : null;

  // Empty state
  if (!data || data.projectGroups.length === 0) {
    return (
      <>
        {summaryText && (
          <p className="mb-4 text-sm text-gray-500">{summaryText}</p>
        )}
        <Card variant="outlined" padding="lg">
          <p className="text-center text-gray-500">
            No models to buy. Add units with "To Buy" status to your projects to
            see them here!
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      {summaryText && (
        <p className="mb-4 text-sm text-gray-500">{summaryText}</p>
      )}
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
                  {group.totalUnits} unit{group.totalUnits !== 1 ? 's' : ''} to
                  buy
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
                      <h4 className="font-medium text-gray-900">{unit.name}</h4>
                      <p className="text-sm text-gray-500">
                        Qty: {unit.quantity}
                        {unit.pointsCost > 0 && ` | ${unit.pointsCost} pts`}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={loadingUnitId === unit.id}
                      onClick={() => onMarkAsOwned(group.project.id, unit.id)}
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
    </>
  );
}

// Paints tab content (new functionality)
function PaintsTabContent({
  data,
  isPending,
  onMarkAsOwned,
}: {
  data: ReturnType<typeof usePaintShoppingList>['data'];
  isPending: (paintId: string) => boolean;
  onMarkAsOwned: (paintId: string) => Promise<void>;
}) {
  // Summary
  const summaryText =
    data && data.totals.totalPaints > 0
      ? `${data.totals.totalPaints} paint${data.totals.totalPaints !== 1 ? 's' : ''} needed by ${data.totals.totalUnits} unit${data.totals.totalUnits !== 1 ? 's' : ''}`
      : null;

  // Empty state
  if (!data || data.items.length === 0) {
    return (
      <>
        {summaryText && (
          <p className="mb-4 text-sm text-gray-500">{summaryText}</p>
        )}
        <Card variant="outlined" padding="lg">
          <p className="text-center text-gray-500">
            No paints to buy. Assign recipes to your units to see which paints
            you need!
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      {summaryText && (
        <p className="mb-4 text-sm text-gray-500">{summaryText}</p>
      )}
      <div className="space-y-3">
        {data.items.map((item) => (
          <PaintShoppingListCard
            key={item.paint.id}
            item={item}
            isPending={isPending(item.paint.id)}
            onMarkAsOwned={() => onMarkAsOwned(item.paint.id)}
          />
        ))}
      </div>
    </>
  );
}

