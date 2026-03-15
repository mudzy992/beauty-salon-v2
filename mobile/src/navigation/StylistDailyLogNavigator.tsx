import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { DailyLogListScreen } from '../screens/stylist/DailyLogListScreen';
import { DailyLogDetailScreen } from '../screens/stylist/DailyLogDetailScreen';
import { DailyLogNewEntryScreen } from '../screens/stylist/DailyLogNewEntryScreen';
import type { StylistDailyLogStackParamList } from './types';

const Stack = createNativeStackNavigator<StylistDailyLogStackParamList>();

export function StylistDailyLogNavigator() {
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
        name="DailyLogList"
        component={DailyLogListScreen}
        options={{ title: 'Dnevna knjiga' }}
      />
      <Stack.Screen
        name="DailyLogDetail"
        component={DailyLogDetailScreen}
        options={{ title: 'Zapis' }}
      />
      <Stack.Screen
        name="DailyLogNewEntry"
        component={DailyLogNewEntryScreen}
        options={{ title: 'Novi zapis (ručno)' }}
      />
    </Stack.Navigator>
  );
}
