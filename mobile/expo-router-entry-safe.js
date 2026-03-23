// Safe entry wrapper:
// `expo-router/entry` internally triggers `expo-keep-awake.activate()` on Android.
// In some cases it rejects with "The current activity is no longer available", which can crash the app
// due to an unhandled rejection. We intercept and swallow that rejection.

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const keepAwake = require('expo-keep-awake');

  if (keepAwake?.activate) {
    const originalActivate = keepAwake.activate;
    keepAwake.activate = (...args) => {
      try {
        return Promise.resolve(originalActivate(...args)).catch(() => undefined);
      } catch {
        return Promise.resolve(undefined);
      }
    };
  }

  if (keepAwake?.deactivate) {
    const originalDeactivate = keepAwake.deactivate;
    keepAwake.deactivate = (...args) => {
      try {
        return Promise.resolve(originalDeactivate(...args)).catch(() => undefined);
      } catch {
        return Promise.resolve(undefined);
      }
    };
  }
} catch {
  // ignore
}

require('expo-router/entry');

