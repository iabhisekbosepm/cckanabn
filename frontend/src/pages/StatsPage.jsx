import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useProjects';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { isPast, isToday, parseISO, format, startOfWeek, addDays } from 'date-fns';

const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981'
};

const STATUS_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'];

function StatsPage() {
  const { data, isLoading, error } = useDashboard();

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data?.projects) return null;

    let totalTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;
    let dueTodayTasks = 0;
    let tasksWithNoDueDate = 0;

    const priorityCount = { high: 0, medium: 0, low: 0 };
    const tasksByColumn = {};
    const tasksByProject = {};
    const tasksByDay = {};

    // Initialize week days
    const weekStart = startOfWeek(new Date());
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      tasksByDay[format(day, 'EEE')] = { name: format(day, 'EEE'), tasks: 0, completed: 0 };
    }

    data.projects.forEach((project) => {
      tasksByProject[project.name] = {
        name: project.name,
        color: project.color,
        total: 0,
        completed: 0
      };

      project.columns?.forEach((column) => {
        const columnNameLower = column.name.toLowerCase();
        const isCompletedColumn = ['done', 'completed', 'finished'].some(c => columnNameLower.includes(c));

        if (!tasksByColumn[column.name]) {
          tasksByColumn[column.name] = { name: column.name, count: 0 };
        }

        column.tasks?.forEach((task) => {
          totalTasks++;
          tasksByColumn[column.name].count++;
          tasksByProject[project.name].total++;
          priorityCount[task.priority]++;

          if (isCompletedColumn) {
            completedTasks++;
            tasksByProject[project.name].completed++;
          }

          if (task.due_date) {
            const dueDate = parseISO(task.due_date);
            const dayKey = format(dueDate, 'EEE');

            if (tasksByDay[dayKey]) {
              tasksByDay[dayKey].tasks++;
              if (isCompletedColumn) {
                tasksByDay[dayKey].completed++;
              }
            }

            if (isPast(dueDate) && !isToday(dueDate) && !isCompletedColumn) {
              overdueTasks++;
            }
            if (isToday(dueDate)) {
              dueTodayTasks++;
            }
          } else {
            tasksWithNoDueDate++;
          }
        });
      });
    });

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      dueTodayTasks,
      tasksWithNoDueDate,
      completionRate,
      priorityData: Object.entries(priorityCount).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: PRIORITY_COLORS[name]
      })),
      columnData: Object.values(tasksByColumn),
      projectData: Object.values(tasksByProject),
      weekData: Object.values(tasksByDay),
      projectCount: data.projects.length
    };
  }, [data]);

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

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Statistics</h1>
          <p className="text-gray-500 mt-1">
            Overview of your tasks across {stats.projectCount} projects
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTasks}</p>
                <p className="text-sm text-gray-500">Total Tasks</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
                <p className="text-sm text-gray-500">Completion Rate</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.overdueTasks}</p>
                <p className="text-sm text-gray-500">Overdue</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.dueTodayTasks}</p>
                <p className="text-sm text-gray-500">Due Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Priority Distribution */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Tasks by Priority</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {stats.priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Tasks by Column/Status */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Tasks by Status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.columnData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Stats */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tasks by Project</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.projectData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" name="Total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Overview */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">This Week's Tasks (by Due Date)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.weekData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="tasks" name="Due" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default StatsPage;
