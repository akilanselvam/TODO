import { collection, deleteDoc, getDocs, doc, writeBatch } from 'firebase/firestore'
import { db } from '../services/firebase'

// ── Export ────────────────────────────────────────────────────────────────────

export function exportJSON(todos, categories) {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    todos,
    categories,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tasks-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportCSV(todos) {
  const header = ['Title', 'Description', 'Priority', 'Category', 'Due Date', 'Due Time', 'Completed', 'Created At']
  const esc = s => `"${String(s || '').replace(/"/g, '""')}"`
  const rows = todos.map(t => [
    esc(t.title),
    esc(t.description),
    t.priority,
    esc(t.category),
    t.dueDate || '',
    t.dueTime || '',
    t.completed ? 'Yes' : 'No',
    t.createdAt || '',
  ].join(','))
  const csv = [header.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tasks-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Import ────────────────────────────────────────────────────────────────────

export function parseImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result)
        if (!parsed.todos || !Array.isArray(parsed.todos)) {
          reject(new Error('Invalid file: missing "todos" array'))
          return
        }
        resolve({
          todos: parsed.todos,
          categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        })
      } catch {
        reject(new Error('Could not parse file — make sure it is a valid JSON export'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

// ── Clear / Delete ────────────────────────────────────────────────────────────

export async function clearFirestoreData(uid) {
  const userRef = doc(db, 'users', uid)
  const [taskDocs, categoryDocs] = await Promise.all([
    getDocs(collection(userRef, 'tasks')),
    getDocs(collection(userRef, 'categories')),
  ])
  // Firestore batch limit is 500 ops
  const all = [...taskDocs.docs, ...categoryDocs.docs]
  for (let i = 0; i < all.length; i += 499) {
    const batch = writeBatch(db)
    all.slice(i, i + 499).forEach(d => batch.delete(d.ref))
    await batch.commit()
  }
}

export function clearLocalData() {
  localStorage.removeItem('todo-app-data')
}
