import { memo } from 'react';
import type { Paint } from '../../types/paint';

interface PaintCardProps {
  paint: Paint;
  isOwned: boolean;
  isPending: boolean;
  onToggleOwnership: () => void;
}

function PaintCardComponent({
  paint,
  isOwned,
  isPending,
  onToggleOwnership,
}: PaintCardProps) {
  const formatBrand = (brand: string) => {
    return brand
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div
      className={`
        relative flex items-center gap-3 rounded-lg border p-3
        transition-all duration-150
        ${
          isOwned
            ? 'border-amber-400 bg-amber-50'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }
        ${isPending ? 'opacity-70' : ''}
      `}
    >
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

      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggleOwnership}
        disabled={isPending}
        className={`
          shrink-0 rounded-full p-2 transition-colors duration-150
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
          ${
            isOwned
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
          }
          disabled:cursor-not-allowed disabled:opacity-50
        `}
        aria-label={
          isOwned
            ? `Remove ${paint.name} from collection`
            : `Add ${paint.name} to collection`
        }
        aria-pressed={isOwned}
      >
        {isOwned ? (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

export const PaintCard = memo(PaintCardComponent);
