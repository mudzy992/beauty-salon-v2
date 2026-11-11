import { PropsWithChildren, useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'

import '../i18n'
import { queryClient } from '../query/client'
import { useAuthStore } from '../stores/auth.store'
import { AuthProvider } from '../context/AuthContext'
import { SettingsProvider } from '../context/SettingsContext'
import { SocketProvider } from '../context/SocketContext'
import { ThemeProvider } from '../features/shell/theme/theme-context'
import { AppToaster } from '../lib/toast/toaster'

export const AppProviders = ({ children }: PropsWithChildren) => {
  const token = useAuthStore((s) => s.token)
  const setReady = useAuthStore((s) => s.setReady)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (!token) {
      setReady(true)
      return
    }
    refreshProfile()
      .catch(() => logout())
      .finally(() => setReady(true))
  }, [token, refreshProfile, logout, setReady])

  return (
    // WCAG 2.5.4 (Motion Actuation, AA) i 2.3.3 (AAA): `framer-motion` animira preko JS-a, pa
    // ga globalni CSS blok `prefers-reduced-motion` u `styles/globals.css` NE doseže —
    // `whileHover`/`whileTap` bi se vrtjeli i kad korisnik traži manje pokreta.
    // `reducedMotion="user"` je službeni mehanizam: isključuje transform/layout animacije prema
    // postavci sistema, a zadržava opacity (koji ne izaziva vestibularne probleme).
    // Bez ovoga je 9 fajlova s 26 animacija ignorisalo korisnikovu postavku.
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            {/* NEJRA §12 — ThemeProvider je IZNAD SettingsProvider jer Q9 traži da
                SettingsContext čita `skin` prije pisanja inline --brand-* varijabli. */}
            <ThemeProvider>
              <SettingsProvider>
                {children}
                <AppToaster />
              </SettingsProvider>
            </ThemeProvider>
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MotionConfig>
  )
}

