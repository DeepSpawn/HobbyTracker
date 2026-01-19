import type { AuthError, AuthErrorCode } from '../../types/auth';

/**
 * User-friendly error messages for Firebase auth error codes
 */
const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  'auth/email-already-in-use':
    'This email is already registered. Try logging in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
  'auth/weak-password':
    'Password is too weak. Please use at least 8 characters.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password. Please try again.',
  'auth/too-many-requests':
    'Too many failed attempts. Please try again later.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/popup-blocked':
    'Sign-in popup was blocked. Please allow popups for this site.',
  'auth/network-request-failed':
    'Network error. Please check your connection and try again.',
  'auth/requires-recent-login':
    'Please sign in again to complete this action.',
  unknown: 'An unexpected error occurred. Please try again.',
};

/**
 * Type guard to check if a string is a known auth error code
 */
function isAuthErrorCode(code: string): code is AuthErrorCode {
  return code in ERROR_MESSAGES;
}

/**
 * Maps a Firebase error to a user-friendly AuthError
 */
export function mapFirebaseError(error: unknown): AuthError {
  // Handle Firebase error shape
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    const code = error.code;

    if (isAuthErrorCode(code)) {
      return {
        code,
        message: ERROR_MESSAGES[code],
      };
    }

    // Log unknown Firebase error codes in development
    if (import.meta.env.DEV) {
      console.warn('[Auth] Unknown Firebase error code:', code, error);
    }
  }

  // Fallback for unexpected errors
  if (import.meta.env.DEV) {
    console.error('[Auth] Unexpected error:', error);
  }

  return {
    code: 'unknown',
    message: ERROR_MESSAGES.unknown,
  };
}
