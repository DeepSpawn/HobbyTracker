import type { ReactNode } from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <header className="fixed left-0 right-0 top-0 z-10 flex h-14 items-center border-b border-gray-200 bg-white px-4 md:hidden">
        <h1 className="text-lg font-bold text-gray-900">HobbyTracker</h1>
      </header>

      {/* Desktop sidebar */}
      <DesktopSidebar />

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Main content */}
      <main className="min-h-screen pb-20 pt-14 md:ml-64 md:pb-0 md:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
