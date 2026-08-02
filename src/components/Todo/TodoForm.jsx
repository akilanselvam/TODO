import { useState } from 'react'
import { useTodo } from '../../context/TodoContext'

const empty = { title: '', description: '', priority: 'medium', dueDate: '', dueTime: '', category: 'Personal' }

export default function TodoForm({ todo, initial, onClose }) {
  const { state, dispatch } = useTodo()
  const [form, setForm] = useState(
    todo
      ? { title: todo.title, description: todo.description, priority: todo.priority,
          dueDate: todo.dueDate ? todo.dueDate.slice(0, 10) : '', dueTime: todo.dueTime || '',
          category: todo.category }
      : { ...empty, ...initial }
  )
  const [error, setError] = useState('')

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    const payload = { ...form, dueDate: form.dueDate || null, dueTime: form.dueTime || null }
    if (todo) {
      dispatch({ type: 'UPDATE_TODO', payload: { ...todo, ...payload } })
    } else {
      dispatch({ type: 'ADD_TODO', payload })
    }
    onClose()
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none input-focus-accent transition-colors'
  const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Title *</label>
        <input
          className={inputCls}
          value={form.title}
          onChange={e => { set('title', e.target.value); setError('') }}
          placeholder="What needs to be done?"
          autoFocus
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Add details..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Priority</label>
          <select className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
            {state.categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Due Date</label>
          <input
            type="date"
            className={inputCls}
            value={form.dueDate}
            onChange={e => set('dueDate', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Time</label>
          <input
            type="time"
            className={inputCls}
            value={form.dueTime}
            onChange={e => set('dueTime', e.target.value)}
            disabled={!form.dueDate}
            title={!form.dueDate ? 'Set a due date first' : ''}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 rounded-lg accent-bg accent-hover text-white text-sm font-medium transition-colors"
        >
          {todo ? 'Save Changes' : 'Add Task'}
        </button>
      </div>
    </form>
  )
}
