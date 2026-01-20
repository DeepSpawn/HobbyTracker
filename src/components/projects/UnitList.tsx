import { Card, StatusBadge, getNextStatus } from '../ui';
import type { ProjectUnit, UnitStatus } from '../../types/project';

interface UnitListProps {
  units: ProjectUnit[];
  emptyMessage?: string;
  onUnitClick?: (unit: ProjectUnit) => void;
  onStatusChange?: (unitId: string, newStatus: UnitStatus) => void;
}

export function UnitList({ units, emptyMessage, onUnitClick, onStatusChange }: UnitListProps) {
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
      {units.map((unit) => (
        <Card
          key={unit.id}
          variant="outlined"
          isInteractive={!!onUnitClick}
          onClick={onUnitClick ? () => onUnitClick(unit) : undefined}
        >
          <Card.Body>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{unit.name}</h4>
                <p className="text-sm text-gray-500">
                  Qty: {unit.quantity}
                  {unit.pointsCost > 0 && ` • ${unit.pointsCost} pts`}
                </p>
              </div>
              <StatusBadge
                status={unit.status}
                onClick={
                  onStatusChange
                    ? () => onStatusChange(unit.id, getNextStatus(unit.status))
                    : undefined
                }
              />
            </div>
          </Card.Body>
        </Card>
      ))}
    </div>
  );
}
