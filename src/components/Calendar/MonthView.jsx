import { useTodo } from '../../context/TodoContext'
import {
  WEEKDAY_LABELS, getMonthMatrix, isSameDay, isToday, formatTimeLabel, minutesOf,
} from '../../utils/calendar'

const priorityChip = {
  high: 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900/40 dark:border-red-500 dark:text-red-200',
  medium: 'bg-amber-100 border-amber-400 text-amber-800 dark:bg-amber-900/40 dark:border-amber-500 dark:text-amber-200',
  low: 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/40 dark:border-green-500 dark:text-green-200',
}

const MAX_CHIPS = 3

export default function MonthView({ cursor, onDayClick, onTaskClick }) {
  const { calendarTodos } = useTodo()
  const weeks = getMonthMatrix(cursor)
  const currentMonth = cursor.getMonth()

  const tasksFor = day =>
    calendarTodos
      .filter(t => isSameDay(new Date(t.dueDate), day))
      .sort((a, b) => {
        // all-day first, then by time
        const am = a.dueTime ? minutesOf(a.dueTime) : -1
        const bm = b.dueTime ? minutesOf(b.dueTime) : -1
        return am - bm
      })

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-auto">
      <div className="min-w-[640px] flex flex-col flex-1">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 shrink-0">
          {WEEKDAY_LABELS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="grid grid-rows-6 flex-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700/60 last:border-b-0">
              {week.map((day, di) => {
                const inMonth = day.getMonth() === currentMonth
                const dayTasks = tasksFor(day)
                const shown = dayTasks.slice(0, MAX_CHIPS)
                const extra = dayTasks.length - shown.length
                return (
                  <div
                    key={di}
                    onClick={() => onDayClick(day)}
                    className={`min-h-[92px] p-1.5 border-l border-slate-100 dark:border-slate-700/60 first:border-l-0 cursor-pointer transition-colors hover:bg-[var(--panel)] dark:hover:bg-[var(--panel)] ${
                      inMonth ? '' : 'bg-slate-50/60 dark:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex justify-end">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${
                        isToday(day)
                          ? 'accent-bg text-white'
                          : inMonth
                          ? 'text-slate-600 dark:text-slate-300'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}>
                        {day.getDate()}
                      </span>
                    </div>

                    <div className="mt-1 space-y-1">
                      {shown.map(t => (
                        <button
                          key={t.id}
                          onClick={e => { e.stopPropagation(); onTaskClick(t) }}
                          className={`w-full flex items-center gap-1 px-1.5 py-0.5 rounded border-l-2 text-[11px] font-medium truncate ${priorityChip[t.priority]} ${t.completed ? 'line-through opacity-60' : ''}`}
                          title={`${t.dueTime ? formatTimeLabel(t.dueTime) + ' · ' : ''}${t.title}`}
                        >
                          {t.dueTime && (
                            <span className="opacity-70 tabular-nums shrink-0">{formatTimeLabel(t.dueTime).replace(' ', '')}</span>
                          )}
                          <span className="truncate">{t.title}</span>
                        </button>
                      ))}
                      {extra > 0 && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 pl-1">+{extra} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
