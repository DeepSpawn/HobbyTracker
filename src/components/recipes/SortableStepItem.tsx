import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../ui';

export interface LocalRecipeStep {
  localId: string;
  paintId: string;
  paintName: string;
  paintBrand: string;
  paintProductLine: string;
  paintHexColor: string;
  method: string | null;
  notes: string | null;
}

interface SortableStepItemProps {
  step: LocalRecipeStep;
  onRemove: (localId: string) => void;
}

/**
 * Format brand name for display
 */
function formatBrand(brand: string): string {
  const brandMap: Record<string, string> = {
    citadel: 'Citadel',
    vallejo: 'Vallejo',
    army_painter: 'Army Painter',
  };
  return brandMap[brand] || brand;
}

/**
 * Individual draggable step item for the recipe step list
 */
export function SortableStepItem({ step, onRemove }: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.localId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-white p-3 ${
        isDragging
          ? 'border-primary-300 shadow-lg ring-2 ring-primary-200'
          : 'border-gray-200'
      }`}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="flex cursor-grab touch-none items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="5" r="1" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="5" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      </button>

      {/* Color swatch */}
      <span
        className="h-8 w-8 flex-shrink-0 rounded border border-gray-200"
        style={{ backgroundColor: step.paintHexColor }}
        aria-hidden="true"
      />

      {/* Paint info */}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-gray-900">
          {step.paintName}
        </div>
        <div className="truncate text-sm text-gray-500">
          {step.paintProductLine}
        </div>
      </div>

      {/* Brand badge */}
      <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        {formatBrand(step.paintBrand)}
      </span>

      {/* Remove button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onRemove(step.localId)}
        aria-label={`Remove ${step.paintName}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </Button>
    </div>
  );
}
