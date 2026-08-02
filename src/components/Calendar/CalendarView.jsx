import { useState } from 'react'
import WeekView from './WeekView'
import MonthView from './MonthView'
import { addDays, addMonths, weekTitle, monthTitle } from '../../utils/calendar'

export default function CalendarView({ mode, onSlotClick, onDayClick, onTaskClick }) {
  const [cursor, setCursor] = useState(() => new Date())

  const isWeek = mode === 'week'
  const title = isWeek ? weekTitle(cursor) : monthTitle(cursor)

  const step = dir => {
    setCursor(c => (isWeek ? addDays(c, dir * 7) : addMonths(c, dir)))
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Navigation bar */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setCursor(new Date())}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Today
        </button>
        <div className="flex items-center">
          <button
            onClick={() => step(-1)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Previous"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => step(1)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Next"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <h2 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
          {title}
        </h2>
      </div>

      {/* Grid */}
      {isWeek ? (
        <WeekView cursor={cursor} onSlotClick={onSlotClick} onTaskClick={onTaskClick} />
      ) : (
        <MonthView cursor={cursor} onDayClick={onDayClick} onTaskClick={onTaskClick} />
      )}
    </div>
  )
}
