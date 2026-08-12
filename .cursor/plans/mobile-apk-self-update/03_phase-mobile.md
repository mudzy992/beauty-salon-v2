# Phase 3 — Mobile

- `android.versionCode` + `REQUEST_INSTALL_PACKAGES`
- Deps: `expo-application`, `expo-file-system`, `expo-intent-launcher`
- `src/features/app-update/*` — check, download, SHA-256, install
- Auto-check in `app/_layout.tsx`; manual on client/stylist profile
- Soft throttle 1×/day (SecureStore); force blocking modal
