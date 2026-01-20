import { Link } from 'react-router-dom';
import { Card } from '../ui';
import type { Project } from '../../types/project';

interface ProjectListProps {
  projects: Project[];
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
              <p className="mt-2 text-xs text-gray-400">
                Created {project.createdAt.toLocaleDateString()}
              </p>
            </Card.Body>
          </Card>
        </Link>
      ))}
    </div>
  );
}
