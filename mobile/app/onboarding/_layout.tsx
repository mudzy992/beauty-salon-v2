import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useTheme } from '../../src/hooks/useTheme';

export default function OnboardingLayout() {
  const { colors } = useTheme();
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
