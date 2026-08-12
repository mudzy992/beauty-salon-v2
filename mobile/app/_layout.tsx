import '../src/i18n';

import React, { useEffect } from 'react';
import { LogBox, View } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/store/authStore';
import { useNotificationStore } from '../src/store/notificationStore';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { SocketProvider } from '../src/realtime/SocketContext';
import { SocketRealtimeSync } from '../src/realtime/SocketRealtimeSync';
import { LoadingScreen } from '../src/components/ui/LoadingScreen';

// Keep console clean during development.
LogBox.ignoreLogs(['ExpoKeepAwake', 'current activity is no longer available']);

// Android ponekad odbije promise iz `expo-keep-awake` (aktivnost više nije dostupna),
// što trenutno ruši app. Patchujemo tako da `activate()` proguta grešku.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const keepAwake = require('expo-keep-awake') as {
    activate?: (...args: any[]) => Promise<any>;
    deactivate?: (...args: any[]) => Promise<any>;
  };

  if (keepAwake?.activate) {
    const originalActivate = keepAwake.activate;
    keepAwake.activate = (...args: any[]) => originalActivate(...args).catch(() => undefined);
  }

  if (keepAwake?.deactivate) {
    const originalDeactivate = keepAwake.deactivate;
    keepAwake.deactivate = (...args: any[]) => originalDeactivate(...args).catch(() => undefined);
  }
} catch {
  // ignore - ako modul nije dostupan, ne radimo ništa
}

// Root fill only (no padding/margin). Avoids any faux "strip" above system navigation.
function ThemedRootShell({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      {children}
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const { colors, isDark } = useTheme();
  const { isInitialized, initialize, user, token } = useAuthStore();
  const fetchNotifications = useNotificationStore((s) => s.fetch);

  usePushNotifications();

  // User requirement:
  // - status bar icons always white
  // - navigation bar icons swap with theme (so 3-button home/back/recent stay readable)
  const statusBarStyle: 'light' = 'light';
  const navigationBarStyle: 'light' | 'dark' = isDark ? 'light' : 'dark';
  const systemBarStyle = {
    statusBar: statusBarStyle,
    navigationBar: navigationBarStyle,
  };

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user?.id) fetchNotifications();
  }, [user?.id, fetchNotifications]);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const bars = <SystemBars style={systemBarStyle} />;

  if (!fontsLoaded || !isInitialized) {
    return (
      <>
        {bars}
        <LoadingScreen />
      </>
    );
  }

  return (
    <SocketProvider token={user ? token : null}>
      <SocketRealtimeSync />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {bars}
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </SocketProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedRootShell>
          <AppContent />
        </ThemedRootShell>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

