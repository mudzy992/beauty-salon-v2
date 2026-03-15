import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_600SemiBold_Italic,
} from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { ThemeProvider } from './src/theme/ThemeContext';
import { useTheme } from './src/hooks/useTheme';
import { RootNavigator } from './src/navigation';
import { useAuthStore } from './src/store/authStore';
import { useNotificationStore } from './src/store/notificationStore';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { LoadingScreen } from './src/components/ui/LoadingScreen';
import './src/i18n';

// Known Expo/Android: KeepAwake rejection when activity is no longer available (e.g. app backgrounded/closed)
LogBox.ignoreLogs(['ExpoKeepAwake', 'current activity is no longer available']);

function AppContent() {
  const { isDark } = useTheme();
  const { isInitialized, initialize, user } = useAuthStore();
  const fetchNotifications = useNotificationStore((s) => s.fetch);

  usePushNotifications();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_600SemiBold_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded || !isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
