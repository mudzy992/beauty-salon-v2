import { ReactNode, useEffect, useMemo } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Center, Spinner } from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'
import { getPostAuthRedirectPath } from '../utils/clientOnboarding'

export default function PublicOnlyRoute({ children }: { children: ReactNode }) {
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
      <Center minH="100vh">
        <Spinner size="xl" />
      </Center>
    )
  }

  if (token && user) {
    return <Navigate to={fallbackRedirect} state={{ from: location }} replace />
  }

  if (token && !user) {
    return (
      <Center minH="100vh">
        <Spinner size="xl" />
      </Center>
    )
  }

  return <>{children}</>
}

