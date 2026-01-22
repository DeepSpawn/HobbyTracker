import {
  collection,
  query,
  where,
  getDocs,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../../lib/firebase';
import type { Project, ProjectUnit, ProjectUnitDocument } from '../../types/project';
import type {
  PaintShoppingListData,
  PaintShoppingListItem,
  UnitWithProject,
} from '../../types/paintShoppingList';
import { subscribeToProjects } from './projectService';
import { subscribeToInventory } from '../inventory/inventoryService';
import { getRecipeSteps } from '../recipe/recipeService';
import { getPaintById } from '../paint/paintService';

/**
 * Convert Firestore document to ProjectUnit
 */
function toProjectUnit(docId: string, data: ProjectUnitDocument): ProjectUnit {
  return {
    id: docId,
    name: data.name,
    quantity: data.quantity,
    status: data.status,
    pointsCost: data.pointsCost,
    recipeId: data.recipeId,
  };
}

/**
 * Get all units with assigned recipes for a single project
 */
async function getUnitsWithRecipes(
  userId: string,
  projectId: string
): Promise<ProjectUnit[]> {
  const unitsRef = collection(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.USER_PROJECTS,
    projectId,
    COLLECTIONS.PROJECT_UNITS
  );

  // Query for units where recipeId is not null
  const q = query(unitsRef, where('recipeId', '!=', null));
  const snapshot = await getDocs(q);

  const units: ProjectUnit[] = [];
  snapshot.forEach((doc) => {
    units.push(toProjectUnit(doc.id, doc.data() as ProjectUnitDocument));
  });

  return units;
}

/**
 * Subscribe to the paint shopping list
 *
 * This combines:
 * - Real-time project subscription
 * - Real-time inventory subscription
 * - On-demand fetching of units, recipes, and paints
 */
export function subscribeToPaintShoppingList(
  userId: string,
  callback: (data: PaintShoppingListData) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  let currentProjects: Project[] = [];
  let currentInventory: Set<string> = new Set();
  let projectsUnsubscribe: Unsubscribe | null = null;
  let inventoryUnsubscribe: Unsubscribe | null = null;
  let isInitialized = { projects: false, inventory: false };

  const rebuildList = async () => {
    // Wait until both subscriptions have received initial data
    if (!isInitialized.projects || !isInitialized.inventory) {
      return;
    }

    try {
      // Map from paintId to list of units that need it
      const paintToUnitsMap = new Map<string, UnitWithProject[]>();

      // Process all projects in parallel
      await Promise.all(
        currentProjects.map(async (project) => {
          const unitsWithRecipes = await getUnitsWithRecipes(userId, project.id);

          // Process all units with recipes
          await Promise.all(
            unitsWithRecipes.map(async (unit) => {
              if (!unit.recipeId) return;

              const unitWithProject: UnitWithProject = { unit, project };

              // Get paint IDs from this unit's recipe
              const steps = await getRecipeSteps(userId, unit.recipeId);

              for (const step of steps) {
                if (!paintToUnitsMap.has(step.paintId)) {
                  paintToUnitsMap.set(step.paintId, []);
                }
                paintToUnitsMap.get(step.paintId)!.push(unitWithProject);
              }
            })
          );
        })
      );

      // Filter out owned paints
      const neededPaintIds = Array.from(paintToUnitsMap.keys()).filter(
        (paintId) => !currentInventory.has(paintId)
      );

      // Fetch paint details and build shopping list items
      const items: PaintShoppingListItem[] = [];

      await Promise.all(
        neededPaintIds.map(async (paintId) => {
          const paint = await getPaintById(paintId);
          if (paint) {
            items.push({
              paint,
              neededByUnits: paintToUnitsMap.get(paintId) || [],
            });
          }
        })
      );

      // Sort items alphabetically by paint name
      items.sort((a, b) => a.paint.name.localeCompare(b.paint.name));

      // Calculate unique units count
      const uniqueUnitIds = new Set<string>();
      items.forEach((item) => {
        item.neededByUnits.forEach((uwp) => {
          uniqueUnitIds.add(`${uwp.project.id}:${uwp.unit.id}`);
        });
      });

      callback({
        items,
        totals: {
          totalPaints: items.length,
          totalUnits: uniqueUnitIds.size,
        },
      });
    } catch (error) {
      console.error('Error building paint shopping list:', error);
      onError?.(
        error instanceof Error
          ? error
          : new Error('Failed to build paint shopping list')
      );
    }
  };

  // Subscribe to projects
  projectsUnsubscribe = subscribeToProjects(userId, (projects) => {
    currentProjects = projects;
    isInitialized.projects = true;
    rebuildList();
  });

  // Subscribe to inventory changes
  inventoryUnsubscribe = subscribeToInventory(
    userId,
    (paintIds) => {
      currentInventory = paintIds;
      isInitialized.inventory = true;
      rebuildList();
    },
    onError
  );

  // Return combined unsubscribe function
  return () => {
    projectsUnsubscribe?.();
    inventoryUnsubscribe?.();
  };
}
