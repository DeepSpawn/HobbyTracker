import type { ReactNode } from 'react';
import { Card } from '../ui';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

/**
 * Shared layout for authentication pages
 * Centers content with app branding
 */
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* App branding */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            HobbyTracker
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Track your miniatures, paints, and projects
          </p>
        </div>

        {/* Auth card */}
        <Card variant="elevated" padding="lg">
          <Card.Header title={title} subtitle={subtitle} />
          <Card.Body>{children}</Card.Body>
        </Card>
      </div>
    </div>
  );
}
