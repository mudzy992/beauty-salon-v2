import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  applyTheme,
  normalizeTheme,
  readStoredTheme,
  writeStoredTheme,
  THEME_META,
} from './theme-state.mjs'
import type { ThemeChoice, ThemeMode, ThemeSkin } from './theme-state.mjs'

export type { ThemeChoice, ThemeSkin, ThemeMode } from './theme-state.mjs'

type ThemeContextValue = {
  choice: ThemeChoice
  setChoice: (choice: ThemeChoice) => void
  skin: ThemeSkin
  mode: ThemeMode
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * NEJRA §12 — jedini vlasnik stanja teme.
 *
 * Stoji IZNAD `SettingsProvider` u `app/providers.tsx`, jer `SettingsContext`
 * čita `skin` da bi ugasio runtime `theme_primary`/`theme_accent` override (Q9).
 * `applyTheme` se poziva u `useEffect`, pa prvi render nikad ne dira `<html>`
 * prije nego React montira djecu (default = današnji izgled).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(() =>
    typeof window === 'undefined' ? 'classic' : readStoredTheme(window.localStorage),
  )

  useEffect(() => {
    applyTheme(document.documentElement, choice, document)
  }, [choice])

  const setChoice = useCallback((next: ThemeChoice) => {
    const value = normalizeTheme(next)
    writeStoredTheme(window.localStorage, value)
    setChoiceState(value)
  }, [])

  const value = useMemo<ThemeContextValue>(() => {
    const meta = THEME_META[choice]
    return { choice, setChoice, skin: meta.skin, mode: meta.mode }
  }, [choice, setChoice])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
