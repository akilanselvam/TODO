import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

const PALETTE_KEY = 'palette'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [palette, setPalette] = useState(() => localStorage.getItem(PALETTE_KEY) || 'classic')

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-palette', palette)
    localStorage.setItem(PALETTE_KEY, palette)
  }, [palette])

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, palette, setPalette }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
