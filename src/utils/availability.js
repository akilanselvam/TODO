import { minutesOf } from './calendar'

const DEFAULT_DURATION = 60 // minutes per timed task block

function hhmm(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function to12h(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const ampm = h < 12 ? 'AM' : 'PM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`
}

// Compute busy blocks and free gaps for a given date (YYYY-MM-DD),
// within working hours [startHour, endHour). Date comparison is done on the
// date string to stay timezone-safe.
export function computeAvailability(todos, dateStr, startHour = 9, endHour = 18) {
  const windowStart = startHour * 60
  const windowEnd = endHour * 60

  const dayTasks = todos
    .filter(t => t.dueDate && t.dueDate.slice(0, 10) === dateStr && t.dueTime)
    .map(t => {
      const start = minutesOf(t.dueTime)
      return { start, end: start + DEFAULT_DURATION, title: t.title, completed: t.completed }
    })
    .sort((a, b) => a.start - b.start)

  // Merge overlapping busy intervals for free-gap calculation
  const merged = []
  for (const b of dayTasks) {
    const last = merged[merged.length - 1]
    if (!last || b.start > last.end) merged.push({ start: b.start, end: b.end })
    else last.end = Math.max(last.end, b.end)
  }

  const free = []
  let cursor = windowStart
  for (const m of merged) {
    const s = Math.max(m.start, windowStart)
    const e = Math.min(m.end, windowEnd)
    if (e <= windowStart || s >= windowEnd) continue
    if (s > cursor) free.push({ start: cursor, end: s })
    cursor = Math.max(cursor, e)
    if (cursor >= windowEnd) break
  }
  if (cursor < windowEnd) free.push({ start: cursor, end: windowEnd })

  return {
    date: dateStr,
    workingHours: `${to12h(windowStart)} – ${to12h(windowEnd)}`,
    busy: dayTasks.map(b => ({
      start: hhmm(b.start),
      end: hhmm(b.end),
      label: `${to12h(b.start)} – ${to12h(b.end)}`,
      title: b.title,
      completed: b.completed,
    })),
    free: free
      .filter(f => f.end > f.start)
      .map(f => ({
        start: hhmm(f.start),
        end: hhmm(f.end),
        label: `${to12h(f.start)} – ${to12h(f.end)}`,
        minutes: f.end - f.start,
      })),
  }
}
