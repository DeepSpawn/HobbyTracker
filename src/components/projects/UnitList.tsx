import { Card, StatusBadge, getNextStatus } from '../ui';
import type { ProjectUnit, UnitStatus } from '../../types/project';

interface UnitListProps {
  units: ProjectUnit[];
  emptyMessage?: string;
  onUnitClick?: (unit: ProjectUnit) => void;
  onStatusChange?: (unitId: string, newStatus: UnitStatus) => void;
  onEditUnit?: (unit: ProjectUnit) => void;
  onDeleteUnit?: (unit: ProjectUnit) => void;
  selectionMode?: boolean;
  selectedUnitIds?: Set<string>;
  onSelectionChange?: (unitId: string, selected: boolean) => void;
}

export function UnitList({
  units,
  emptyMessage,
  onUnitClick,
  onStatusChange,
  onEditUnit,
  onDeleteUnit,
  selectionMode = false,
  selectedUnitIds = new Set(),
  onSelectionChange,
}: UnitListProps) {
  if (units.length === 0) {
    return (
      <Card variant="outlined" padding="lg">
        <p className="text-center text-gray-500">
          {emptyMessage || 'No units yet. Add your first unit!'}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {units.map((unit) => {
        const isSelected = selectedUnitIds.has(unit.id);

        return (
          <Card
            key={unit.id}
            variant="outlined"
            isInteractive={!!onUnitClick && !selectionMode}
            onClick={onUnitClick && !selectionMode ? () => onUnitClick(unit) : undefined}
            className={isSelected ? 'ring-2 ring-primary-500 ring-offset-1' : ''}
          >
            <Card.Body>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectionMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => onSelectionChange?.(unit.id, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      aria-label={`Select ${unit.name}`}
                    />
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">{unit.name}</h4>
                    <p className="text-sm text-gray-500">
                      Qty: {unit.quantity}
                      {unit.pointsCost > 0 && ` • ${unit.pointsCost} pts`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!selectionMode && (onEditUnit || onDeleteUnit) && (
                    <div className="flex items-center gap-1">
                      {onEditUnit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditUnit(unit);
                          }}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                          aria-label={`Edit ${unit.name}`}
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                      )}
                      {onDeleteUnit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteUnit(unit);
                          }}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                          aria-label={`Delete ${unit.name}`}
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                  <StatusBadge
                    status={unit.status}
                    onClick={
                      onStatusChange && !selectionMode
                        ? () => onStatusChange(unit.id, getNextStatus(unit.status))
                        : undefined
                    }
                  />
                </div>
              </div>
            </Card.Body>
          </Card>
        );
      })}
    </div>
  );
}
