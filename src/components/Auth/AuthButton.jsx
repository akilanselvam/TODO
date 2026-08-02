import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 002.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}

export default function AuthButton() {
  const { firebaseEnabled, authLoading, user, signIn, signOutUser } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const onDocClick = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Local-only build (no Firebase configured): show a subtle indicator.
  if (!firebaseEnabled) {
    return (
      <span
        title="Running in local mode — data is saved in this browser only. Add Firebase config to enable cross-device sync."
        className="hidden sm:inline text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
      >
        Local
      </span>
    )
  }

  if (authLoading) {
    return <span className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
  }

  if (!user) {
    return (
      <button
        onClick={signIn}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        <GoogleIcon />
        <span className="hidden sm:inline">Sign in</span>
      </button>
    )
  }

  const initial = (user.displayName || user.email || '?').charAt(0).toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(o => !o)}
        className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-slate-200 dark:hover:ring-slate-600 transition-all"
        title={user.email || user.displayName || 'Account'}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="w-8 h-8 rounded-full accent-bg text-white text-sm font-medium flex items-center justify-center">
            {initial}
          </span>
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{user.displayName || 'Signed in'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            <p className="mt-1 text-[11px] text-green-600 dark:text-green-400">● Synced to cloud</p>
          </div>
          <button
            onClick={() => { setMenuOpen(false); signOutUser() }}
            className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
