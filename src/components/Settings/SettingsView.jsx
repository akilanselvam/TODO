import { useEffect, useRef, useState } from 'react'
import { deleteUser, reauthenticateWithPopup } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { useTodo } from '../../context/TodoContext'
import { useLanguage } from '../../context/LanguageContext'
import { auth, db, googleProvider, isFirebaseConfigured } from '../../services/firebase'
import {
  exportJSON, exportCSV, parseImportFile,
  clearFirestoreData, clearLocalData,
} from '../../utils/dataManagement'
import {
  getNotifEnabled, setNotifEnabled, requestPermission, getPermissionState,
} from '../../utils/notifications'

// ── Small helpers ─────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-bold uppercase tracking-widest px-1 mb-2" style={{ color: 'var(--muted)' }}>
        {title}
      </p>
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--panel)' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ icon, label, sublabel, onClick, danger, disabled, right }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150 active:scale-[0.98] disabled:opacity-40"
      style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.07)', cursor: disabled ? 'default' : 'pointer' }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.06)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: danger ? 'rgba(239,68,68,0.15)' : 'rgba(var(--accent-rgb),0.12)' }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: danger ? '#f87171' : 'var(--text)' }}>{label}</p>
        {sublabel && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sublabel}</p>}
      </div>
      {right && <span style={{ color: 'var(--muted)' }}>{right}</span>}
      {!right && !disabled && (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--muted)', opacity: 0.5 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  )
}

function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-3xl p-6 shadow-2xl"
        style={{ background: 'var(--panel)', border: '1px solid rgba(var(--accent-rgb),0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text)' }}>{title}</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all duration-150 active:scale-95"
            style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--text)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all duration-150 active:scale-95"
            style={{ background: danger ? '#ef4444' : 'var(--accent)', color: '#fff' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SettingsView() {
  const { user, firebaseEnabled, signIn, signOutUser } = useAuth()
  const { state, dispatch, mode } = useTodo()
  const { lang, switchLang, t } = useLanguage()
  const uid = user?.uid

  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null) // { type, title, message, label, danger }
  const [notifEnabled, setNotifEnabledState] = useState(getNotifEnabled)
  const [notifPermission, setNotifPermission] = useState(getPermissionState)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [whatsappLoading, setWhatsappLoading] = useState(false)
  const [whatsappSaving, setWhatsappSaving] = useState(false)

  const showToast = (msg, error = false) => {
    setToast({ msg, error })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!uid || !isFirebaseConfigured) {
      setWhatsappNumber('')
      return
    }
    let cancelled = false
    setWhatsappLoading(true)
    getDoc(doc(db, 'users', uid))
      .then(snapshot => {
        if (!cancelled) setWhatsappNumber(snapshot.data()?.whatsappNumber || '')
      })
      .catch(() => {
        if (!cancelled) showToast('Could not load your WhatsApp number', true)
      })
      .finally(() => {
        if (!cancelled) setWhatsappLoading(false)
      })
    return () => { cancelled = true }
  }, [uid])

  const handleSaveWhatsapp = async () => {
    const value = whatsappNumber.trim()
    if (value && !/^\+[1-9]\d{7,14}$/.test(value)) {
      showToast('Enter a valid international number, e.g. +919876543210', true)
      return
    }
    if (!uid || !isFirebaseConfigured) {
      showToast('Sign in with cloud sync to save WhatsApp reminders', true)
      return
    }
    setWhatsappSaving(true)
    try {
      await setDoc(doc(db, 'users', uid), {
        whatsappNumber: value,
        whatsappNotificationsEnabled: Boolean(value),
        whatsappConsentAt: value ? serverTimestamp() : null,
      }, { merge: true })
      setWhatsappNumber(value)
      showToast(value ? 'WhatsApp reminders number saved' : 'WhatsApp reminders disabled')
    } catch (err) {
      showToast(err.message || 'Could not save your WhatsApp number', true)
    } finally {
      setWhatsappSaving(false)
    }
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExportJSON = () => {
    exportJSON(state.todos, state.categories)
    showToast(`Exported ${state.todos.length} tasks as JSON`)
  }

  const handleExportCSV = () => {
    exportCSV(state.todos)
    showToast(`Exported ${state.todos.length} tasks as CSV`)
  }

  // ── Import ──────────────────────────────────────────────────────────────────
  const handleImportFile = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setBusy(true)
    try {
      const { todos, categories } = await parseImportFile(file)
      // Merge: add todos with new IDs to avoid collisions
      const { nanoid } = await import('../../utils/nanoid')
      for (const todo of todos) {
        dispatch({ type: 'ADD_TODO', payload: { ...todo, id: nanoid() } })
      }
      for (const cat of categories) {
        dispatch({ type: 'ADD_CATEGORY', payload: cat })
      }
      showToast(`Imported ${todos.length} tasks`)
    } catch (err) {
      showToast(err.message, true)
    } finally {
      setBusy(false)
    }
  }

  // ── Clear data ──────────────────────────────────────────────────────────────
  const handleClearData = async () => {
    setConfirm(null)
    setBusy(true)
    try {
      if (mode === 'firestore' && uid) await clearFirestoreData(uid)
      clearLocalData()
      dispatch({ type: 'SET_DATA', payload: { todos: [], categories: ['Personal', 'Work', 'Others'] } })
      showToast('All tasks cleared')
    } catch (err) {
      showToast(err.message, true)
    } finally {
      setBusy(false)
    }
  }

  // ── Sign out ────────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    setConfirm(null)
    await signOutUser()
  }

  // ── Delete account ──────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    setConfirm(null)
    if (!user) return
    setBusy(true)
    try {
      // Wipe Firestore data first
      if (uid) await clearFirestoreData(uid)
      clearLocalData()
      dispatch({ type: 'SET_DATA', payload: { todos: [], categories: ['Personal', 'Work', 'Others'] } })
      // Delete Firebase Auth account (may require recent login)
      try {
        await deleteUser(auth.currentUser)
      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          await reauthenticateWithPopup(auth.currentUser, googleProvider)
          await deleteUser(auth.currentUser)
        } else {
          throw err
        }
      }
      showToast('Account deleted')
    } catch (err) {
      showToast(err.message || 'Failed to delete account', true)
    } finally {
      setBusy(false)
    }
  }

  const taskCount = state.todos.length
  const doneCount = state.todos.filter(t => t.completed).length

  const handleNotifToggle = async () => {
    if (!notifEnabled && notifPermission !== 'granted') {
      const granted = await requestPermission()
      setNotifPermission(granted ? 'granted' : 'denied')
      if (!granted) {
        showToast(lang === 'ta' ? 'அனுமதி மறுக்கப்பட்டது' : 'Notification permission denied')
        return
      }
    }
    const next = !notifEnabled
    setNotifEnabled(next)
    setNotifEnabledState(next)
    showToast(next
      ? (lang === 'ta' ? 'அறிவிப்புகள் இயக்கப்பட்டன' : 'Notifications enabled')
      : (lang === 'ta' ? 'அறிவிப்புகள் நிறுத்தப்பட்டன' : 'Notifications disabled'))
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pb-24" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* Profile card */}
        <div
          className="rounded-3xl p-5 mb-6 flex items-center gap-4"
          style={{ background: 'var(--panel)', border: '1px solid rgba(var(--accent-rgb),0.12)' }}
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
              style={{ boxShadow: '0 0 0 3px rgba(var(--accent-rgb),0.3)' }}
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl accent-bg flex items-center justify-center flex-shrink-0 text-2xl font-bold text-white">
              {user ? (user.displayName || user.email || '?').charAt(0).toUpperCase() : '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {user ? (
              <>
                <p className="font-bold text-base truncate" style={{ color: 'var(--text)' }}>
                  {user.displayName || 'Anonymous'}
                </p>
                <p className="text-sm truncate mt-0.5" style={{ color: 'var(--muted)' }}>{user.email}</p>
                <span
                  className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  {mode === 'firestore' ? 'Cloud sync on' : 'Local only'}
                </span>
              </>
            ) : (
              <>
                <p className="font-bold text-base" style={{ color: 'var(--text)' }}>{t('not_signed_in')}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{t('data_local_only')}</p>
                {firebaseEnabled && (
                  <button
                    onClick={signIn}
                    className="mt-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    {t('btn_sign_in_google')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total', value: taskCount },
            { label: 'Done', value: doneCount },
            { label: 'Active', value: taskCount - doneCount },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-2xl p-3 text-center"
              style={{ background: 'var(--panel)' }}
            >
              <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{s.value}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Data management */}
        <Section title={t('section_your_data')}>
          <Row
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
            label={t('export_json')}
            sublabel={t('export_json_sub')}
            onClick={handleExportJSON}
            disabled={busy || taskCount === 0}
          />
          <Row
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            label={t('export_csv')}
            sublabel={t('export_csv_sub')}
            onClick={handleExportCSV}
            disabled={busy || taskCount === 0}
          />
          <Row
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
            label={t('import_json')}
            sublabel={t('import_json_sub')}
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          />
          <Row
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#f87171' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
            label={t('clear_tasks')}
            sublabel={t('clear_tasks_sub')}
            onClick={() => setConfirm({
              type: 'clear',
              title: 'Clear all tasks?',
              message: `This will permanently delete all ${taskCount} tasks${mode === 'firestore' ? ' from the cloud' : ''}. This cannot be undone.`,
              label: 'Clear everything',
              danger: true,
            })}
            disabled={busy || taskCount === 0}
            danger
          />
        </Section>

        {/* Account */}
        {firebaseEnabled && (
          <Section title={t('section_account')}>
            {user ? (
              <>
                <Row
                  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>}
                  label={t('btn_sign_out')}
                  sublabel="Your data stays in the cloud"
                  onClick={() => setConfirm({
                    type: 'signout',
                    title: 'Sign out?',
                    message: 'Your tasks are saved to the cloud and will be there when you sign back in.',
                    label: 'Sign out',
                    danger: false,
                  })}
                  disabled={busy}
                />
                <Row
                  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#f87171' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>}
                  label={t('delete_account')}
                  sublabel={t('delete_account_sub')}
                  onClick={() => setConfirm({
                    type: 'delete',
                    title: 'Delete your account?',
                    message: 'All your tasks and account data will be permanently deleted. This cannot be undone. You may be asked to re-authenticate.',
                    label: 'Delete forever',
                    danger: true,
                  })}
                  disabled={busy}
                  danger
                />
              </>
            ) : (
              <Row
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>}
                label={t('btn_sign_in_google')}
                sublabel={t('sign_in_sync')}
                onClick={signIn}
              />
            )}
          </Section>
        )}

        {/* Notifications */}
        <Section title={lang === 'ta' ? 'அறிவிப்புகள்' : 'NOTIFICATIONS'}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {lang === 'ta' ? 'பணி நினைவூட்டல்கள்' : 'Task Reminders'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {notifPermission === 'denied'
                  ? (lang === 'ta' ? 'உலாவியில் அனுமதி மறுக்கப்பட்டது' : 'Blocked in browser settings')
                  : (lang === 'ta' ? 'காலக்கெடு 15 நிமிடம் முன் அறிவிப்பு' : '15 min before each due task')}
              </p>
            </div>
            {/* Toggle switch */}
            <button
              onClick={handleNotifToggle}
              disabled={notifPermission === 'denied'}
              className="transition-all duration-200 disabled:opacity-40"
              style={{
                width: 48, height: 28, borderRadius: 14,
                background: notifEnabled && notifPermission === 'granted'
                  ? 'var(--accent)'
                  : 'rgba(var(--accent-rgb),0.15)',
                border: 'none', cursor: notifPermission === 'denied' ? 'not-allowed' : 'pointer',
                position: 'relative', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 3,
                left: notifEnabled && notifPermission === 'granted' ? 23 : 3,
                width: 22, height: 22, borderRadius: '50%',
                background: '#fff',
                transition: 'left 200ms cubic-bezier(0.34,1.56,0.64,1)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              }} />
            </button>
          </div>
        </Section>

        {/* WhatsApp reminders */}
        <Section title="WHATSAPP REMINDERS">
          <div style={{ padding: '14px 16px' }}>
            <label htmlFor="whatsapp-number" className="block text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
              WhatsApp number
            </label>
            <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
              Enter the full international number with country code and no spaces. By saving it, you agree to receive task reminders on WhatsApp. Leave blank and save to turn reminders off.
            </p>
            <div className="flex gap-2">
              <input
                id="whatsapp-number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+919876543210"
                value={whatsappNumber}
                onChange={event => setWhatsappNumber(event.target.value)}
                disabled={!user || whatsappLoading || whatsappSaving}
                className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-50"
                style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid rgba(var(--accent-rgb),0.16)' }}
                aria-describedby="whatsapp-help"
              />
              <button
                type="button"
                onClick={handleSaveWhatsapp}
                disabled={!user || whatsappLoading || whatsappSaving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                {whatsappSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
            <p id="whatsapp-help" className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              {!user ? 'Sign in and enable cloud sync to configure WhatsApp reminders.' : 'For now, reminders can be delivered only to numbers already enabled for the configured Twilio WhatsApp sender.'}
            </p>
          </div>
        </Section>

        {/* Language */}
        <Section title={t('section_language')}>
          <div style={{ padding: '12px 16px', display: 'flex', gap: 10 }}>
            {[
              { code: 'en', label: t('lang_en') },
              { code: 'ta', label: t('lang_ta') },
            ].map(({ code, label }) => (
              <button
                key={code}
                onClick={() => switchLang(code)}
                className="transition-all duration-150 active:scale-95"
                style={{
                  flex: 1, padding: '10px', borderRadius: 12, border: 'none',
                  background: lang === code ? 'var(--accent)' : 'rgba(var(--accent-rgb),0.1)',
                  color: lang === code ? '#fff' : 'var(--muted)',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        {/* App info */}
        <div className="text-center pb-4">
          <p className="text-xs" style={{ color: 'var(--muted)', opacity: 0.5 }}>
            AK Todo · {mode === 'firestore' ? 'Cloud mode' : 'Local mode'}
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.label}
          danger={confirm.danger}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.type === 'clear') handleClearData()
            else if (confirm.type === 'signout') handleSignOut()
            else if (confirm.type === 'delete') handleDeleteAccount()
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg whitespace-nowrap"
          style={{
            background: toast.error ? '#ef4444' : 'var(--accent)',
            color: '#fff',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Busy overlay */}
      {busy && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
      )}
    </div>
  )
}
