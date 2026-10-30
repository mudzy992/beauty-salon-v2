import { useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { createRefreshGate } from './refreshGate';

/**
 * Periodično poziva callback dok je ekran fokusiran i aplikacija aktivna.
 */
export function useAutoRefresh(
  callback: () => void | Promise<void>,
  opts?: {
    intervalMs?: number;
    /** Produži interval kad je Socket.IO spojen (fallback polling). */
    connectedIntervalMs?: number;
    isSocketConnected?: boolean;
  },
) {
  const baseIntervalMs = opts?.intervalMs ?? 30000;
  const intervalMs =
    opts?.isSocketConnected && opts?.connectedIntervalMs != null
      ? opts.connectedIntervalMs
      : baseIntervalMs;
  const cbRef = useRef(callback);
  cbRef.current = callback;
  const refreshGateRef = useRef<ReturnType<typeof createRefreshGate> | null>(null);
  if (!refreshGateRef.current) refreshGateRef.current = createRefreshGate();

  const run = useCallback(
    () => refreshGateRef.current?.run(() => cbRef.current()) ?? Promise.resolve(),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let interval: ReturnType<typeof setInterval> | null = null;
      let appState: AppStateStatus = AppState.currentState;

      const start = () => {
        if (interval) return;
        interval = setInterval(run, intervalMs);
      };
      const stop = () => {
        if (!interval) return;
        clearInterval(interval);
        interval = null;
      };

      const sub = AppState.addEventListener('change', (next) => {
        appState = next;
        if (appState === 'active') {
          run();
          start();
        } else {
          stop();
        }
      });

      run();
      if (appState === 'active') start();

      return () => {
        stop();
        sub.remove();
      };
    }, [intervalMs, run, callback]),
  );

  return run;
}

