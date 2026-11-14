import { useState, useRef } from 'react'
import { useTodo } from '../../context/TodoContext'
import { useLanguage } from '../../context/LanguageContext'
import { PriorityBadge, CategoryBadge } from '../UI/Badge'
import SubtaskList from './SubtaskList'
import Modal from '../UI/Modal'
import TodoForm from './TodoForm'
import TaskDetail from './TaskDetail'
import { formatTimeLabel } from '../../utils/calendar'

function formatDate(dateStr, dueTime) {
  if (!dateStr) return null
  const now = new Date()
  const today = new Date()
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const date = new Date(dateStr)
  if (date.toDateString() === today.toDateString()) {
    if (dueTime) {
      const [h, m] = dueTime.split(':').map(Number)
      const due = new Date(dateStr); due.setHours(h, m, 0, 0)
      return { label: 'Today', overdue: due < now }
    }
    return { label: 'Today', overdue: false }
  }
  if (date.toDateString() === tomorrow.toDateString()) return { label: 'Tomorrow', overdue: false }
  return { label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: date < today }
}

const priorityBorderColor = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
}

const SWIPE_THRESHOLD = 72

export default function TodoItem({ todo, isDragging, isDragOver, onDragStart, onDragEnd }) {
  const { dispatch } = useTodo()
  const { t, lang } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  // Swipe state
  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const gestureRef = useRef({ active: false, startX: 0, startY: 0, locked: false })
  const wasSwiped = useRef(false)

  const dateInfo = formatDate(todo.dueDate, todo.dueTime)
  const subtasksDone = todo.subtasks.filter(s => s.completed).length

  function onPointerDown(e) {
    if (e.target.closest('button')) return
    gestureRef.current = { active: true, startX: e.clientX, startY: e.clientY, locked: false }
    wasSwiped.current = false
  }

  function onPointerMove(e) {
    const g = gestureRef.current
    if (!g.active) return
    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    if (!g.locked) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        if (Math.abs(dx) > Math.abs(dy) * 1.3) {
          g.locked = true
          setIsSwiping(true)
          wasSwiped.current = true
          e.preventDefault()
        } else {
          g.active = false
        }
      }
      return
    }
    setSwipeX(Math.max(-110, Math.min(110, dx)))
  }

  function onPointerUp() {
    const g = gestureRef.current
    if (!g.active) { setIsSwiping(false); return }
    g.active = false
    setIsSwiping(false)
    setSwipeX(prev => {
      if (prev > SWIPE_THRESHOLD) {
        dispatch({ type: 'TOGGLE_TODO', payload: todo.id })
      } else if (prev < -SWIPE_THRESHOLD) {
        setConfirmDelete(true)
      }
      return 0
    })
  }

  function onCardClick() {
    if (wasSwiped.current) return
    setDetailOpen(true)
  }

  const actionProgress = Math.min(1, Math.abs(swipeX) / SWIPE_THRESHOLD)
  const isSwipingRight = swipeX > 8
  const isSwipingLeft = swipeX < -8

  return (
    <>
      {/* Drop target indicator */}
      {isDragOver && (
        <div style={{ height: 3, borderRadius: 2, background: 'var(--accent)', margin: '2px 0', opacity: 0.8 }} />
      )}

      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ opacity: isDragging ? 0.4 : 1, transition: 'opacity 150ms ease' }}
        draggable={!todo.completed}
        onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.() }}
        onDragEnd={onDragEnd}
      >
        {/* Background action layers */}
        <div
          className="absolute inset-0 flex items-center rounded-2xl"
          style={{
            background: '#16a34a',
            opacity: isSwipingRight ? actionProgress : 0,
            transition: isSwiping ? 'none' : 'opacity 200ms ease',
          }}
        >
          <div style={{ paddingLeft: 20 }}>
            <svg width="22" height="22" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div
          className="absolute inset-0 flex items-center justify-end rounded-2xl"
          style={{
            background: '#dc2626',
            opacity: isSwipingLeft ? actionProgress : 0,
            transition: isSwiping ? 'none' : 'opacity 200ms ease',
          }}
        >
          <div style={{ paddingRight: 20 }}>
            <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        </div>

        {/* Card */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onClick={onCardClick}
          className={`group bg-[var(--panel)] rounded-2xl shadow-sm overflow-hidden cursor-pointer ${
            todo.completed ? 'opacity-60' : 'hover:shadow-md'
          }`}
          style={{
            borderLeft: `4px solid ${priorityBorderColor[todo.priority]}`,
            transform: `translateX(${swipeX}px)`,
            transition: isSwiping ? 'none' : 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 150ms ease',
            touchAction: 'pan-y',
            userSelect: 'none',
          }}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* Drag handle */}
              {!todo.completed && (
                <div
                  className="mt-1 flex-shrink-0 cursor-grab active:cursor-grabbing opacity-30 hover:opacity-60 transition-opacity"
                  style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '2px 0' }}
                  onClick={e => e.stopPropagation()}
                >
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 14, height: 2, borderRadius: 1, background: 'var(--muted)' }} />
                  ))}
                </div>
              )}

              {/* Checkbox */}
              <button
                onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_TODO', payload: todo.id }) }}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 active:scale-90 ${
                  todo.completed
                    ? 'accent-bg border-[var(--accent)]'
                    : 'border-[var(--muted)] hover:border-[var(--accent)]'
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
                <p className={`text-sm font-semibold leading-snug ${
                  todo.completed ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]'
                }`}>
                  {todo.title}
                </p>
                {todo.description && (
                  <p className="mt-0.5 text-xs text-[var(--muted)] line-clamp-2">{todo.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <PriorityBadge priority={todo.priority} />
                  <CategoryBadge category={todo.category} />
                  {dateInfo && (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      dateInfo.overdue && !todo.completed ? 'text-red-400' : 'text-[var(--muted)]'
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {dateInfo.label}{todo.dueTime ? `, ${formatTimeLabel(todo.dueTime)}` : ''}
                    </span>
                  )}
                  {dateInfo?.overdue && !todo.completed && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
                      padding: '2px 7px', borderRadius: 20,
                      background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                    }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                        <circle cx="4" cy="4" r="4" />
                      </svg>
                      {lang === 'ta' ? 'தாமதம்' : 'Overdue'}
                    </span>
                  )}
                  {todo.subtasks.length > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
                      className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {subtasksDone}/{todo.subtasks.length}
                    </button>
                  )}
                </div>
              </div>

              {/* Quick actions (edit/delete) — desktop hover, hidden on mobile since we have swipe + detail */}
              <div className="hidden lg:flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); setEditing(true) }}
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all duration-150 active:scale-90"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 active:scale-90"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {expanded && (
              <div className="mt-3 ml-8">
                <SubtaskList todo={todo} />
              </div>
            )}
          </div>
        </div>
      </div>

      <TaskDetail
        isOpen={detailOpen}
        todo={todo}
        onClose={() => setDetailOpen(false)}
        onEdit={() => { setDetailOpen(false); setEditing(true) }}
        onDelete={() => { setDetailOpen(false); setConfirmDelete(true) }}
        onToggle={() => dispatch({ type: 'TOGGLE_TODO', payload: todo.id })}
      />

      <Modal isOpen={editing} onClose={() => setEditing(false)} title="Edit Task">
        <TodoForm todo={todo} onClose={() => setEditing(false)} />
      </Modal>

      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Task">
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          <strong style={{ color: 'var(--text)' }}>"{todo.title}"</strong> — {t('delete_confirm_msg')}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirmDelete(false)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-all"
            style={{ background: 'rgba(var(--accent-rgb),0.08)', color: 'var(--muted)', border: 'none' }}
          >
            {t('btn_cancel')}
          </button>
          <button
            onClick={() => { dispatch({ type: 'DELETE_TODO', payload: todo.id }); setConfirmDelete(false) }}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold active:scale-95 transition-all"
            style={{ border: 'none' }}
          >
            {t('btn_delete')}
          </button>
        </div>
      </Modal>
    </>
  )
}
