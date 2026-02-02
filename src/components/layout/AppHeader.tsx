import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui';
import type { AuthUser } from '../../types/auth';

interface AppHeaderProps {
  user: AuthUser | null;
}

const MenuIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/**
 * Reusable application header with navigation
 */
export function AppHeader({ user }: AppHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/paints', label: 'Paints' },
    { to: '/projects', label: 'Projects' },
    { to: '/recipes', label: 'Recipes' },
    { to: '/profile', label: user?.displayName || user?.email || 'Profile' },
  ];

  return (
    <header className="relative border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <h1 className="text-xl font-bold text-gray-900">HobbyTracker</h1>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-4 sm:flex">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              <Button variant="ghost" size="sm">
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 sm:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile navigation dropdown */}
      {isMenuOpen && (
        <nav className="border-t border-gray-200 bg-white sm:hidden">
          <div className="space-y-1 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.to === '/profile' ? 'Profile' : link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
