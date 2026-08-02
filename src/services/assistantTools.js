import { nanoid } from '../utils/nanoid'
import { computeAvailability } from '../utils/availability'

// ---- Tool schemas exposed to the model ----
export const assistantToolSpecs = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task/todo. Use for anything the user wants to add or be reminded of.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short task title' },
          description: { type: 'string', description: 'Optional details' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Defaults to medium' },
          dueDate: { type: 'string', description: 'Due date as YYYY-MM-DD. Resolve relative dates against today.' },
          dueTime: { type: 'string', description: '24-hour time HH:MM. Omit for an all-day task.' },
          category: { type: 'string', description: 'One of the available categories' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Update fields of an existing task. Reference it by its exact id (from the task list or find_tasks).',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The id of the task to update' },
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          dueDate: { type: 'string', description: 'YYYY-MM-DD, or empty string to clear' },
          dueTime: { type: 'string', description: 'HH:MM, or empty string to clear' },
          category: { type: 'string' },
          completed: { type: 'boolean' },
        },
        required: ['taskId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Mark a task complete (or incomplete). Reference it by id.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          completed: { type: 'boolean', description: 'true to complete (default), false to reopen' },
        },
        required: ['taskId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Permanently delete a task. Reference it by id. Confirm with the user first if ambiguous.',
      parameters: {
        type: 'object',
        properties: { taskId: { type: 'string' } },
        required: ['taskId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_tasks',
      description: 'Search tasks by text, date, or status. Use to locate a task id before updating/deleting, or to answer "what do I have on X".',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text to match in title/description' },
          date: { type: 'string', description: 'Filter to a specific date YYYY-MM-DD' },
          status: { type: 'string', enum: ['all', 'active', 'completed'], description: 'Defaults to all' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Report busy blocks and free time on a given day, based on the user\'s timed tasks.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'The day to check, YYYY-MM-DD' },
          startHour: { type: 'integer', description: 'Start of working window, 0-23 (default 9)' },
          endHour: { type: 'integer', description: 'End of working window, 0-23 (default 18)' },
        },
        required: ['date'],
      },
    },
  },
]

const summarize = t => ({
  id: t.id,
  title: t.title,
  dueDate: t.dueDate,
  dueTime: t.dueTime,
  priority: t.priority,
  category: t.category,
  completed: t.completed,
})

// Factory: executors operate on a mutable `working` snapshot of todos so that
// multiple tool calls within one turn stay consistent (React state updates are
// async). Each executor also dispatches the real action to the store.
export function makeExecutors({ working, dispatch }) {
  const norm = v => (v === '' ? null : v)

  return {
    create_task(a) {
      if (!a.title || !a.title.trim()) return { ok: false, error: 'title is required' }
      const task = {
        id: nanoid(),
        title: a.title.trim(),
        description: a.description || '',
        completed: false,
        priority: a.priority || 'medium',
        dueDate: norm(a.dueDate) || null,
        dueTime: norm(a.dueTime) || null,
        category: a.category || 'Personal',
        subtasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      working.unshift(task)
      dispatch({ type: 'ADD_TODO', payload: { ...task } })
      return { ok: true, task: summarize(task) }
    },

    update_task(a) {
      const t = working.find(x => x.id === a.taskId)
      if (!t) return { ok: false, error: `No task found with id "${a.taskId}"` }
      const patch = { id: a.taskId }
      for (const f of ['title', 'description', 'priority', 'category', 'completed']) {
        if (a[f] !== undefined) { t[f] = a[f]; patch[f] = a[f] }
      }
      if (a.dueDate !== undefined) { t.dueDate = norm(a.dueDate); patch.dueDate = norm(a.dueDate) }
      if (a.dueTime !== undefined) { t.dueTime = norm(a.dueTime); patch.dueTime = norm(a.dueTime) }
      dispatch({ type: 'UPDATE_TODO', payload: patch })
      return { ok: true, task: summarize(t) }
    },

    complete_task(a) {
      const t = working.find(x => x.id === a.taskId)
      if (!t) return { ok: false, error: `No task found with id "${a.taskId}"` }
      const completed = a.completed === undefined ? true : a.completed
      t.completed = completed
      dispatch({ type: 'UPDATE_TODO', payload: { id: a.taskId, completed } })
      return { ok: true, task: summarize(t) }
    },

    delete_task(a) {
      const idx = working.findIndex(x => x.id === a.taskId)
      if (idx === -1) return { ok: false, error: `No task found with id "${a.taskId}"` }
      const [removed] = working.splice(idx, 1)
      dispatch({ type: 'DELETE_TODO', payload: a.taskId })
      return { ok: true, deleted: summarize(removed) }
    },

    find_tasks(a) {
      let list = working.slice()
      if (a.status === 'active') list = list.filter(t => !t.completed)
      else if (a.status === 'completed') list = list.filter(t => t.completed)
      if (a.date) list = list.filter(t => t.dueDate && t.dueDate.slice(0, 10) === a.date)
      if (a.query) {
        const q = a.query.toLowerCase()
        list = list.filter(t =>
          t.title.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q))
      }
      return { count: list.length, tasks: list.slice(0, 50).map(summarize) }
    },

    check_availability(a) {
      const start = Number.isInteger(a.startHour) ? a.startHour : 9
      const end = Number.isInteger(a.endHour) ? a.endHour : 18
      return computeAvailability(working, a.date, start, end)
    },
  }
}
