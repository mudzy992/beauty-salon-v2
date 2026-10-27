import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';
import { attachSocketRecovery } from './socket-recovery.mjs';
import type { SocketRecoveryController } from './socket-recovery.mjs';

export const SOCKET_EVENTS = {
  RESERVATION_CREATED: 'reservation:created',
  RESERVATION_UPDATED: 'reservation:updated',
  RESERVATION_CANCELLED: 'reservation:cancelled',
  RESERVATION_CONFIRMED: 'reservation:confirmed',
  RESERVATION_STYLIST_RESPONSE: 'reservation:stylist_response',
  DAILY_LOG_UPDATED: 'daily-log:updated',
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
  const recoveryRef = useRef<SocketRecoveryController | null>(null);
  const [connected, setConnected] = useState(false);
  const token = useAuthStore((s) => s.token);
  const tokenRef = useRef(token);

  useEffect(() => {
    const baseURL = import.meta.env.VITE_API_URL || '';
    const url = baseURL || window.location.origin;

    const socket = io(url, {
      auth: tokenRef.current ? { token: tokenRef.current } : {},
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: false,
    });
    const recovery = attachSocketRecovery(socket);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;
    recoveryRef.current = recovery;
    socket.connect();

    return () => {
      recovery.dispose();
      if (recoveryRef.current === recovery) recoveryRef.current = null;
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (tokenRef.current === token) return;
    tokenRef.current = token;

    const socket = socketRef.current;
    if (socket) {
      recoveryRef.current?.reset();
      socket.auth = token ? { token } : {};
      socket.disconnect().connect();
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
