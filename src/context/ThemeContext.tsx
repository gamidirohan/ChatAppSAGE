'use client'

import { createContext, useState, useEffect, useContext } from 'react'

type Theme = 'light' | 'dark'

type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('theme')
    if (storedTheme === 'dark') {
      setTheme('dark')
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const body = document.body

    root.classList.remove('light', 'dark')
    body.classList.remove('light', 'dark')

    root.classList.add(theme)
    body.classList.add(theme)

    root.dataset.theme = theme
    body.dataset.theme = theme
    root.style.colorScheme = theme
    body.style.colorScheme = theme

    window.localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
