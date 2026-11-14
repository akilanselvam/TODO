import { useEffect } from 'react'
import { PriorityBadge, CategoryBadge } from '../UI/Badge'
import { formatTimeLabel } from '../../utils/calendar'
import { useLanguage } from '../../context/LanguageContext'

function formatDate(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (date.toDateString() === today.toDateString()) return { label: 'Today', overdue: false }
  if (date.toDateString() === tomorrow.toDateString()) return { label: 'Tomorrow', overdue: false }
  const overdue = date < today && date.toDateString() !== today.toDateString()
  return { label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), overdue }
}

export default function TaskDetail({ isOpen, todo, onClose, onEdit, onDelete, onToggle }) {
  const { t, lang } = useLanguage()
  useEffect(() => {
    if (!isOpen) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen || !todo) return null

  const dateInfo = formatDate(todo.dueDate)
  const subtasksDone = todo.subtasks?.filter(s => s.completed).length ?? 0
  const subtasksTotal = todo.subtasks?.length ?? 0

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col justify-end"
      style={{ touchAction: 'none' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative rounded-t-3xl"
        style={{ background: 'var(--panel)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(var(--accent-rgb),0.25)' }} />
        </div>

        <div style={{ padding: '16px 24px 0' }}>
          {/* Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <PriorityBadge priority={todo.priority} />
            <CategoryBadge category={todo.category} />
            {todo.completed && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>● {t('label_completed')}</span>
            )}
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: 22, fontWeight: 800, lineHeight: 1.3,
            color: 'var(--text)',
            textDecoration: todo.completed ? 'line-through' : 'none',
            marginBottom: 8,
          }}>
            {todo.title}
          </h2>

          {/* Description */}
          {todo.description && (
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
              {todo.description}
            </p>
          )}

          {/* Meta row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {dateInfo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(var(--accent-rgb),0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    style={{ color: dateInfo.overdue ? '#f87171' : 'var(--accent)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: dateInfo.overdue ? '#f87171' : 'var(--text)' }}>
                  {dateInfo.label}
                  {todo.dueTime ? ` · ${formatTimeLabel(todo.dueTime)}` : ''}
                  {dateInfo.overdue && <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 6, color: '#f87171' }}>{t('label_overdue')}</span>}
                </span>
              </div>
            )}

            {subtasksTotal > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(var(--accent-rgb),0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  {lang === 'ta' ? `${subtasksTotal} இல் ${subtasksDone} முடிந்தது` : `${subtasksDone} of ${subtasksTotal} subtasks done`}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
            {/* Complete toggle */}
            <button
              onClick={() => { onToggle(); onClose() }}
              className="active:scale-95 transition-all duration-150"
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 14,
                border: 'none',
                background: todo.completed ? 'rgba(var(--accent-rgb),0.15)' : 'var(--accent)',
                color: todo.completed ? 'var(--accent)' : '#fff',
                fontSize: 14, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {todo.completed ? t('btn_mark_incomplete') : t('btn_mark_complete')}
            </button>

            {/* Edit */}
            <button
              onClick={onEdit}
              className="active:scale-95 transition-all duration-150"
              style={{
                width: 48, height: 48,
                borderRadius: 14,
                border: 'none',
                background: 'rgba(var(--accent-rgb),0.12)',
                color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            {/* Delete */}
            <button
              onClick={onDelete}
              className="active:scale-95 transition-all duration-150"
              style={{
                width: 48, height: 48,
                borderRadius: 14,
                border: 'none',
                background: 'rgba(239,68,68,0.12)',
                color: '#f87171',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
