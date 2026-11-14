import { useState, useEffect } from 'react'
import { useTodo } from '../../context/TodoContext'
import { useLanguage } from '../../context/LanguageContext'
import {
  WEEKDAY_LABELS, getWeekDays, isSameDay, isToday, formatTimeLabel, minutesOf,
} from '../../utils/calendar'

const priorityStyle = {
  high:   { dot: '#ef4444', border: '#ef4444', bg: 'rgba(239,68,68,0.12)',   text: '#fca5a5' },
  medium: { dot: '#f59e0b', border: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: '#fcd34d' },
  low:    { dot: '#22c55e', border: '#22c55e', bg: 'rgba(34,197,94,0.12)',  text: '#86efac' },
}

export default function WeekView({ cursor, onSlotClick, onTaskClick }) {
  const { calendarTodos } = useTodo()
  const { t, lang } = useLanguage()
  const days = getWeekDays(cursor)

  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date()
    return days.find(d => isSameDay(d, today)) || days[0]
  })

  useEffect(() => {
    const today = new Date()
    setSelectedDay(days.find(d => isSameDay(d, today)) || days[0])
  }, [cursor]) // eslint-disable-line

  const tasksForDay = day =>
    calendarTodos
      .filter(t => isSameDay(new Date(t.dueDate), day))
      .sort((a, b) => {
        if (!a.dueTime && !b.dueTime) return 0
        if (!a.dueTime) return -1
        if (!b.dueTime) return 1
        return a.dueTime.localeCompare(b.dueTime)
      })

  const selectedTasks = tasksForDay(selectedDay)

  const selLabel = selectedDay.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Day-strip */}
      <div style={{ background: 'var(--panel)', borderBottom: '1px solid rgba(var(--accent-rgb),0.12)', padding: '10px 12px 12px' }}>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {days.map((day, i) => {
            const active = isSameDay(day, selectedDay)
            const today = isToday(day)
            const count = tasksForDay(day).length
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(day)}
                className="transition-all duration-150 active:scale-90"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                  padding: '10px 10px 8px',
                  borderRadius: '20px',
                  background: active
                    ? 'var(--accent)'
                    : today
                    ? 'rgba(var(--accent-rgb),0.14)'
                    : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  minWidth: '44px',
                  flexShrink: 0,
                }}
              >
                <span style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: active ? 'rgba(255,255,255,0.75)' : today ? 'var(--accent)' : 'var(--muted)',
                }}>
                  {WEEKDAY_LABELS[i].slice(0, 1)}
                </span>
                <span style={{
                  fontSize: '20px', fontWeight: 800, lineHeight: 1,
                  color: active ? '#fff' : today ? 'var(--accent)' : 'var(--text)',
                }}>
                  {day.getDate()}
                </span>
                {/* task count dot */}
                <span style={{
                  width: count > 0 ? '5px' : '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: count > 0
                    ? active ? 'rgba(255,255,255,0.7)' : 'var(--accent)'
                    : 'transparent',
                  transition: 'background 200ms',
                }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day header */}
      <div style={{ padding: '20px 20px 8px', background: 'var(--bg)' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>
          {selLabel}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
          {selectedTasks.length === 0
            ? t('no_tasks_label')
            : lang === 'ta'
              ? `${selectedTasks.length} பணிகள்`
              : `${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 100px' }}>
        {selectedTasks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '48px', gap: '12px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '20px',
              background: 'rgba(var(--accent-rgb),0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{t('no_tasks_selected')}</p>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>{t('hint_tap_add')}</p>
            </div>
            <button
              onClick={() => onSlotClick(selectedDay, '09:00')}
              className="active:scale-95"
              style={{
                marginTop: '4px', padding: '10px 24px', borderRadius: '14px',
                background: 'var(--accent)', border: 'none', color: '#fff',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {t('btn_add_task')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {selectedTasks.map((task, idx) => {
              const ps = priorityStyle[task.priority]
              const isLast = idx === selectedTasks.length - 1
              return (
                <div key={task.id} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  {/* Timeline */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '14px', flexShrink: 0 }}>
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: ps.dot, flexShrink: 0,
                      boxShadow: `0 0 8px ${ps.dot}60`,
                    }} />
                    {!isLast && (
                      <div style={{
                        width: '2px', flex: 1, minHeight: '28px', marginTop: '4px',
                        background: 'linear-gradient(to bottom, rgba(var(--accent-rgb),0.25), rgba(var(--accent-rgb),0.05))',
                        borderRadius: '1px',
                      }} />
                    )}
                  </div>

                  {/* Card */}
                  <button
                    onClick={() => onTaskClick(task)}
                    className="active:scale-[0.98]"
                    style={{
                      flex: 1, textAlign: 'left',
                      padding: '12px 14px',
                      marginBottom: isLast ? '0' : '10px',
                      borderRadius: '18px',
                      background: 'var(--panel)',
                      borderLeft: `3px solid ${ps.border}`,
                      border: 'none', // reset
                      borderLeftWidth: '3px',
                      borderLeftStyle: 'solid',
                      borderLeftColor: ps.border,
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      opacity: task.completed ? 0.55 : 1,
                    }}
                  >
                    {task.dueTime && (
                      <p style={{
                        fontSize: '11px', fontWeight: 700, color: 'var(--muted)',
                        marginBottom: '4px', letterSpacing: '0.03em', textTransform: 'uppercase',
                      }}>
                        {formatTimeLabel(task.dueTime)}
                      </p>
                    )}
                    <p style={{
                      fontSize: '15px', fontWeight: 700, color: 'var(--text)',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      lineHeight: 1.3,
                    }}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p style={{
                        fontSize: '12px', color: 'var(--muted)', marginTop: '4px',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {task.description}
                      </p>
                    )}
                  </button>
                </div>
              )
            })}

            {/* Add more */}
            <button
              onClick={() => onSlotClick(selectedDay, '12:00')}
              className="active:scale-[0.98]"
              style={{
                marginTop: '12px', padding: '12px', width: '100%',
                borderRadius: '16px',
                border: '1.5px dashed rgba(var(--accent-rgb),0.3)',
                background: 'transparent', color: 'var(--muted)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {t('btn_add_task')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
