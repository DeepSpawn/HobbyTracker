import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CollapsibleSection } from '../components/ui';
import { AppHeader } from '../components/layout';
import { PaintShoppingListCard } from '../components/shopping';
import { useAuth } from '../hooks/useAuth';
import { useShoppingList } from '../hooks/useShoppingList';
import { usePaintShoppingList } from '../hooks/usePaintShoppingList';
import type { ShoppingListData } from '../services/project';
import type { PaintShoppingListData } from '../types/paintShoppingList';

/**
 * Format brand name from snake_case to Title Case
 */
function formatBrand(brand: string): string {
  return brand
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format the shopping list data as plain text for sharing
 */
function formatShoppingListText(
  modelsData: ShoppingListData | null,
  paintsData: PaintShoppingListData | null
): string {
  const lines: string[] = [];

  lines.push('SHOPPING LIST');
  lines.push('');

  // Models section
  const totalModels = modelsData?.totals.totalUnits ?? 0;
  lines.push(`MODELS NEEDED (${totalModels})`);
  lines.push('────────────────────');

  if (modelsData && modelsData.projectGroups.length > 0) {
    for (const group of modelsData.projectGroups) {
      lines.push('');
      lines.push(`${group.project.name}:`);
      for (const unit of group.units) {
        const pointsStr = unit.pointsCost > 0 ? ` - ${unit.pointsCost} pts` : '';
        lines.push(`  • ${unit.name} (x${unit.quantity})${pointsStr}`);
      }
    }
  } else {
    lines.push('');
    lines.push('  No models to buy');
  }

  lines.push('');
  lines.push('');

  // Paints section
  const totalPaintsCount = paintsData?.totals.totalPaints ?? 0;
  lines.push(`PAINTS NEEDED (${totalPaintsCount})`);
  lines.push('────────────────────');

  if (paintsData && paintsData.items.length > 0) {
    lines.push('');
    for (const item of paintsData.items) {
      const brand = formatBrand(item.paint.brand);
      lines.push(`  • ${item.paint.name} (${brand} - ${item.paint.productLine})`);
    }
  } else {
    lines.push('');
    lines.push('  No paints to buy');
  }

  return lines.join('\n');
}

export function ShoppingListPage() {
  const { user } = useAuth();
  const [isCopied, setIsCopied] = useState(false);

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

  const handleCopyToClipboard = useCallback(async () => {
    const text = formatShoppingListText(modelsData, paintsData);
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [modelsData, paintsData]);

  const isLoading = modelsLoading || paintsLoading;
  const error = modelsError || paintsError;

  // Calculate totals for header
  const totalModels = modelsData?.totals.totalUnits ?? 0;
  const totalPaints = paintsData?.totals.totalPaints ?? 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader user={user} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <PageHeader
            totalModels={0}
            totalPaints={0}
            isLoading
            onCopy={handleCopyToClipboard}
            isCopied={isCopied}
          />
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
          <PageHeader
            totalModels={0}
            totalPaints={0}
            onCopy={handleCopyToClipboard}
            isCopied={isCopied}
          />
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
        <PageHeader
          totalModels={totalModels}
          totalPaints={totalPaints}
          onCopy={handleCopyToClipboard}
          isCopied={isCopied}
        />

        <div className="space-y-6">
          {/* Models Needed Section */}
          <CollapsibleSection
            title="Models Needed"
            count={totalModels}
            defaultExpanded={true}
          >
            <ModelsContent
              data={modelsData}
              loadingUnitId={loadingUnitId}
              onMarkAsOwned={handleMarkUnitAsOwned}
            />
          </CollapsibleSection>

          {/* Paints Needed Section */}
          <CollapsibleSection
            title="Paints Needed"
            count={totalPaints}
            defaultExpanded={true}
          >
            <PaintsContent
              data={paintsData}
              isPending={isPaintPending}
              onMarkAsOwned={markPaintAsOwned}
            />
          </CollapsibleSection>
        </div>
      </main>
    </div>
  );
}

// Page header with totals and copy button
function PageHeader({
  totalModels,
  totalPaints,
  isLoading = false,
  onCopy,
  isCopied,
}: {
  totalModels: number;
  totalPaints: number;
  isLoading?: boolean;
  onCopy: () => void;
  isCopied: boolean;
}) {
  const hasItems = totalModels > 0 || totalPaints > 0;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shopping List</h2>
          {!isLoading && hasItems && (
            <p className="mt-1 text-sm text-gray-500">
              {totalModels} model{totalModels !== 1 ? 's' : ''}, {totalPaints} paint
              {totalPaints !== 1 ? 's' : ''} needed
            </p>
          )}
          {!isLoading && !hasItems && (
            <p className="mt-1 text-sm text-gray-500">
              Track what you need to buy for your projects
            </p>
          )}
        </div>
        {!isLoading && hasItems && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCopy}
            className="flex items-center gap-2"
          >
            {isCopied ? (
              <>
                <svg
                  className="h-4 w-4 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy to Clipboard
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Models section content
function ModelsContent({
  data,
  loadingUnitId,
  onMarkAsOwned,
}: {
  data: ReturnType<typeof useShoppingList>['data'];
  loadingUnitId: string | null;
  onMarkAsOwned: (projectId: string, unitId: string) => Promise<void>;
}) {
  // Empty state
  if (!data || data.projectGroups.length === 0) {
    return (
      <p className="text-center text-gray-500">
        No models to buy. Add units with "To Buy" status to your projects to see
        them here!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {data.projectGroups.map((group) => (
        <div key={group.project.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <div className="mb-3">
            <h4 className="font-semibold text-gray-900">
              <Link
                to={`/projects/${group.project.id}`}
                className="hover:text-primary-600 hover:underline"
              >
                {group.project.name}
              </Link>
            </h4>
            <p className="text-sm text-gray-500">
              {group.totalUnits} unit{group.totalUnits !== 1 ? 's' : ''} to buy
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
                  <p className="font-medium text-gray-900">{unit.name}</p>
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
        </div>
      ))}
    </div>
  );
}

// Paints section content
function PaintsContent({
  data,
  isPending,
  onMarkAsOwned,
}: {
  data: ReturnType<typeof usePaintShoppingList>['data'];
  isPending: (paintId: string) => boolean;
  onMarkAsOwned: (paintId: string) => Promise<void>;
}) {
  // Empty state
  if (!data || data.items.length === 0) {
    return (
      <p className="text-center text-gray-500">
        No paints to buy. Assign recipes to your units to see which paints you
        need!
      </p>
    );
  }

  return (
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
  );
}
