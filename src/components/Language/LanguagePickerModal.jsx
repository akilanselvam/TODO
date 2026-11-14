import { useLanguage } from '../../context/LanguageContext'

const OPTIONS = [
  { code: 'en', label: 'English', sub: 'Continue in English' },
  { code: 'ta', label: 'தமிழ்', sub: 'தமிழில் தொடரவும்' },
]

export default function LanguagePickerModal() {
  const { lang, switchLang, showLangPicker } = useLanguage()

  if (!showLangPicker) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 shadow-2xl"
        style={{ background: 'var(--panel)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}
      >
        {/* Globe icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'rgba(var(--accent-rgb),0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: 'var(--accent)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 004 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
          Choose your language
        </h2>
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
          மொழியை தேர்வு செய்யவும்
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {OPTIONS.map(({ code, label, sub }) => {
            const active = lang === code
            return (
              <button
                key={code}
                onClick={() => switchLang(code)}
                className="active:scale-[0.98] transition-all duration-150"
                style={{
                  padding: '16px 20px',
                  borderRadius: 18,
                  border: `2px solid ${active ? 'var(--accent)' : 'rgba(var(--accent-rgb),0.15)'}`,
                  background: active ? 'rgba(var(--accent-rgb),0.1)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>{label}</p>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{sub}</p>
                </div>
                {active && (
                  <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    style={{ color: 'var(--accent)', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => switchLang(lang)}
          className="active:scale-[0.98] transition-all duration-150"
          style={{
            marginTop: 20, width: '100%', padding: '14px',
            borderRadius: 16, border: 'none',
            background: 'var(--accent)', color: '#fff',
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {lang === 'ta' ? 'தொடரவும்' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
