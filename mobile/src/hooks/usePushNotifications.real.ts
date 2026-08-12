import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useRouter } from 'expo-router';
import { resolvePushRoute } from '../utils/resolve-push-route';

function resolveProjectId(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const fromExpoConfig = (Constants?.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  const fromEasConfig = (Constants as { easConfig?: { projectId?: string } })?.easConfig?.projectId;
  const fromManifest2 = (Constants as { manifest2?: { extra?: { eas?: { projectId?: string } } } })?.manifest2?.extra?.eas?.projectId;
  return fromEnv || fromEasConfig || fromExpoConfig || fromManifest2;
}

function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

async function configureChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Opće obavijesti',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#D4A843',
  });
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  configureNotificationHandler();
  await configureChannels();

  const existing = await Notifications.getPermissionsAsync();
  let granted = !!(existing as { granted?: boolean }).granted;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = !!(req as { granted?: boolean }).granted;
  }
  if (!granted) {
    console.warn('[Push] Permission not granted.');
    return null;
  }

  if (!Device.isDevice) {
    console.warn('[Push] Not registering token on simulator/emulator.');
    return null;
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    console.error('[Push] Missing EAS projectId for push token generation.');
    return null;
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse?.data;
    if (!token) {
      console.error('[Push] Expo push token was not returned by getExpoPushTokenAsync.');
      return null;
    }
    return token;
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'message' in e ? (e as { message: string }).message : e;
    console.error('[Push] getExpoPushTokenAsync failed:', msg);
    return null;
  }
}

async function unregisterPushToken(token: string): Promise<void> {
  try {
    await api.delete('/api/notifications/push-token', { data: { token } });
  } catch {
    // ignore logout cleanup failures
  }
}

function navigateFromPushData(
  router: ReturnType<typeof useRouter>,
  data: Record<string, unknown>,
): void {
  const target = resolvePushRoute(data);
  if (!target) return;
  router.push(target as never);
}

export function usePushNotifications() {
  const user = useAuthStore((s) => s.user);
  const fetchNotifications = useNotificationStore((s) => s.fetch);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const receivedListener = useRef<Notifications.EventSubscription | null>(null);
  const registeredTokenRef = useRef<string | null>(null);
  const handledColdStartRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      const token = registeredTokenRef.current;
      if (token) {
        void unregisterPushToken(token);
        registeredTokenRef.current = null;
      }
      if (Platform.OS !== 'web') {
        void Notifications.setBadgeCountAsync(0);
      }
      return;
    }

    let isMounted = true;

    (async () => {
      if (!handledColdStartRef.current) {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse?.notification) {
          handledColdStartRef.current = true;
          const data = (lastResponse.notification.request?.content?.data ?? {}) as Record<string, unknown>;
          navigateFromPushData(router, data);
        }
      }

      const token = await registerForPushNotificationsAsync();
      if (!isMounted || !token) return;

      registeredTokenRef.current = token;
      try {
        await api.post('/api/notifications/push-token', {
          token,
          platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
        });
      } catch (e: unknown) {
        const err = e as { response?: { status?: number; data?: unknown } };
        console.warn(
          '[Push] Push token register failed:',
          err?.response?.status,
          err?.response?.data ?? err,
        );
      }
    })();

    receivedListener.current = Notifications.addNotificationReceivedListener(() => {
      void fetchNotifications();
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response?.notification?.request?.content?.data ?? {}) as Record<string, unknown>;
      navigateFromPushData(router, data);
    });

    return () => {
      isMounted = false;
      receivedListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user, router, fetchNotifications]);

  useEffect(() => {
    if (Platform.OS === 'web' || !user) return;
    void Notifications.setBadgeCountAsync(unreadCount);
  }, [unreadCount, user]);

  return { expoPushToken: registeredTokenRef.current };
}
