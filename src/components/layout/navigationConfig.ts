import type { ComponentType, SVGProps } from 'react';
import {
  HomeIcon as HomeIconOutline,
  FolderIcon as FolderIconOutline,
  SwatchIcon as SwatchIconOutline,
  BookOpenIcon as BookOpenIconOutline,
  ShoppingCartIcon as ShoppingCartIconOutline,
  UserCircleIcon as UserCircleIconOutline,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  FolderIcon as FolderIconSolid,
  SwatchIcon as SwatchIconSolid,
  BookOpenIcon as BookOpenIconSolid,
  ShoppingCartIcon as ShoppingCartIconSolid,
  UserCircleIcon as UserCircleIconSolid,
} from '@heroicons/react/24/solid';

export interface NavItemConfig {
  name: string;
  path: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  activeIcon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const mainNavItems: NavItemConfig[] = [
  {
    name: 'Home',
    path: '/',
    icon: HomeIconOutline,
    activeIcon: HomeIconSolid,
  },
  {
    name: 'Projects',
    path: '/projects',
    icon: FolderIconOutline,
    activeIcon: FolderIconSolid,
  },
  {
    name: 'Paints',
    path: '/paints',
    icon: SwatchIconOutline,
    activeIcon: SwatchIconSolid,
  },
  {
    name: 'Recipes',
    path: '/recipes',
    icon: BookOpenIconOutline,
    activeIcon: BookOpenIconSolid,
  },
  {
    name: 'Shopping',
    path: '/shopping-list',
    icon: ShoppingCartIconOutline,
    activeIcon: ShoppingCartIconSolid,
  },
];

export const profileNavItem: NavItemConfig = {
  name: 'Profile',
  path: '/profile',
  icon: UserCircleIconOutline,
  activeIcon: UserCircleIconSolid,
};
