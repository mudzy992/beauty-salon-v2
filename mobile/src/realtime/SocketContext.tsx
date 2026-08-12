import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from './socket-client';
import type { SocketEventName } from './socket-events';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  on: (event: SocketEventName | string, handler: (...args: unknown[]) => void) => void;
  off: (event: SocketEventName | string, handler: (...args: unknown[]) => void) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({
  children,
  token,
}: {
  children: ReactNode;
  token: string | null;
}) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      socketRef.current = null;
      setConnected(false);
      return;
    }
    const socketInstance = connectSocket(token);
    socketRef.current = socketInstance;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    if (socketInstance.connected) setConnected(true);
    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
      disconnectSocket();
      socketRef.current = null;
      setConnected(false);
    };
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

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
