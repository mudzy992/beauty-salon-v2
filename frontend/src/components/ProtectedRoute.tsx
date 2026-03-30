import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner, Center } from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import {
  getClientMandatoryOnboardingPath,
  isExemptFromForcedPasswordChange,
} from '../utils/clientOnboarding';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return (
      <Center minH="100vh">
        <Spinner size="xl" />
      </Center>
    );
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
