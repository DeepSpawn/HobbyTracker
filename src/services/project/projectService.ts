import {
  doc,
  collection,
  addDoc,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  type Unsubscribe,
  type Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../../lib/firebase';
import type { Project, ProjectDocument } from '../../types/project';

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
