import {
  collection,
  query,
  where,
  getDocs,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../../lib/firebase';
import type {
  Project,
  ProjectUnit,
  ProjectUnitDocument,
} from '../../types/project';
import { subscribeToProjects } from './projectService';

/**
 * A project group in the shopping list with its units to buy
 */
export interface ShoppingListProjectGroup {
  project: Project;
  units: ProjectUnit[];
  totalUnits: number;
  totalPoints: number;
}

/**
 * Complete shopping list data with groups and totals
 */
export interface ShoppingListData {
  projectGroups: ShoppingListProjectGroup[];
  totals: {
    totalUnits: number;
    totalPoints: number;
    projectCount: number;
  };
}

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
 * Get units with 'to_buy' status for a single project
 */
async function getProjectToBuyUnits(
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

  const q = query(unitsRef, where('status', '==', 'to_buy'));
  const snapshot = await getDocs(q);

  const units: ProjectUnit[] = [];
  snapshot.forEach((doc) => {
    units.push(toProjectUnit(doc.id, doc.data() as ProjectUnitDocument));
  });

  return units;
}

/**
 * Subscribe to the shopping list (all units with 'to_buy' status across all projects)
 * Returns real-time updates when projects or units change
 */
export function subscribeToShoppingList(
  userId: string,
  callback: (data: ShoppingListData) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  // Subscribe to projects - when projects change, refetch all to_buy units
  return subscribeToProjects(userId, async (projects) => {
    try {
      // Fetch to_buy units for all projects in parallel
      const groupsPromises = projects.map(async (project) => {
        const units = await getProjectToBuyUnits(userId, project.id);

        // Calculate totals for this project
        const totalUnits = units.reduce((sum, unit) => sum + unit.quantity, 0);
        const totalPoints = units.reduce(
          (sum, unit) => sum + unit.pointsCost,
          0
        );

        return {
          project,
          units,
          totalUnits,
          totalPoints,
        };
      });

      const allGroups = await Promise.all(groupsPromises);

      // Filter out projects with no units to buy
      const projectGroups = allGroups.filter((group) => group.units.length > 0);

      // Calculate overall totals
      const totals = {
        totalUnits: projectGroups.reduce(
          (sum, group) => sum + group.totalUnits,
          0
        ),
        totalPoints: projectGroups.reduce(
          (sum, group) => sum + group.totalPoints,
          0
        ),
        projectCount: projectGroups.length,
      };

      callback({ projectGroups, totals });
    } catch (error) {
      console.error('Error fetching shopping list:', error);
      onError?.(
        error instanceof Error
          ? error
          : new Error('Failed to fetch shopping list')
      );
    }
  });
}
