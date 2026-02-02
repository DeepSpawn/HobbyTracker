import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { CreateProjectForm, ProjectList, ProjectListSkeleton } from '../components/projects';
import { ImportWizardModal } from '../components/import';
import { useProjectsWithCompletion } from '../hooks/useProjectsWithCompletion';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, isLoading, error } = useProjectsWithCompletion();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);

  const handleProjectCreated = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <>
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
          <ProjectListSkeleton />
        ) : (
          <ProjectList
            projects={projects}
            onCreateProject={() => setShowCreateForm(true)}
          />
        )}

      {/* Import Wizard Modal */}
      <ImportWizardModal
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onProjectCreated={handleProjectCreated}
      />
    </>
  );
}
