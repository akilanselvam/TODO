const priorityStyles = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
}

const priorityDot = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-green-500',
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyles[priority]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${priorityDot[priority]}`} />
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}

export function CategoryBadge({ category }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium badge-accent">
      {category}
    </span>
  )
}
