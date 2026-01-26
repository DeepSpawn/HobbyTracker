import { Card, Skeleton } from '../ui';

function RecipeCardSkeleton() {
  return (
    <Card variant="outlined">
      <Card.Body>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Recipe name */}
            <Skeleton height={20} width="60%" rounded="sm" />

            {/* Description */}
            <Skeleton height={14} width="90%" rounded="sm" className="mt-2" />
            <Skeleton height={14} width="70%" rounded="sm" className="mt-1" />

            {/* Date */}
            <Skeleton height={12} width={80} rounded="sm" className="mt-2" />
          </div>

          {/* Color swatches */}
          <div className="flex flex-shrink-0 items-center gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={24} width={24} rounded="full" />
            ))}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

interface RecipeListSkeletonProps {
  count?: number;
}

export function RecipeListSkeleton({ count = 3 }: RecipeListSkeletonProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  );
}
