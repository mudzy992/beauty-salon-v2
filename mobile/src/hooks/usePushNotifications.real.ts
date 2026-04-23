import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useRouter } from 'expo-router';

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
      shouldSetBadge: false,
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
  let granted = !!(existing as any)?.granted;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = !!(req as any)?.granted;
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

export function usePushNotifications() {
  const user = useAuthStore((s) => s.user);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;

    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (!isMounted || !token) return;

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

    responseListener.current = Notifications.addNotificationResponseReceivedListener((_response) => {
      const data = (_response?.notification?.request?.content?.data ?? {}) as Record<string, unknown>;
      const kind = (data.kind as string | undefined) ?? '';
      const reservationId = (data.reservationId as string | undefined) ?? undefined;

      // Routing: reschedule/reorder/delay warning vodi korisnika na listu rezervacija (accept/decline).
      if (
        kind === 'reservation_reschedule' ||
        kind === 'reservation_reorder' ||
        kind === 'delay_warning'
      ) {
        if (reservationId) {
          router.push({ pathname: '/reservations', params: { focusReservationId: reservationId } } as any);
        } else {
          router.push('/reservations');
        }
      }
    });

    return () => {
      isMounted = false;
      responseListener.current?.remove();
    };
  }, [user]);

  return { expoPushToken: null as string | null };
}
