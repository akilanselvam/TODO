const admin = require('firebase-admin')
const { DateTime } = require('luxon')
const crypto = require('crypto')
const { defineSecret } = require('firebase-functions/params')
const { onRequest } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const twilio = require('twilio')

admin.initializeApp()

const db = admin.firestore()
const accountSid = defineSecret('TWILIO_ACCOUNT_SID')
const authToken = defineSecret('TWILIO_AUTH_TOKEN')
const whatsappFrom = defineSecret('TWILIO_WHATSAPP_FROM')
const openAiApiKey = defineSecret('OPENAI_API_KEY')
const timeZone = process.env.TASK_TIME_ZONE || 'Asia/Kolkata'
const reminderWindowMinutes = 15
const lateDeliveryGraceMinutes = 5
const claimLeaseMinutes = 20

function formatSpokenTime(value) {
  if (typeof value !== 'string') return value
  const parsed = DateTime.fromFormat(value, 'HH:mm', { zone: timeZone })
  if (!parsed.isValid) return value
  return parsed.toFormat(parsed.minute === 0 ? 'h a' : 'h:mm a')
}

const siriToolSpecs = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task or reminder. Call this immediately when the user asks to add, schedule, or remember something.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' }, description: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          dueDate: { type: 'string', description: 'YYYY-MM-DD' },
          dueTime: { type: 'string', description: 'HH:MM 24-hour time' },
          category: { type: 'string' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Update fields of an existing task by its exact id.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          dueDate: { type: 'string' }, dueTime: { type: 'string' }, category: { type: 'string' },
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
      description: 'Mark an existing task complete or incomplete by its exact id.',
      parameters: {
        type: 'object',
        properties: { taskId: { type: 'string' }, completed: { type: 'boolean' } },
        required: ['taskId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Permanently delete an existing task by its exact id.',
      parameters: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_tasks',
      description: 'Search existing tasks by text, date, or status. Use only when asking about tasks that already exist.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' },
          status: { type: 'string', enum: ['all', 'active', 'completed'] },
        },
      },
    },
  },
]

function buildSiriSystemPrompt(tasks) {
  const now = DateTime.now().setZone(timeZone)
  const today = now.toFormat('yyyy-MM-dd')
  const taskLines = tasks.length
    ? tasks.map(t => `- ${t.id} — "${t.title}" — ${t.dueDate ? `${t.dueDate}${t.dueTime ? ` ${formatSpokenTime(t.dueTime)}` : ' (all-day)'}` : 'no date'} — ${t.priority || 'medium'} — ${t.category || 'Personal'} — ${t.completed ? 'done' : 'open'}`).join('\n')
    : '(no tasks yet)'

  return `You are a friendly, concise voice assistant for a todo app. The user is speaking through Siri.\nToday is ${now.toFormat('EEEE')}, ${today}. Current time is ${formatSpokenTime(now.toFormat('HH:mm'))} (${timeZone}).\n\nRules:\n1. Never confirm an action unless its tool returned ok:true this turn.\n2. For requests to add, schedule, or remember something, call create_task immediately.\n3. Use find_tasks only to locate existing tasks.\n4. Resolve relative dates against ${today}; always set dueDate on new tasks. Morning is 09:00, afternoon 14:00, evening 18:00, tonight 20:00.\n5. Use exact task ids below for updates, completion, or deletion. Ask for clarification if multiple tasks match.\n6. Keep replies short and conversational. Use plain spoken text without markdown.\n7. Speak times in natural 12-hour format with AM/PM: say 14:00 as “2 PM”, 09:30 as “9:30 AM”, and never read a 24-hour time aloud.\n\nCurrent tasks:\n${taskLines}`
}

function makeSiriExecutors(uid, working) {
  const tasksRef = db.collection('users').doc(uid).collection('tasks')
  const norm = value => value === '' ? null : value
  const summarize = task => ({
    id: task.id, title: task.title, dueDate: task.dueDate, dueTime: task.dueTime,
    spokenDueTime: formatSpokenTime(task.dueTime),
    priority: task.priority, category: task.category, completed: task.completed,
  })

  return {
    async create_task(args) {
      if (typeof args.title !== 'string' || !args.title.trim()) return { ok: false, error: 'title is required' }
      const now = new Date().toISOString()
      const task = {
        id: crypto.randomBytes(10).toString('base64url'),
        title: args.title.trim(), description: args.description || '', completed: false,
        priority: args.priority || 'medium', dueDate: norm(args.dueDate) || null,
        dueTime: norm(args.dueTime) || null, category: args.category || 'Personal',
        subtasks: [], createdAt: now, updatedAt: now,
      }
      await tasksRef.doc(task.id).set(task)
      working.unshift(task)
      return { ok: true, task: summarize(task) }
    },
    async update_task(args) {
      const task = working.find(item => item.id === args.taskId)
      if (!task) return { ok: false, error: `No task found with id "${args.taskId}"` }
      const patch = { updatedAt: new Date().toISOString() }
      for (const field of ['title', 'description', 'priority', 'category', 'completed']) {
        if (args[field] !== undefined) patch[field] = args[field]
      }
      for (const field of ['dueDate', 'dueTime']) {
        if (args[field] !== undefined) patch[field] = norm(args[field])
      }
      Object.assign(task, patch)
      await tasksRef.doc(task.id).set(patch, { merge: true })
      return { ok: true, task: summarize(task) }
    },
    async complete_task(args) {
      const task = working.find(item => item.id === args.taskId)
      if (!task) return { ok: false, error: `No task found with id "${args.taskId}"` }
      task.completed = args.completed === undefined ? true : args.completed
      task.updatedAt = new Date().toISOString()
      await tasksRef.doc(task.id).set({ completed: task.completed, updatedAt: task.updatedAt }, { merge: true })
      return { ok: true, task: summarize(task) }
    },
    async delete_task(args) {
      const index = working.findIndex(item => item.id === args.taskId)
      if (index < 0) return { ok: false, error: `No task found with id "${args.taskId}"` }
      const [removed] = working.splice(index, 1)
      await tasksRef.doc(removed.id).delete()
      return { ok: true, deleted: summarize(removed) }
    },
    find_tasks(args) {
      let found = working.slice()
      if (args.status === 'active') found = found.filter(task => !task.completed)
      else if (args.status === 'completed') found = found.filter(task => task.completed)
      if (args.date) found = found.filter(task => task.dueDate === args.date)
      if (args.query) {
        const query = args.query.toLowerCase()
        found = found.filter(task => task.title.toLowerCase().includes(query) || (task.description || '').toLowerCase().includes(query))
      }
      return { count: found.length, tasks: found.slice(0, 50).map(summarize) }
    },
  }
}

async function runSiriAgent(messages, executeTool) {
  const thread = [...messages]
  for (let step = 0; step < 6; step += 1) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiApiKey.value()}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: thread, tools: siriToolSpecs, tool_choice: 'auto', temperature: 0.2 }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error?.message || `OpenAI request failed (${response.status})`)
    const message = data.choices?.[0]?.message
    if (!message) throw new Error('OpenAI returned no message')
    thread.push(message)
    if (!message.tool_calls?.length) return { content: message.content || '', thread }

    for (const call of message.tool_calls) {
      let args = {}
      try { args = JSON.parse(call.function.arguments || '{}') } catch { /* invalid arguments */ }
      let result
      try { result = await executeTool(call.function.name, args) }
      catch (error) { result = { ok: false, error: error.message || 'Tool failed' } }
      thread.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
    }
  }
  return { content: "I couldn't finish that. Please try a shorter request.", thread }
}

exports.siriGenerateKey = onRequest({ region: 'us-central1', cors: true }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')
  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!idToken) return res.status(401).json({ error: 'Missing auth token' })

  let uid
  try { uid = (await admin.auth().verifyIdToken(idToken)).uid }
  catch { return res.status(401).json({ error: 'Invalid auth token' }) }

  try {
    const userRef = db.collection('users').doc(uid)
    const siriApiKey = await db.runTransaction(async transaction => {
      const userDoc = await transaction.get(userRef)
      const existing = userDoc.data()?.siriApiKey
      if (typeof existing === 'string' && existing) return existing
      const generated = crypto.randomBytes(32).toString('hex')
      transaction.set(userRef, { siriApiKey: generated }, { merge: true })
      return generated
    })
    return res.json({ siriApiKey })
  } catch (error) {
    console.error('siriGenerateKey failed:', error.message)
    return res.status(500).json({ error: 'Could not create Siri key' })
  }
})

exports.siriChat = onRequest({ region: 'us-central1', cors: true, secrets: [openAiApiKey], timeoutSeconds: 120 }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')
  const { siriApiKey, message } = req.body || {}
  const rawSessionId = req.body?.sessionId || 'siri-default'
  const sessionId = typeof rawSessionId === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(rawSessionId) ? rawSessionId : ''
  if (typeof siriApiKey !== 'string' || siriApiKey.length < 32 || typeof message !== 'string' || !message.trim() || message.length > 2000 || !sessionId) {
    return res.status(400).json({ error: 'Invalid siriApiKey, message, or sessionId' })
  }

  try {
    const userSnapshot = await db.collection('users').where('siriApiKey', '==', siriApiKey).limit(1).get()
    if (userSnapshot.empty) return res.status(401).json({ error: 'Invalid Siri API key' })
    const userDoc = userSnapshot.docs[0]
    const uid = userDoc.id
    const taskSnapshot = await userDoc.ref.collection('tasks').get()
    const working = taskSnapshot.docs.map(document => ({ id: document.id, ...document.data() }))
    const sessionRef = userDoc.ref.collection('siriSessions').doc(sessionId)
    const sessionDoc = await sessionRef.get()
    const history = Array.isArray(sessionDoc.data()?.messages)
      ? sessionDoc.data().messages.filter(item => ['user', 'assistant'].includes(item.role) && typeof item.content === 'string').slice(-20)
      : []
    const userMessage = message.trim()
    const messages = [
      { role: 'system', content: buildSiriSystemPrompt(working) },
      ...history,
      { role: 'user', content: userMessage },
    ]
    const executors = makeSiriExecutors(uid, working)
    const { content, thread } = await runSiriAgent(messages, async (name, args) => {
      const executor = executors[name]
      return executor ? executor(args) : { ok: false, error: `Unknown tool: ${name}` }
    })
    const updatedHistory = thread.filter(item => item.role === 'user' || item.role === 'assistant').slice(-20)
    await sessionRef.set({ messages: updatedHistory, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
    return res.json({ reply: content })
  } catch (error) {
    console.error('siriChat failed:', error.message)
    return res.status(500).json({ error: 'Siri assistant could not process the request' })
  }
})

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
