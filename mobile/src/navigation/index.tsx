import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { useAppModeStore } from '../store/appModeStore';
import { isStylist, isClient } from '../utils/roles';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { StylistNavigator } from './StylistNavigator';
import type { RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { colors, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const appMode = useAppModeStore((s) => s.mode);

  const showStylistApp = user && isStylist(user) && (appMode === 'stylist' || !isClient(user));

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.headerBg,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : showStylistApp ? (
          <RootStack.Screen name="StylistMain" component={StylistNavigator} />
        ) : (
          <RootStack.Screen name="Main" component={MainNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
