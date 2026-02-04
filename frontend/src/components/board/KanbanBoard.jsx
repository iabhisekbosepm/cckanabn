import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  rectIntersection,
  getFirstCollision
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import Column from './Column';
import TaskCard from './TaskCard';
import ColumnModal from '../modals/ColumnModal';
import TaskModal from '../modals/TaskModal';
import TaskDetailModal from '../modals/TaskDetailModal';
import DeleteConfirmModal from '../modals/DeleteConfirmModal';
import {
  useCreateColumn,
  useUpdateColumn,
  useDeleteColumn,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useMoveTask
} from '../../hooks/useBoard';
import { filterTasks, defaultFilters } from '../../utils/filterTasks';

// Custom collision detection for better cross-column dragging
function customCollisionDetection(args) {
  // First, check for pointer intersections
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  // Fall back to rect intersection
  return rectIntersection(args);
}

function KanbanBoard({ project, filters = defaultFilters }) {
  const [activeTask, setActiveTask] = useState(null);
  const [activeColumn, setActiveColumn] = useState(null);
  const [columnModal, setColumnModal] = useState({ open: false, column: null });
  const [taskModal, setTaskModal] = useState({ open: false, task: null, columnId: null });
  const [taskDetailModal, setTaskDetailModal] = useState({ open: false, task: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, type: null, item: null });

  const createColumn = useCreateColumn(project.id);
  const updateColumn = useUpdateColumn(project.id);
  const deleteColumn = useDeleteColumn(project.id);
  const createTask = useCreateTask(project.id);
  const updateTask = useUpdateTask(project.id);
  const deleteTask = useDeleteTask(project.id);
  const moveTask = useMoveTask(project.id);

  // Apply filters to columns
  const filteredColumns = useMemo(() => {
    if (!project.columns) return [];
    return project.columns.map(column => ({
      ...column,
      tasks: filterTasks(column.tasks, filters),
      allTasksCount: column.tasks?.length || 0
    }));
  }, [project.columns, filters]);

  const hasActiveFilters = filters.search || filters.priorities.length > 0 || filters.labelIds.length > 0 || filters.dueDate;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    })
  );

  const findColumnByTaskId = (taskId) => {
    return project.columns?.find((col) =>
      col.tasks?.some((task) => task.id === taskId)
    );
  };

  const findTaskById = (taskId) => {
    return project.columns
      ?.flatMap((c) => c.tasks || [])
      .find((t) => t.id === taskId);
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const task = findTaskById(active.id);
    if (task) {
      setActiveTask(task);
      setActiveColumn(findColumnByTaskId(active.id));
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find the columns
    const activeColumn = findColumnByTaskId(activeId);

    // Check if we're over a column directly
    const overColumnId = String(overId).startsWith('column-')
      ? parseInt(String(overId).replace('column-', ''))
      : null;

    const overColumn = overColumnId
      ? project.columns?.find(c => c.id === overColumnId)
      : findColumnByTaskId(overId);

    if (!activeColumn || !overColumn) return;

    // Update active column for visual feedback
    if (activeColumn.id !== overColumn.id) {
      setActiveColumn(overColumn);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    setActiveTask(null);
    setActiveColumn(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const task = findTaskById(activeId);
    if (!task) return;

    // Determine target column
    let targetColumnId;
    let targetPosition;

    // Check if dropped on a column
    if (String(overId).startsWith('column-')) {
      targetColumnId = parseInt(String(overId).replace('column-', ''));
      const targetColumn = project.columns?.find(c => c.id === targetColumnId);
      // Place at the end of the column
      targetPosition = ((targetColumn?.tasks?.length || 0) + 1) * 1000;
    } else {
      // Dropped on a task
      const overTask = findTaskById(overId);
      if (overTask) {
        targetColumnId = overTask.column_id;

        // Find the index of the over task in its column
        const targetColumn = project.columns?.find(c => c.id === targetColumnId);
        const overIndex = targetColumn?.tasks?.findIndex(t => t.id === overId) || 0;

        // Calculate position
        if (task.column_id === targetColumnId) {
          // Same column - reordering
          const activeIndex = targetColumn?.tasks?.findIndex(t => t.id === activeId) || 0;
          if (activeIndex < overIndex) {
            targetPosition = overTask.position + 1;
          } else {
            targetPosition = overTask.position - 1;
          }
        } else {
          // Different column - insert at over task's position
          targetPosition = overTask.position;
        }
      }
    }

    if (!targetColumnId) return;

    // Don't do anything if nothing changed
    if (task.column_id === targetColumnId && task.position === targetPosition) {
      return;
    }

    moveTask.mutate({
      taskId: activeId,
      columnId: targetColumnId,
      position: targetPosition || 1000
    });
  };

  const handleColumnSubmit = (data) => {
    if (columnModal.column) {
      updateColumn.mutate({ id: columnModal.column.id, ...data });
    } else {
      createColumn.mutate(data);
    }
  };

  const handleTaskSubmit = (data) => {
    if (taskModal.task) {
      updateTask.mutate({ id: taskModal.task.id, ...data });
    } else {
      createTask.mutate(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteModal.type === 'column') {
      deleteColumn.mutate(deleteModal.item.id);
    } else if (deleteModal.type === 'task') {
      deleteTask.mutate(deleteModal.item.id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {filteredColumns.map((column) => (
              <Column
                key={column.id}
                column={column}
                isOver={activeColumn?.id === column.id && activeTask?.column_id !== column.id}
                onEditColumn={(col) => setColumnModal({ open: true, column: col })}
                onDeleteColumn={(col) => setDeleteModal({ open: true, type: 'column', item: col })}
                onAddTask={(colId) => setTaskModal({ open: true, task: null, columnId: colId })}
                onEditTask={(task) => setTaskModal({ open: true, task, columnId: task.column_id })}
                onDeleteTask={(task) => setDeleteModal({ open: true, type: 'task', item: task })}
                onViewTaskDetails={(task) => setTaskDetailModal({ open: true, task })}
                showFilteredCount={hasActiveFilters}
              />
            ))}

            <div className="flex-shrink-0 w-72">
              <button
                onClick={() => setColumnModal({ open: true, column: null })}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Column
              </button>
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div className="rotate-3">
                <TaskCard
                  task={activeTask}
                  isDragging
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onViewDetails={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <ColumnModal
        isOpen={columnModal.open}
        onClose={() => setColumnModal({ open: false, column: null })}
        onSubmit={handleColumnSubmit}
        column={columnModal.column}
      />

      <TaskModal
        isOpen={taskModal.open}
        onClose={() => setTaskModal({ open: false, task: null, columnId: null })}
        onSubmit={handleTaskSubmit}
        task={taskModal.task}
        columnId={taskModal.columnId}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, type: null, item: null })}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${deleteModal.type === 'column' ? 'Column' : 'Task'}`}
        message={
          deleteModal.type === 'column'
            ? 'Are you sure you want to delete this column? All tasks in this column will be deleted.'
            : 'Are you sure you want to delete this task?'
        }
      />

      <TaskDetailModal
        isOpen={taskDetailModal.open}
        onClose={() => setTaskDetailModal({ open: false, task: null })}
        task={taskDetailModal.task}
      />
    </div>
  );
}

export default KanbanBoard;
