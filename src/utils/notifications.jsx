const NOTIFIED_KEY = 'notif-fired'
const ENABLED_KEY = 'notif-enabled'

export function getNotifEnabled() {
  return localStorage.getItem(ENABLED_KEY) !== 'false'
}

export function setNotifEnabled(val) {
  localStorage.setItem(ENABLED_KEY, val ? 'true' : 'false')
}

export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function getPermissionState() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

function getFiredSet() {
  try {
    const today = new Date().toDateString()
    const stored = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}')
    if (stored._date !== today) return { _date: today }
    return stored
  } catch {
    return { _date: new Date().toDateString() }
  }
}

function markFired(taskId) {
  const set = getFiredSet()
  set[taskId] = true
  try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify(set)) } catch {}
}

export function hasFired(taskId) {
  return Boolean(getFiredSet()[taskId])
}

export async function fireNotification(title, body, taskId) {
  if (!getNotifEnabled()) return
  if (Notification.permission !== 'granted') return
  markFired(taskId)

  // Prefer service-worker notification (works in background)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, {
        body,
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: taskId,
        renotify: false,
      })
      return
    } catch {}
  }

  // Fallback: Notification API
  try { new Notification(title, { body, tag: taskId }) } catch {}
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch {}
}
