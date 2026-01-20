import { Card, StatusBadge, getNextStatus } from '../ui';
import type { ProjectUnit, UnitStatus } from '../../types/project';

interface UnitListProps {
  units: ProjectUnit[];
  emptyMessage?: string;
  onUnitClick?: (unit: ProjectUnit) => void;
  onStatusChange?: (unitId: string, newStatus: UnitStatus) => void;
  selectionMode?: boolean;
  selectedUnitIds?: Set<string>;
  onSelectionChange?: (unitId: string, selected: boolean) => void;
}

export function UnitList({
  units,
  emptyMessage,
  onUnitClick,
  onStatusChange,
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
                <StatusBadge
                  status={unit.status}
                  onClick={
                    onStatusChange && !selectionMode
                      ? () => onStatusChange(unit.id, getNextStatus(unit.status))
                      : undefined
                  }
                />
              </div>
            </Card.Body>
          </Card>
        );
      })}
    </div>
  );
}
