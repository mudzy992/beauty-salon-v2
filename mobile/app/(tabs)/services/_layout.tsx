import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../src/hooks/useTheme';

export default function ServicesStackLayout() {
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
      <Stack.Screen name="index" options={{ title: t('services.title') }} />
      <Stack.Screen name="service-detail" options={{ headerShown: true }} />
      <Stack.Screen name="service-single-detail" options={{ headerShown: true }} />
      <Stack.Screen name="reservation" options={{ title: t('reservation.title') }} />
    </Stack>
  );
}

