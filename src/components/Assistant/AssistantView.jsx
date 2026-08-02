import { useState, useRef, useEffect } from 'react'
import { useChat } from '../../context/ChatContext'
import ApiKeySettings from './ApiKeySettings'

const suggestions = [
  "What's on today?",
  'Add "Call dentist" tomorrow at 3pm',
  'Am I free Thursday afternoon?',
  'What tasks are overdue?',
]

const toolLabels = {
  create_task: 'Created task',
  update_task: 'Updated task',
  complete_task: 'Updated status',
  delete_task: 'Deleted task',
  find_tasks: 'Looked up tasks',
  check_availability: 'Checked availability',
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

export default function AssistantView() {
  const { messages, loading, error, sendMessage, clear, hasKey } = useChat()
  const [input, setInput] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const submit = e => {
    e.preventDefault()
    if (!input.trim() || loading) return
    sendMessage(input)
    setInput('')
  }

  const send = text => { if (!loading) sendMessage(text) }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Sub-header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg accent-gradient flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Assistant</h2>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clear}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1"
            >
              Clear chat
            </button>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            title="Assistant settings"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4.5 h-4.5" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {!hasKey && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-300">
              <p className="font-semibold mb-1">Setup needed</p>
              <p className="mb-3">Add your OpenAI API key to start chatting. It's stored in this browser only.</p>
              <button
                onClick={() => setSettingsOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors"
              >
                Add API key
              </button>
            </div>
          )}

          {messages.length === 0 && hasKey && (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto rounded-2xl accent-gradient flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-medium">How can I help with your tasks?</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Ask me to add, change, or check on things.</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'accent-bg text-white rounded-br-md'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-md'
                }`}>
                  {m.content}
                </div>
                {m.role === 'assistant' && m.tools && m.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {m.tools.map((t, j) => (
                      <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {toolLabels[t] || t}
                      </span>
                    ))}
                  </div>
                )}
                {m.role === 'assistant' && m.warning && (
                  <div className="mt-1.5 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-[11px] text-amber-800 dark:text-amber-300">
                    <svg className="w-3.5 h-3.5 shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <span>{m.warning}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="px-3.5 py-2 rounded-2xl rounded-bl-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <TypingDots />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-300 dark:border-red-700/60 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Suggestions + input */}
      <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 px-4 py-3" style={{ transform: 'translateY(-30%)', zIndex: 10 }}>
        <div className="max-w-2xl mx-auto">
          {messages.length === 0 && hasKey && (
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-3 py-1.5 rounded-full text-xs border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover-border-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={submit} className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) submit(e) }}
              placeholder={hasKey ? 'Message the assistant…' : 'Add your API key to get started'}
              disabled={!hasKey || loading}
              rows={1}
              className="flex-1 resize-none max-h-32 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none input-focus-accent disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={!hasKey || loading || !input.trim()}
              className="p-2.5 rounded-xl accent-bg accent-hover text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l0-14m0 0l-6 6m6-6l6 6" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      <ApiKeySettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
