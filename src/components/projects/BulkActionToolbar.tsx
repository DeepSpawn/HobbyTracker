import { Button } from '../ui';

interface BulkActionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onMarkAsOwned: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onMarkAsOwned,
  onCancel,
  isLoading = false,
}: BulkActionToolbarProps) {
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">
          {selectedCount} of {totalCount} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={allSelected ? onDeselectAll : onSelectAll}
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onMarkAsOwned}
          disabled={selectedCount === 0 || isLoading}
          isLoading={isLoading}
        >
          Mark as Owned
        </Button>
      </div>
    </div>
  );
}
