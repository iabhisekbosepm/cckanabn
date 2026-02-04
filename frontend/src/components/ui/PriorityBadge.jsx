import { clsx } from 'clsx';

const priorityStyles = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700'
};

function PriorityBadge({ priority }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize',
        priorityStyles[priority]
      )}
    >
      {priority}
    </span>
  );
}

export default PriorityBadge;
