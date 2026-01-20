import { Timestamp } from 'firebase/firestore';

// Firestore document types (internal)
export interface RecipeDocument {
  name: string;
  description: string | null;
  authorId: string;
  createdAt: Timestamp;
}

export interface RecipeStepDocument {
  stepOrder: number;
  paintId: string;
  method: string | null;
  notes: string | null;
}

// Client-facing types (with JS Date)
export interface Recipe {
  id: string;
  name: string;
  description: string | null;
  authorId: string;
  createdAt: Date;
}

export interface RecipeStep {
  id: string;
  stepOrder: number;
  paintId: string;
  method: string | null;
  notes: string | null;
}

// Extended type with paint details for UI display
export interface RecipeStepWithPaint extends RecipeStep {
  paint: {
    id: string;
    name: string;
    brand: string;
    productLine: string;
    hexColor: string;
  } | null;
}

// Recipe with steps for convenience
export interface RecipeWithSteps extends Recipe {
  steps: RecipeStepWithPaint[];
}
