import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PaintShoppingListItem } from '../../types/paintShoppingList';
import { Button } from '../ui';

interface PaintShoppingListCardProps {
  item: PaintShoppingListItem;
  isPending: boolean;
  onMarkAsOwned: () => void;
}

/**
 * Format brand name from snake_case to Title Case
 */
function formatBrand(brand: string): string {
  return brand
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function PaintShoppingListCard({
  item,
  isPending,
  onMarkAsOwned,
}: PaintShoppingListCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { paint, neededByUnits } = item;

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-3 ${isPending ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* Color swatch */}
        <div
          className="h-10 w-10 shrink-0 rounded-md border border-gray-200 shadow-sm"
          style={{ backgroundColor: paint.hexColor }}
          aria-hidden="true"
        />

        {/* Paint info */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900">{paint.name}</p>
          <p className="truncate text-sm text-gray-500">
            {formatBrand(paint.brand)} - {paint.productLine}
          </p>
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="shrink-0 rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={isExpanded ? 'Collapse units' : 'Expand units'}
          aria-expanded={isExpanded}
        >
          <svg
            className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Mark as owned button */}
        <Button
          variant="primary"
          size="sm"
          isLoading={isPending}
          onClick={onMarkAsOwned}
        >
          Mark as Owned
        </Button>
      </div>

      {/* Expandable unit list */}
      {isExpanded && neededByUnits.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Needed by {neededByUnits.length} unit
            {neededByUnits.length !== 1 ? 's' : ''}:
          </p>
          <ul className="space-y-1 text-sm text-gray-600">
            {neededByUnits.map(({ unit, project }) => (
              <li key={`${project.id}:${unit.id}`}>
                <Link
                  to={`/projects/${project.id}`}
                  className="text-primary-600 hover:text-primary-700 hover:underline"
                >
                  {unit.name}
                </Link>
                <span className="text-gray-400"> in </span>
                <Link
                  to={`/projects/${project.id}`}
                  className="text-primary-600 hover:text-primary-700 hover:underline"
                >
                  {project.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
