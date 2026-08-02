import { useState } from 'react'
import { useTodo } from '../../context/TodoContext'

const views = [
  {
    id: 'all', label: 'All Tasks',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
  },
  {
    id: 'today', label: 'Today',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  },
]

const defaultCategories = ['Personal', 'Work', 'Others']

export default function Sidebar({ isOpen, onClose }) {
  const { state, dispatch } = useTodo()
  const [newCat, setNewCat] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  const activeView = state.filter.view
  const activeCategory = state.filter.category

  function setView(view) {
    dispatch({ type: 'SET_FILTER', payload: { view, category: 'all' } })
    onClose?.()
  }

  function setCategory(cat) {
    dispatch({ type: 'SET_FILTER', payload: { category: cat, view: 'all' } })
    onClose?.()
  }

  function addCategory(e) {
    e.preventDefault()
    if (!newCat.trim()) return
    dispatch({ type: 'ADD_CATEGORY', payload: newCat.trim() })
    setNewCat('')
    setAddingCat(false)
  }

  const navBtn = (active) =>
    `flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
      active
        ? 'bg-[var(--panel)] text-accent dark:text-accent font-medium'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
    }`

  const todoCount = (view, cat) => {
    return state.todos.filter(t => {
      if (view === 'today') {
        if (!t.dueDate) return false
        return new Date(t.dueDate).toDateString() === new Date().toDateString()
      }
      if (cat && cat !== 'all') return t.category === cat
      return true
    }).length
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed lg:static top-0 left-0 h-full lg:h-auto w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-30 flex flex-col transition-transform duration-200 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Views */}
          <nav className="space-y-1">
            {views.map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={navBtn(activeView === v.id && activeCategory === 'all')}
              >
                {v.icon}
                <span className="flex-1 text-left">{v.label}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {todoCount(v.id, null)}
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-6">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Categories
              </span>
              <button
                onClick={() => setAddingCat(true)}
                className="p-0.5 rounded text-slate-400 hover:text-accent transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setCategory('all')}
                className={navBtn(activeCategory === 'all' && activeView === 'all')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="flex-1 text-left">All Categories</span>
              </button>

              {state.categories.map(cat => (
                <div key={cat} className="group flex items-center">
                  <button
                    onClick={() => setCategory(cat)}
                    className={navBtn(activeCategory === cat)}
                  >
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
                    <span className="flex-1 text-left truncate">{cat}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {state.todos.filter(t => t.category === cat).length}
                    </span>
                  </button>
                  {!defaultCategories.includes(cat) && (
                    <button
                      onClick={() => dispatch({ type: 'DELETE_CATEGORY', payload: cat })}
                      className="opacity-0 group-hover:opacity-100 ml-1 p-1 text-slate-300 hover:text-red-400 transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </nav>

            {addingCat && (
              <form onSubmit={addCategory} className="mt-2 flex gap-1">
                  <input
                  autoFocus
                  value={newCat}
                  onChange={e => setNewCat(e.target.value)}
                  onBlur={() => { if (!newCat.trim()) setAddingCat(false) }}
                  placeholder="Category name"
                  className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none input-focus-accent"
                />
                <button
                  type="submit"
                  className="px-2 py-1.5 rounded-lg accent-bg accent-hover text-white text-sm transition-colors"
                >
                  Add
                </button>
              </form>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
