import { useEffect, useRef } from 'react'
import {
  fireNotification,
  hasFired,
  getNotifEnabled,
  registerServiceWorker,
} from '../utils/notifications'

export function useTaskNotifications(todos, lang) {
  const scheduledRef = useRef(new Set())

  // Register SW once
  useEffect(() => { registerServiceWorker() }, [])

  useEffect(() => {
    if (!getNotifEnabled()) return
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const now = new Date()
    const todayStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')

    // Also check tomorrow for early-morning scheduling
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = [
      tomorrow.getFullYear(),
      String(tomorrow.getMonth() + 1).padStart(2, '0'),
      String(tomorrow.getDate()).padStart(2, '0'),
    ].join('-')

    const isTamil = lang === 'ta'

    for (const task of todos) {
      if (task.completed) continue
      if (!task.dueDate) continue
      if (task.dueDate !== todayStr && task.dueDate !== tomorrowStr) continue
      if (hasFired(task.id) || scheduledRef.current.has(task.id)) continue

      let targetMs
      if (task.dueTime) {
        const [h, m] = task.dueTime.split(':').map(Number)
        const dueDate = task.dueDate === todayStr ? now : tomorrow
        const due = new Date(dueDate)
        due.setHours(h, m, 0, 0)
        // Notify 15 minutes early
        targetMs = due.getTime() - 15 * 60 * 1000
      } else {
        // No time — remind at 9 AM on the due day
        const dueDate = task.dueDate === todayStr ? now : tomorrow
        const nine = new Date(dueDate)
        nine.setHours(9, 0, 0, 0)
        targetMs = nine.getTime()
      }

      const delay = targetMs - Date.now()
      if (delay < 0 || delay > 25 * 60 * 60 * 1000) continue // past or >25h away

      scheduledRef.current.add(task.id)

      const title = isTamil ? '📋 பணி நினைவூட்டல்' : '📋 Task Reminder'
      const timeNote = task.dueTime
        ? (isTamil ? ` — ${task.dueTime} மணிக்கு 15 நிமிடம் மீதம்` : ` — 15 min until ${task.dueTime}`)
        : (isTamil ? ' — இன்று செய்யவேண்டியது' : ' — due today')
      const body = task.title + (task.dueDate === tomorrowStr
        ? (isTamil ? ' — நாளை' : ' — tomorrow')
        : timeNote)

      setTimeout(() => {
        // Push notification (works in background / when app closed)
        fireNotification(title, body, task.id)
        // In-app toast (fires when app is open — always visible)
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { title, body } }))
        scheduledRef.current.delete(task.id)
      }, Math.max(delay, 500))
    }
  }, [todos, lang])
}
