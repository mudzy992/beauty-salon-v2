import { useCallback } from 'react';
import { SOCKET_EVENTS } from '../realtime/socket-events';
import { useSocketEvent } from './useSocketEvent';

/** Refresh public settings / salon-driven UI when admin updates content. */
export function usePublicContentSocketRefresh(onRefresh: () => void): void {
  const handler = useCallback(() => {
    onRefresh();
  }, [onRefresh]);
  useSocketEvent(SOCKET_EVENTS.SETTINGS_UPDATED, handler);
  useSocketEvent(SOCKET_EVENTS.SALON_UPDATED, handler);
}
