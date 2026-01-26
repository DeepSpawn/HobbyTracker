import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';
import { NavItem } from './NavItem';
import { mainNavItems, profileNavItem } from './navigationConfig';

export function DesktopSidebar() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-gray-200 bg-white md:flex">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <h1 className="text-xl font-bold text-gray-900">HobbyTracker</h1>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 py-4" aria-label="Main navigation">
        {mainNavItems.map((item) => (
          <NavItem key={item.path} item={item} variant="sidebar" />
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200">
        <NavItem item={profileNavItem} variant="sidebar" />
        <div className="px-4 py-3">
          <div className="mb-2 truncate text-sm text-gray-600">
            {user?.displayName || user?.email || 'User'}
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors duration-fast hover:bg-gray-50 hover:text-gray-900"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
