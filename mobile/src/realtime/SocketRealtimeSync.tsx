import { useCallback } from 'react';
import { useNotificationStore } from '../store/notificationStore';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { SOCKET_EVENTS } from './socket-events';

/** Global realtime side-effects (notification badge, etc.). */
export function SocketRealtimeSync() {
  const fetchNotifications = useNotificationStore((s) => s.fetch);
  const onNotificationNew = useCallback(() => {
    void fetchNotifications();
  }, [fetchNotifications]);
  useSocketEvent(SOCKET_EVENTS.NOTIFICATION_NEW, onNotificationNew);
  return null;
}
