import { useCallback } from 'react';
import { Button } from '../ui';
import type { NewRecruitParseResult } from '../../types/newRecruit';

export interface UnitReviewStepProps {
  parseResult: NewRecruitParseResult;
  ownedUnitIndices: Set<number>;
  onToggleOwned: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function UnitReviewStep({
  parseResult,
  ownedUnitIndices,
  onToggleOwned,
  onSelectAll,
  onDeselectAll,
}: UnitReviewStepProps) {
  const { units, totalPoints } = parseResult;
  const ownedCount = ownedUnitIndices.size;
  const toBuyCount = units.length - ownedCount;

  const handleCheckboxChange = useCallback(
    (index: number) => {
      onToggleOwned(index);
    },
    [onToggleOwned]
  );

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{units.length}</span> units
          <span className="mx-2 text-gray-300">•</span>
          <span className="font-semibold text-gray-900">{totalPoints}</span> pts total
        </div>
        <div className="text-sm text-gray-600">
          <span className="text-success">{ownedCount} owned</span>
          <span className="mx-2 text-gray-300">•</span>
          <span className="text-warning">{toBuyCount} to buy</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onSelectAll}>
          Select All
        </Button>
        <Button variant="ghost" size="sm" onClick={onDeselectAll}>
          Deselect All
        </Button>
      </div>

      {/* Instructions */}
      <p className="text-sm text-gray-500">
        Check the boxes for units you already own. Unchecked units will be marked as "To Buy".
      </p>

      {/* Unit List */}
      <div className="max-h-[300px] overflow-y-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="w-12 px-3 py-2 text-left">
                <span className="sr-only">Owned</span>
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Unit</th>
              <th className="w-16 px-3 py-2 text-center font-medium text-gray-700">Qty</th>
              <th className="w-20 px-3 py-2 text-right font-medium text-gray-700">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {units.map((unit, index) => {
              const isOwned = ownedUnitIndices.has(index);
              return (
                <tr
                  key={`${unit.name}-${index}`}
                  className={`transition-colors ${isOwned ? 'bg-success/5' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isOwned}
                      onChange={() => handleCheckboxChange(index)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      aria-label={`Mark ${unit.name} as owned`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{unit.name}</div>
                    {unit.categories.length > 0 && (
                      <div className="mt-0.5 text-xs text-gray-500">
                        {unit.categories.slice(0, 3).join(' • ')}
                        {unit.categories.length > 3 && ' ...'}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-600">{unit.quantity}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{unit.pointsCost}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

UnitReviewStep.displayName = 'UnitReviewStep';
