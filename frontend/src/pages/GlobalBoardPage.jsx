import { useMemo, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboard } from '../hooks/useProjects';
import { tasksApi } from '../api/tasks';
import { useLabels } from '../hooks/useLabels';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import PriorityBadge from '../components/ui/PriorityBadge';
import LabelBadge from '../components/ui/LabelBadge';
import SearchFilter from '../components/ui/SearchFilter';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { MarkdownText } from '../utils/markdown.jsx';
import { filterTasks, defaultFilters } from '../utils/filterTasks';
import { exportAllProjects } from '../utils/exportProject';
import toast from 'react-hot-toast';

// View modes for swimlanes
const VIEW_MODES = {
  COLUMNS: 'columns',
  PRIORITY: 'priority',
  PROJECT: 'project',
  LABELS: 'labels',
  DUE_DATE: 'dueDate'
};

const VIEW_MODE_LABELS = {
  [VIEW_MODES.COLUMNS]: 'By Columns',
  [VIEW_MODES.PRIORITY]: 'By Priority',
  [VIEW_MODES.PROJECT]: 'By Project',
  [VIEW_MODES.LABELS]: 'By Labels',
  [VIEW_MODES.DUE_DATE]: 'By Due Date'
};

// Priority order and colors
const PRIORITY_CONFIG = {
  high: { label: 'High Priority', color: '#EF4444', order: 0 },
  medium: { label: 'Medium Priority', color: '#F59E0B', order: 1 },
  low: { label: 'Low Priority', color: '#10B981', order: 2 }
};

// Due date categories
const DUE_DATE_CATEGORIES = {
  overdue: { label: 'Overdue', color: '#EF4444' },
  today: { label: 'Due Today', color: '#F59E0B' },
  thisWeek: { label: 'This Week', color: '#3B82F6' },
  later: { label: 'Later', color: '#6B7280' },
  noDueDate: { label: 'No Due Date', color: '#9CA3AF' }
};

function GlobalBoardPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const { data: allLabels } = useLabels();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(defaultFilters);
  const [viewMode, setViewMode] = useState(VIEW_MODES.COLUMNS);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Clear selection when view mode changes
  useEffect(() => {
    setSelectedTasks(new Set());
  }, [viewMode]);

  // Get all tasks flattened
  const allTasks = useMemo(() => {
    if (!data?.projects) return [];

    const tasks = [];
    data.projects.forEach((project) => {
      project.columns?.forEach((column) => {
        column.tasks?.forEach((task) => {
          tasks.push({
            ...task,
            projectId: project.id,
            projectName: project.name,
            projectColor: project.color,
            columnName: column.name,
            columnId: column.id
          });
        });
      });
    });
    return filterTasks(tasks, filters);
  }, [data, filters]);

  // Group tasks based on view mode - using switch for clarity
  const groupedData = useMemo(() => {
    switch (viewMode) {
      case VIEW_MODES.COLUMNS: {
        // Column-based view (default)
        const columnMap = {};

        data?.projects?.forEach((project) => {
          project.columns?.forEach((column) => {
            const columnKey = column.name.toLowerCase().trim();

            if (!columnMap[columnKey]) {
              columnMap[columnKey] = {
                id: `col-${columnKey}`,
                name: column.name,
                color: column.color,
                tasks: [],
                position: column.position
              };
            }

            column.tasks?.forEach((task) => {
              columnMap[columnKey].tasks.push({
                ...task,
                projectId: project.id,
                projectName: project.name,
                projectColor: project.color,
                columnName: column.name
              });
            });
          });
        });

        const columnOrder = ['to do', 'in progress', 'in review', 'in testing', 'done', 'completed'];
        const columns = Object.values(columnMap).sort((a, b) => {
          const aIndex = columnOrder.indexOf(a.name.toLowerCase());
          const bIndex = columnOrder.indexOf(b.name.toLowerCase());
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.position - b.position;
        });

        return columns.map(col => ({
          ...col,
          tasks: filterTasks(col.tasks, filters),
          allTasksCount: col.tasks.length
        }));
      }

      case VIEW_MODES.PRIORITY: {
        const groups = [
          { id: 'priority-high', name: 'High Priority', color: PRIORITY_CONFIG.high.color, tasks: [], order: 0 },
          { id: 'priority-medium', name: 'Medium Priority', color: PRIORITY_CONFIG.medium.color, tasks: [], order: 1 },
          { id: 'priority-low', name: 'Low Priority', color: PRIORITY_CONFIG.low.color, tasks: [], order: 2 }
        ];

        const groupMap = { high: groups[0], medium: groups[1], low: groups[2] };

        allTasks.forEach(task => {
          const priority = task.priority || 'medium';
          if (groupMap[priority]) {
            groupMap[priority].tasks.push(task);
          }
        });

        return groups;
      }

      case VIEW_MODES.PROJECT: {
        const groups = [];

        data?.projects?.forEach(project => {
          groups.push({
            id: `project-${project.id}`,
            name: project.name,
            color: project.color,
            tasks: allTasks.filter(t => t.projectId === project.id)
          });
        });

        return groups;
      }

      case VIEW_MODES.LABELS: {
        const groups = [];
        const noLabelGroup = { id: 'label-none', name: 'No Labels', color: '#9CA3AF', tasks: [] };

        // Create groups for each label
        const labelGroups = {};
        allLabels?.forEach(label => {
          labelGroups[label.id] = { id: `label-${label.id}`, name: label.name, color: label.color, tasks: [] };
        });

        allTasks.forEach(task => {
          if (!task.labels || task.labels.length === 0) {
            noLabelGroup.tasks.push(task);
          } else {
            task.labels.forEach(label => {
              if (labelGroups[label.id]) {
                labelGroups[label.id].tasks.push(task);
              }
            });
          }
        });

        // Add label groups with tasks
        Object.values(labelGroups).forEach(group => {
          if (group.tasks.length > 0) {
            groups.push(group);
          }
        });

        // Add no label group if it has tasks
        if (noLabelGroup.tasks.length > 0) {
          groups.push(noLabelGroup);
        }

        return groups;
      }

      case VIEW_MODES.DUE_DATE: {
        const now = new Date();
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (7 - now.getDay()));

        const groups = [
          { id: 'due-overdue', name: 'Overdue', color: DUE_DATE_CATEGORIES.overdue.color, tasks: [] },
          { id: 'due-today', name: 'Due Today', color: DUE_DATE_CATEGORIES.today.color, tasks: [] },
          { id: 'due-thisweek', name: 'This Week', color: DUE_DATE_CATEGORIES.thisWeek.color, tasks: [] },
          { id: 'due-later', name: 'Later', color: DUE_DATE_CATEGORIES.later.color, tasks: [] },
          { id: 'due-none', name: 'No Due Date', color: DUE_DATE_CATEGORIES.noDueDate.color, tasks: [] }
        ];

        allTasks.forEach(task => {
          if (!task.due_date) {
            groups[4].tasks.push(task);
          } else {
            const dueDate = parseISO(task.due_date);
            if (isPast(dueDate) && !isToday(dueDate)) {
              groups[0].tasks.push(task);
            } else if (isToday(dueDate)) {
              groups[1].tasks.push(task);
            } else if (dueDate <= endOfWeek) {
              groups[2].tasks.push(task);
            } else {
              groups[3].tasks.push(task);
            }
          }
        });

        return groups;
      }

      default:
        return [];
    }
  }, [data, filters, viewMode, allTasks, allLabels]);

  // Selection handlers
  const toggleTaskSelection = useCallback((taskId, projectId) => {
    const key = `${projectId}-${taskId}`;
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  const selectAllTasks = useCallback(() => {
    const allKeys = allTasks.map(t => `${t.projectId}-${t.id}`);
    setSelectedTasks(new Set(allKeys));
  }, [allTasks]);

  const clearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  // Bulk action handlers
  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedTasks.size} tasks?`)) return;

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedTasks).map(key => {
        const [, taskId] = key.split('-');
        return tasksApi.delete(taskId);
      });
      await Promise.all(promises);
      toast.success(`${selectedTasks.size} tasks deleted`);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refetch();
    } catch (error) {
      toast.error('Failed to delete some tasks');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkPriorityChange = async (priority) => {
    if (selectedTasks.size === 0) return;

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedTasks).map(key => {
        const [, taskId] = key.split('-');
        return tasksApi.update(taskId, { priority });
      });
      await Promise.all(promises);
      toast.success(`${selectedTasks.size} tasks updated to ${priority} priority`);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refetch();
    } catch (error) {
      toast.error('Failed to update some tasks');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkLabelAdd = async (labelId) => {
    if (selectedTasks.size === 0) return;

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedTasks).map(key => {
        const [, taskId] = key.split('-');
        return tasksApi.addLabel(taskId, labelId);
      });
      await Promise.all(promises);
      toast.success(`Label added to ${selectedTasks.size} tasks`);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refetch();
    } catch (error) {
      toast.error('Failed to add label to some tasks');
    } finally {
      setBulkActionLoading(false);
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

  const projects = data?.projects || [];

  if (projects.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="No projects yet"
          description="Create your first project to see all tasks here."
          action={
            <Link to="/">
              <Button>Go to Projects</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const hasActiveFilters = filters.search || filters.priorities.length > 0 || filters.labelIds.length > 0 || filters.dueDate;
  const totalTasks = allTasks.length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Global Kanban Board</h1>
            <p className="text-gray-500 text-sm mt-1">
              All tasks from {projects.length} projects • {totalTasks} tasks
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* View Mode Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">View:</span>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(VIEW_MODE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Export Button */}
            <button
              onClick={() => {
                exportAllProjects(projects);
                toast.success('All projects exported successfully');
              }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export all projects to markdown"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>

            {/* Project Legend */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Projects:</span>
              {projects.slice(0, 4).map((project) => (
                <Link
                  key={project.id}
                  to={`/project/${project.id}`}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: `${project.color}20`,
                    color: project.color
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                </Link>
              ))}
              {projects.length > 4 && (
                <span className="text-xs text-gray-400">+{projects.length - 4} more</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedTasks.size > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-800">
                {selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={selectAllTasks}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select all ({totalTasks})
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* Priority Dropdown */}
              <div className="relative group">
                <button
                  disabled={bulkActionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                  Set Priority
                </button>
                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => handleBulkPriorityChange(key)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Label Dropdown */}
              <div className="relative group">
                <button
                  disabled={bulkActionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Add Label
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 max-h-60 overflow-y-auto">
                  {allLabels?.map(label => (
                    <button
                      key={label.id}
                      onClick={() => handleBulkLabelAdd(label.id)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: label.color }} />
                      {label.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="px-4 pt-4">
        <SearchFilter filters={filters} onFilterChange={setFilters} />
      </div>

      {/* Swimlane Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-4 h-full">
          {groupedData.map((group) => (
            <div key={group.id || group.name} className="flex-shrink-0 w-80 h-full">
              <div
                className="rounded-xl p-3 h-full flex flex-col"
                style={{ backgroundColor: group.color ? `${group.color}20` : '#E5E7EB' }}
              >
                {/* Group Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {group.color && (
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                    )}
                    <h3 className="font-semibold text-gray-800">{group.name || group.label}</h3>
                    <span className="bg-white/50 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                      {group.tasks.length}
                    </span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="flex-1 overflow-y-auto space-y-2 bg-white/30 rounded-lg p-2">
                  {group.tasks.map((task) => {
                    const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
                    const isDueToday = task.due_date && isToday(parseISO(task.due_date));
                    const taskKey = `${task.projectId}-${task.id}`;
                    const isSelected = selectedTasks.has(taskKey);

                    return (
                      <div
                        key={taskKey}
                        className={`relative bg-white rounded-lg shadow-sm border p-3 hover:shadow-md transition-shadow ${
                          isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        {/* Checkbox */}
                        <div className="absolute top-2 left-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTaskSelection(task.id, task.projectId)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>

                        <Link
                          to={`/project/${task.projectId}`}
                          className="block pl-6"
                        >
                          {/* Labels */}
                          {task.labels && task.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {task.labels.map((label) => (
                                <LabelBadge key={label.id} label={label} size="xs" />
                              ))}
                            </div>
                          )}

                          {/* Project Tag */}
                          <div
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mb-2"
                            style={{
                              backgroundColor: `${task.projectColor}20`,
                              color: task.projectColor
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: task.projectColor }}
                            />
                            {task.projectName}
                          </div>

                          {/* Column indicator for non-column views */}
                          {viewMode !== VIEW_MODES.COLUMNS && task.columnName && (
                            <span className="ml-2 text-[10px] text-gray-400">
                              • {task.columnName}
                            </span>
                          )}

                          {/* Task Title */}
                          <h4 className="font-medium text-gray-900 text-sm mb-1">
                            <MarkdownText>{task.title}</MarkdownText>
                          </h4>

                          {/* Task Description */}
                          {task.description && (
                            <p className="text-gray-500 text-xs mb-2 line-clamp-2">
                              <MarkdownText>{task.description}</MarkdownText>
                            </p>
                          )}

                          {/* Task Meta */}
                          <div className="flex items-center justify-between gap-2">
                            <PriorityBadge priority={task.priority} />
                            {task.due_date && (
                              <span className={`text-xs flex items-center gap-1 ${
                                isOverdue ? 'text-red-600 font-medium' : isDueToday ? 'text-orange-600 font-medium' : 'text-gray-500'
                              }`}>
                                {isOverdue && (
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {format(parseISO(task.due_date), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </Link>
                      </div>
                    );
                  })}

                  {group.tasks.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {groupedData.length === 0 && (
            <div className="flex items-center justify-center w-full">
              <EmptyState
                title="No tasks found"
                description="Adjust your filters or add tasks to your projects."
                action={
                  <Link to="/">
                    <Button>Go to Projects</Button>
                  </Link>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlobalBoardPage;
