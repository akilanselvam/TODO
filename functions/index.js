const admin = require('firebase-admin')
const { DateTime } = require('luxon')
const { defineSecret } = require('firebase-functions/params')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const twilio = require('twilio')

admin.initializeApp()

const db = admin.firestore()
const accountSid = defineSecret('TWILIO_ACCOUNT_SID')
const authToken = defineSecret('TWILIO_AUTH_TOKEN')
const whatsappFrom = defineSecret('TWILIO_WHATSAPP_FROM')
const timeZone = process.env.TASK_TIME_ZONE || 'Asia/Kolkata'
const reminderWindowMinutes = 15
const lateDeliveryGraceMinutes = 5
const claimLeaseMinutes = 20

function parseDueAt(task) {
  if (typeof task.dueDate !== 'string' || typeof task.dueTime !== 'string') return null
  const dueAt = DateTime.fromFormat(
    `${task.dueDate} ${task.dueTime}`,
    'yyyy-MM-dd HH:mm',
    { zone: timeZone, setZone: true }
  )
  return dueAt.isValid ? dueAt : null
}

function reminderId(taskId, dueKey) {
  return `${encodeURIComponent(taskId)}_${dueKey.replace(/[^0-9A-Za-z_-]/g, '_')}`
}

async function claimReminder(uid, taskId, dueKey) {
  const ref = db.collection('users').doc(uid).collection('reminderDeliveries').doc(reminderId(taskId, dueKey))
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref)
    const existing = snapshot.data()
    if (existing?.status === 'sent') return null
    const now = DateTime.utc()
    const claimedAt = existing?.claimedAt?.toDate?.()
    if (existing?.status === 'sending' && claimedAt && now.diff(DateTime.fromJSDate(claimedAt), 'minutes').minutes < claimLeaseMinutes) {
      return null
    }
    transaction.set(ref, {
      status: 'sending',
      taskId,
      dueKey,
      claimedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    return ref
  })
}

exports.sendTaskReminders = onSchedule({
  schedule: 'every 5 minutes',
  timeZone,
  region: 'us-central1',
  maxInstances: 1,
  secrets: [accountSid, authToken, whatsappFrom],
}, async () => {
  const now = DateTime.now().setZone(timeZone)
  const windowStart = now.minus({ minutes: lateDeliveryGraceMinutes })
  const windowEnd = now.plus({ minutes: reminderWindowMinutes })
  const client = twilio(accountSid.value(), authToken.value())
  const from = whatsappFrom.value().startsWith('whatsapp:')
    ? whatsappFrom.value()
    : `whatsapp:${whatsappFrom.value()}`

  const users = await db.collection('users').get()
  let sentCount = 0
  let failedCount = 0

  for (const userDoc of users.docs) {
    const user = userDoc.data()
    const number = user.whatsappNumber
    if (user.whatsappNotificationsEnabled !== true || typeof number !== 'string' || !/^\+[1-9]\d{7,14}$/.test(number)) continue

    const tasks = await userDoc.ref.collection('tasks').where('completed', '==', false).get()
    for (const taskDoc of tasks.docs) {
      const task = taskDoc.data()
      const dueAt = parseDueAt(task)
      if (!dueAt || dueAt < windowStart || dueAt >= windowEnd) continue

      const dueKey = `${task.dueDate}T${task.dueTime}`
      const claimRef = await claimReminder(userDoc.id, taskDoc.id, dueKey)
      if (!claimRef) continue

      try {
        const title = (task.title || 'Untitled task').replace(/\s+/g, ' ').trim().slice(0, 160)
        await client.messages.create({
          from,
          to: `whatsapp:${number}`,
          body: `⏰ Task reminder: "${title}" is due on ${dueAt.toFormat('LLLL d')} at ${dueAt.toFormat('h:mm a')}.`,
        })
        await claimRef.set({ status: 'sent', sentAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
        sentCount += 1
      } catch (error) {
        await claimRef.delete().catch(() => {})
        failedCount += 1
        console.error(`WhatsApp reminder failed for user ${userDoc.id}, task ${taskDoc.id}:`, error.message)
      }
    }
  }

  console.log(`WhatsApp reminders finished: ${sentCount} sent, ${failedCount} failed`)
})
