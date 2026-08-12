import { useCallback } from 'react';
import { SOCKET_EVENTS } from '../realtime/socket-events';
import { useSocketEvent } from './useSocketEvent';

export function useReservationSocketRefresh(onRefresh: () => void): void {
  const handler = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  useSocketEvent(SOCKET_EVENTS.RESERVATION_CREATED, handler);
  useSocketEvent(SOCKET_EVENTS.RESERVATION_UPDATED, handler);
  useSocketEvent(SOCKET_EVENTS.RESERVATION_CANCELLED, handler);
  useSocketEvent(SOCKET_EVENTS.RESERVATION_CONFIRMED, handler);
  useSocketEvent(SOCKET_EVENTS.RESERVATION_STYLIST_RESPONSE, handler);
}
