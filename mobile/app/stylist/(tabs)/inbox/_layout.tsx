import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../../../src/hooks/useTheme';

export default function InboxStackLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.headerBg },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Zahtjevi' }} />
    </Stack>
  );
}

