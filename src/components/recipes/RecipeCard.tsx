import { Link } from 'react-router-dom';
import { Card } from '../ui';

interface PaintSwatch {
  id: string;
  name: string;
  hexColor: string;
}

interface RecipeCardProps {
  recipe: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
  };
  swatches?: PaintSwatch[];
}

/**
 * Card component for displaying a recipe in a list with color swatches
 */
export function RecipeCard({ recipe, swatches = [] }: RecipeCardProps) {
  const displaySwatches = swatches.slice(0, 5);
  const remainingCount = swatches.length - 5;

  return (
    <Link to={`/recipes/${recipe.id}`} className="block">
      <Card
        variant="outlined"
        className="transition-shadow hover:shadow-md"
      >
        <Card.Body>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-gray-900">
                {recipe.name}
              </h3>
              {recipe.description && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                  {recipe.description}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-400">
                {recipe.createdAt.toLocaleDateString()}
              </p>
            </div>

            {/* Color swatches */}
            {displaySwatches.length > 0 && (
              <div className="flex flex-shrink-0 items-center gap-1">
                {displaySwatches.map((swatch) => (
                  <span
                    key={swatch.id}
                    className="h-6 w-6 rounded-full border border-gray-200"
                    style={{ backgroundColor: swatch.hexColor }}
                    title={swatch.name}
                    aria-label={swatch.name}
                  />
                ))}
                {remainingCount > 0 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                    +{remainingCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    </Link>
  );
}
