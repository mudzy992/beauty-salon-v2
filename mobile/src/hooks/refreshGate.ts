export function createRefreshGate(
  onError: (error: unknown) => void | Promise<void> = () => undefined,
) {
  let activeRequest: Promise<void> | null = null;

  return {
    get inFlight() {
      return activeRequest !== null;
    },
    run(task: () => void | Promise<void>): Promise<void> {
      if (activeRequest) return activeRequest;
      activeRequest = Promise.resolve()
        .then(task)
        .catch(async (error: unknown) => {
          try {
            await onError(error);
          } catch {
            // Error reporting must not create another unhandled rejection.
          }
        })
        .finally(() => {
          activeRequest = null;
        });
      return activeRequest;
    },
  };
}
