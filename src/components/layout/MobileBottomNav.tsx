import { NavItem } from './NavItem';
import { mainNavItems, profileNavItem } from './navigationConfig';

export function MobileBottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 flex h-16 items-center justify-around border-t border-gray-200 bg-white pb-safe md:hidden"
      aria-label="Mobile navigation"
    >
      {mainNavItems.map((item) => (
        <NavItem key={item.path} item={item} variant="bottom-nav" />
      ))}
      <NavItem item={profileNavItem} variant="bottom-nav" />
    </nav>
  );
}
