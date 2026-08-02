import { useState } from 'react'
import { useTodo } from '../../context/TodoContext'
import { PriorityBadge, CategoryBadge } from '../UI/Badge'
import SubtaskList from './SubtaskList'
import Modal from '../UI/Modal'
import TodoForm from './TodoForm'
import { formatTimeLabel } from '../../utils/calendar'

function formatDate(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (date.toDateString() === today.toDateString()) return { label: 'Today', overdue: false }
  if (date.toDateString() === tomorrow.toDateString()) return { label: 'Tomorrow', overdue: false }
  const overdue = date < today && date.toDateString() !== today.toDateString()
  return { label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue }
}

export default function TodoItem({ todo }) {
  const { dispatch } = useTodo()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const dateInfo = formatDate(todo.dueDate)
  const subtasksDone = todo.subtasks.filter(s => s.completed).length

  return (
    <>
      <div className={`group bg-white dark:bg-slate-800 rounded-xl border transition-all hover:shadow-md ${
        todo.completed
          ? 'border-slate-100 dark:border-slate-700/50 opacity-70'
          : 'border-slate-200 dark:border-slate-700'
      }`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <button
              onClick={() => dispatch({ type: 'TOGGLE_TODO', payload: todo.id })}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                todo.completed
                  ? 'accent-bg border-[var(--accent)]'
                  : 'border-slate-300 dark:border-slate-500 hover-border-accent'
              }`}
            >
              {todo.completed && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium leading-snug ${
                todo.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'
              }`}>
                {todo.title}
              </p>
              {todo.description && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{todo.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <PriorityBadge priority={todo.priority} />
                <CategoryBadge category={todo.category} />
                {dateInfo && (
                  <span className={`inline-flex items-center gap-1 text-xs ${
                    dateInfo.overdue ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {dateInfo.label}{todo.dueTime ? `, ${formatTimeLabel(todo.dueTime)}` : ''}
                  </span>
                )}
                {todo.subtasks.length > 0 && (
                  <button
                    onClick={() => setExpanded(e => !e)}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-accent transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {subtasksDone}/{todo.subtasks.length}
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={() => setExpanded(e => !e)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-accent hover:bg-[var(--panel)] dark:hover:bg-[var(--panel)] transition-colors"
                title="Toggle subtasks"
              >
                <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-accent hover:bg-[var(--panel)] dark:hover:bg-[var(--panel)] transition-colors"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {expanded && (
            <div className="mt-1 ml-8">
              <SubtaskList todo={todo} />
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={editing} onClose={() => setEditing(false)} title="Edit Task">
        <TodoForm todo={todo} onClose={() => setEditing(false)} />
      </Modal>

      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Task">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          Are you sure you want to delete <strong>"{todo.title}"</strong>? This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirmDelete(false)}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { dispatch({ type: 'DELETE_TODO', payload: todo.id }); setConfirmDelete(false) }}
            className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>
    </>
  )
}
