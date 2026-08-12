import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import type { StylistScheduleStackParamList } from './types';
import { StylistScheduleScreen } from '../screens/stylist/StylistScheduleScreen';
import { StylistDirectBookingScreen } from '../screens/stylist/StylistDirectBookingScreen';
import { StylistReservationDetailScreen } from '../screens/stylist/StylistReservationDetailScreen';

const Stack = createNativeStackNavigator<StylistScheduleStackParamList>();

export function StylistScheduleNavigator() {
  const { colors } = useTheme();
  const options = {
    headerStyle: { backgroundColor: colors.headerBg },
    headerTintColor: colors.headerText,
    headerTitleStyle: { fontWeight: '600' as const },
    contentStyle: { backgroundColor: colors.background },
  };

  return (
    <Stack.Navigator screenOptions={options}>
      <Stack.Screen
        name="ScheduleList"
        component={StylistScheduleScreen}
        options={{ title: 'Raspored' }}
      />
      <Stack.Screen
        name="StylistDirectBooking"
        component={StylistDirectBookingScreen}
        options={{ title: 'Direktna rezervacija' }}
      />
      <Stack.Screen
        name="StylistReservationDetail"
        component={StylistReservationDetailScreen}
        options={{ title: 'Detalji termina' }}
      />
    </Stack.Navigator>
  );
}

