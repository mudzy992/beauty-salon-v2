import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';

export const SOCKET_EVENTS = {
  RESERVATION_CREATED: 'reservation:created',
  RESERVATION_UPDATED: 'reservation:updated',
  RESERVATION_CANCELLED: 'reservation:cancelled',
  RESERVATION_CONFIRMED: 'reservation:confirmed',
  RESERVATION_STYLIST_RESPONSE: 'reservation:stylist_response',
  NOTIFICATION_NEW: 'notification:new',
  SETTINGS_UPDATED: 'settings:updated',
  SALON_UPDATED: 'salon:updated',
  AVAILABILITY_CHANGED: 'availability:changed',
} as const;

type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  on: (event: SocketEventName | string, handler: (...args: unknown[]) => void) => void;
  off: (event: SocketEventName | string, handler: (...args: unknown[]) => void) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    const baseURL = import.meta.env.VITE_API_URL || '';
    const url = baseURL || window.location.origin;

    const socket = io(url, {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.auth = token ? { token } : {};
      socketRef.current.disconnect().connect();
    }
  }, [token]);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.off(event, handler);
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, on, off }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}

export function useSocketEvent(event: SocketEventName | string, handler: (...args: unknown[]) => void) {
  const { on, off } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const stableHandler = (...args: unknown[]) => handlerRef.current(...args);
    on(event, stableHandler);
    return () => off(event, stableHandler);
  }, [event, on, off]);
}
