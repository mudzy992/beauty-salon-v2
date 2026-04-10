import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { normalizeRoles } from '../utils/clientOnboarding'

export default function StylistRoute({ children }: { children: ReactNode }) {
  const { token, user, isReady } = useAuth()
  const location = useLocation()

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600">Učitavanje…</div>
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

