import ThemeToggle from '../UI/ThemeToggle'
import AuthButton from '../Auth/AuthButton'

export default function Header({ onMenuToggle }) {
  return (
    <header className="sticky top-0 z-10 bg-white/90 dark:bg-[rgba(255,255,255,0.03)] backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/30 px-4 py-4 flex items-center gap-4">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="flex items-center gap-3 flex-1">
        <img src="/ak-logo-white.png" alt="AK's Assistant" className="w-12 h-12 md:w-14 md:h-14 object-contain bg-transparent rounded-none" />
      </div>
      <AuthButton />
      <ThemeToggle />
    </header>
  )
}
