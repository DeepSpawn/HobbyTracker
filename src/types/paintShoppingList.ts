import type { Paint } from './paint';
import type { Project, ProjectUnit } from './project';

/**
 * A unit with its associated project context for the paint shopping list
 */
export interface UnitWithProject {
  unit: ProjectUnit;
  project: Project;
}

/**
 * A paint item in the shopping list with all units that need it
 */
export interface PaintShoppingListItem {
  paint: Paint;
  neededByUnits: UnitWithProject[];
}

/**
 * Complete paint shopping list data
 */
export interface PaintShoppingListData {
  items: PaintShoppingListItem[];
  totals: {
    totalPaints: number;
    totalUnits: number; // Count of unique units needing paints
  };
}
