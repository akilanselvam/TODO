import { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { nanoid } from '../utils/nanoid'
import { db } from '../services/firebase'
import { useAuth } from './AuthContext'

const TodoContext = createContext()

const STORAGE_KEY = 'todo-app-data'

const defaultCategories = ['Personal', 'Work', 'Others']

const defaultState = {
  todos: [],
  categories: defaultCategories,
  filter: {
    search: '',
    status: 'all',
    priority: 'all',
    category: 'all',
    view: 'today',
  },
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...defaultState, ...parsed, filter: defaultState.filter }
    }
  } catch {
    /* ignore */
  }
  return defaultState
}

function saveState(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ todos: state.todos, categories: state.categories })
    )
  } catch {
    /* ignore */
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_TODO': {
      const todo = {
        id: action.payload.id || nanoid(),
        title: action.payload.title,
        description: action.payload.description || '',
        completed: false,
        priority: action.payload.priority || 'medium',
        dueDate: action.payload.dueDate || null,
        dueTime: action.payload.dueTime || null,
        category: action.payload.category || 'Personal',
        subtasks: action.payload.subtasks || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return { ...state, todos: [todo, ...state.todos] }
    }
    case 'UPDATE_TODO': {
      return {
        ...state,
        todos: state.todos.map(t =>
          t.id === action.payload.id
            ? { ...t, ...action.payload, updatedAt: new Date().toISOString() }
            : t
        ),
      }
    }
    case 'DELETE_TODO': {
      return { ...state, todos: state.todos.filter(t => t.id !== action.payload) }
    }
    case 'TOGGLE_TODO': {
      return {
        ...state,
        todos: state.todos.map(t =>
          t.id === action.payload
            ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() }
            : t
        ),
      }
    }
    case 'ADD_SUBTASK': {
      const subtask = { id: nanoid(), title: action.payload.title, completed: false }
      return {
        ...state,
        todos: state.todos.map(t =>
          t.id === action.payload.todoId
            ? { ...t, subtasks: [...t.subtasks, subtask], updatedAt: new Date().toISOString() }
            : t
        ),
      }
    }
    case 'TOGGLE_SUBTASK': {
      return {
        ...state,
        todos: state.todos.map(t =>
          t.id === action.payload.todoId
            ? {
                ...t,
                subtasks: t.subtasks.map(s =>
                  s.id === action.payload.subtaskId ? { ...s, completed: !s.completed } : s
                ),
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
      }
    }
    case 'DELETE_SUBTASK': {
      return {
        ...state,
        todos: state.todos.map(t =>
          t.id === action.payload.todoId
            ? {
                ...t,
                subtasks: t.subtasks.filter(s => s.id !== action.payload.subtaskId),
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
      }
    }
    case 'ADD_CATEGORY': {
      if (state.categories.includes(action.payload)) return state
      return { ...state, categories: [...state.categories, action.payload] }
    }
    case 'DELETE_CATEGORY': {
      return {
        ...state,
        categories: state.categories.filter(c => c !== action.payload),
        todos: state.todos.map(t =>
          t.category === action.payload ? { ...t, category: 'Personal' } : t
        ),
      }
    }
    case 'SET_FILTER': {
      return { ...state, filter: { ...state.filter, ...action.payload } }
    }
    case 'SET_DATA': {
      return {
        ...state,
        todos: action.payload.todos || [],
        categories: (action.payload.categories && action.payload.categories.length)
          ? action.payload.categories
          : defaultState.categories,
      }
    }
    default:
      return state
  }
}

const serialize = (todos, categories) => JSON.stringify({ todos, categories })

export function TodoProvider({ children }) {
  const { user, firebaseEnabled } = useAuth()
  const uid = user?.uid || null
  // Use Firestore only when configured AND signed in; otherwise localStorage.
  const mode = firebaseEnabled && uid ? 'firestore' : 'local'

  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const [syncError, setSyncError] = useState('')

  // Serialized snapshot of the last data we synced — guards against write/echo loops.
  const lastSyncedRef = useRef(null)
  // True once the active backend has delivered its initial data (prevents an
  // early local-state write from clobbering existing cloud data on load).
  const readyRef = useRef(false)
  // Latest data, for seeding a brand-new cloud document on first sign-in.
  const dataRef = useRef({ todos: state.todos, categories: state.categories })
  useEffect(() => {
    dataRef.current = { todos: state.todos, categories: state.categories }
  }, [state.todos, state.categories])

  // --- Subscribe to the active data source ---
  useEffect(() => {
    readyRef.current = false
    setSyncError('')

    if (mode === 'firestore') {
      const ref = doc(db, 'users', uid)
      const unsub = onSnapshot(
        ref,
        snap => {
          if (!snap.exists()) {
            // First sign-in: seed the cloud with local data so nothing is lost.
            const seed = { todos: dataRef.current.todos, categories: dataRef.current.categories }
            lastSyncedRef.current = serialize(seed.todos, seed.categories)
            setDoc(ref, seed).catch(e => setSyncError(e.message))
            dispatch({ type: 'SET_DATA', payload: seed })
          } else {
            const data = snap.data()
            const payload = { todos: data.todos || [], categories: data.categories || defaultState.categories }
            lastSyncedRef.current = serialize(payload.todos, payload.categories)
            dispatch({ type: 'SET_DATA', payload })
          }
          readyRef.current = true
        },
        err => { setSyncError(err.message); readyRef.current = true }
      )
      return unsub
    }

    // Local mode: load once from localStorage.
    const data = loadState()
    lastSyncedRef.current = serialize(data.todos, data.categories)
    dispatch({ type: 'SET_DATA', payload: { todos: data.todos, categories: data.categories } })
    readyRef.current = true
  }, [mode, uid])

  // --- Persist local changes to the active backend ---
  useEffect(() => {
    if (!readyRef.current) return
    const s = serialize(state.todos, state.categories)
    if (s === lastSyncedRef.current) return // no change, or an echo from a snapshot
    lastSyncedRef.current = s
    if (mode === 'firestore') {
      setDoc(doc(db, 'users', uid), { todos: state.todos, categories: state.categories }, { merge: true })
        .catch(e => setSyncError(e.message))
    } else {
      saveState({ todos: state.todos, categories: state.categories })
    }
  }, [state.todos, state.categories, mode, uid])

  // Base filters shared by list + calendar (search / status / priority / category)
  function matchesBaseFilters(todo) {
    const { search, status, priority, category } = state.filter

    if (search && !todo.title.toLowerCase().includes(search.toLowerCase()) &&
        !todo.description.toLowerCase().includes(search.toLowerCase())) return false

    if (status === 'active' && todo.completed) return false
    if (status === 'completed' && !todo.completed) return false

    if (priority !== 'all' && todo.priority !== priority) return false
    if (category !== 'all' && todo.category !== category) return false

    return true
  }

  // List view also honours the sidebar "today" view
  const filteredTodos = state.todos.filter(todo => {
    if (!matchesBaseFilters(todo)) return false

    if (state.filter.view === 'today') {
      if (!todo.dueDate) return false
      if (new Date(todo.dueDate).toDateString() !== new Date().toDateString()) return false
    }

    if (state.filter.view === 'tomorrow') {
      if (!todo.dueDate) return false
      const due = new Date(todo.dueDate)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      if (due.toDateString() !== tomorrow.toDateString()) return false
    }

    return true
  })

  // Backlog: past due, not completed, and matching base filters
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const backlogTodos = state.todos.filter(todo => {
    if (!matchesBaseFilters(todo)) return false
    if (todo.completed) return false
    if (!todo.dueDate) return false
    const due = new Date(todo.dueDate)
    // Past days only (strictly before today)
    return due < todayStart
  })

  // Calendar shows real dates, so it ignores the "today" view but keeps other filters
  const calendarTodos = state.todos.filter(todo => todo.dueDate && matchesBaseFilters(todo))

  return (
    <TodoContext.Provider value={{ state, dispatch, filteredTodos, calendarTodos, backlogTodos, mode, syncError }}>
      {children}
    </TodoContext.Provider>
  )
}

export const useTodo = () => useContext(TodoContext)
