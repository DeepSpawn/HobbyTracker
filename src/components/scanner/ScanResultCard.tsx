import type { Paint } from '../../types/paint';
import { Button } from '../ui/Button';

interface ScanResultCardProps {
  paint: Paint | null;
  barcode: string | null;
  isOwned: boolean;
  isPending: boolean;
  onAddToInventory: () => void;
  onDismiss: () => void;
}

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
      clipRule="evenodd"
    />
  </svg>
);

const formatPaintType = (paintType: string): string => {
  return paintType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatBrand = (brand: string): string => {
  const brandMap: Record<string, string> = {
    citadel: 'Citadel',
    vallejo: 'Vallejo',
    army_painter: 'Army Painter',
  };
  return brandMap[brand] || brand;
};

export function ScanResultCard({
  paint,
  barcode,
  isOwned,
  isPending,
  onAddToInventory,
  onDismiss,
}: ScanResultCardProps) {
  if (!barcode) {
    return null;
  }

  if (!paint) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4 mx-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">Paint Not Found</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Barcode: {barcode}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              This barcode is not in our database yet.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 mx-4 mb-4">
      <div className="flex items-start gap-3">
        {/* Color swatch */}
        <div
          className="w-12 h-12 rounded-lg shrink-0 border border-gray-200"
          style={{ backgroundColor: paint.hexColor }}
          aria-label={`Paint color: ${paint.hexColor}`}
        />

        {/* Paint info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{paint.name}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatBrand(paint.brand)} - {paint.productLine}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatPaintType(paint.paintType)}
            {paint.sku && ` - ${paint.sku}`}
          </p>
        </div>

        {/* Action */}
        {isOwned ? (
          <div className="flex items-center gap-2 text-sm text-amber-600 shrink-0">
            <CheckIcon />
            <span className="hidden sm:inline">In Collection</span>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<PlusIcon />}
            onClick={onAddToInventory}
            isLoading={isPending}
            disabled={isPending}
          >
            Add
          </Button>
        )}
      </div>

      {/* Dismiss button for continuous mode */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Scan Another
        </Button>
      </div>
    </div>
  );
}
