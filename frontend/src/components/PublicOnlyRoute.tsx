import { ReactNode, useEffect, useMemo } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Center, Spinner } from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'

export default function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { token, user, isReady } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const fallbackRedirect = useMemo(() => {
    const roles = user?.roles ?? []
    const isAdmin = roles.includes('SYSTEM_ADMIN') || roles.includes('OWNER')
    return isAdmin ? '/admin' : '/'
  }, [user?.roles])

  useEffect(() => {
    if (!isReady) return
    if (!token) return
    navigate(fallbackRedirect, { replace: true })
  }, [isReady, token, navigate, fallbackRedirect])

  if (!isReady) {
    return (
      <Center minH="100vh">
        <Spinner size="xl" />
      </Center>
    )
  }

  if (token) {
    return <Navigate to={fallbackRedirect} state={{ from: location }} replace />
  }

  return <>{children}</>
}

