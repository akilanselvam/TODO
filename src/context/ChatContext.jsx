import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import { useTodo } from './TodoContext'
import { runAssistant } from '../services/openai'
import { assistantToolSpecs, makeExecutors } from '../services/assistantTools'
import { getStoredKey, setStoredKey, getStoredModel, setStoredModel } from '../services/settings'
import { verifyClaim } from '../services/verifyClaim'

const ChatContext = createContext()
const STORAGE_KEY = 'todo-chat-history'

function loadHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return []
}

function buildSystemPrompt(todos, categories) {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' })

  const taskLines = todos.length
    ? todos.map(t => {
        const when = t.dueDate ? `${t.dueDate}${t.dueTime ? ' ' + t.dueTime : ' (all-day)'}` : 'no date'
        return `- ${t.id} — "${t.title}" — ${when} — ${t.priority} — ${t.category} — ${t.completed ? 'done' : 'open'}`
      }).join('\n')
    : '(no tasks yet)'

  return `You are a friendly, concise scheduling assistant built into a todo & calendar app.
Today is ${weekday}, ${today}. Times are local, 24-hour internally (HH:MM).

You can create, update, complete, delete, and find tasks, and check the user's availability, using the provided tools.

Rules:
- CRITICAL: A task is only actually created, updated, completed, or deleted when you CALL the matching tool and it returns ok:true. NEVER say you did something without calling its tool in this same turn — do not fabricate confirmations. If unsure whether a task exists, call find_tasks first.
- Resolve relative dates ("today", "tomorrow", "next Monday", "Friday") into concrete YYYY-MM-DD using today's date above.
- To update, complete, or delete a task you MUST use its exact id from the task list below (or from find_tasks). Never invent ids. If several tasks match, ask which one.
- You can update, reschedule, complete, reopen, or delete a task even if it is already done. Never refuse or require reopening it first just because it is completed.
- When the user refers to a specific task, look across ALL statuses (both open and completed), not just active ones.
- When the user gives a time but no date, assume today unless they imply otherwise.
- After performing actions, confirm briefly what changed (title + date/time). Don't dump raw ids at the user.
- For availability, default working hours are 09:00–18:00 unless the user says otherwise. Summarise free gaps in plain language (e.g. "You're free 2–5 PM").
- Keep replies short and natural.

Available categories: ${categories.join(', ')}.

Current tasks:
${taskLines}`
}

export function ChatProvider({ children }) {
  const { state, dispatch } = useTodo()
  const [messages, setMessages] = useState(loadHistory) // {role:'user'|'assistant', content, tools?}
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [apiKey, setApiKeyState] = useState(getStoredKey)
  const [model, setModelState] = useState(getStoredModel)

  const saveSettings = useCallback(({ apiKey: key, model: m }) => {
    if (key !== undefined) { setStoredKey(key); setApiKeyState(key.trim()) }
    if (m !== undefined) { setStoredModel(m); setModelState(m.trim() || 'gpt-4o-mini') }
    setError('')
  }, [])

  // Keep the latest todos/categories reachable inside the async send handler
  const todosRef = useRef(state.todos)
  const categoriesRef = useRef(state.categories)
  useEffect(() => { todosRef.current = state.todos }, [state.todos])
  useEffect(() => { categoriesRef.current = state.categories }, [state.categories])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)) } catch { /* ignore */ }
  }, [messages])

  const sendMessage = useCallback(async text => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setError('')

    if (!apiKey) {
      setError('No OpenAI API key set. Open Assistant settings (gear icon) and paste your key.')
      return
    }

    const userMsg = { role: 'user', content: trimmed }
    // Display history (for API continuity we re-send prior user/assistant turns)
    const priorForApi = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    // Per-turn working snapshot so multi-step tool calls stay consistent
    const working = todosRef.current.map(t => ({ ...t }))
    const executors = makeExecutors({ working, dispatch })
    const toolsUsed = []
    const toolCalls = [] // { name, ok } — used by the verification safeguard

    const apiMessages = [
      { role: 'system', content: buildSystemPrompt(working, categoriesRef.current) },
      ...priorForApi,
      { role: 'user', content: trimmed },
    ]

    try {
      const { content } = await runAssistant({
        apiKey,
        model,
        messages: apiMessages,
        tools: assistantToolSpecs,
        executeTool: (name, args) => {
          const fn = executors[name]
          if (!fn) { toolCalls.push({ name, ok: false }); return { ok: false, error: `Unknown tool ${name}` } }
          const result = fn(args)
          toolCalls.push({ name, ok: result?.ok !== false })
          return result
        },
        onToolActivity: ({ name }) => { if (!toolsUsed.includes(name)) toolsUsed.push(name) },
      })
      const warning = verifyClaim({ text: content, toolCalls })
      setMessages(prev => [...prev, { role: 'assistant', content: content || '(no response)', tools: toolsUsed, warning }])
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }, [messages, loading, dispatch, apiKey, model])

  const clear = useCallback(() => {
    setMessages([])
    setError('')
  }, [])

  return (
    <ChatContext.Provider value={{
      messages, loading, error, sendMessage, clear,
      hasKey: Boolean(apiKey), apiKey, model, saveSettings,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => useContext(ChatContext)
