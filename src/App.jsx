import { useState } from 'react'
import Header from './components/Layout/Header'
import Sidebar from './components/Layout/Sidebar'
import TodoList from './components/Todo/TodoList'
import TodoForm from './components/Todo/TodoForm'
import Modal from './components/UI/Modal'
import ViewSwitcher from './components/UI/ViewSwitcher'
import SearchBar from './components/Filters/SearchBar'
import FilterBar from './components/Filters/FilterBar'
import CalendarView from './components/Calendar/CalendarView'
import AssistantView from './components/Assistant/AssistantView'
import { useTodo } from './context/TodoContext'

function toDateInput(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function AppContent() {
  const { state, filteredTodos, syncError } = useTodo()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [viewMode, setViewMode] = useState('list')
  const [addOpen, setAddOpen] = useState(false)
  const [addInitial, setAddInitial] = useState(null)
  const [editingTodo, setEditingTodo] = useState(null)

  const openAdd = (initial = null) => { setAddInitial(initial); setAddOpen(true) }
  const openSlot = (day, time) => openAdd({ dueDate: toDateInput(day), dueTime: time })
  const openDay = day => openAdd({ dueDate: toDateInput(day) })
  const openEdit = todo => setEditingTodo(todo)

  const viewLabel = state.filter.view === 'today'
    ? 'Today'
    : state.filter.view === 'tomorrow'
    ? 'Tomorrow'
    : state.filter.category !== 'all'
    ? state.filter.category
    : 'All Tasks'
  const activeCount = filteredTodos.filter(t => !t.completed).length

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header onMenuToggle={() => setSidebarOpen(o => !o)} />
      <div className="flex flex-1 min-h-0">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 min-w-0 min-h-0 flex flex-col">
          {/* Toolbar */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <ViewSwitcher value={viewMode} onChange={setViewMode} />
            <div className="flex-1" />
            <button
              onClick={() => openAdd()}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 accent-bg accent-hover text-sm font-medium rounded-xl transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Task</span>
            </button>
          </div>

          {/* Body */}
          {viewMode === 'list' ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
                <div>
                  <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{viewLabel}</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeCount} task{activeCount !== 1 ? 's' : ''} remaining
                  </p>
                </div>
                <SearchBar />
                <FilterBar />
                <TodoList />
              </div>
            </div>
          ) : viewMode === 'assistant' ? (
            <AssistantView />
          ) : (
            <CalendarView
              mode={viewMode}
              onSlotClick={openSlot}
              onDayClick={openDay}
              onTaskClick={openEdit}
            />
          )}
        </main>
      </div>

      {syncError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm shadow-lg">
          <span className="font-medium">Sync error:</span> {syncError}
        </div>
      )}

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="New Task">
        <TodoForm initial={addInitial} onClose={() => setAddOpen(false)} />
      </Modal>

      <Modal isOpen={!!editingTodo} onClose={() => setEditingTodo(null)} title="Edit Task">
        {editingTodo && <TodoForm todo={editingTodo} onClose={() => setEditingTodo(null)} />}
      </Modal>
    </div>
  )
}

export default function App() {
  return <AppContent />
}
