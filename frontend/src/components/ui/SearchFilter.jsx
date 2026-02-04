import { useState } from 'react';
import { useLabels } from '../../hooks/useLabels';

function SearchFilter({ filters, onFilterChange }) {
  const { data: labels = [] } = useLabels();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearchChange = (e) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handlePriorityChange = (priority) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    onFilterChange({ ...filters, priorities: newPriorities });
  };

  const handleLabelChange = (labelId) => {
    const newLabels = filters.labelIds.includes(labelId)
      ? filters.labelIds.filter(id => id !== labelId)
      : [...filters.labelIds, labelId];
    onFilterChange({ ...filters, labelIds: newLabels });
  };

  const handleDueDateChange = (e) => {
    onFilterChange({ ...filters, dueDate: e.target.value });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      priorities: [],
      labelIds: [],
      dueDate: ''
    });
  };

  const hasActiveFilters = filters.search || filters.priorities.length > 0 || filters.labelIds.length > 0 || filters.dueDate;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-2 rounded-lg border transition-colors ${
            isExpanded || hasActiveFilters
              ? 'bg-blue-50 border-blue-200 text-blue-600'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Clear filters"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
          {/* Priority Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Priority</label>
            <div className="flex gap-2">
              {['high', 'medium', 'low'].map((priority) => (
                <button
                  key={priority}
                  onClick={() => handlePriorityChange(priority)}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                    filters.priorities.includes(priority)
                      ? priority === 'high'
                        ? 'bg-red-100 text-red-700 ring-2 ring-red-500 ring-offset-1'
                        : priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-500 ring-offset-1'
                        : 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-1'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          {/* Label Filter */}
          {labels.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Labels</label>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => handleLabelChange(label.id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                      filters.labelIds.includes(label.id)
                        ? 'ring-2 ring-offset-1'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: `${label.color}20`,
                      color: label.color,
                      ringColor: label.color
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Due Date Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Due Date</label>
            <select
              value={filters.dueDate}
              onChange={handleDueDateChange}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All dates</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due today</option>
              <option value="week">Due this week</option>
              <option value="no-date">No due date</option>
            </select>
          </div>
        </div>
      )}

      {/* Active Filter Pills */}
      {hasActiveFilters && !isExpanded && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {filters.priorities.map((priority) => (
            <span
              key={priority}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                priority === 'high'
                  ? 'bg-red-100 text-red-700'
                  : priority === 'medium'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {priority}
              <button onClick={() => handlePriorityChange(priority)} className="hover:opacity-70">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          {filters.labelIds.map((labelId) => {
            const label = labels.find(l => l.id === labelId);
            if (!label) return null;
            return (
              <span
                key={labelId}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${label.color}20`,
                  color: label.color
                }}
              >
                {label.name}
                <button onClick={() => handleLabelChange(labelId)} className="hover:opacity-70">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            );
          })}
          {filters.dueDate && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {filters.dueDate === 'overdue' ? 'Overdue' : filters.dueDate === 'today' ? 'Due today' : filters.dueDate === 'week' ? 'Due this week' : 'No due date'}
              <button onClick={() => onFilterChange({ ...filters, dueDate: '' })} className="hover:opacity-70">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchFilter;
