import { isPast, isToday, parseISO, isWithinInterval, addDays, startOfDay, endOfDay } from 'date-fns';

export function filterTasks(tasks, filters) {
  if (!tasks) return [];

  return tasks.filter((task) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const titleMatch = task.title?.toLowerCase().includes(searchLower);
      const descMatch = task.description?.toLowerCase().includes(searchLower);
      if (!titleMatch && !descMatch) return false;
    }

    // Priority filter
    if (filters.priorities.length > 0) {
      if (!filters.priorities.includes(task.priority)) return false;
    }

    // Label filter
    if (filters.labelIds.length > 0) {
      const taskLabelIds = task.labels?.map(l => l.id) || [];
      const hasMatchingLabel = filters.labelIds.some(id => taskLabelIds.includes(id));
      if (!hasMatchingLabel) return false;
    }

    // Due date filter
    if (filters.dueDate) {
      const today = startOfDay(new Date());
      const weekEnd = endOfDay(addDays(today, 7));

      switch (filters.dueDate) {
        case 'overdue':
          if (!task.due_date || !isPast(parseISO(task.due_date)) || isToday(parseISO(task.due_date))) {
            return false;
          }
          break;
        case 'today':
          if (!task.due_date || !isToday(parseISO(task.due_date))) {
            return false;
          }
          break;
        case 'week':
          if (!task.due_date) return false;
          const dueDate = parseISO(task.due_date);
          if (!isWithinInterval(dueDate, { start: today, end: weekEnd })) {
            return false;
          }
          break;
        case 'no-date':
          if (task.due_date) return false;
          break;
      }
    }

    return true;
  });
}

export const defaultFilters = {
  search: '',
  priorities: [],
  labelIds: [],
  dueDate: ''
};
