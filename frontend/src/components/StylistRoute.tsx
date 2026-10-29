import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { normalizeRoles } from '../utils/clientOnboarding'

export default function StylistRoute({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { token, user, isReady } = useAuth()
  const location = useLocation()

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600">{t('common.loading')}</div>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const roles = normalizeRoles(user?.roles)
  const isStylist = roles.includes('STYLIST')
  if (!isStylist) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

