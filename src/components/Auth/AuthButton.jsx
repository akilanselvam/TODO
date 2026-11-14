import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

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

function GearIcon({ size = 5 }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

/**
 * compact  — hero/compact-header variant: smaller avatar with white ring, no sign-in button shown
 * onSettings — callback to navigate to the settings view
 */
export default function AuthButton({ onSettings, compact = false }) {
  const { firebaseEnabled, authLoading, user, signIn, signOutUser } = useAuth()
  const { t, lang, switchLang } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const onDocClick = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  if (!firebaseEnabled) {
    if (compact) {
      return (
        <button
          onClick={onSettings}
          className="p-2 -mr-2 rounded-xl text-white/70 hover:text-white transition-all duration-150 active:scale-90 active:bg-white/15"
        >
          <GearIcon />
        </button>
      )
    }
    return (
      <span
        title="Running in local mode — data is saved in this browser only."
        className="hidden sm:inline text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
      >
        Local
      </span>
    )
  }

  if (authLoading) {
    return <span className={`rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse ${compact ? 'w-7 h-7' : 'w-8 h-8'}`} />
  }

  if (!user) {
    if (compact) {
      // Not signed in in compact mode → gear icon → settings
      return (
        <button
          onClick={onSettings}
          className="p-2 -mr-2 rounded-xl text-white/70 hover:text-white transition-all duration-150 active:scale-90 active:bg-white/15"
        >
          <GearIcon />
        </button>
      )
    }
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
    <div className={`relative ${compact ? '' : ''}`} ref={menuRef}>
      <button
        onClick={() => setMenuOpen(o => !o)}
        className={compact
          ? 'p-1 -mr-2 rounded-xl transition-all duration-150 active:scale-90 active:bg-white/15'
          : 'flex items-center gap-2 rounded-full hover:ring-2 hover:ring-slate-200 dark:hover:ring-slate-600 transition-all'
        }
        title={user.email || user.displayName || 'Account'}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className={compact ? 'w-7 h-7 rounded-full ring-2 ring-white/40' : 'w-8 h-8 rounded-full'}
          />
        ) : (
          <span className={`rounded-full accent-bg text-white font-medium flex items-center justify-center ${compact ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm'}`}>
            {initial}
          </span>
        )}
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-2xl shadow-xl z-50 overflow-hidden"
          style={{ background: 'var(--panel)', border: '1px solid rgba(var(--accent-rgb),0.15)' }}
        >
          {/* User info */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.1)' }}>
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{user.displayName || 'Signed in'}</p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>{user.email}</p>
            <p className="mt-1.5 text-[11px] font-medium" style={{ color: '#4ade80' }}>{t('synced_cloud')}</p>
          </div>

          {/* Language toggle */}
          <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid rgba(var(--accent-rgb),0.08)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {t('section_language')}
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ code: 'en', label: t('lang_en') }, { code: 'ta', label: t('lang_ta') }].map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => switchLang(code)}
                  className="transition-all duration-150 active:scale-95"
                  style={{
                    flex: 1, padding: '7px 4px', borderRadius: 10, border: 'none',
                    background: lang === code ? 'var(--accent)' : 'rgba(var(--accent-rgb),0.1)',
                    color: lang === code ? '#fff' : 'var(--muted)',
                    fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          {onSettings && (
            <button
              onClick={() => { setMenuOpen(false); onSettings() }}
              className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-150 active:scale-[0.98] flex items-center gap-2.5"
              style={{ color: 'var(--text)', borderBottom: '1px solid rgba(var(--accent-rgb),0.08)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <GearIcon size={4} />
              {t('account_settings')}
            </button>
          )}

          {/* Sign out */}
          <button
            onClick={() => { setMenuOpen(false); signOutUser() }}
            className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-150 active:scale-[0.98]"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
