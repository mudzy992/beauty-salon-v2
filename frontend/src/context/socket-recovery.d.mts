import type { Socket } from "socket.io-client";

export interface SocketRecoveryOptions {
  initialDelayMs?: number;
  maxDelayMs?: number;
  setTimeoutFn?: (callback: () => void, delayMs: number) => unknown;
  clearTimeoutFn?: (timer: unknown) => void;
}

export interface SocketRecoveryController {
  reset(): void;
  dispose(): void;
}

export declare function attachSocketRecovery(
  socket: Socket,
  options?: SocketRecoveryOptions,
): SocketRecoveryController;
