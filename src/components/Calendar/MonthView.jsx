import { useState } from 'react'
import { useTodo } from '../../context/TodoContext'
import { useLanguage } from '../../context/LanguageContext'
import {
  WEEKDAY_LABELS, getMonthMatrix, isSameDay, isToday, formatTimeLabel, minutesOf,
} from '../../utils/calendar'

const priorityDot = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#22c55e',
}

const priorityStyle = {
  high:   { border: '#ef4444', bg: 'rgba(239,68,68,0.12)',   text: '#fca5a5' },
  medium: { border: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: '#fcd34d' },
  low:    { border: '#22c55e', bg: 'rgba(34,197,94,0.12)',  text: '#86efac' },
}

export default function MonthView({ cursor, onDayClick, onTaskClick }) {
  const { calendarTodos } = useTodo()
  const { t, lang } = useLanguage()
  const weeks = getMonthMatrix(cursor)
  const currentMonth = cursor.getMonth()

  const [selectedDay, setSelectedDay] = useState(() => new Date())

  const tasksFor = day =>
    calendarTodos
      .filter(t => isSameDay(new Date(t.dueDate), day))
      .sort((a, b) => {
        const am = a.dueTime ? minutesOf(a.dueTime) : -1
        const bm = b.dueTime ? minutesOf(b.dueTime) : -1
        return am - bm
      })

  const selectedTasks = tasksFor(selectedDay)

  const handleDayClick = day => {
    setSelectedDay(day)
    // also call onDayClick if it's a double-tap-like intent, but single tap selects
  }

  const selLabel = selectedDay.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Calendar grid — fixed section */}
      <div style={{ background: 'var(--bg)', flexShrink: 0 }}>
        {/* Weekday labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 4px' }}>
          {WEEKDAY_LABELS.map(d => (
            <div
              key={d}
              style={{
                padding: '8px 0 6px',
                textAlign: 'center',
                fontSize: '11px', fontWeight: 700,
                color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
              {d.slice(0, 2)}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div style={{ padding: '0 4px' }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '2px' }}>
              {week.map((day, di) => {
                const inMonth = day.getMonth() === currentMonth
                const today = isToday(day)
                const selected = isSameDay(day, selectedDay)
                const dayTasks = tasksFor(day)
                const dots = dayTasks.slice(0, 3)

                return (
                  <button
                    key={di}
                    onClick={() => handleDayClick(day)}
                    className="transition-all duration-150 active:scale-90"
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '4px 2px 6px',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: selected && !today ? 'rgba(var(--accent-rgb),0.14)' : 'transparent',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {/* Date number */}
                    <span style={{
                      width: '32px', height: '32px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '50%',
                      fontSize: '14px', fontWeight: today || selected ? 800 : inMonth ? 500 : 400,
                      background: today ? 'var(--accent)' : 'transparent',
                      color: today
                        ? '#fff'
                        : selected
                        ? 'var(--accent)'
                        : inMonth
                        ? 'var(--text)'
                        : 'var(--muted)',
                      opacity: inMonth ? 1 : 0.35,
                    }}>
                      {day.getDate()}
                    </span>

                    {/* Priority dots */}
                    <div style={{ display: 'flex', gap: '2px', marginTop: '3px', height: '5px' }}>
                      {dots.map((t, ti) => (
                        <span
                          key={ti}
                          style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            background: priorityDot[t.priority],
                            opacity: inMonth ? 1 : 0.4,
                          }}
                        />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Divider with selected date label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 20px 10px',
        borderTop: '1px solid rgba(var(--accent-rgb),0.12)',
      }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {selLabel}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '1px' }}>
            {selectedTasks.length === 0
              ? t('no_tasks_label')
              : lang === 'ta'
                ? `${selectedTasks.length} பணிகள்`
                : `${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => onDayClick(selectedDay)}
          className="active:scale-90"
          style={{
            marginLeft: 'auto', padding: '7px 16px', borderRadius: '12px',
            background: 'rgba(var(--accent-rgb),0.15)', border: 'none',
            color: 'var(--accent)', fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          {t('btn_add_task')}
        </button>
      </div>

      {/* Task list for selected day */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 100px' }}>
        {selectedTasks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '32px', gap: '8px', opacity: 0.6 }}>
            <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>{t('no_tasks_day')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedTasks.map(task => {
              const ps = priorityStyle[task.priority]
              return (
                <button
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="active:scale-[0.98]"
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: '16px',
                    background: 'var(--panel)',
                    borderLeft: 'none',
                    borderLeftWidth: '3px',
                    borderLeftStyle: 'solid',
                    borderLeftColor: ps.border,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    opacity: task.completed ? 0.55 : 1,
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}
                >
                  {/* Priority dot */}
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: ps.border, flexShrink: 0,
                    boxShadow: `0 0 6px ${ps.border}60`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {task.dueTime && (
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {formatTimeLabel(task.dueTime)}
                      </p>
                    )}
                    <p style={{
                      fontSize: '14px', fontWeight: 600, color: 'var(--text)',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {task.title}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
