export async function safelyRunPushTask<T>(
  task: () => T | Promise<T>,
  reportError: (error: unknown) => void,
): Promise<T | null> {
  try {
    return await task();
  } catch (error) {
    try {
      reportError(error);
    } catch {
      // A logging failure must not turn best-effort notification work into a rejection.
    }
    return null;
  }
}
