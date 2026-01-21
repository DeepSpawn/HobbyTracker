import { Link } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { AppHeader } from '../components/layout';
import { useAuth } from '../hooks/useAuth';

/**
 * Home page - placeholder for authenticated users
 */
export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} />

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card variant="elevated" padding="lg">
          <Card.Header
            title="Welcome to HobbyTracker!"
            subtitle="Your miniature hobby management starts here"
          />
          <Card.Body>
            <p className="text-gray-600">
              You&apos;re now signed in. This is a placeholder home page.
              The full application features will be implemented in upcoming tickets.
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-gray-600">
              <li>Track your miniature collection</li>
              <li>Manage your paint inventory</li>
              <li>Create and follow paint recipes</li>
              <li>Import army lists from popular apps</li>
              <li>Generate shopping lists for your projects</li>
            </ul>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to="/projects" className="flex-1">
                <Button variant="primary" fullWidth>
                  View Projects
                </Button>
              </Link>
              <Link to="/paints" className="flex-1">
                <Button variant="outline" fullWidth>
                  Manage Paint Inventory
                </Button>
              </Link>
            </div>
          </Card.Body>
        </Card>
      </main>
    </div>
  );
}
