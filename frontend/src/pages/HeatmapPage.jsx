import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { heatmapApi } from '../api/heatmap';

function HeatmapPage() {
  const [viewMode, setViewMode] = useState('due'); // 'due' or 'created'
  const [selectedDate, setSelectedDate] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['heatmap'],
    queryFn: () => heatmapApi.getData()
  });

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Generate calendar data for the year
  const calendarData = useMemo(() => {
    const taskData = viewMode === 'due' ? data?.byDueDate : data?.byCreatedDate;
    if (!taskData) return [];

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const weeks = [];
    let currentWeek = [];

    // Pad the start to align with Sunday
    const startDay = startOfYear.getDay();
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null);
    }

    const current = new Date(startOfYear);
    while (current <= endOfYear) {
      const dateStr = formatDateLocal(current);
      const tasks = taskData[dateStr] || [];

      currentWeek.push({
        date: new Date(current),
        dateStr,
        tasks,
        count: tasks.length
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      current.setDate(current.getDate() + 1);
    }

    // Pad the end
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [data, year, viewMode]);

  // Calculate max tasks for color scaling
  const maxTasks = useMemo(() => {
    const taskData = viewMode === 'due' ? data?.byDueDate : data?.byCreatedDate;
    if (!taskData) return 1;
    return Math.max(1, ...Object.values(taskData).map(tasks => tasks.length));
  }, [data, viewMode]);

  // Get color intensity based on task count
  const getColor = (count) => {
    if (count === 0) return 'bg-gray-100';
    const intensity = Math.min(count / maxTasks, 1);
    if (intensity <= 0.25) return 'bg-green-200';
    if (intensity <= 0.5) return 'bg-green-400';
    if (intensity <= 0.75) return 'bg-green-500';
    return 'bg-green-600';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate month positions for labels
  const monthLabels = useMemo(() => {
    const labels = [];
    let currentMonth = -1;

    calendarData.forEach((week, weekIndex) => {
      week.forEach(day => {
        if (day && day.date.getMonth() !== currentMonth) {
          currentMonth = day.date.getMonth();
          labels.push({ month: months[currentMonth], weekIndex });
        }
      });
    });

    return labels;
  }, [calendarData]);

  // Get selected date's tasks
  const selectedTasks = useMemo(() => {
    if (!selectedDate || !data) return [];
    const taskData = viewMode === 'due' ? data.byDueDate : data.byCreatedDate;
    return taskData?.[selectedDate] || [];
  }, [selectedDate, data, viewMode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workload Heatmap</h1>
          <p className="text-gray-600 mt-1">Visualize task distribution over time</p>
        </div>
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('due')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'due'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              By Due Date
            </button>
            <button
              onClick={() => setViewMode('created')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'created'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              By Created Date
            </button>
          </div>

          {/* Year Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear(y => y - 1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-lg font-semibold text-gray-900 min-w-[60px] text-center">{year}</span>
            <button
              onClick={() => setYear(y => y + 1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{data?.totalTasks || 0}</div>
          <div className="text-sm text-gray-600">Total Tasks</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-red-600">
            {data?.tasks?.filter(t => t.priority === 'high').length || 0}
          </div>
          <div className="text-sm text-gray-600">High Priority</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">
            {data?.tasks?.filter(t => t.priority === 'medium').length || 0}
          </div>
          <div className="text-sm text-gray-600">Medium Priority</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {data?.tasks?.filter(t => t.priority === 'low').length || 0}
          </div>
          <div className="text-sm text-gray-600">Low Priority</div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex gap-4">
          {/* Day labels */}
          <div className="flex flex-col gap-[3px] pt-6">
            {days.map((day, i) => (
              <div
                key={day}
                className="h-[14px] text-xs text-gray-500 flex items-center"
                style={{ visibility: i % 2 === 1 ? 'visible' : 'hidden' }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex-1 overflow-x-auto">
            {/* Month labels */}
            <div className="flex gap-[3px] mb-2 relative h-4">
              {monthLabels.map((label, i) => (
                <div
                  key={i}
                  className="text-xs text-gray-500 absolute"
                  style={{ left: `${label.weekIndex * 17}px` }}
                >
                  {label.month}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-[3px]">
              {calendarData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`w-[14px] h-[14px] rounded-sm cursor-pointer transition-all ${
                        day
                          ? `${getColor(day.count)} hover:ring-2 hover:ring-blue-400 ${
                              selectedDate === day.dateStr ? 'ring-2 ring-blue-500' : ''
                            }`
                          : 'bg-transparent'
                      }`}
                      onClick={() => day && setSelectedDate(day.dateStr)}
                      title={day ? `${day.dateStr}: ${day.count} task${day.count !== 1 ? 's' : ''}` : ''}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-4">
              <span className="text-xs text-gray-500">Less</span>
              <div className="w-[14px] h-[14px] rounded-sm bg-gray-100" />
              <div className="w-[14px] h-[14px] rounded-sm bg-green-200" />
              <div className="w-[14px] h-[14px] rounded-sm bg-green-400" />
              <div className="w-[14px] h-[14px] rounded-sm bg-green-500" />
              <div className="w-[14px] h-[14px] rounded-sm bg-green-600" />
              <span className="text-xs text-gray-500">More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Tasks for {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h2>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {selectedTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No tasks for this date</p>
          ) : (
            <div className="space-y-3">
              {selectedTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: task.project_color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{task.title}</div>
                    <div className="text-sm text-gray-500">
                      {task.project_name} / {task.column_name}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

export default HeatmapPage;
