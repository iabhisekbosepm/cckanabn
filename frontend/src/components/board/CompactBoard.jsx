import { Link } from 'react-router-dom';

function CompactBoard({ project }) {
  if (!project) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Project Header */}
      <div
        className="px-4 py-3 border-b"
        style={{ backgroundColor: project.color || '#3B82F6' }}
      >
        <div className="flex items-center justify-between">
          <Link
            to={`/project/${project.id}`}
            className="text-white font-semibold hover:underline"
          >
            {project.name}
          </Link>
          <Link
            to={`/project/${project.id}`}
            className="text-white/80 hover:text-white text-sm"
          >
            Open →
          </Link>
        </div>
        {project.description && (
          <p className="text-white/80 text-sm mt-1 truncate">{project.description}</p>
        )}
      </div>

      {/* Compact Kanban Columns */}
      <div className="p-3">
        {project.columns && project.columns.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {project.columns.map((column) => (
              <div
                key={column.id}
                className="flex-shrink-0 w-48 rounded-lg p-2"
                style={{ backgroundColor: column.color || '#E5E7EB' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-800 text-sm truncate">
                    {column.name}
                  </h4>
                  <span className="bg-white/50 text-gray-600 text-xs font-medium px-1.5 py-0.5 rounded-full">
                    {column.tasks?.length || 0}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {column.tasks?.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="bg-white rounded p-2 shadow-sm border border-gray-100"
                    >
                      <p className="text-xs text-gray-800 font-medium truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            task.priority === 'high'
                              ? 'bg-red-500'
                              : task.priority === 'medium'
                              ? 'bg-yellow-500'
                              : 'bg-gray-400'
                          }`}
                        />
                        <span className="text-[10px] text-gray-500 capitalize">
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                  {column.tasks && column.tasks.length > 5 && (
                    <p className="text-xs text-gray-500 text-center py-1">
                      +{column.tasks.length - 5} more
                    </p>
                  )}
                  {(!column.tasks || column.tasks.length === 0) && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      No tasks
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm">
            No columns yet.{' '}
            <Link to={`/project/${project.id}`} className="text-blue-600 hover:underline">
              Add columns
            </Link>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 flex items-center gap-4">
        <span>{project.columns?.length || 0} columns</span>
        <span>
          {project.columns?.reduce((sum, col) => sum + (col.tasks?.length || 0), 0) || 0} tasks
        </span>
      </div>
    </div>
  );
}

export default CompactBoard;
