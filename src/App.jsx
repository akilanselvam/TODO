import { useState, useEffect } from 'react'
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
import SettingsView from './components/Settings/SettingsView'
import AuthButton from './components/Auth/AuthButton'
import { useTodo } from './context/TodoContext'
import { useLanguage } from './context/LanguageContext'
import LanguagePickerModal from './components/Language/LanguagePickerModal'
import ToastStack from './components/UI/ToastStack'
import { useTaskNotifications } from './hooks/useTaskNotifications'

function toDateInput(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function AppContent() {
  const { state, filteredTodos, backlogTodos, syncError } = useTodo()
  const { t, lang } = useLanguage()
  useTaskNotifications(state.todos, lang)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [viewMode, setViewMode] = useState('list')
  const [prevView, setPrevView] = useState('list')

  const goSettings = () => { setPrevView(viewMode); setViewMode('settings') }
  const goBack = () => setViewMode(prevView)

  const [isOnline, setIsOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  const [addOpen, setAddOpen] = useState(false)
  const [addInitial, setAddInitial] = useState(null)
  const [editingTodo, setEditingTodo] = useState(null)

  const openAdd = (initial = null) => { setAddInitial(initial); setAddOpen(true) }
  const openSlot = (day, time) => openAdd({ dueDate: toDateInput(day), dueTime: time })
  const openDay = day => openAdd({ dueDate: toDateInput(day) })
  const openEdit = todo => setEditingTodo(todo)

  const viewLabel = state.filter.view === 'today'
    ? t('view_today')
    : state.filter.view === 'tomorrow'
    ? t('view_tomorrow')
    : state.filter.category !== 'all'
    ? state.filter.category
    : t('view_all_tasks')

  const activeCount = filteredTodos.filter(t => !t.completed).length
  const totalCount = state.todos.length
  const doneCount = state.todos.filter(t => t.completed).length
  const activeTotalCount = state.todos.filter(t => !t.completed).length
  const highCount = state.todos.filter(t => t.priority === 'high' && !t.completed).length

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header onMenuToggle={() => setSidebarOpen(o => !o)} />
      <div className="flex flex-1 min-h-0">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 min-w-0 min-h-0 flex flex-col">
          {/* Toolbar — desktop only */}
          <div className="shrink-0 hidden lg:flex items-center gap-3 px-4 py-3 border-b border-[var(--panel)]">
            <ViewSwitcher value={viewMode} onChange={setViewMode} />
            <div className="flex-1" />
            <button
              onClick={() => openAdd()}
              className="flex items-center gap-1.5 px-4 py-2 accent-bg accent-hover text-white text-sm font-medium rounded-xl transition-all duration-150 active:scale-95 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Task</span>
            </button>
          </div>

          {/* Body */}
          {viewMode === 'list' ? (
            <div className="flex-1 min-h-0 overflow-y-auto pb-24 lg:pb-0">
              {/* Hero gradient */}
              <div className="hero-gradient px-5 pt-4 pb-14">
                <div className="max-w-2xl mx-auto">
                  {/* Embedded mobile header */}
                  <div className="flex items-center justify-between mb-5">
                    <button
                      onClick={() => setSidebarOpen(o => !o)}
                      className="p-2 -ml-2 rounded-xl text-white/70 hover:text-white transition-all duration-150 active:scale-90 active:bg-white/15"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <AuthButton onSettings={goSettings} compact />
                  </div>

                  <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">{dateLabel}</p>
                  <h1 className="text-2xl font-bold text-white mt-1">{viewLabel}</h1>
                  <p className="text-white/60 text-sm mt-0.5">
                    {lang === 'ta'
                      ? `${activeCount} ${activeCount !== 1 ? 'பணிகள்' : 'பணி'} மீதம்`
                      : `${activeCount} task${activeCount !== 1 ? 's' : ''} remaining`}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4">
                      <p className="text-3xl font-bold text-white">{doneCount}</p>
                      <p className="text-white/70 text-xs font-medium mt-1">{t('stat_done')}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                      <p className="text-3xl font-bold text-white">{activeTotalCount}</p>
                      <p className="text-white/70 text-xs font-medium mt-1">{t('stat_active')}</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4">
                      <p className="text-3xl font-bold text-white">{highCount}</p>
                      <p className="text-white/70 text-xs font-medium mt-1">{t('stat_high_priority')}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                      <p className="text-3xl font-bold text-white">{totalCount}</p>
                      <p className="text-white/70 text-xs font-medium mt-1">{t('stat_total')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating content sheet */}
              <div className="-mt-7 rounded-t-3xl bg-[var(--bg)]" style={{ minHeight: 'calc(100% - 220px)' }}>
                <div className="max-w-2xl mx-auto px-4 pt-5 pb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-[var(--text)]">{t('my_tasks')}</h2>
                    <span className="text-xs text-[var(--muted)]">
                      {lang === 'ta' ? `${filteredTodos.length} பணிகள்` : `${filteredTodos.length} task${filteredTodos.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <SearchBar />
                  <FilterBar />
                  <TodoList />
                </div>
              </div>
            </div>
          ) : viewMode === 'assistant' ? (
            <div className="flex-1 min-h-0 flex flex-col pb-16 lg:pb-0">
              {/* Mobile compact header */}
              <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-[var(--panel)]" style={{ borderColor: 'rgba(var(--accent-rgb),0.12)' }}>
                <button onClick={() => setSidebarOpen(o => !o)} className="p-2 -ml-2 rounded-xl text-[var(--muted)] active:scale-90 active:bg-[var(--bg)] transition-all duration-150">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-6 h-6 rounded-lg accent-bg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-[var(--text)]">{t('ai_assistant')}</span>
                </div>
                <AuthButton onSettings={goSettings} compact />
              </div>
              <AssistantView />
            </div>
          ) : viewMode === 'settings' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Settings header */}
              <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b bg-[var(--panel)]" style={{ borderColor: 'rgba(var(--accent-rgb),0.12)' }}>
                <button onClick={goBack} className="p-2 -ml-2 rounded-xl text-[var(--muted)] active:scale-90 active:bg-[var(--bg)] transition-all duration-150">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm font-bold text-[var(--text)]">{t('settings_title')}</span>
              </div>
              <SettingsView />
            </div>
          ) : (
            <div className="flex-1 min-h-0 pb-16 lg:pb-0">
              {/* Mobile compact header */}
              <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-[var(--panel)]" style={{ borderColor: 'rgba(var(--accent-rgb),0.12)' }}>
                <button onClick={() => setSidebarOpen(o => !o)} className="p-2 -ml-2 rounded-xl text-[var(--muted)] active:scale-90 active:bg-[var(--bg)] transition-all duration-150">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-6 h-6 rounded-lg accent-bg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-[var(--text)]">{viewMode === 'week' ? t('week_view') : t('month_view')}</span>
                </div>
                <AuthButton onSettings={goSettings} compact />
              </div>
              <CalendarView
                mode={viewMode}
                onSlotClick={openSlot}
                onDayClick={openDay}
                onTaskClick={openEdit}
              />
            </div>
          )}
        </main>
      </div>

      {/* FAB — floats above bottom nav */}
      <button
        onClick={() => openAdd()}
        className={`lg:hidden fixed z-50 w-14 h-14 rounded-2xl accent-bg flex items-center justify-center transition-all duration-150 active:scale-90 ${viewMode === 'settings' ? 'hidden' : ''}`}
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)',
          right: '20px',
          boxShadow: '0 8px 24px rgba(var(--accent-rgb), 0.45)',
        }}
        aria-label="Add task"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Mobile bottom nav — 4 tabs only */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--panel)]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          borderTop: '1px solid rgba(var(--accent-rgb), 0.08)',
        }}
      >
        <div className="flex items-center h-16">
          {[
            { id: 'list', label: t('nav_tasks'), icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            )},
            { id: 'assistant', label: t('nav_ai'), icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            )},
            { id: 'week', label: t('nav_week'), icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            )},
            { id: 'month', label: t('nav_month'), icon: (
              <>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={1.8} />
                <line x1="16" y1="2" x2="16" y2="6" strokeWidth={1.8} strokeLinecap="round" />
                <line x1="8" y1="2" x2="8" y2="6" strokeWidth={1.8} strokeLinecap="round" />
                <line x1="3" y1="10" x2="21" y2="10" strokeWidth={1.8} />
              </>
            )},
          ].map(tab => {
            const active = viewMode === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className="flex-1 flex flex-col items-center justify-center h-full gap-0.5 transition-all duration-150 active:scale-95 select-none"
              >
                <span
                  className="flex items-center justify-center w-10 h-6 rounded-full transition-all duration-200"
                  style={active ? { backgroundColor: 'rgba(var(--accent-rgb), 0.18)' } : {}}
                >
                  <svg
                    className="w-[18px] h-[18px] transition-colors duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}
                  >
                    {tab.icon}
                  </svg>
                </span>
                <span
                  className="text-[10px] font-semibold transition-colors duration-200"
                  style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-[80] flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-white" style={{ background: '#f59e0b' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
          </svg>
          You're offline — changes will sync when reconnected
        </div>
      )}

      {/* Sync error */}
      {syncError && (
        <div className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm shadow-lg">
          <span className="font-medium">Sync error:</span> {syncError}
        </div>
      )}

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="New Task">
        <TodoForm initial={addInitial} onClose={() => setAddOpen(false)} />
      </Modal>

      <Modal isOpen={!!editingTodo} onClose={() => setEditingTodo(null)} title="Edit Task">
        {editingTodo && <TodoForm todo={editingTodo} onClose={() => setEditingTodo(null)} />}
      </Modal>

      <LanguagePickerModal />
      <ToastStack />
    </div>
  )
}

export default function App() {
  return <AppContent />
}
