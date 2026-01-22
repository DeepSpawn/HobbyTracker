export interface PaintSwatch {
  id: string;
  name: string;
  hexColor: string;
}

interface UnitRecipeDisplayProps {
  recipeName: string;
  swatches: PaintSwatch[];
  maxSwatches?: number;
}

export function UnitRecipeDisplay({
  recipeName,
  swatches,
  maxSwatches = 4,
}: UnitRecipeDisplayProps) {
  const displaySwatches = swatches.slice(0, maxSwatches);
  const hasMoreSwatches = swatches.length > maxSwatches;

  return (
    <div className="flex items-center gap-2">
      <span className="truncate text-xs text-gray-600" title={recipeName}>
        {recipeName}
      </span>
      {displaySwatches.length > 0 && (
        <div className="flex items-center gap-0.5">
          {displaySwatches.map((swatch) => (
            <span
              key={swatch.id}
              className="h-4 w-4 shrink-0 rounded-full border border-gray-200"
              style={{ backgroundColor: swatch.hexColor }}
              title={swatch.name}
              aria-label={`Color swatch: ${swatch.name}`}
            />
          ))}
          {hasMoreSwatches && (
            <span className="ml-0.5 text-xs text-gray-400">
              +{swatches.length - maxSwatches}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
