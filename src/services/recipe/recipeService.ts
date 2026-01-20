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
  Recipe,
  RecipeDocument,
  RecipeStep,
  RecipeStepDocument,
} from '../../types/recipe';

/**
 * Get the recipes collection reference for a user
 */
function getRecipesCollection(userId: string) {
  return collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.USER_RECIPES);
}

/**
 * Get a specific recipe document reference
 */
function getRecipeDocRef(userId: string, recipeId: string) {
  return doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.USER_RECIPES, recipeId);
}

/**
 * Get the steps subcollection reference for a recipe
 */
function getRecipeStepsCollection(userId: string, recipeId: string) {
  return collection(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.USER_RECIPES,
    recipeId,
    COLLECTIONS.RECIPE_STEPS
  );
}

/**
 * Convert Firestore document to Recipe
 */
function toRecipe(docId: string, data: RecipeDocument): Recipe {
  return {
    id: docId,
    name: data.name,
    description: data.description,
    authorId: data.authorId,
    createdAt: (data.createdAt as Timestamp).toDate(),
  };
}

/**
 * Convert Firestore document to RecipeStep
 */
function toRecipeStep(docId: string, data: RecipeStepDocument): RecipeStep {
  return {
    id: docId,
    stepOrder: data.stepOrder,
    paintId: data.paintId,
    method: data.method,
    notes: data.notes,
  };
}

/**
 * Input type for creating a recipe (without system fields)
 */
export interface CreateRecipeInput {
  name: string;
  description?: string | null;
}

/**
 * Input type for creating a recipe step
 */
export interface CreateRecipeStepInput {
  stepOrder: number;
  paintId: string;
  method?: string | null;
  notes?: string | null;
}

/**
 * Input type for updating a recipe
 */
export interface UpdateRecipeInput {
  name?: string;
  description?: string | null;
}

/**
 * Input type for updating a recipe step
 */
export interface UpdateRecipeStepInput {
  stepOrder?: number;
  paintId?: string;
  method?: string | null;
  notes?: string | null;
}

/**
 * Create a new recipe for a user
 * Returns the created recipe's ID
 */
export async function createRecipe(
  userId: string,
  input: CreateRecipeInput
): Promise<string> {
  const recipesRef = getRecipesCollection(userId);

  const docRef = await addDoc(recipesRef, {
    name: input.name,
    description: input.description ?? null,
    authorId: userId,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Subscribe to user's recipes (real-time updates)
 */
export function subscribeToRecipes(
  userId: string,
  callback: (recipes: Recipe[]) => void
): Unsubscribe {
  const recipesRef = getRecipesCollection(userId);
  const q = query(recipesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const recipes: Recipe[] = [];
    snapshot.forEach((doc) => {
      recipes.push(toRecipe(doc.id, doc.data() as RecipeDocument));
    });
    callback(recipes);
  });
}

/**
 * Get a single recipe by ID
 */
export async function getRecipe(
  userId: string,
  recipeId: string
): Promise<Recipe | null> {
  const docRef = getRecipeDocRef(userId, recipeId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return toRecipe(docSnap.id, docSnap.data() as RecipeDocument);
}

/**
 * Update an existing recipe
 */
export async function updateRecipe(
  userId: string,
  recipeId: string,
  updates: UpdateRecipeInput
): Promise<void> {
  const recipeRef = getRecipeDocRef(userId, recipeId);
  await updateDoc(recipeRef, { ...updates });
}

/**
 * Delete a recipe and all its steps
 */
export async function deleteRecipe(
  userId: string,
  recipeId: string
): Promise<void> {
  const batch = writeBatch(db);

  // Delete all steps first
  const stepsRef = getRecipeStepsCollection(userId, recipeId);
  const stepsSnapshot = await getDocs(stepsRef);
  stepsSnapshot.forEach((stepDoc) => {
    batch.delete(stepDoc.ref);
  });

  // Delete the recipe
  const recipeRef = getRecipeDocRef(userId, recipeId);
  batch.delete(recipeRef);

  await batch.commit();
}

/**
 * Subscribe to recipe steps (real-time updates)
 */
export function subscribeToRecipeSteps(
  userId: string,
  recipeId: string,
  callback: (steps: RecipeStep[]) => void
): Unsubscribe {
  const stepsRef = getRecipeStepsCollection(userId, recipeId);
  const q = query(stepsRef, orderBy('stepOrder', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const steps: RecipeStep[] = [];
    snapshot.forEach((doc) => {
      steps.push(toRecipeStep(doc.id, doc.data() as RecipeStepDocument));
    });
    callback(steps);
  });
}

/**
 * Get all steps for a recipe
 */
export async function getRecipeSteps(
  userId: string,
  recipeId: string
): Promise<RecipeStep[]> {
  const stepsRef = getRecipeStepsCollection(userId, recipeId);
  const q = query(stepsRef, orderBy('stepOrder', 'asc'));
  const snapshot = await getDocs(q);

  const steps: RecipeStep[] = [];
  snapshot.forEach((doc) => {
    steps.push(toRecipeStep(doc.id, doc.data() as RecipeStepDocument));
  });

  return steps;
}

/**
 * Create a new step in a recipe
 */
export async function createRecipeStep(
  userId: string,
  recipeId: string,
  input: CreateRecipeStepInput
): Promise<string> {
  const stepsRef = getRecipeStepsCollection(userId, recipeId);

  const docRef = await addDoc(stepsRef, {
    stepOrder: input.stepOrder,
    paintId: input.paintId,
    method: input.method ?? null,
    notes: input.notes ?? null,
  });

  return docRef.id;
}

/**
 * Update an existing recipe step
 */
export async function updateRecipeStep(
  userId: string,
  recipeId: string,
  stepId: string,
  updates: UpdateRecipeStepInput
): Promise<void> {
  const stepRef = doc(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.USER_RECIPES,
    recipeId,
    COLLECTIONS.RECIPE_STEPS,
    stepId
  );

  await updateDoc(stepRef, { ...updates });
}

/**
 * Delete a step from a recipe
 */
export async function deleteRecipeStep(
  userId: string,
  recipeId: string,
  stepId: string
): Promise<void> {
  const stepRef = doc(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.USER_RECIPES,
    recipeId,
    COLLECTIONS.RECIPE_STEPS,
    stepId
  );

  await deleteDoc(stepRef);
}

/**
 * Save a recipe with all its steps atomically
 * This is used when creating a new recipe with all steps at once
 */
export async function saveRecipeWithSteps(
  userId: string,
  recipeInput: CreateRecipeInput,
  steps: Omit<CreateRecipeStepInput, 'stepOrder'>[]
): Promise<string> {
  const batch = writeBatch(db);

  // Create recipe document
  const recipeRef = doc(getRecipesCollection(userId));
  batch.set(recipeRef, {
    name: recipeInput.name,
    description: recipeInput.description ?? null,
    authorId: userId,
    createdAt: serverTimestamp(),
  });

  // Create all step documents with correct stepOrder
  steps.forEach((step, index) => {
    const stepRef = doc(getRecipeStepsCollection(userId, recipeRef.id));
    batch.set(stepRef, {
      stepOrder: index,
      paintId: step.paintId,
      method: step.method ?? null,
      notes: step.notes ?? null,
    });
  });

  await batch.commit();
  return recipeRef.id;
}

/**
 * Reorder steps by providing new step IDs in desired order
 * Updates stepOrder for all steps based on their position in the array
 */
export async function reorderRecipeSteps(
  userId: string,
  recipeId: string,
  stepIds: string[]
): Promise<void> {
  const batch = writeBatch(db);

  stepIds.forEach((stepId, index) => {
    const stepRef = doc(
      db,
      COLLECTIONS.USERS,
      userId,
      COLLECTIONS.USER_RECIPES,
      recipeId,
      COLLECTIONS.RECIPE_STEPS,
      stepId
    );
    batch.update(stepRef, { stepOrder: index });
  });

  await batch.commit();
}
