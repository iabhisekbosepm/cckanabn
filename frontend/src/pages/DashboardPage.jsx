import { useState, useMemo } from 'react';
import { useDashboard, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects';
import ProjectGrid from '../components/project/ProjectGrid';
import ProjectModal from '../components/modals/ProjectModal';
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

function DashboardPage() {
  const { data, isLoading, error } = useDashboard();

  // Process projects to add phase and product type data
  const projects = useMemo(() => {
    if (!data?.projects) return [];

    return data.projects.map(project => {
      // Calculate phase breakdown from columns
      const phases = {};
      let totalTasks = 0;

      project.columns?.forEach(column => {
        const taskCount = column.tasks?.length || 0;
        phases[column.name] = taskCount;
        totalTasks += taskCount;
      });

      // Extract unique labels (product types) from all tasks
      const labelSet = new Map();
      project.columns?.forEach(column => {
        column.tasks?.forEach(task => {
          task.labels?.forEach(label => {
            if (!labelSet.has(label.id)) {
              labelSet.set(label.id, label);
            }
          });
        });
      });
      const productTypes = Array.from(labelSet.values());

      return {
        ...project,
        column_count: project.columns?.length || 0,
        task_count: totalTasks,
        phases,
        productTypes
      };
    });
  }, [data]);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [projectModal, setProjectModal] = useState({ open: false, project: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, project: null });

  const handleProjectSubmit = (data) => {
    if (projectModal.project) {
      updateProject.mutate({ id: projectModal.project.id, ...data });
    } else {
      createProject.mutate(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteModal.project) {
      deleteProject.mutate(deleteModal.project.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading projects</p>
          <p className="text-gray-500 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage your kanban boards</p>
        </div>
        <Button onClick={() => setProjectModal({ open: true, project: null })}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Button>
      </div>

      {projects?.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start organizing your tasks with kanban boards."
          action={
            <Button onClick={() => setProjectModal({ open: true, project: null })}>
              Create Project
            </Button>
          }
        />
      ) : (
        <ProjectGrid
          projects={projects}
          onEdit={(project) => setProjectModal({ open: true, project })}
          onDelete={(project) => setDeleteModal({ open: true, project })}
        />
      )}

      <ProjectModal
        isOpen={projectModal.open}
        onClose={() => setProjectModal({ open: false, project: null })}
        onSubmit={handleProjectSubmit}
        project={projectModal.project}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, project: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        message="Are you sure you want to delete this project? All columns and tasks will be permanently deleted."
      />
    </div>
  );
}

export default DashboardPage;
