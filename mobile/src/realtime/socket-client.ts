import { io, type Socket } from 'socket.io-client';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

let socket: Socket | null = null;
let activeToken: string | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string | null): Socket {
  const normalizedToken = token ?? null;
  if (socket && activeToken === normalizedToken) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  disconnectSocket();
  activeToken = normalizedToken;
  socket = io(API_URL, {
    auth: normalizedToken ? { token: normalizedToken } : {},
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

export function disconnectSocket(): void {
  if (!socket) return;
  socket.disconnect();
  socket = null;
  activeToken = null;
}
