# Expo Go — Android 16 / libworklets.so SIGSEGV

## Simptom

Expo Go na Androidu 16 (Redmi/Xiaomi) puca native crash u `libworklets.so` unutar `host.exp.exponent` APK-a.

## Uzrok

Projekt koristi `react-native-reanimated` + `react-native-worklets`. Expo Go već uključuje native worklets; inicijalizacija native modula na Android 16 može SIGSEGV (Expo issue #48390).

Metro shim samo u `resolveRequest` nije bio dovoljan — neki importi i dalje su išli na pravi paket.

## Fix (u repou)

Za **Expo Go** (ne EAS/dev-client):

1. `metro.config.js` — `extraNodeModules` + `resolveRequest` preusmjerava `react-native-reanimated` i `react-native-worklets` (uključujući subpath) na `mobile/shims/`.
2. `babel.config.js` — isti alias preko `module-resolver`; `react-native-reanimated/plugin` isključen.
3. Shim paketi: `mobile/shims/packages/react-native-reanimated`, `mobile/shims/packages/react-native-worklets`.

EAS build i `expo start --dev-client` i dalje koriste pravi native Reanimated.

## Obavezno nakon pull-a

```bash
cd mobile
npx expo start -c
```

Zatim u Expo Go: zatvori app potpuno (swipe away) i ponovo skeniraj QR.

Ako i dalje puca, provjeri da bundler radi iz `mobile/` foldera, ne iz repo root-a.

## Napomena

U Expo Go animacije Reanimated su JS-only (bez native worklets). Production APK/dev client nema ovo ograničenje.
