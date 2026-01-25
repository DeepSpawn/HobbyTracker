import { Card, Skeleton } from '../ui';

interface ProjectCardSkeletonProps {
  className?: string;
}

function ProjectCardSkeleton({ className = '' }: ProjectCardSkeletonProps) {
  return (
    <Card variant="elevated" className={className}>
      <Card.Body>
        {/* Title */}
        <Skeleton height={24} width="70%" rounded="sm" />

        {/* Faction */}
        <Skeleton height={16} width="40%" rounded="sm" className="mt-2" />

        {/* Game system / points */}
        <div className="mt-2 flex gap-3">
          <Skeleton height={14} width={80} rounded="sm" />
          <Skeleton height={14} width={60} rounded="sm" />
        </div>

        {/* Progress section */}
        <div className="mt-4">
          <div className="mb-1 flex justify-between">
            <Skeleton height={12} width={100} rounded="sm" />
            <Skeleton height={12} width={30} rounded="sm" />
          </div>
          <Skeleton height={8} width="100%" rounded="full" />
        </div>

        {/* Created date */}
        <Skeleton height={12} width={120} rounded="sm" className="mt-3" />
      </Card.Body>
    </Card>
  );
}

interface ProjectListSkeletonProps {
  count?: number;
}

export function ProjectListSkeleton({ count = 3 }: ProjectListSkeletonProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}
