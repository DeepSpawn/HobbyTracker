import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';
import type { AuthUser } from '../../types/auth';
import { mapFirebaseError } from './authErrors';

/**
 * Maps Firebase User to our portable AuthUser type
 */
function mapFirebaseUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
  };
}

/**
 * Sign in with email and password
 * @throws AuthError on failure
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthUser> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return mapFirebaseUser(result.user);
  } catch (error) {
    throw mapFirebaseError(error);
  }
}

/**
 * Create a new account with email and password
 * @throws AuthError on failure
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthUser> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return mapFirebaseUser(result.user);
  } catch (error) {
    throw mapFirebaseError(error);
  }
}

/**
 * Sign in with Google using popup
 * @throws AuthError on failure
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return mapFirebaseUser(result.user);
  } catch (error) {
    throw mapFirebaseError(error);
  }
}

/**
 * Sign out the current user
 * @throws AuthError on failure
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw mapFirebaseError(error);
  }
}

/**
 * Subscribe to auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, (firebaseUser) => {
    callback(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
  });
}
