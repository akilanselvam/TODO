import { useState, useEffect } from 'react'

export default function ToastStack() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    function handler(e) {
      const { title, body } = e.detail
      const id = Date.now() + Math.random()
      setToasts(prev => [...prev, { id, title, body }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000)
    }
    window.addEventListener('app-toast', handler)
    return () => window.removeEventListener('app-toast', handler)
  }, [])

  if (!toasts.length) return null

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      width: 'min(360px, calc(100vw - 32px))',
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            background: 'var(--panel)',
            borderRadius: 14,
            padding: '12px 14px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
            borderLeft: '4px solid var(--accent)',
            pointerEvents: 'auto',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            animation: 'toast-in 220ms cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'rgba(var(--accent-rgb),0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" fill="none" stroke="var(--accent)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{toast.title}</p>
            {toast.body && (
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{toast.body}</p>
            )}
          </div>
          <button
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 2, color: 'var(--muted)', flexShrink: 0, lineHeight: 0,
            }}
            aria-label="Dismiss"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <style>{`@keyframes toast-in { from { opacity:0; transform:translateY(-8px) scale(0.96); } to { opacity:1; transform:none; } }`}</style>
    </div>
  )
}
