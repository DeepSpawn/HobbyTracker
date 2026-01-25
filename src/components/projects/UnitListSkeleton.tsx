import { Card, Skeleton } from '../ui';

function UnitCardSkeleton() {
  return (
    <Card variant="outlined">
      <Card.Body>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            {/* Unit name */}
            <Skeleton height={18} width="50%" rounded="sm" />

            {/* Quantity and points */}
            <Skeleton height={14} width={100} rounded="sm" className="mt-1" />

            {/* Recipe link placeholder */}
            <Skeleton height={12} width={80} rounded="sm" className="mt-1" />
          </div>

          <div className="flex items-center gap-2">
            {/* Action buttons placeholder */}
            <div className="flex gap-1">
              <Skeleton height={28} width={28} rounded="lg" />
              <Skeleton height={28} width={28} rounded="lg" />
            </div>

            {/* Status badge */}
            <Skeleton height={24} width={70} rounded="full" />
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

interface UnitListSkeletonProps {
  count?: number;
}

export function UnitListSkeleton({ count = 3 }: UnitListSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <UnitCardSkeleton key={i} />
      ))}
    </div>
  );
}
