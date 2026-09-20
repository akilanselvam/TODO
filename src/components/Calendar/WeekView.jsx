import { useTodo } from '../../context/TodoContext'
import {
  HOURS, HOUR_HEIGHT, WEEKDAY_LABELS,
  getWeekDays, isSameDay, isToday, layoutDayTasks, formatHour, formatTimeLabel,
} from '../../utils/calendar'

const priorityBlock = {
  high: 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900/40 dark:border-red-500 dark:text-red-200',
  medium: 'bg-amber-100 border-amber-400 text-amber-800 dark:bg-amber-900/40 dark:border-amber-500 dark:text-amber-200',
  low: 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/40 dark:border-green-500 dark:text-green-200',
}
export default function WeekView({ cursor, onSlotClick, onTaskClick }) {
  const { calendarTodos } = useTodo()
  const days = getWeekDays(cursor)

  const tasksFor = day => calendarTodos.filter(t => isSameDay(new Date(t.dueDate), day))
  const allDayFor = day => tasksFor(day).filter(t => !t.dueTime)
  const timedFor = day => tasksFor(day).filter(t => t.dueTime)

  const hasAnyAllDay = days.some(d => allDayFor(d).length > 0)

  return (
    <div className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="w-full min-w-0">
        {/* Day headers */}
        <div className="flex sticky top-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur border-b border-slate-200 dark:border-slate-700">
          <div className="w-8 sm:w-14 shrink-0 sticky left-0 bg-white/95 dark:bg-slate-800/95 z-10" />
          {days.map((day, i) => (
            <div key={i} className="flex-1 py-2 text-center border-l border-slate-100 dark:border-slate-700/60">
              <div className="text-[9px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <span className="sm:hidden">{WEEKDAY_LABELS[i].slice(0, 1)}</span>
                <span className="hidden sm:inline">{WEEKDAY_LABELS[i]}</span>
              </div>
              <div className={`mx-auto mt-0.5 w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-[11px] sm:text-sm font-medium ${
                isToday(day)
                  ? 'accent-bg text-white'
                  : 'text-slate-700 dark:text-slate-200'
              }`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* All-day row */}
        {hasAnyAllDay && (
          <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="w-8 sm:w-14 shrink-0 sticky left-0 bg-slate-50/60 dark:bg-slate-800/40 flex items-start justify-end pr-1.5 pt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
              <span className="hidden sm:inline">all-day</span>
            </div>
            {days.map((day, i) => (
              <div key={i} className="flex-1 min-h-[32px] p-1 space-y-1 border-l border-slate-100 dark:border-slate-700/60">
                {allDayFor(day).map(t => (
                  <button
                    key={t.id}
                    onClick={() => onTaskClick(t)}
                    className={`w-full min-w-0 text-left px-0.5 sm:px-1.5 py-0.5 rounded border-l-2 text-[9px] sm:text-[11px] font-medium truncate ${priorityBlock[t.priority]} ${t.completed ? 'line-through opacity-60' : ''}`}
                    title={t.title}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Time grid */}
        <div className="flex">
          {/* Hour gutter */}
          <div className="w-8 sm:w-14 shrink-0 sticky left-0 bg-white dark:bg-slate-800 z-10">
            {HOURS.map(h => (
              <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
                <span className="absolute -top-2 right-1 sm:right-1.5 text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-500">
                  {h === 0 ? '' : formatHour(h)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, i) => {
            const laidOut = layoutDayTasks(timedFor(day))
            return (
              <div key={i} className="flex-1 min-w-0 relative border-l border-slate-100 dark:border-slate-700/60">
                {/* hour cells (click to add) */}
                {HOURS.map(h => (
                  <div
                    key={h}
                    style={{ height: HOUR_HEIGHT }}
                    onClick={() => onSlotClick(day, `${String(h).padStart(2, '0')}:00`)}
                    className="border-b border-slate-100 dark:border-slate-700/40 hover:bg-[var(--panel)] dark:hover:bg-[var(--panel)] cursor-pointer transition-colors"
                  />
                ))}

                {/* today background tint */}
                {isToday(day) && (
                  <div className="absolute inset-0 accent-overlay pointer-events-none" />
                )}

                {/* task blocks */}
                {laidOut.map(({ todo, top, height, colIndex, colCount }) => {
                  const widthPct = 100 / colCount
                  return (
                    <button
                      key={todo.id}
                      onClick={e => { e.stopPropagation(); onTaskClick(todo) }}
                      style={{
                        top,
                        height: Math.max(height - 2, 18),
                        left: `calc(${colIndex * widthPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                      }}
                      className={`absolute rounded-md border-l-2 px-0.5 sm:px-1.5 py-0.5 overflow-hidden text-left shadow-sm hover:shadow-md hover:z-10 transition-shadow ${priorityBlock[todo.priority]} ${todo.completed ? 'line-through opacity-60' : ''}`}
                      title={`${formatTimeLabel(todo.dueTime)} · ${todo.title}`}
                    >
                      <div className="text-[9px] sm:text-[11px] font-semibold leading-tight truncate">{todo.title}</div>
                      {height > 30 && (
                        <div className="text-[10px] opacity-80 leading-tight">{formatTimeLabel(todo.dueTime)}</div>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
