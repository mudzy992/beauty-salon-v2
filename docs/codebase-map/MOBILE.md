## Mobile (Expo / React Native) — Codebase Map

### Overview

- **App location**: `mobile/`
- **Framework**: Expo SDK 55 + React Native with **Expo Router** (`expo-router`)
- **Routing**: file-based routes in `mobile/app/**` with route groups for auth/onboarding, client tabs, and stylist tabs
- **State**: Zustand (`mobile/src/store/**`)
- **Data fetching**: Axios client (`mobile/src/services/api.ts`) + direct calls in screens/stores (no React Query)
- **Styling**: `StyleSheet` + theme tokens (`mobile/src/theme/**`); NativeWind/Tailwind is present and wired, but most UI is StyleSheet-driven
- **i18n**: `i18next` + `react-i18next` (`mobile/src/i18n/index.ts`, currently `bs` only)

## App entrypoints

- **Expo main entry**: `mobile/package.json` → `"main": "./expo-router-entry-safe.js"`
- **Safe router entry wrapper**: `mobile/expo-router-entry-safe.js`
  - patches `expo-keep-awake` `activate/deactivate` to swallow Android “activity no longer available” promise rejections
  - then loads `expo-router/entry`
- **Root layout (global providers)**: `mobile/app/_layout.tsx`
  - initializes i18n via `import '../src/i18n'`
  - fonts via `expo-font` + `@expo-google-fonts/inter`
  - providers: `SafeAreaProvider`, `GestureHandlerRootView`, `ThemeProvider`
  - system UI: `SystemBars` from `react-native-edge-to-edge`
  - auth bootstrap: `useAuthStore().initialize()`; notifications refresh on login via `useNotificationStore().fetch()`
  - renders `<Stack screenOptions={{ headerShown: false }} />`
- **Default Expo `App.tsx` (not runtime)**: `mobile/App.tsx`
  - imports `mobile/global.css` then returns `null` (kept as a “default entry file”, runtime is Router)

## Navigation & routing

### Routing gate / redirects

- **Gate page**: `mobile/app/index.tsx`
  - unauthenticated → `/login`
  - `mustChangePassword` → `/onboarding/change-password`
  - client onboarding enforcement → `/onboarding/gender` → `/onboarding/email` → `/onboarding/phone` (phone can be “skipped” via SecureStore key)
  - stylist vs client switch: `useAppModeStore()` + `isClient/isStylist` from `mobile/src/utils/roles.ts` routes to `/stylist/inbox` or `/home`

### Tab navigation (custom bottom bar)

- **Client tabs layout**: `mobile/app/(tabs)/_layout.tsx`
  - uses `<Tabs>` but hides built-in bar (`tabBarStyle: { display: 'none' }`)
  - overlays custom bottom nav: `mobile/src/navigation/BottomNavMenu.tsx`
  - uses `expo-blur` `BlurTargetView` so the nav can blur the content behind it
  - badge count comes from `useNotificationStore().unreadCount`
- **Stylist tabs layout**: `mobile/app/stylist/(tabs)/_layout.tsx`
  - role-gated (redirect to `/login` if not stylist)
  - same hidden-tabs + `BottomNavMenu` pattern

### Router ↔ screen adapter layer (React Navigation-like API)

- **Wrapper**: `mobile/app/_components/ReactNavScreenWrapper.tsx`
- **Adapter/map**: `mobile/app/_components/reactNavAdapter.ts`
  - maps “screen names” + params into expo-router paths
  - allows `mobile/src/screens/**` to keep a React Navigation-style `navigation` API while routes live in `app/**`

## Screens & features (route map)

### Route groups

- **Auth**: `mobile/app/(auth)/*`
  - layout: `mobile/app/(auth)/_layout.tsx` (redirects away when logged in)
  - screens: `mobile/app/(auth)/login.tsx`, `mobile/app/(auth)/register.tsx`
- **Onboarding**: `mobile/app/onboarding/*`
  - layout: `mobile/app/onboarding/_layout.tsx`
  - screens: `gender.tsx`, `email.tsx`, `phone.tsx`, `change-password.tsx`
- **Client tabs**: `mobile/app/(tabs)/*`
  - **Home**: `mobile/app/(tabs)/home/index.tsx`
    - blog list: `mobile/app/(tabs)/home/blog-list.tsx`
    - blog post: `mobile/app/(tabs)/home/blog-post/[slug].tsx`
    - satisfied clients: `mobile/app/(tabs)/home/satisfied-clients.tsx`
  - **Services**: `mobile/app/(tabs)/services/index.tsx`
    - service detail: `service-detail.tsx`, `service-single-detail.tsx`
    - reservation flow entry: `reservation.tsx`
    - work gallery: `service-work-gallery.tsx`
  - **Reservations**: `mobile/app/(tabs)/reservations/index.tsx`
    - write review: `mobile/app/(tabs)/reservations/write-review.tsx`
  - **Profile**: `mobile/app/(tabs)/profile/index.tsx`
    - edit: `edit.tsx`
    - change password: `change-password.tsx`
    - notifications: `notifications.tsx`
- **Stylist tabs**: `mobile/app/stylist/(tabs)/*`
  - inbox: `mobile/app/stylist/(tabs)/inbox/index.tsx`
  - daily log: `mobile/app/stylist/(tabs)/daily-log/index.tsx`
    - new entry: `new-entry.tsx`
    - detail: `detail/[entryId].tsx`
    - reschedule preview: `reschedule-preview/[reservationId].tsx`
  - schedule: `mobile/app/stylist/(tabs)/schedule/index.tsx`
    - reservation detail: `reservation-detail/[reservationId].tsx`
  - stats: `mobile/app/stylist/(tabs)/stats/index.tsx`
  - profile: `mobile/app/stylist/(tabs)/profile/index.tsx`

### Screen implementations (where the UI logic lives)

- **Auth screens**: `mobile/src/screens/auth/LoginScreen.tsx`, `mobile/src/screens/auth/RegisterScreen.tsx`
- **Client screens**: `mobile/src/screens/client/*` (Home, Services, ServiceDetail, Reservation, MyReservations, Reviews, Profile, etc.)
- **Stylist screens**: `mobile/src/screens/stylist/*` (Inbox, Schedule, Stats, Daily Log, reservation detail, etc.)

## Data fetching

### API client

- **Axios client**: `mobile/src/services/api.ts`
  - `baseURL`: `process.env.EXPO_PUBLIC_API_URL` (fallback `http://localhost:3000`)
  - auth header from `expo-secure-store` token (`Authorization: Bearer ...`)
  - global `401` handler via `setOnUnauthorized()`; `authStore` registers `logout()`
  - file/image URL helpers are exported via `mobile/src/utils/uploadUrl.ts` (`EXPO_PUBLIC_API_FILES_URL`)

### Stores doing server calls

- **Auth bootstrap/login**: `mobile/src/store/authStore.ts`
  - `initialize()` reads token → GET `/api/users/profile`
  - `login()` POST `/auth/login` → stores token → refreshes profile
- **Notifications**: `mobile/src/store/notificationStore.ts`
  - GET `/api/notifications`, PATCH `/api/notifications/:id/read`

### Notable screen-driven fetch patterns

- **Home aggregation**: `mobile/src/screens/client/HomeScreen.tsx`
  - multiple parallel requests and periodic refresh via `mobile/src/hooks/useAutoRefresh.ts`
- **Reservation creation**: `mobile/src/screens/client/ReservationScreen.tsx`
  - loads services + availability + loyalty and posts reservation (endpoints under `/api/...`)

## State management

- **Auth**: `mobile/src/store/authStore.ts` (user/token/loading/initialized)
- **Notifications**: `mobile/src/store/notificationStore.ts` (list, unreadCount, mark-read)
- **App mode** (“client” vs “stylist” UI): `mobile/src/store/appModeStore.ts`

## Styling & theming

- **Theme tokens**: `mobile/src/theme/**` (colors, spacing, typography, shadows, fonts)
- **Theme provider**: `mobile/src/theme/ThemeContext.tsx` (modes: `light`/`dark`/`system`)
- **Primary styling approach**: `StyleSheet.create()` across components/screens
- **NativeWind/Tailwind (present)**:
  - Metro integration: `mobile/metro.config.js` uses `withNativewind()`
  - Tailwind CSS imports + theme variables: `mobile/global.css`
  - Tailwind tooling deps: `tailwindcss`, `@tailwindcss/postcss`, `react-native-css`, `nativewind`

## Build / run / deploy commands

- **Local dev** (from `mobile/package.json`):
  - `npm run start` → `expo start`
  - `npm run android` → `expo start --android`
  - `npm run ios` → `expo start --ios`
  - `npm run web` → `expo start --web`
  - `npm run lint` → `eslint .`
- **EAS build**: `mobile/eas.json`
  - profiles: `development` (dev client, internal), `preview` (internal), `production`
  - env configured per profile (examples):
    - `EXPO_PUBLIC_API_URL`
    - `EXPO_PUBLIC_API_FILES_URL`
    - `EXPO_PUBLIC_EAS_PROJECT_ID`
    - `EXPO_PUBLIC_PUSH_ENABLED`

## Native modules / plugins (managed Expo)

- **No `mobile/ios` or `mobile/android` directories detected** (managed workflow; native config via Expo plugins)
- **Configured Expo plugins**: `mobile/app.config.js`
  - `react-native-edge-to-edge`, `expo-router`, `expo-navigation-bar`, `expo-secure-store`, `expo-localization`, `expo-notifications`, `expo-font`, `expo-image`, `expo-image-picker`
- **Notable native dependencies** (from `mobile/package.json`):
  - `react-native-reanimated` (Babel plugin enabled in `mobile/babel.config.js`)
  - `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context`
  - `expo-notifications`, `expo-image-picker`, `expo-secure-store`, `expo-blur`, `expo-navigation-bar`
  - `react-native-calendars`

## Environment & configuration

- **Expo config**: `mobile/app.config.js`
  - `userInterfaceStyle: 'automatic'`
  - push notifications project id: `EXPO_PUBLIC_EAS_PROJECT_ID` (fallback constant in file)
  - android: `googleServicesFile: './google-services.json'`
- **Module alias**: `mobile/babel.config.js` maps `@` → `./src`

