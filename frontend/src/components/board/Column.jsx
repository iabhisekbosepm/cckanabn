import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';

function Column({ column, isOver: isOverFromParent, onEditColumn, onDeleteColumn, onAddTask, onEditTask, onDeleteTask, onViewTaskDetails, showFilteredCount }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: 'column',
      column
    }
  });

  const taskIds = column.tasks?.map((t) => t.id) || [];
  const showDropIndicator = isOver || isOverFromParent;
  const filteredCount = column.tasks?.length || 0;
  const totalCount = column.allTasksCount || filteredCount;

  return (
    <div className="flex-shrink-0 w-72 h-full">
      <div
        ref={setNodeRef}
        className={`rounded-xl p-3 h-full flex flex-col transition-all duration-200 ${
          showDropIndicator ? 'ring-2 ring-blue-400' : ''
        }`}
        style={{ backgroundColor: column.color || '#E5E7EB' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">{column.name}</h3>
            <span className="bg-white/50 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
              {showFilteredCount && filteredCount !== totalCount
                ? `${filteredCount}/${totalCount}`
                : filteredCount}
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onEditColumn(column)}
              className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
              title="Edit column"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => onDeleteColumn(column)}
              className="p-1 text-gray-600 hover:text-red-600 transition-colors"
              title="Delete column"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className={`flex-1 overflow-y-auto space-y-2 min-h-[100px] rounded-lg p-2 transition-all duration-200 ${
            showDropIndicator
              ? 'bg-blue-200/50'
              : 'bg-white/20'
          }`}
        >
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {column.tasks?.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onViewDetails={onViewTaskDetails}
              />
            ))}
          </SortableContext>

          {showDropIndicator && (!column.tasks || column.tasks.length === 0) && (
            <div className="flex items-center justify-center h-20 text-blue-500 text-sm font-medium border-2 border-dashed border-blue-300 rounded-lg">
              Drop here
            </div>
          )}
        </div>

        <button
          onClick={() => onAddTask(column.id)}
          className="mt-3 w-full py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-white/30 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>
    </div>
  );
}

export default Column;
