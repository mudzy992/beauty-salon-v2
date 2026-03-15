/**
 * Push notifikacije: u Expo Go na Androidu remote push ne radi (od SDK 53).
 * Kad je EXPO_PUBLIC_PUSH_ENABLED !== 'true', modul expo-notifications se uopšte ne učitava,
 * da ne bi izazivao greške u Expo Go.
 */
const PUSH_ENABLED = process.env.EXPO_PUBLIC_PUSH_ENABLED === 'true';

function usePushNotificationsNoop() {
  return { expoPushToken: null as string | null };
}

export const usePushNotifications = PUSH_ENABLED
  ? require('./usePushNotifications.real').usePushNotifications
  : usePushNotificationsNoop;
