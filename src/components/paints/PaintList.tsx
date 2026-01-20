import type { Paint } from '../../types/paint';
import { PaintCard } from './PaintCard';

interface PaintListProps {
  paints: Paint[];
  isOwned: (paintId: string) => boolean;
  isPending: (paintId: string) => boolean;
  onToggleOwnership: (paintId: string) => void;
  onPaintClick?: (paint: Paint) => void;
  emptyMessage?: string;
}

export function PaintList({
  paints,
  isOwned,
  isPending,
  onToggleOwnership,
  onPaintClick,
  emptyMessage = 'No paints found',
}: PaintListProps) {
  if (paints.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
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
