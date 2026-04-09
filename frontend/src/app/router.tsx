import { useRoutes } from 'react-router-dom'

import PublicOnlyRoute from '../components/PublicOnlyRoute'
import ProtectedRoute from '../components/ProtectedRoute'
import Login from '../pages/Login'
import Register from '../pages/Register'
import ForceChangePassword from '../pages/ForceChangePassword'
import OnboardingGender from '../pages/onboarding/OnboardingGender'
import OnboardingEmail from '../pages/onboarding/OnboardingEmail'
import NotFound from '../pages/NotFound'
import { adminRoutes } from './routes/admin.routes'
import { publicRoutes } from './routes/public.routes'

export const AppRouter = () => {
  const element = useRoutes([
    {
      path: '/login',
      element: (
        <PublicOnlyRoute>
          <Login />
        </PublicOnlyRoute>
      ),
    },
    {
      path: '/register',
      element: (
        <PublicOnlyRoute>
          <Register />
        </PublicOnlyRoute>
      ),
    },
    {
      path: '/force-change-password',
      element: (
        <ProtectedRoute>
          <ForceChangePassword />
        </ProtectedRoute>
      ),
    },
    {
      path: '/onboarding/gender',
      element: (
        <ProtectedRoute>
          <OnboardingGender />
        </ProtectedRoute>
      ),
    },
    {
      path: '/onboarding/email',
      element: (
        <ProtectedRoute>
          <OnboardingEmail />
        </ProtectedRoute>
      ),
    },
    ...publicRoutes,
    ...adminRoutes,
    { path: '*', element: <NotFound /> },
  ])

  return element
}

