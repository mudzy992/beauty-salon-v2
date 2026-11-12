import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  applyTheme,
  THEME_META,
} from './theme-state.mjs'
import type { ThemeChoice, ThemeMode, ThemeSkin } from './theme-state.mjs'
import { readModePreference, resolveTheme, writeModePreference } from './theme-policy.mjs'

export type { ThemeChoice, ThemeSkin, ThemeMode } from './theme-state.mjs'

type ThemeContextValue = {
  choice: ThemeChoice
  setChoice: (choice: ThemeChoice) => void
  skin: ThemeSkin
  mode: ThemeMode
  setGlobalTheme: (skin: string | undefined, mode: string | undefined) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Jedini vlasnik stanja teme. Administratorske postavke dolaze preko
 * SettingsProvider-a, a lokalno se pamti samo Aurum svijetli/tamni režim.
 * Dok postavke nisu dostupne primjenjuje se odobreni Aurum svijetli default.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [globalTheme, setGlobalThemeState] = useState({ skin: 'aurum', mode: 'light' })
  const [preference, setPreference] = useState<ThemeMode | null>(() => {
    try { return typeof window === 'undefined' ? null : readModePreference(window.localStorage) }
    catch { return null }
  })
  const choice = resolveTheme(globalTheme.skin, globalTheme.mode, preference)

  useEffect(() => {
    applyTheme(document.documentElement, choice, document)
  }, [choice])

  const setGlobalTheme = useCallback((skin: string | undefined, mode: string | undefined) => {
    setGlobalThemeState({ skin: skin === 'classic' ? 'classic' : 'aurum', mode: mode === 'dark' ? 'dark' : 'light' })
  }, [])
  const setChoice = useCallback((next: ThemeChoice) => {
    if (next !== 'aurum-light' && next !== 'aurum-dark') return
    const mode = next === 'aurum-dark' ? 'dark' : 'light'
    setPreference(mode)
    try { writeModePreference(window.localStorage, mode) } catch { /* storage may be blocked */ }
  }, [])

  const value = useMemo<ThemeContextValue>(() => {
    const meta = THEME_META[choice]
    return { choice, setChoice, setGlobalTheme, skin: meta.skin, mode: meta.mode }
  }, [choice, setChoice, setGlobalTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
