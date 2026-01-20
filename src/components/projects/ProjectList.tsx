import { Link } from 'react-router-dom';
import { Card, ProgressBar } from '../ui';
import type { ProjectWithCompletion } from '../../hooks/useProjectsWithCompletion';

interface ProjectListProps {
  projects: ProjectWithCompletion[];
  emptyMessage?: string;
}

export function ProjectList({ projects, emptyMessage }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <Card variant="outlined" padding="lg">
        <p className="text-center text-gray-500">
          {emptyMessage || 'No projects yet. Create your first project!'}
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link key={project.id} to={`/projects/${project.id}`}>
          <Card variant="elevated" isInteractive>
            <Card.Body>
              <h3 className="text-lg font-semibold text-gray-900">
                {project.name}
              </h3>
              {project.faction && (
                <p className="mt-1 text-sm text-gray-600">{project.faction}</p>
              )}
              <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                {project.gameSystem && <span>{project.gameSystem}</span>}
                {project.targetPoints > 0 && (
                  <span>{project.targetPoints} pts</span>
                )}
              </div>

              {/* Completion Progress */}
              <div className="mt-4">
                {project.unitCounts && project.unitCounts.total > 0 ? (
                  <>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-gray-600">
                        {project.unitCounts.complete}/{project.unitCounts.total}{' '}
                        units complete
                      </span>
                      <span className="font-medium text-gray-900">
                        {project.completionPercentage}%
                      </span>
                    </div>
                    <ProgressBar
                      value={project.completionPercentage ?? 0}
                      size="sm"
                      variant={
                        project.completionPercentage === 100
                          ? 'success'
                          : 'default'
                      }
                    />
                  </>
                ) : (
                  <p className="text-xs text-gray-400">No units added yet</p>
                )}
              </div>

              <p className="mt-3 text-xs text-gray-400">
                Created {project.createdAt.toLocaleDateString()}
              </p>
            </Card.Body>
          </Card>
        </Link>
      ))}
    </div>
  );
}
