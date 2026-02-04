import { Link } from 'react-router-dom';

// Phase colors for different column types
const phaseColors = {
  'to do': '#94A3B8',      // gray
  'in progress': '#3B82F6', // blue
  'in review': '#8B5CF6',   // purple
  'in testing': '#F59E0B',  // amber
  'done': '#10B981',        // green
  'completed': '#10B981',   // green
  'default': '#6B7280'      // default gray
};

function getPhaseColor(columnName) {
  const key = columnName.toLowerCase().trim();
  return phaseColors[key] || phaseColors.default;
}

function ProjectCard({ project, onEdit, onDelete }) {
  const totalTasks = project.task_count || 0;
  const phases = project.phases || {};
  const productTypes = project.productTypes || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div
        className="h-2"
        style={{ backgroundColor: project.color || '#3B82F6' }}
      />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Link
            to={`/project/${project.id}`}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
          >
            {project.name}
          </Link>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(project)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Edit project"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(project)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete project"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {project.description && (
          <p className="text-gray-500 text-sm mb-3 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Product Types (Labels) */}
        {productTypes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {productTypes.slice(0, 5).map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${label.color}20`,
                  color: label.color
                }}
              >
                {label.name}
              </span>
            ))}
            {productTypes.length > 5 && (
              <span className="text-xs text-gray-400">
                +{productTypes.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Phase Progress Bar */}
        {totalTasks > 0 && Object.keys(phases).length > 0 && (
          <div className="mb-3">
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
              {Object.entries(phases).map(([columnName, count]) => {
                if (count === 0) return null;
                const percentage = (count / totalTasks) * 100;
                return (
                  <div
                    key={columnName}
                    className="h-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: getPhaseColor(columnName)
                    }}
                    title={`${columnName}: ${count} tasks (${Math.round(percentage)}%)`}
                  />
                );
              })}
            </div>
            {/* Phase Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {Object.entries(phases).map(([columnName, count]) => (
                <span
                  key={columnName}
                  className="flex items-center gap-1 text-xs text-gray-500"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getPhaseColor(columnName) }}
                  />
                  {columnName}: {count}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
            </svg>
            {project.column_count || 0} columns
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {project.task_count || 0} tasks
          </span>
        </div>

        <Link
          to={`/project/${project.id}`}
          className="mt-4 inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Open Board
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default ProjectCard;
