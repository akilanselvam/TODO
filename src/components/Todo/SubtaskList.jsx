import { useState } from 'react'
import { useTodo } from '../../context/TodoContext'

export default function SubtaskList({ todo }) {
  const { dispatch } = useTodo()
  const [input, setInput] = useState('')

  function addSubtask(e) {
    e.preventDefault()
    if (!input.trim()) return
    dispatch({ type: 'ADD_SUBTASK', payload: { todoId: todo.id, title: input.trim() } })
    setInput('')
  }

  const done = todo.subtasks.filter(s => s.completed).length

  return (
    <div className="mt-3 space-y-2">
      {todo.subtasks.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Subtasks {done}/{todo.subtasks.length}
            </span>
            <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full accent-bg rounded-full transition-all"
                  style={{ width: `${todo.subtasks.length ? (done / todo.subtasks.length) * 100 : 0}%` }}
                />
            </div>
          </div>
          <ul className="space-y-1">
            {todo.subtasks.map(subtask => (
              <li key={subtask.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_SUBTASK', payload: { todoId: todo.id, subtaskId: subtask.id } })}
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    subtask.completed
                        ? 'accent-bg border-[var(--accent)]'
                      : 'border-slate-300 dark:border-slate-500 hover-border-accent'
                  }`}
                >
                  {subtask.completed && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className={`text-sm flex-1 ${subtask.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                  {subtask.title}
                </span>
                <button
                  onClick={() => dispatch({ type: 'DELETE_SUBTASK', payload: { todoId: todo.id, subtaskId: subtask.id } })}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <form onSubmit={addSubtask} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Add subtask..."
            className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none input-focus-accent"
        />
        <button
          type="submit"
          disabled={!input.trim()}
            className="px-3 py-1.5 text-sm rounded-lg badge-accent hover:accent-hover disabled:opacity-40 transition-colors"
        >
          Add
        </button>
      </form>
    </div>
  )
}
