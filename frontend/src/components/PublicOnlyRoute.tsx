import { ReactNode, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPostAuthRedirectPath } from '../utils/clientOnboarding'

export default function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { token, user, isReady } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const fallbackRedirect = useMemo(() => getPostAuthRedirectPath(user), [user])

  useEffect(() => {
    if (!isReady) return
    if (!token) return
    if (!user) return
    navigate(fallbackRedirect, { replace: true })
  }, [isReady, token, user, navigate, fallbackRedirect])

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600">{t('common.loading')}</div>
      </div>
    )
  }

  if (token && user) {
    return <Navigate to={fallbackRedirect} state={{ from: location }} replace />
  }

  if (token && !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600">{t('common.loading')}</div>
      </div>
    )
  }

  return <>{children}</>
}

