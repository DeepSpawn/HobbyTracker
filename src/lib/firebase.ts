import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Auth providers
export const googleProvider = new GoogleAuthProvider();

// Collection names for type-safe references
export const COLLECTIONS = {
  PAINTS: 'paints',
  USERS: 'users',
  // Subcollections under users/{userId}
  USER_INVENTORY: 'inventory',
  USER_PROJECTS: 'projects',
  USER_RECIPES: 'recipes',
  // Subcollections under projects/{projectId}
  PROJECT_UNITS: 'units',
  // Subcollections under recipes/{recipeId}
  RECIPE_STEPS: 'steps',
} as const;

export default app;
