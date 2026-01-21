import type { RecipeStepWithPaint } from '../../types/recipe';

interface RecipeStepDisplayProps {
  step: RecipeStepWithPaint;
  stepNumber: number;
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
 * Read-only display of a recipe step with paint information
 */
export function RecipeStepDisplay({ step, stepNumber }: RecipeStepDisplayProps) {
  if (!step.paint) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
          {stepNumber}
        </span>
        <span className="text-gray-400 italic">Paint not found</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
      {/* Step number */}
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
        {stepNumber}
      </span>

      {/* Color swatch */}
      <span
        className="h-8 w-8 flex-shrink-0 rounded border border-gray-200"
        style={{ backgroundColor: step.paint.hexColor }}
        aria-hidden="true"
      />

      {/* Paint info */}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-gray-900">
          {step.paint.name}
        </div>
        <div className="truncate text-sm text-gray-500">
          {step.paint.productLine}
        </div>
      </div>

      {/* Brand badge */}
      <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        {formatBrand(step.paint.brand)}
      </span>
    </div>
  );
}
