import {
  doc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
  type Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../../lib/firebase';
import type {
  Project,
  ProjectDocument,
  ProjectUnit,
  ProjectUnitDocument,
  UnitStatus,
} from '../../types/project';

/**
 * Get the projects collection reference for a user
 */
function getProjectsCollection(userId: string) {
  return collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.USER_PROJECTS);
}

/**
 * Get a specific project document reference
 */
function getProjectDocRef(userId: string, projectId: string) {
  return doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.USER_PROJECTS, projectId);
}

/**
 * Get the units subcollection reference for a project
 */
function getProjectUnitsCollection(userId: string, projectId: string) {
  return collection(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.USER_PROJECTS,
    projectId,
    COLLECTIONS.PROJECT_UNITS
  );
}

/**
 * Convert Firestore document to Project
 */
function toProject(docId: string, data: ProjectDocument): Project {
  return {
    id: docId,
    name: data.name,
    faction: data.faction,
    gameSystem: data.gameSystem,
    targetPoints: data.targetPoints,
    userId: data.userId,
    createdAt: (data.createdAt as Timestamp).toDate(),
  };
}

/**
 * Input type for creating a project (without system fields)
 */
export interface CreateProjectInput {
  name: string;
  faction: string;
  gameSystem: string;
  targetPoints: number;
}

/**
 * Create a new project for a user
 * Returns the created project's ID
 */
export async function createProject(
  userId: string,
  input: CreateProjectInput
): Promise<string> {
  const projectsRef = getProjectsCollection(userId);

  const docRef = await addDoc(projectsRef, {
    name: input.name,
    faction: input.faction || '',
    gameSystem: input.gameSystem || '',
    targetPoints: input.targetPoints || 0,
    userId,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Subscribe to user's projects (real-time updates)
 */
export function subscribeToProjects(
  userId: string,
  callback: (projects: Project[]) => void
): Unsubscribe {
  const projectsRef = getProjectsCollection(userId);
  const q = query(projectsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const projects: Project[] = [];
    snapshot.forEach((doc) => {
      projects.push(toProject(doc.id, doc.data() as ProjectDocument));
    });
    callback(projects);
  });
}

/**
 * Get a single project by ID
 */
export async function getProject(
  userId: string,
  projectId: string
): Promise<Project | null> {
  const docRef = getProjectDocRef(userId, projectId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return toProject(docSnap.id, docSnap.data() as ProjectDocument);
}

/**
 * Unit counts for calculating project completion
 */
export interface ProjectUnitCounts {
  total: number;
  complete: number;
}

/**
 * Get unit counts for a single project
 */
export async function getProjectUnitCounts(
  userId: string,
  projectId: string
): Promise<ProjectUnitCounts> {
  const unitsRef = getProjectUnitsCollection(userId, projectId);
  const snapshot = await getDocs(unitsRef);

  let total = 0;
  let complete = 0;

  snapshot.forEach((doc) => {
    const data = doc.data() as ProjectUnitDocument;
    total += data.quantity;
    if (data.status === 'complete') {
      complete += data.quantity;
    }
  });

  return { total, complete };
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
 * Input type for creating a unit
 */
export interface CreateProjectUnitInput {
  name: string;
  quantity: number;
  status: UnitStatus;
  pointsCost: number;
  recipeId?: string | null;
}

/**
 * Input type for updating a unit
 */
export interface UpdateProjectUnitInput {
  name?: string;
  quantity?: number;
  status?: UnitStatus;
  pointsCost?: number;
  recipeId?: string | null;
}

/**
 * Subscribe to project units (real-time updates)
 */
export function subscribeToProjectUnits(
  userId: string,
  projectId: string,
  callback: (units: ProjectUnit[]) => void
): Unsubscribe {
  const unitsRef = getProjectUnitsCollection(userId, projectId);
  const q = query(unitsRef, orderBy('name', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const units: ProjectUnit[] = [];
    snapshot.forEach((doc) => {
      units.push(toProjectUnit(doc.id, doc.data() as ProjectUnitDocument));
    });
    callback(units);
  });
}

/**
 * Create a new unit in a project
 */
export async function createProjectUnit(
  userId: string,
  projectId: string,
  input: CreateProjectUnitInput
): Promise<string> {
  const unitsRef = getProjectUnitsCollection(userId, projectId);

  const docRef = await addDoc(unitsRef, {
    name: input.name,
    quantity: input.quantity,
    status: input.status,
    pointsCost: input.pointsCost,
    recipeId: input.recipeId ?? null,
  });

  return docRef.id;
}

/**
 * Update an existing unit
 */
export async function updateProjectUnit(
  userId: string,
  projectId: string,
  unitId: string,
  updates: UpdateProjectUnitInput
): Promise<void> {
  const unitRef = doc(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.USER_PROJECTS,
    projectId,
    COLLECTIONS.PROJECT_UNITS,
    unitId
  );

  await updateDoc(unitRef, { ...updates });
}

/**
 * Delete a unit from a project
 */
export async function deleteProjectUnit(
  userId: string,
  projectId: string,
  unitId: string
): Promise<void> {
  const unitRef = doc(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.USER_PROJECTS,
    projectId,
    COLLECTIONS.PROJECT_UNITS,
    unitId
  );

  await deleteDoc(unitRef);
}

/**
 * Batch update status for multiple units
 * Uses Firestore batch writes for atomic operation
 */
export async function batchUpdateUnitStatus(
  userId: string,
  projectId: string,
  unitIds: string[],
  newStatus: UnitStatus
): Promise<void> {
  if (unitIds.length === 0) return;

  // Firestore batches are limited to 500 operations
  // For safety, chunk into batches of 450
  const BATCH_SIZE = 450;

  for (let i = 0; i < unitIds.length; i += BATCH_SIZE) {
    const chunk = unitIds.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const unitId of chunk) {
      const unitRef = doc(
        db,
        COLLECTIONS.USERS,
        userId,
        COLLECTIONS.USER_PROJECTS,
        projectId,
        COLLECTIONS.PROJECT_UNITS,
        unitId
      );
      batch.update(unitRef, { status: newStatus });
    }

    await batch.commit();
  }
}
