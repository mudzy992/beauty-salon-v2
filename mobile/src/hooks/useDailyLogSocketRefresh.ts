import { useCallback } from 'react';
import { SOCKET_EVENTS } from '../realtime/socket-events';
import { useSocketEvent } from './useSocketEvent';

export function useDailyLogSocketRefresh(onRefresh: () => void): void {
  const handler = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  useSocketEvent(SOCKET_EVENTS.DAILY_LOG_UPDATED, handler);
}
