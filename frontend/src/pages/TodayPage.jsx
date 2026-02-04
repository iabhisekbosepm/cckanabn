import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useProjects';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import PriorityBadge from '../components/ui/PriorityBadge';
import LabelBadge from '../components/ui/LabelBadge';
import { format, isToday, isPast, parseISO, isThisWeek } from 'date-fns';
import { formatInIST } from '../utils/dateUtils';
import { MarkdownText } from '../utils/markdown.jsx';

function TodayPage() {
  const { data, isLoading, error } = useDashboard();
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  // Process data to get today's important tasks
  const todayData = useMemo(() => {
    if (!data?.projects) return null;

    const projectsWithTasks = [];
    let totalOverdue = 0;
    let totalDueToday = 0;
    let totalHighPriority = 0;
    let totalInProgress = 0;

    data.projects.forEach(project => {
      const overdueTasks = [];
      const dueTodayTasks = [];
      const highPriorityTasks = [];
      const inProgressTasks = [];

      project.columns?.forEach(column => {
        const columnLower = column.name.toLowerCase();
        const isInProgress = columnLower.includes('progress') || columnLower.includes('review') || columnLower.includes('testing');
        const isDone = columnLower === 'done' || columnLower === 'completed';

        column.tasks?.forEach(task => {
          // Skip completed tasks
          if (isDone) return;

          const taskWithMeta = {
            ...task,
            columnName: column.name,
            columnColor: column.color,
            projectId: project.id,
            projectName: project.name,
            projectColor: project.color
          };

          // Check due date
          if (task.due_date) {
            const dueDate = parseISO(task.due_date);
            if (isToday(dueDate)) {
              dueTodayTasks.push(taskWithMeta);
            } else if (isPast(dueDate)) {
              overdueTasks.push(taskWithMeta);
            }
          }

          // Check high priority (not in done)
          if (task.priority === 'high') {
            // Avoid duplicates - only add if not already in due today or overdue
            const isDueTodayOrOverdue = task.due_date && (isToday(parseISO(task.due_date)) || isPast(parseISO(task.due_date)));
            if (!isDueTodayOrOverdue) {
              highPriorityTasks.push(taskWithMeta);
            }
          }

          // Check in progress
          if (isInProgress) {
            // Avoid duplicates
            const isDueTodayOrOverdue = task.due_date && (isToday(parseISO(task.due_date)) || isPast(parseISO(task.due_date)));
            const isHighPriority = task.priority === 'high';
            if (!isDueTodayOrOverdue && !isHighPriority) {
              inProgressTasks.push(taskWithMeta);
            }
          }
        });
      });

      // Sort tasks by priority
      const sortByPriority = (a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] || 1) - (order[b.priority] || 1);
      };

      overdueTasks.sort(sortByPriority);
      dueTodayTasks.sort(sortByPriority);
      highPriorityTasks.sort(sortByPriority);

      const hasImportantTasks = overdueTasks.length > 0 || dueTodayTasks.length > 0 || highPriorityTasks.length > 0 || inProgressTasks.length > 0;

      if (hasImportantTasks) {
        projectsWithTasks.push({
          id: project.id,
          name: project.name,
          color: project.color,
          overdueTasks,
          dueTodayTasks,
          highPriorityTasks,
          inProgressTasks,
          totalImportant: overdueTasks.length + dueTodayTasks.length + highPriorityTasks.length
        });

        totalOverdue += overdueTasks.length;
        totalDueToday += dueTodayTasks.length;
        totalHighPriority += highPriorityTasks.length;
        totalInProgress += inProgressTasks.length;
      }
    });

    // Sort projects by number of important tasks
    projectsWithTasks.sort((a, b) => b.totalImportant - a.totalImportant);

    // Expand all projects by default
    if (expandedProjects.size === 0 && projectsWithTasks.length > 0) {
      setExpandedProjects(new Set(projectsWithTasks.map(p => p.id)));
    }

    return {
      projects: projectsWithTasks,
      totals: {
        overdue: totalOverdue,
        dueToday: totalDueToday,
        highPriority: totalHighPriority,
        inProgress: totalInProgress,
        total: totalOverdue + totalDueToday + totalHighPriority + totalInProgress
      }
    };
  }, [data]);

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    if (todayData?.projects) {
      setExpandedProjects(new Set(todayData.projects.map(p => p.id)));
    }
  };

  const collapseAll = () => {
    setExpandedProjects(new Set());
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
          <p className="text-red-500 mb-2">Error loading data</p>
          <p className="text-gray-500 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data?.projects || data.projects.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="No projects yet"
          description="Create projects to see your daily planner."
          action={
            <Link to="/">
              <Button>Go to Projects</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Today's Plan</h1>
            <p className="text-gray-500 text-sm mt-1">
              {format(today, 'EEEE, MMMM d, yyyy')} • {formatInIST(today, 'h:mm a')} IST
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Quick Stats */}
            <div className="flex items-center gap-3">
              {todayData?.totals.overdue > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  {todayData.totals.overdue} Overdue
                </span>
              )}
              {todayData?.totals.dueToday > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm font-medium">
                  {todayData.totals.dueToday} Due Today
                </span>
              )}
              {todayData?.totals.highPriority > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium">
                  {todayData.totals.highPriority} High Priority
                </span>
              )}
            </div>
            {/* Expand/Collapse */}
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Expand All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {todayData?.projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500">No urgent tasks for today. Great job staying on top of things!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayData.projects.map(project => (
              <ProjectSection
                key={project.id}
                project={project}
                isExpanded={expandedProjects.has(project.id)}
                onToggle={() => toggleProject(project.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Project Section Component
function ProjectSection({ project, isExpanded, onToggle }) {
  const totalTasks = project.overdueTasks.length + project.dueTodayTasks.length + project.highPriorityTasks.length + project.inProgressTasks.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Project Header */}
      <div
        className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h2 className="font-semibold text-gray-900">{project.name}</h2>
          <span className="text-sm text-gray-500">({totalTasks} tasks)</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick badges */}
          <div className="flex items-center gap-2">
            {project.overdueTasks.length > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                {project.overdueTasks.length} overdue
              </span>
            )}
            {project.dueTodayTasks.length > 0 && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                {project.dueTodayTasks.length} due today
              </span>
            )}
            {project.highPriorityTasks.length > 0 && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                {project.highPriorityTasks.length} high priority
              </span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Overdue Tasks */}
          {project.overdueTasks.length > 0 && (
            <TaskGroup
              title="Overdue"
              tasks={project.overdueTasks}
              bgColor="bg-red-50"
              borderColor="border-red-200"
              iconColor="text-red-500"
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              }
            />
          )}

          {/* Due Today Tasks */}
          {project.dueTodayTasks.length > 0 && (
            <TaskGroup
              title="Due Today"
              tasks={project.dueTodayTasks}
              bgColor="bg-orange-50"
              borderColor="border-orange-200"
              iconColor="text-orange-500"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          )}

          {/* High Priority Tasks */}
          {project.highPriorityTasks.length > 0 && (
            <TaskGroup
              title="High Priority"
              tasks={project.highPriorityTasks}
              bgColor="bg-yellow-50"
              borderColor="border-yellow-200"
              iconColor="text-yellow-600"
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                </svg>
              }
            />
          )}

          {/* In Progress Tasks */}
          {project.inProgressTasks.length > 0 && (
            <TaskGroup
              title="In Progress"
              tasks={project.inProgressTasks}
              bgColor="bg-blue-50"
              borderColor="border-blue-200"
              iconColor="text-blue-500"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

// Task Group Component
function TaskGroup({ title, tasks, bgColor, borderColor, iconColor, icon }) {
  return (
    <div className={`${bgColor} border-b ${borderColor} last:border-b-0`}>
      <div className="px-4 py-2 flex items-center gap-2">
        <span className={iconColor}>{icon}</span>
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className="text-xs text-gray-500">({tasks.length})</span>
      </div>
      <div className="px-4 pb-3 space-y-2">
        {tasks.map(task => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

// Task Item Component
function TaskItem({ task }) {
  return (
    <Link
      to={`/project/${task.projectId}`}
      className="block bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {task.labels.map(label => (
                <LabelBadge key={label.id} label={label} size="xs" />
              ))}
            </div>
          )}

          {/* Title */}
          <h4 className="font-medium text-gray-900 text-sm">
            <MarkdownText>{task.title}</MarkdownText>
          </h4>

          {/* Description */}
          {task.description && (
            <p className="text-gray-500 text-xs mt-1 line-clamp-1">
              <MarkdownText>{task.description}</MarkdownText>
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2">
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: `${task.columnColor}30`,
                color: task.columnColor
              }}
            >
              {task.columnName}
            </span>
            <PriorityBadge priority={task.priority} />
            {task.due_date && (
              <span className={`text-xs ${
                isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))
                  ? 'text-red-600 font-medium'
                  : isToday(parseISO(task.due_date))
                  ? 'text-orange-600 font-medium'
                  : 'text-gray-500'
              }`}>
                {format(parseISO(task.due_date), 'MMM d')}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

export default TodayPage;
