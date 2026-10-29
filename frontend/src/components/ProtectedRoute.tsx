import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getClientMandatoryOnboardingPath,
  isExemptFromForcedPasswordChange,
} from '../utils/clientOnboarding';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { token, user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600">{t('common.loading')}</div>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (
    user?.mustChangePassword &&
    !isExemptFromForcedPasswordChange(user) &&
    location.pathname !== '/force-change-password'
  ) {
    return <Navigate to="/force-change-password" replace />;
  }

  const isClient = (user?.roles ?? []).includes('CLIENT')
  const isOnboardingRoute = location.pathname.startsWith('/onboarding')
  const isForceChangePasswordRoute = location.pathname === '/force-change-password'

  if (isClient && !isForceChangePasswordRoute && user) {
    const nextStep = getClientMandatoryOnboardingPath(user)
    if (nextStep && location.pathname !== nextStep) {
      return <Navigate to={nextStep} replace />
    }
    if (isOnboardingRoute && nextStep === null) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>;
}
