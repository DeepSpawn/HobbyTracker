import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthContextValue, AuthError, AuthUser } from '../types/auth';
import {
  signInWithEmail as authSignInWithEmail,
  signUpWithEmail as authSignUpWithEmail,
  signInWithGoogle as authSignInWithGoogle,
  signOut as authSignOut,
  onAuthStateChange,
} from '../services/auth';
import { createOrUpdateUserProfile } from '../services/user';

/**
 * Auth context - null when outside provider
 */
export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider component
 * Manages authentication state and provides auth methods to children
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // Subscribe to auth state changes on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChange((authUser) => {
      setUser(authUser);
      setIsLoading(false);

      // Create or update user profile in Firestore when authenticated
      if (authUser) {
        createOrUpdateUserProfile({
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          photoURL: authUser.photoURL,
        }).catch((err) => {
          console.error('Failed to create/update user profile:', err);
        });
      }
    });

    return unsubscribe;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setIsLoading(true);
      try {
        await authSignInWithEmail(email, password);
        // User state will be updated by onAuthStateChange
      } catch (err) {
        setError(err as AuthError);
        setIsLoading(false);
        throw err;
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      await authSignInWithGoogle();
      // User state will be updated by onAuthStateChange
    } catch (err) {
      setError(err as AuthError);
      setIsLoading(false);
      throw err;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await authSignUpWithEmail(email, password);
      // User state will be updated by onAuthStateChange
    } catch (err) {
      setError(err as AuthError);
      setIsLoading(false);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await authSignOut();
      // User state will be updated by onAuthStateChange
    } catch (err) {
      setError(err as AuthError);
      throw err;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      error,
      signInWithEmail,
      signInWithGoogle,
      signUp,
      signOut,
      clearError,
    }),
    [
      user,
      isLoading,
      error,
      signInWithEmail,
      signInWithGoogle,
      signUp,
      signOut,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
