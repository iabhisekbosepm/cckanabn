import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useProjects';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PriorityBadge from '../components/ui/PriorityBadge';
import LabelBadge from '../components/ui/LabelBadge';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO
} from 'date-fns';

function CalendarPage() {
  const { data, isLoading, error } = useDashboard();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Collect all tasks with due dates
  const tasksWithDates = useMemo(() => {
    if (!data?.projects) return [];

    const tasks = [];
    data.projects.forEach((project) => {
      project.columns?.forEach((column) => {
        column.tasks?.forEach((task) => {
          if (task.due_date) {
            tasks.push({
              ...task,
              projectId: project.id,
              projectName: project.name,
              projectColor: project.color,
              columnName: column.name
            });
          }
        });
      });
    });
    return tasks;
  }, [data]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped = {};
    tasksWithDates.forEach((task) => {
      // Extract date part from ISO string (handles both "2026-02-05" and "2026-02-05T00:00:00.000Z")
      const dateKey = task.due_date.split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });
    return grouped;
  }, [tasksWithDates]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

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

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-500 text-sm mt-1">
              {tasksWithDates.length} tasks with due dates
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Today
            </button>
            <h2 className="text-lg font-semibold text-gray-900 min-w-[160px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="py-3 text-center text-sm font-medium text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 flex-1">
            {calendarDays.map((day, index) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={index}
                  className={`border-b border-r border-gray-200 p-2 min-h-[120px] ${
                    !isCurrentMonth ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm font-medium ${
                        isCurrentDay
                          ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                          : isCurrentMonth
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Tasks for this day */}
                  <div className="space-y-1 overflow-y-auto max-h-[80px]">
                    {dayTasks.slice(0, 3).map((task) => (
                      <Link
                        key={`${task.projectId}-${task.id}`}
                        to={`/project/${task.projectId}`}
                        className="block text-xs p-1.5 rounded truncate hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: `${task.projectColor}15`,
                          borderLeft: `3px solid ${task.projectColor}`
                        }}
                        title={`${task.title} - ${task.projectName}`}
                      >
                        <div className="flex items-center gap-1">
                          {task.priority === 'high' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                          )}
                          <span className="truncate">{task.title}</span>
                        </div>
                      </Link>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-gray-500 pl-1">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task List for Selected Date (Today by default) */}
      <div className="bg-white border-t border-gray-200 p-4 max-h-[200px] overflow-y-auto">
        <h3 className="font-semibold text-gray-900 mb-3">
          Upcoming Tasks
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {tasksWithDates
            .filter(task => {
              const dueDate = parseISO(task.due_date);
              return dueDate >= new Date() || isSameDay(dueDate, new Date());
            })
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
            .slice(0, 6)
            .map((task) => (
              <Link
                key={`${task.projectId}-${task.id}`}
                to={`/project/${task.projectId}`}
                className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div
                  className="w-1 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: task.projectColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{format(parseISO(task.due_date), 'MMM d')}</span>
                    <span>•</span>
                    <span className="truncate">{task.projectName}</span>
                  </div>
                </div>
                <PriorityBadge priority={task.priority} />
              </Link>
            ))}
          {tasksWithDates.filter(task => parseISO(task.due_date) >= new Date()).length === 0 && (
            <p className="text-gray-500 text-sm col-span-full">No upcoming tasks</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CalendarPage;
