import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';

export default function HomeStackLayout() {
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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="blog-list" options={{ title: 'Blog' }} />
      <Stack.Screen name="blog-post/[slug]" options={{ title: '' }} />
      <Stack.Screen name="satisfied-clients" options={{ title: 'Zadovoljni klijenti' }} />
    </Stack>
  );
}

