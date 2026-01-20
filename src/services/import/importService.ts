import {
  createProject,
  createProjectUnit,
  type CreateProjectInput,
} from '../project/projectService';
import type { NewRecruitImportUnit } from '../../types/newRecruit';

/**
 * Input for importing a project from an army list
 */
export interface ImportProjectInput {
  project: CreateProjectInput;
  units: Array<{
    unit: NewRecruitImportUnit;
    isOwned: boolean;
  }>;
}

/**
 * Import a project from parsed army list data
 * Creates the project and all units in Firestore
 * Returns the created project ID
 */
export async function importProject(
  userId: string,
  input: ImportProjectInput
): Promise<string> {
  // 1. Create the project
  const projectId = await createProject(userId, input.project);

  // 2. Create all units in parallel
  await Promise.all(
    input.units.map(({ unit, isOwned }) =>
      createProjectUnit(userId, projectId, {
        name: unit.name,
        quantity: unit.quantity,
        status: isOwned ? 'owned' : 'to_buy',
        pointsCost: unit.pointsCost,
        recipeId: null,
      })
    )
  );

  return projectId;
}
