import { Skeleton } from '../ui';

function PaintCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
      {/* Color swatch */}
      <Skeleton height={40} width={40} rounded="md" className="shrink-0" />

      {/* Paint info */}
      <div className="min-w-0 flex-1">
        <Skeleton height={18} width="70%" rounded="sm" />
        <Skeleton height={14} width="50%" rounded="sm" className="mt-1" />
      </div>

      {/* Toggle button placeholder */}
      <Skeleton height={36} width={36} rounded="full" className="shrink-0" />
    </div>
  );
}

interface PaintListSkeletonProps {
  count?: number;
}

export function PaintListSkeleton({ count = 6 }: PaintListSkeletonProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <PaintCardSkeleton key={i} />
      ))}
    </div>
  );
}
