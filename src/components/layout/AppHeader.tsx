import { Link } from 'react-router-dom';
import { Button } from '../ui';
import type { AuthUser } from '../../types/auth';

interface AppHeaderProps {
  user: AuthUser | null;
}

/**
 * Reusable application header with navigation
 */
export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <h1 className="text-xl font-bold text-gray-900">HobbyTracker</h1>
        <nav className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              Home
            </Button>
          </Link>
          <Link to="/paints">
            <Button variant="ghost" size="sm">
              Paints
            </Button>
          </Link>
          <Link to="/projects">
            <Button variant="ghost" size="sm">
              Projects
            </Button>
          </Link>
          <Link to="/recipes">
            <Button variant="ghost" size="sm">
              Recipes
            </Button>
          </Link>
          <Link to="/profile">
            <Button variant="ghost" size="sm">
              {user?.displayName || user?.email || 'Profile'}
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
