import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../src/hooks/useTheme';

export default function ReservationsStackLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();

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
      <Stack.Screen name="index" options={{ title: t('myReservations.title') }} />
      <Stack.Screen name="[reservationId]" options={{ title: t('reservationDetail.title') }} />
      <Stack.Screen name="write-review" options={{ title: t('reviews.writeReview') }} />
    </Stack>
  );
}

