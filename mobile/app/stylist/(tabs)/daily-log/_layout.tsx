import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../../../src/hooks/useTheme';

export default function DailyLogStackLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.headerBg },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Dnevna knjiga' }} />
      <Stack.Screen name="debts" options={{ title: 'Dužnici' }} />
      <Stack.Screen name="detail/[entryId]" options={{ title: 'Zapis' }} />
      <Stack.Screen name="new-entry" options={{ title: 'Novi zapis (ručno)' }} />
      <Stack.Screen
        name="reschedule-preview/[reservationId]"
        options={{ title: 'Novi raspored' }}
      />
    </Stack>
  );
}

