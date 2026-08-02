import { useTheme } from '../../context/ThemeContext'

const PALETTES = [
  { id: 'interallar', label: 'Interallar' },
  { id: 'mario', label: 'Mario' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'classic', label: 'Classic' },
]

export default function ThemeToggle() {
  const { palette, setPalette } = useTheme()

  return (
    <div className="relative">
      <select
        value={palette}
        onChange={e => setPalette(e.target.value)}
        className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
        title="Select color palette"
      >
        {PALETTES.map(p => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
    </div>
  )
}
