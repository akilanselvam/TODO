import { useState } from 'react'
import { useTodo } from '../../context/TodoContext'

export default function FilterBar() {
  const { state, dispatch } = useTodo()
  const { status, priority, view, category } = state.filter
  const [activePanel, setActivePanel] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const togglePanel = (panel) => setActivePanel((current) => (current === panel ? null : panel))
  const toggleDropdown = () => setDropdownOpen((current) => !current)

  const summaryBtn = (active) =>
    `inline-flex min-w-[8rem] max-w-[12rem] shrink-0 items-center justify-between gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/95 px-4 py-3 text-left text-sm font-medium text-slate-100 transition hover:border-slate-500/70 hover:bg-slate-800/95 dark:border-slate-700 dark:bg-slate-950/95 dark:hover:bg-slate-900`

  const optionBtn = (active) =>
    `rounded-full px-3 py-2 text-xs font-semibold transition ${
      active
        ? 'accent-bg text-white shadow-sm'
        : 'bg-slate-800 text-slate-200 hover:bg-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
    }`

  const labelize = (value) =>
    value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)

  const renderFilterGroup = (title, items, activeValue, payloadKey, compareFn) => (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-slate-300">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = compareFn(item, activeValue)
          return (
            <button
              key={item}
              type="button"
              onClick={() => dispatch({ type: 'SET_FILTER', payload: { [payloadKey]: item } })}
              className={optionBtn(active)}
            >
              {item === 'all' ? (payloadKey === 'category' ? 'All categories' : 'All') : labelize(item)}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="lg:hidden">
        <button
          type="button"
          className="inline-flex w-full items-center justify-between rounded-2xl border border-slate-700/80 bg-slate-900/95 px-4 py-3 text-sm font-semibold text-slate-100 shadow-sm transition hover:border-slate-500/70 hover:bg-slate-800/95 dark:border-slate-700 dark:bg-slate-950/95 dark:hover:bg-slate-900"
          onClick={toggleDropdown}
        >
          <span className="truncate">Filters</span>
          <svg className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="mt-3 space-y-3 rounded-3xl border border-slate-700/80 bg-slate-950/90 p-3 shadow-lg">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {['status', 'date', 'priority', 'category'].map((field) => (
                <button
                  key={field}
                  type="button"
                  onClick={() => togglePanel(field)}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                    activePanel === field
                      ? 'accent-bg text-white'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-700/80">
              {activePanel ? (
                <div className="space-y-4">
                  {activePanel === 'status' && renderFilterGroup('Status filters', ['all', 'active', 'completed'], status, 'status', (item, active) => item === active)}
                  {activePanel === 'date' && renderFilterGroup('Date filters', ['all', 'today', 'tomorrow'], view, 'view', (item, active) => item === active)}
                  {activePanel === 'priority' && renderFilterGroup('Priority filters', ['all', 'high', 'medium', 'low'], priority, 'priority', (item, active) => item === active)}
                  {activePanel === 'category' && renderFilterGroup('Category filters', ['all', ...state.categories], category, 'category', (item, active) => item === active)}
                </div>
              ) : (
                <div className="text-sm text-slate-400">Select a filter category to see its options.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="hidden lg:flex gap-3 overflow-x-auto pb-2 px-1">
        <button
          type="button"
          className={summaryBtn(activePanel === 'status')}
          onClick={() => togglePanel('status')}
        >
          <span className="truncate">Status: {labelize(status)}</span>
          <svg className={`h-4 w-4 transition-transform ${activePanel === 'status' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <button
          type="button"
          className={summaryBtn(activePanel === 'date')}
          onClick={() => togglePanel('date')}
        >
          <span className="truncate">Date: {view === 'today' ? 'Today' : view === 'tomorrow' ? 'Tomorrow' : 'All days'}</span>
          <svg className={`h-4 w-4 transition-transform ${activePanel === 'date' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <button
          type="button"
          className={summaryBtn(activePanel === 'priority')}
          onClick={() => togglePanel('priority')}
        >
          <span className="truncate">Priority: {labelize(priority)}</span>
          <svg className={`h-4 w-4 transition-transform ${activePanel === 'priority' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <button
          type="button"
          className={summaryBtn(activePanel === 'category')}
          onClick={() => togglePanel('category')}
        >
          <span className="truncate">Category: {category === 'all' ? 'All categories' : category}</span>
          <svg className={`h-4 w-4 transition-transform ${activePanel === 'category' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="hidden lg:block rounded-3xl border border-slate-700/80 bg-slate-950/90 p-3 shadow-lg">
        {activePanel === 'status' && renderFilterGroup('Status filters', ['all', 'active', 'completed'], status, 'status', (item, active) => item === active)}
        {activePanel === 'date' && renderFilterGroup('Date filters', ['all', 'today', 'tomorrow'], view, 'view', (item, active) => item === active)}
        {activePanel === 'priority' && renderFilterGroup('Priority filters', ['all', 'high', 'medium', 'low'], priority, 'priority', (item, active) => item === active)}
        {activePanel === 'category' && renderFilterGroup('Category filters', ['all', ...state.categories], category, 'category', (item, active) => item === active)}
        {!activePanel && <div className="text-sm text-slate-400">Tap a filter button to open options.</div>}
      </div>
    </div>
  )
}
