import { useState } from 'react'
import Modal from '../UI/Modal'
import { useChat } from '../../context/ChatContext'
import { maskKey } from '../../services/settings'

export default function ApiKeySettings({ isOpen, onClose }) {
  const { apiKey, model, saveSettings } = useChat()
  const [keyInput, setKeyInput] = useState('')
  const [modelInput, setModelInput] = useState(model || 'gpt-4o-mini')
  const [reveal, setReveal] = useState(false)

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] dark:focus:ring-[var(--accent)] transition-colors'
  const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1'

  const handleSave = () => {
    // Only overwrite the key if the user typed a new one; otherwise keep existing.
    const patch = { model: modelInput }
    if (keyInput.trim()) patch.apiKey = keyInput
    saveSettings(patch)
    setKeyInput('')
    onClose()
  }

  const handleRemove = () => {
    saveSettings({ apiKey: '' })
    setKeyInput('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assistant Settings">
      <div className="space-y-4">
        <div>
          <label className={labelCls}>OpenAI API Key</label>
          {apiKey && !keyInput && (
            <p className="mb-1.5 text-xs text-slate-500 dark:text-slate-400">
              Current: <span className="font-mono">{maskKey(apiKey)}</span> — leave blank to keep it.
            </p>
          )}
          <div className="relative">
            <input
              type={reveal ? 'text' : 'password'}
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder={apiKey ? 'Enter a new key to replace…' : 'sk-…'}
              autoComplete="off"
              className={`${inputCls} pr-16 font-mono input-focus-accent`}
            />
            <button
              type="button"
              onClick={() => setReveal(r => !r)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {reveal ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div>
          <label className={labelCls}>Model</label>
          <input
            value={modelInput}
            onChange={e => setModelInput(e.target.value)}
            placeholder="gpt-4o-mini"
            className={`${inputCls} font-mono accent-bg accent-hover`}
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Any chat model that supports function-calling (e.g. gpt-4o-mini, gpt-4o).
          </p>
        </div>

        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 p-2.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
          Stored in this browser's localStorage and sent directly to OpenAI from the browser.
          Fine for personal use — use a backend proxy before deploying publicly.
        </div>

        <div className="flex items-center gap-2 pt-1">
          {apiKey && (
            <button
              onClick={handleRemove}
              className="px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Remove key
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg accent-bg accent-hover text-white text-sm font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
