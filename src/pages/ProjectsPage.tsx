import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { AppHeader } from '../components/layout';
import { CreateProjectForm, ProjectList } from '../components/projects';
import { ImportWizardModal } from '../components/import';
import { useAuth } from '../hooks/useAuth';
import { useProjectsWithCompletion } from '../hooks/useProjectsWithCompletion';

export function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { projects, isLoading, error } = useProjectsWithCompletion();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);

  const handleProjectCreated = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} />

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page header with action */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
            <p className="mt-1 text-sm text-gray-500">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
          {!showCreateForm && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowImportWizard(true)}>
                Import Army List
              </Button>
              <Button variant="primary" onClick={() => setShowCreateForm(true)}>
                New Project
              </Button>
            </div>
          )}
        </div>

        {/* Error state */}
        {error && (
          <Card variant="outlined" className="mb-6 border-error/20 bg-error/10">
            <Card.Body>
              <p className="text-error">Error loading projects: {error.message}</p>
            </Card.Body>
          </Card>
        )}

        {/* Create form (conditionally shown) */}
        {showCreateForm && (
          <div className="mb-6">
            <CreateProjectForm
              onSuccess={() => setShowCreateForm(false)}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
            <p className="mt-2 text-gray-500">Loading projects...</p>
          </div>
        ) : (
          <ProjectList
            projects={projects}
            emptyMessage="No projects yet. Create your first project to get started!"
          />
        )}

        {/* Import Wizard Modal */}
        <ImportWizardModal
          isOpen={showImportWizard}
          onClose={() => setShowImportWizard(false)}
          onProjectCreated={handleProjectCreated}
        />
      </main>
    </div>
  );
}
