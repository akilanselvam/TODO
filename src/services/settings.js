// OpenAI settings backed by localStorage (falls back to .env for defaults).
// Kept in localStorage so the key can be changed in-app without a rebuild.
const KEY_LS = 'openai-api-key'
const MODEL_LS = 'openai-model'

const ENV_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const ENV_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'

export function getStoredKey() {
  try { return localStorage.getItem(KEY_LS) || ENV_KEY } catch { return ENV_KEY }
}

export function setStoredKey(key) {
  try {
    if (key && key.trim()) localStorage.setItem(KEY_LS, key.trim())
    else localStorage.removeItem(KEY_LS)
  } catch { /* ignore */ }
}

export function getStoredModel() {
  try { return localStorage.getItem(MODEL_LS) || ENV_MODEL } catch { return ENV_MODEL }
}

export function setStoredModel(model) {
  try {
    if (model && model.trim()) localStorage.setItem(MODEL_LS, model.trim())
    else localStorage.removeItem(MODEL_LS)
  } catch { /* ignore */ }
}

// Mask a key for display, e.g. "sk-pro…9QAA"
export function maskKey(key) {
  if (!key) return ''
  if (key.length <= 12) return '••••'
  return `${key.slice(0, 6)}…${key.slice(-4)}`
}
