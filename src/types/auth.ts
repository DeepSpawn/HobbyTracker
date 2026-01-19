/**
 * Auth-related TypeScript types
 * Designed to be portable between web and React Native
 */

/**
 * Platform-agnostic user representation
 * Maps from Firebase User but can be adapted for other providers
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

/**
 * Authentication state
 */
export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Known Firebase auth error codes
 */
export type AuthErrorCode =
  | 'auth/email-already-in-use'
  | 'auth/invalid-email'
  | 'auth/operation-not-allowed'
  | 'auth/weak-password'
  | 'auth/user-disabled'
  | 'auth/user-not-found'
  | 'auth/wrong-password'
  | 'auth/invalid-credential'
  | 'auth/too-many-requests'
  | 'auth/popup-closed-by-user'
  | 'auth/popup-blocked'
  | 'auth/network-request-failed'
  | 'auth/requires-recent-login'
  | 'unknown';

/**
 * Normalized auth error with user-friendly message
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

/**
 * Auth context value provided to consumers
 */
export interface AuthContextValue extends AuthState {
  error: AuthError | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}
