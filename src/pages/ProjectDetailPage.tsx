import { useParams, Link } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-gray-900">HobbyTracker</h1>
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                Home
              </Button>
            </Link>
            <Link to="/projects">
              <Button variant="ghost" size="sm">
                Projects
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="ghost" size="sm">
                {user?.displayName || user?.email || 'Profile'}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Card variant="elevated" padding="lg">
          <Card.Header title="Project Detail" subtitle={`Project ID: ${id}`} />
          <Card.Body>
            <p className="text-gray-600">
              Project detail page placeholder. Full functionality will be implemented in
              upcoming tickets.
            </p>
          </Card.Body>
          <Card.Footer>
            <Link to="/projects">
              <Button variant="outline">Back to Projects</Button>
            </Link>
          </Card.Footer>
        </Card>
      </main>
    </div>
  );
}
