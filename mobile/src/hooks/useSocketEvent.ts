import { useEffect, useRef } from 'react';
import { useSocket } from '../realtime/SocketContext';
import type { SocketEventName } from '../realtime/socket-events';

export function useSocketEvent(
  event: SocketEventName | string,
  handler: (...args: unknown[]) => void,
): void {
  const { on, off } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const stableHandler = (...args: unknown[]) => handlerRef.current(...args);
    on(event, stableHandler);
    return () => off(event, stableHandler);
  }, [event, on, off]);
}
