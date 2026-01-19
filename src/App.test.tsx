import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AuthContext } from './context/AuthContext';
import type { AuthContextValue } from './types/auth';

// Mock auth context value for unauthenticated user
const mockUnauthenticatedContext: AuthContextValue = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  clearError: vi.fn(),
};

// Mock auth context value for authenticated user
const mockAuthenticatedContext: AuthContextValue = {
  user: {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    emailVerified: true,
  },
  isLoading: false,
  isAuthenticated: true,
  error: null,
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  clearError: vi.fn(),
};

// Mock loading context
const mockLoadingContext: AuthContextValue = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  clearError: vi.fn(),
};

function renderApp(
  authContext: AuthContextValue,
  initialRoute: string = '/'
) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthContext.Provider value={authContext}>
        <App />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when loading', () => {
    it('shows loading screen', () => {
      renderApp(mockLoadingContext);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('when unauthenticated', () => {
    it('redirects to login page from protected routes', () => {
      renderApp(mockUnauthenticatedContext, '/');
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    });

    it('shows login page at /login', () => {
      renderApp(mockUnauthenticatedContext, '/login');
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('shows register page at /register', () => {
      renderApp(mockUnauthenticatedContext, '/register');
      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    });
  });

  describe('when authenticated', () => {
    it('shows home page at /', () => {
      renderApp(mockAuthenticatedContext, '/');
      expect(screen.getByText('Welcome to HobbyTracker!')).toBeInTheDocument();
    });

    it('shows profile page at /profile', () => {
      renderApp(mockAuthenticatedContext, '/profile');
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('redirects from login to home when already authenticated', () => {
      renderApp(mockAuthenticatedContext, '/login');
      expect(screen.getByText('Welcome to HobbyTracker!')).toBeInTheDocument();
    });
  });
});
