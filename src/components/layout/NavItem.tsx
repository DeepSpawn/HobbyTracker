import { Link, useLocation } from 'react-router-dom';
import type { NavItemConfig } from './navigationConfig';

type NavItemVariant = 'sidebar' | 'bottom-nav';

interface NavItemProps {
  item: NavItemConfig;
  variant: NavItemVariant;
}

const sidebarStyles = {
  base: 'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-fast border-l-4',
  active: 'bg-primary-50 text-primary-700 border-primary-600',
  inactive: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent',
};

const bottomNavStyles = {
  base: 'flex flex-col items-center justify-center gap-1 py-2 transition-colors duration-fast flex-1',
  active: 'text-primary-600',
  inactive: 'text-gray-500',
};

export function NavItem({ item, variant }: NavItemProps) {
  const location = useLocation();

  // Exact match for home, startsWith for other routes
  const isActive =
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path);

  const Icon = isActive ? item.activeIcon : item.icon;
  const styles = variant === 'sidebar' ? sidebarStyles : bottomNavStyles;

  if (variant === 'sidebar') {
    return (
      <Link
        to={item.path}
        className={`${styles.base} ${isActive ? styles.active : styles.inactive}`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
        <span>{item.name}</span>
      </Link>
    );
  }

  return (
    <Link
      to={item.path}
      className={`${styles.base} ${isActive ? styles.active : styles.inactive}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="h-6 w-6" aria-hidden="true" />
      <span className="text-xs">{item.name}</span>
    </Link>
  );
}
