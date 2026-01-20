import { Card, Badge } from '../ui';
import type { ProjectUnit, UnitStatus } from '../../types/project';

interface UnitListProps {
  units: ProjectUnit[];
  emptyMessage?: string;
  onUnitClick?: (unit: ProjectUnit) => void;
}

const statusLabels: Record<UnitStatus, string> = {
  to_buy: 'To Buy',
  owned: 'Owned',
  complete: 'Complete',
};

export function UnitList({ units, emptyMessage, onUnitClick }: UnitListProps) {
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
              <Badge variant={unit.status} size="md">
                {statusLabels[unit.status]}
              </Badge>
            </div>
          </Card.Body>
        </Card>
      ))}
    </div>
  );
}
