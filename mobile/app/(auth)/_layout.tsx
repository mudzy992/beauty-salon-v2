import React from 'react';
import { Redirect, Slot } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { SessionBootstrapNotice } from '../../src/components/SessionBootstrapNotice';

export default function AuthLayout() {
  const { user, isInitialized, bootstrapError, isInitializing, initialize } = useAuthStore();

  if (!isInitialized) return null;
  if (user) return <Redirect href="/" />;
  if (bootstrapError) {
    return (
      <SessionBootstrapNotice
        error={bootstrapError}
        isRetrying={isInitializing}
        onRetry={initialize}
      />
    );
  }

  return <Slot />;
}

