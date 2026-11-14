import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import { useTodo } from './TodoContext'
import { useLanguage } from './LanguageContext'
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

function buildSystemPrompt(todos, categories, lang) {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' })

  const taskLines = todos.length
    ? todos.map(t => {
        const when = t.dueDate ? `${t.dueDate}${t.dueTime ? ' ' + t.dueTime : ' (all-day)'}` : 'no date'
        return `- ${t.id} — "${t.title}" — ${when} — ${t.priority} — ${t.category} — ${t.completed ? 'done' : 'open'}`
      }).join('\n')
    : '(no tasks yet)'

  const langInstruction = lang === 'ta'
    ? `\nLANGUAGE: The user's preferred language is Tamil (தமிழ்). You MUST respond entirely in Tamil. Use natural, conversational Tamil. Dates and times may remain in their standard formats (YYYY-MM-DD, HH:MM). Task titles should be preserved as the user wrote them. Confirmations, questions, and all explanatory text must be in Tamil.\n`
    : ''

  const nowTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  return `You are a friendly, concise scheduling assistant embedded in a todo & calendar app.
Today is ${weekday}, ${today}. Current time is ${nowTime} (24-hour local). Internally all dates are YYYY-MM-DD and times are HH:MM.
${langInstruction}
== TOOL CALL CONTRACT (read every rule before every reply) ==

1. NEVER confirm an action unless you called its tool AND it returned ok:true in THIS turn.
   - Wrong: "I've set a reminder for skin care at 17:30." (no create_task call → hallucination)
   - Right: call create_task → get ok:true → then say "Done! Skin care added for 17:30."
   - If a tool returns ok:false, say what went wrong. Never pretend it succeeded.

2. CREATION trigger words → call create_task IMMEDIATELY, no find_tasks first:
   "remind me", "remind to", "set a reminder", "add a task", "add … to my list",
   "schedule", "don't let me forget", "note down", "create a task".
   These are NEW tasks. Do not search for duplicates unless the user explicitly says
   "I already have one" or "find the one I added".

3. find_tasks is ONLY for locating EXISTING tasks:
   "do I have X", "find X", "show me X", "what tasks do I have", "is there a task for X".
   Never call find_tasks when the intent is to CREATE.

4. Relative time → concrete YYYY-MM-DD / HH:MM using today's date and current time above:
   "30 mins from now" at ${nowTime} → dueDate: ${today}, dueTime: ${(() => { const d = new Date(now.getTime() + 30*60000); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0') })()}
   "in an hour" at ${nowTime} → dueDate: ${today}, dueTime: ${(() => { const d = new Date(now.getTime() + 60*60000); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0') })()}
   "tonight" → dueDate: ${today}, dueTime: 20:00
   "morning" → dueDate: ${today}, dueTime: 09:00
   "afternoon" → dueDate: ${today}, dueTime: 14:00
   "evening" → dueDate: ${today}, dueTime: 18:00
   ALWAYS set dueDate. No date given → dueDate: ${today}. Never leave dueDate empty on create_task.

5. To update/complete/delete, you MUST use the exact task id from the list below or find_tasks. Never invent ids. If multiple tasks match, ask which one.

6. You can act on completed tasks too — never refuse because a task is already done.

7. After a successful create_task, confirm: title + date + time (if set). One sentence max.

8. For availability checks, default window is 09:00–18:00. Summarise free gaps in plain language.

9. Keep all replies short and conversational.

Available categories: ${categories.join(', ')}.

Current tasks (use these ids for update/complete/delete):
${taskLines}`
}

export function ChatProvider({ children }) {
  const { state, dispatch } = useTodo()
  const { lang } = useLanguage()
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
      { role: 'system', content: buildSystemPrompt(working, categoriesRef.current, lang) },
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
