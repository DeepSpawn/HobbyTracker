import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Loading screen shown while auth state initializes
 */
function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

interface LocationState {
  from?: {
    pathname: string;
  };
}

/**
 * Route guard for public-only pages (login, register)
 * Redirects authenticated users to home or their intended destination
 */
export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    // Redirect to where they came from, or home
    const state = location.state as LocationState | null;
    const from = state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
}
