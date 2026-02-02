import type { Paint } from '../../types/paint';
import { PaintCard } from './PaintCard';
import { EmptyState } from '../ui';

interface PaintListEmptyStateProps {
  variant: 'search' | 'collection';
  onScanPaint?: () => void;
}

interface PaintListProps {
  paints: Paint[];
  isOwned: (paintId: string) => boolean;
  isPending: (paintId: string) => boolean;
  onToggleOwnership: (paintId: string) => void;
  onPaintClick?: (paint: Paint) => void;
  emptyState?: PaintListEmptyStateProps;
}

export function PaintList({
  paints,
  isOwned,
  isPending,
  onToggleOwnership,
  onPaintClick,
  emptyState,
}: PaintListProps) {
  if (paints.length === 0) {
    if (emptyState?.variant === 'collection') {
      return (
        <EmptyState
          icon="paints"
          title="No paints in collection"
          description="Add paints to your collection by browsing or scanning"
          action={
            emptyState.onScanPaint
              ? { label: 'Scan Paint', onClick: emptyState.onScanPaint }
              : undefined
          }
        />
      );
    }
    return (
      <EmptyState
        icon="paints"
        title="No paints found"
        description="Try adjusting your search or filters"
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {paints.map((paint) => (
        <PaintCard
          key={paint.id}
          paint={paint}
          isOwned={isOwned(paint.id)}
          isPending={isPending(paint.id)}
          onToggleOwnership={() => onToggleOwnership(paint.id)}
          onClick={onPaintClick ? () => onPaintClick(paint) : undefined}
        />
      ))}
    </div>
  );
}
