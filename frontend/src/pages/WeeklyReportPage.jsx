import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useProjects';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, subWeeks, addDays } from 'date-fns';
import { formatInIST } from '../utils/dateUtils';
import { exportAllProjects, downloadAsFile } from '../utils/exportProject';
import toast from 'react-hot-toast';

// Priority colors
const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981'
};

// Column status mapping
const STATUS_MAPPING = {
  'to do': 'todo',
  'in progress': 'inProgress',
  'in review': 'inProgress',
  'in testing': 'inProgress',
  'done': 'completed',
  'completed': 'completed'
};

function WeeklyReportPage() {
  const { data, isLoading, error } = useDashboard();
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week, -1 = last week, etc.

  // Calculate week date range
  const weekRange = useMemo(() => {
    const now = new Date();
    const baseDate = addDays(now, selectedWeek * 7);
    const start = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(baseDate, { weekStartsOn: 1 }); // Sunday
    return { start, end };
  }, [selectedWeek]);

  // Process data for the report
  const reportData = useMemo(() => {
    if (!data?.projects) return null;

    const projects = data.projects.map(project => {
      let totalTasks = 0;
      let todoTasks = 0;
      let inProgressTasks = 0;
      let completedTasks = 0;
      let highPriority = 0;
      let mediumPriority = 0;
      let lowPriority = 0;
      let overdueTasks = 0;
      let dueSoonTasks = 0;
      const tasksByColumn = {};
      const allTasks = [];

      project.columns?.forEach(column => {
        const columnKey = column.name.toLowerCase().trim();
        const status = STATUS_MAPPING[columnKey] || 'other';

        tasksByColumn[column.name] = {
          count: column.tasks?.length || 0,
          color: column.color
        };

        column.tasks?.forEach(task => {
          totalTasks++;
          allTasks.push({
            ...task,
            columnName: column.name,
            status
          });

          // Count by status
          if (status === 'todo') todoTasks++;
          else if (status === 'inProgress') inProgressTasks++;
          else if (status === 'completed') completedTasks++;

          // Count by priority
          if (task.priority === 'high') highPriority++;
          else if (task.priority === 'medium') mediumPriority++;
          else lowPriority++;

          // Check due dates
          if (task.due_date) {
            const dueDate = parseISO(task.due_date);
            const now = new Date();
            if (dueDate < now && status !== 'completed') {
              overdueTasks++;
            } else if (isWithinInterval(dueDate, weekRange)) {
              dueSoonTasks++;
            }
          }
        });
      });

      // Calculate completion rate
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: project.id,
        name: project.name,
        color: project.color,
        description: project.description,
        totalTasks,
        todoTasks,
        inProgressTasks,
        completedTasks,
        highPriority,
        mediumPriority,
        lowPriority,
        overdueTasks,
        dueSoonTasks,
        completionRate,
        tasksByColumn,
        allTasks
      };
    });

    // Calculate totals
    const totals = projects.reduce((acc, p) => ({
      totalTasks: acc.totalTasks + p.totalTasks,
      todoTasks: acc.todoTasks + p.todoTasks,
      inProgressTasks: acc.inProgressTasks + p.inProgressTasks,
      completedTasks: acc.completedTasks + p.completedTasks,
      highPriority: acc.highPriority + p.highPriority,
      mediumPriority: acc.mediumPriority + p.mediumPriority,
      lowPriority: acc.lowPriority + p.lowPriority,
      overdueTasks: acc.overdueTasks + p.overdueTasks,
      dueSoonTasks: acc.dueSoonTasks + p.dueSoonTasks
    }), {
      totalTasks: 0,
      todoTasks: 0,
      inProgressTasks: 0,
      completedTasks: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
      overdueTasks: 0,
      dueSoonTasks: 0
    });

    totals.completionRate = totals.totalTasks > 0
      ? Math.round((totals.completedTasks / totals.totalTasks) * 100)
      : 0;

    return { projects, totals };
  }, [data, weekRange]);

  // Export report to markdown - Simple format for sharing
  const exportReport = () => {
    if (!reportData) return;

    let report = `Here is the update:\n\n`;

    reportData.projects.forEach(project => {
      // Skip projects with no tasks
      if (project.totalTasks === 0) return;

      // Project name with separator
      report += `${project.name}\n`;
      report += `${'='.repeat(project.name.length)}\n`;

      // Group tasks by column and list them
      const tasksByColumn = {};
      project.allTasks.forEach(task => {
        if (!tasksByColumn[task.columnName]) {
          tasksByColumn[task.columnName] = [];
        }
        tasksByColumn[task.columnName].push(task);
      });

      // Define column order for display
      const columnOrder = ['In Progress', 'In Testing', 'In Review', 'To Do', 'Done', 'Completed'];
      const sortedColumns = Object.keys(tasksByColumn).sort((a, b) => {
        const aIndex = columnOrder.findIndex(c => c.toLowerCase() === a.toLowerCase());
        const bIndex = columnOrder.findIndex(c => c.toLowerCase() === b.toLowerCase());
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });

      sortedColumns.forEach(columnName => {
        const tasks = tasksByColumn[columnName];
        const columnLower = columnName.toLowerCase();

        // Skip completed/done columns in the export (optional - can remove if you want them)
        // if (columnLower === 'done' || columnLower === 'completed') return;

        report += `${columnName}:\n`;

        // For columns with many tasks, show summary + count
        if (tasks.length > 10) {
          // Show summary counts by status
          const summaryParts = [];
          summaryParts.push(`Total ${tasks.length}`);

          // If there are labels, group by them
          const labelCounts = {};
          tasks.forEach(t => {
            if (t.labels && t.labels.length > 0) {
              t.labels.forEach(l => {
                labelCounts[l.name] = (labelCounts[l.name] || 0) + 1;
              });
            }
          });

          if (Object.keys(labelCounts).length > 0) {
            Object.entries(labelCounts).forEach(([name, count]) => {
              summaryParts.push(`${name} ${count}`);
            });
          }

          report += summaryParts.join(', ') + '\n';
        } else {
          // List individual tasks
          tasks.forEach((task, index) => {
            let taskLine = `${index + 1}. ${task.title}`;

            // Add labels if present
            if (task.labels && task.labels.length > 0) {
              const labelNames = task.labels.map(l => l.name).join(', ');
              taskLine += ` [${labelNames}]`;
            }

            report += `${taskLine}\n`;
          });
        }
        report += '\n';
      });

      report += '\n';
    });

    // Copy to clipboard instead of downloading
    navigator.clipboard.writeText(report.trim()).then(() => {
      toast.success('Report copied to clipboard!');
    }).catch(() => {
      // Fallback: download as file
      const filename = `weekly-update-${format(weekRange.start, 'yyyy-MM-dd')}.txt`;
      downloadAsFile(report.trim(), filename);
      toast.success('Report downloaded');
    });
  };

  // Export detailed report (original format)
  const exportDetailedReport = () => {
    if (!reportData) return;

    const weekStart = format(weekRange.start, 'MMM d, yyyy');
    const weekEnd = format(weekRange.end, 'MMM d, yyyy');

    let markdown = `# Weekly Report\n`;
    markdown += `**Period:** ${weekStart} - ${weekEnd}\n`;
    markdown += `**Generated:** ${formatInIST(new Date(), 'MMM d, yyyy h:mm a')} IST\n\n`;

    markdown += `---\n\n`;

    // Overall Summary
    markdown += `## Overall Summary\n\n`;
    markdown += `| Metric | Value |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Tasks | ${reportData.totals.totalTasks} |\n`;
    markdown += `| To Do | ${reportData.totals.todoTasks} |\n`;
    markdown += `| In Progress | ${reportData.totals.inProgressTasks} |\n`;
    markdown += `| Completed | ${reportData.totals.completedTasks} |\n`;
    markdown += `| Completion Rate | ${reportData.totals.completionRate}% |\n\n`;

    // Project-wise breakdown
    markdown += `## Project-wise Breakdown\n\n`;

    reportData.projects.forEach(project => {
      if (project.totalTasks === 0) return;

      markdown += `### ${project.name}\n\n`;

      Object.entries(project.tasksByColumn).forEach(([columnName, data]) => {
        if (data.count === 0) return;
        markdown += `**${columnName}:** ${data.count} tasks\n`;
      });

      markdown += `\n**Completion Rate:** ${project.completionRate}%\n\n`;
      markdown += `---\n\n`;
    });

    const filename = `weekly-report-detailed-${format(weekRange.start, 'yyyy-MM-dd')}.md`;
    downloadAsFile(markdown, filename);
    toast.success('Detailed report exported');
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
          description="Create projects to see weekly reports."
          action={
            <Link to="/">
              <Button>Go to Projects</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Weekly Report</h1>
            <p className="text-gray-500 text-sm mt-1">
              {format(weekRange.start, 'MMM d')} - {format(weekRange.end, 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Week Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedWeek(prev => prev - 1)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Previous week"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setSelectedWeek(0)}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  selectedWeek === 0
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setSelectedWeek(prev => Math.min(prev + 1, 0))}
                disabled={selectedWeek >= 0}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                title="Next week"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={exportReport}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                title="Copy simple update to clipboard"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy Update
              </button>
              <button
                onClick={exportDetailedReport}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Download detailed report"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Overall Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <SummaryCard
            label="Total Tasks"
            value={reportData.totals.totalTasks}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            color="blue"
          />
          <SummaryCard
            label="To Do"
            value={reportData.totals.todoTasks}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="gray"
          />
          <SummaryCard
            label="In Progress"
            value={reportData.totals.inProgressTasks}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            color="yellow"
          />
          <SummaryCard
            label="Completed"
            value={reportData.totals.completedTasks}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
          />
          <SummaryCard
            label="Overdue"
            value={reportData.totals.overdueTasks}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            color="red"
          />
          <SummaryCard
            label="Completion Rate"
            value={`${reportData.totals.completionRate}%`}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            color="purple"
          />
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h2>
          <div className="flex items-center gap-8">
            <div className="flex-1">
              <div className="h-4 rounded-full overflow-hidden bg-gray-100 flex">
                {reportData.totals.totalTasks > 0 && (
                  <>
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(reportData.totals.highPriority / reportData.totals.totalTasks) * 100}%`,
                        backgroundColor: PRIORITY_COLORS.high
                      }}
                      title={`High: ${reportData.totals.highPriority}`}
                    />
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(reportData.totals.mediumPriority / reportData.totals.totalTasks) * 100}%`,
                        backgroundColor: PRIORITY_COLORS.medium
                      }}
                      title={`Medium: ${reportData.totals.mediumPriority}`}
                    />
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(reportData.totals.lowPriority / reportData.totals.totalTasks) * 100}%`,
                        backgroundColor: PRIORITY_COLORS.low
                      }}
                      title={`Low: ${reportData.totals.lowPriority}`}
                    />
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.high }} />
                <span className="text-sm text-gray-600">High ({reportData.totals.highPriority})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.medium }} />
                <span className="text-sm text-gray-600">Medium ({reportData.totals.mediumPriority})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.low }} />
                <span className="text-sm text-gray-600">Low ({reportData.totals.lowPriority})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Project-wise Breakdown */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Project-wise Breakdown</h2>

          <div className="grid gap-4">
            {reportData.projects.map(project => (
              <ProjectReportCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ label, value, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    gray: 'bg-gray-50 text-gray-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

// Project Report Card Component
function ProjectReportCard({ project }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Project Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <div>
              <h3 className="font-semibold text-gray-900">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-gray-500">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">
                <span className="font-medium text-gray-900">{project.totalTasks}</span> tasks
              </span>
              <span className="text-green-600">
                <span className="font-medium">{project.completedTasks}</span> done
              </span>
              {project.overdueTasks > 0 && (
                <span className="text-red-600">
                  <span className="font-medium">{project.overdueTasks}</span> overdue
                </span>
              )}
              <span className="text-purple-600 font-medium">
                {project.completionRate}%
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="h-2 rounded-full overflow-hidden bg-gray-100 flex">
            {project.totalTasks > 0 && (
              <>
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${(project.completedTasks / project.totalTasks) * 100}%` }}
                  title={`Completed: ${project.completedTasks}`}
                />
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${(project.inProgressTasks / project.totalTasks) * 100}%` }}
                  title={`In Progress: ${project.inProgressTasks}`}
                />
                <div
                  className="h-full bg-gray-300 transition-all"
                  style={{ width: `${(project.todoTasks / project.totalTasks) * 100}%` }}
                  title={`To Do: ${project.todoTasks}`}
                />
              </>
            )}
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Completed: {project.completedTasks}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> In Progress: {project.inProgressTasks}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-300" /> To Do: {project.todoTasks}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Column Breakdown */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Tasks by Column</h4>
              <div className="space-y-2">
                {Object.entries(project.tasksByColumn).map(([columnName, data]) => (
                  <div key={columnName} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{columnName}</span>
                    <span className="text-sm font-medium text-gray-900">{data.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Breakdown */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Priority Breakdown</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.high }} />
                    High Priority
                  </span>
                  <span className="text-sm font-medium text-gray-900">{project.highPriority}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.medium }} />
                    Medium Priority
                  </span>
                  <span className="text-sm font-medium text-gray-900">{project.mediumPriority}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.low }} />
                    Low Priority
                  </span>
                  <span className="text-sm font-medium text-gray-900">{project.lowPriority}</span>
                </div>
              </div>
            </div>
          </div>

          {/* High Priority Tasks List */}
          {project.highPriority > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">High Priority Tasks</h4>
              <div className="space-y-1">
                {project.allTasks
                  .filter(t => t.priority === 'high')
                  .slice(0, 5)
                  .map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between text-sm bg-white rounded px-3 py-2"
                    >
                      <span className="text-gray-900">{task.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        task.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : task.status === 'inProgress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {task.columnName}
                      </span>
                    </div>
                  ))}
                {project.highPriority > 5 && (
                  <p className="text-xs text-gray-500 mt-1">
                    +{project.highPriority - 5} more high priority tasks
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Link to Project */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Link
              to={`/project/${project.id}`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View Project Board &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeeklyReportPage;
