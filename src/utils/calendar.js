// ---- Constants ----
export const HOURS = Array.from({ length: 24 }, (_, i) => i)
export const HOUR_HEIGHT = 48 // px per hour row in week view
export const DEFAULT_DURATION = 60 // minutes for a timed task block
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ---- Date helpers (Monday-start week) ----
export function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function addMonths(d, n) {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export function isToday(d) {
  return isSameDay(d, new Date())
}

// Monday = start of week
export function startOfWeek(d) {
  const x = startOfDay(d)
  const day = (x.getDay() + 6) % 7 // Mon=0 ... Sun=6
  return addDays(x, -day)
}

export function getWeekDays(cursor) {
  const s = startOfWeek(cursor)
  return Array.from({ length: 7 }, (_, i) => addDays(s, i))
}

export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

// 6-week matrix (42 cells) for a stable month grid, including adjacent-month spill
export function getMonthMatrix(cursor) {
  const gridStart = startOfWeek(startOfMonth(cursor))
  const weeks = []
  let cur = gridStart
  for (let w = 0; w < 6; w++) {
    const week = []
    for (let i = 0; i < 7; i++) {
      week.push(cur)
      cur = addDays(cur, 1)
    }
    weeks.push(week)
  }
  return weeks
}

// ---- Time helpers ----
export function parseTime(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return { h, m: m || 0 }
}

export function minutesOf(t) {
  const p = parseTime(t)
  return p ? p.h * 60 + p.m : null
}

export function formatHour(h) {
  const ampm = h < 12 ? 'AM' : 'PM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr} ${ampm}`
}

export function formatTimeLabel(t) {
  const p = parseTime(t)
  if (!p) return ''
  const ampm = p.h < 12 ? 'AM' : 'PM'
  const hr = p.h % 12 === 0 ? 12 : p.h % 12
  const mm = p.m.toString().padStart(2, '0')
  return `${hr}:${mm} ${ampm}`
}

// ---- Titles ----
export function weekTitle(cursor) {
  const days = getWeekDays(cursor)
  const start = days[0]
  const end = days[6]
  const opts = { month: 'short', day: 'numeric' }
  if (start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
  }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`
}

export function monthTitle(cursor) {
  return cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// ---- Overlap layout ----
// Splits a day's timed tasks into side-by-side columns so overlapping
// tasks are "layered" next to each other (Teams-style).
// Returns items decorated with { top, height, colIndex, colCount }.
export function layoutDayTasks(tasks, durationMin = DEFAULT_DURATION) {
  const items = tasks
    .map(todo => {
      const start = minutesOf(todo.dueTime)
      return { todo, start, end: start + durationMin }
    })
    .sort((a, b) => a.start - b.start || a.end - b.end)

  // Group into clusters of chain-overlapping tasks
  const clusters = []
  let cluster = []
  let clusterEnd = -1
  for (const it of items) {
    if (cluster.length === 0 || it.start < clusterEnd) {
      cluster.push(it)
      clusterEnd = Math.max(clusterEnd, it.end)
    } else {
      clusters.push(cluster)
      cluster = [it]
      clusterEnd = it.end
    }
  }
  if (cluster.length) clusters.push(cluster)

  // Within each cluster, greedily assign columns
  const result = []
  for (const cl of clusters) {
    const colEnds = [] // last end-time per column
    for (const it of cl) {
      let col = 0
      while (col < colEnds.length && colEnds[col] > it.start) col++
      it.colIndex = col
      colEnds[col] = it.end
    }
    const colCount = colEnds.length
    for (const it of cl) {
      result.push({
        todo: it.todo,
        top: (it.start / 60) * HOUR_HEIGHT,
        height: ((it.end - it.start) / 60) * HOUR_HEIGHT,
        colIndex: it.colIndex,
        colCount,
      })
    }
  }
  return result
}
