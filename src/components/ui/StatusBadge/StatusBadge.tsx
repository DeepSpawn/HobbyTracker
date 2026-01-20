import { Badge } from '../Badge';
import type { UnitStatus } from '../../../types/project';

export interface StatusBadgeProps {
  status: UnitStatus;
  onClick?: () => void;
  disabled?: boolean;
}

const statusLabels: Record<UnitStatus, string> = {
  to_buy: 'To Buy',
  owned: 'Owned',
  complete: 'Complete',
};

const nextStatus: Record<UnitStatus, UnitStatus> = {
  to_buy: 'owned',
  owned: 'complete',
  complete: 'to_buy',
};

export function getNextStatus(current: UnitStatus): UnitStatus {
  return nextStatus[current];
}

export function StatusBadge({ status, onClick, disabled = false }: StatusBadgeProps) {
  const isClickable = onClick && !disabled;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking badge
    if (isClickable) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };

  return (
    <Badge
      variant={status}
      size="md"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Status: ${statusLabels[status]}. Click to change.` : undefined}
      className={
        isClickable
          ? 'cursor-pointer transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1'
          : ''
      }
    >
      {statusLabels[status]}
    </Badge>
  );
}
