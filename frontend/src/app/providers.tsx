import { PropsWithChildren, useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'

import '../i18n'
import { queryClient } from '../query/client'
import { useAuthStore } from '../stores/auth.store'
import { AuthProvider } from '../context/AuthContext'
import { SettingsProvider } from '../context/SettingsContext'
import { SocketProvider } from '../context/SocketContext'
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <SettingsProvider>
            {children}
            <AppToaster />
          </SettingsProvider>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

