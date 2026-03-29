import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../src/hooks/useTheme';

export default function ProfileStackLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.headerBg },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('profile.title') }} />
      <Stack.Screen name="edit" options={{ title: t('profile.editProfile') }} />
      <Stack.Screen name="change-password" options={{ title: t('profile.changePasswordLabel') }} />
      <Stack.Screen name="notifications" options={{ title: t('notifications.title') }} />
    </Stack>
  );
}

