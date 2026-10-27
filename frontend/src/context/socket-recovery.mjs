const DEFAULT_INITIAL_DELAY_MS = 1_000;
const DEFAULT_MAX_DELAY_MS = 5_000;
const AUTH_REJECTED_MESSAGE = "Unauthorized";

export function attachSocketRecovery(socket, options = {}) {
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  const maxDelayMs = Math.max(
    initialDelayMs,
    options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS,
  );
  const scheduleTimeout =
    options.setTimeoutFn ??
    ((callback, delayMs) => setTimeout(callback, delayMs));
  const cancelTimeout =
    options.clearTimeoutFn ?? ((timer) => clearTimeout(timer));

  let retryTimer = null;
  let retryRequested = false;
  let nextDelayMs = initialDelayMs;
  let disposed = false;

  const clearRetryTimer = () => {
    if (retryTimer === null) return;
    cancelTimeout(retryTimer);
    retryTimer = null;
  };

  const reset = () => {
    retryRequested = false;
    nextDelayMs = initialDelayMs;
    clearRetryTimer();
  };

  const scheduleRetry = () => {
    if (disposed || !retryRequested || retryTimer !== null || socket.connected)
      return;

    const delayMs = nextDelayMs;
    nextDelayMs = Math.min(nextDelayMs * 2, maxDelayMs);
    retryTimer = scheduleTimeout(() => {
      retryTimer = null;
      if (disposed || !retryRequested || socket.connected) return;
      socket.connect();
    }, delayMs);
  };

  const handleConnect = () => reset();

  const handleDisconnect = (reason) => {
    if (reason === "io client disconnect") {
      reset();
      return;
    }

    retryRequested = true;
    scheduleRetry();
  };

  const handleConnectError = (error) => {
    if (error?.message === AUTH_REJECTED_MESSAGE) {
      reset();
      socket.disconnect();
      return;
    }

    retryRequested = true;
    scheduleRetry();
  };

  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", handleConnectError);

  return {
    reset,
    dispose() {
      if (disposed) return;
      disposed = true;
      reset();
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
    },
  };
}
