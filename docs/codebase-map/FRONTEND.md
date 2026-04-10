# FRONTEND Codebase Map (React + Vite)

**Last refreshed:** 2026-04-10

## Overview

- **App**: SPA in `frontend/` (React 18 + TypeScript + Vite)
- **Routing**: React Router v6 via `useRoutes` (`frontend/src/app/router.tsx`)
- **API**: Axios client wrapper (`frontend/src/api/client.ts`)
- **State**: Zustand for auth (`frontend/src/stores/auth.store.ts`), TanStack Query wired globally (`frontend/src/query/client.ts`)
- **Realtime**: Socket.IO context + helper hook (`frontend/src/context/SocketContext.tsx`)
- **UI**: TailwindCSS + copied shadcn-style components, importatnt Apple Linear style always (`frontend/src/components/ui/*`)
- **i18n**: i18next + react-i18next (`frontend/src/i18n/index.ts`)

## Run / build commands

From `frontend/package.json`:

- **dev**: `npm run dev`
- **build**: `npm run build` (runs `tsc -b` then `vite build`)
- **preview**: `npm run preview` (serves on port `10000`)
- **lint**: `npm run lint`

## App entrypoints

- **DOM mount**: `frontend/src/main.tsx`
  - imports global styles: `frontend/src/styles/globals.css`
  - renders `frontend/src/App.tsx`
- **App root**: `frontend/src/App.tsx`
  - wraps `AppRouter` in `BrowserRouter`
  - wraps everything in `AppProviders` (`frontend/src/app/providers.tsx`)

## Global providers

Provider composition in `frontend/src/app/providers.tsx`:

- **i18n init**: `import '../i18n'` → `frontend/src/i18n/index.ts`
- **QueryClient**: `QueryClientProvider` (`frontend/src/query/client.ts`)
- **Auth**: `AuthProvider` (`frontend/src/context/AuthContext.tsx`, backed by `frontend/src/stores/auth.store.ts`)
- **Realtime**: `SocketProvider` (`frontend/src/context/SocketContext.tsx`)
- **Settings**: `SettingsProvider` (`frontend/src/context/SettingsContext.tsx`)
- **Toasts**: `AppToaster` (`frontend/src/lib/toast/toaster.tsx`)

Auth bootstrap behavior in `frontend/src/app/providers.tsx`:

- If a token exists, it calls `useAuthStore().refreshProfile()` and sets `isReady` afterward.
- If refresh fails, it calls `logout()`.

## Routing

### Router entry

- **Route table**: `frontend/src/app/router.tsx` (uses `useRoutes`)
- **Route groups**:
  - Public: `frontend/src/app/routes/public.routes.tsx`
  - Admin: `frontend/src/app/routes/admin.routes.tsx`

### Public routes (site)

Defined in `frontend/src/app/routes/public.routes.tsx`:

- Root layout: `/` → `frontend/src/layouts/PublicLayout.tsx` → `frontend/src/features/shell/public/public-layout.tsx`
- Key pages (examples):
  - `/` → `frontend/src/pages/public/PublicHome.tsx`
  - `/usluge` → `frontend/src/pages/public/PublicServices.tsx`
  - `/usluge/:serviceId` → `frontend/src/pages/public/PublicServiceDetail.tsx`
  - `/blog` → `frontend/src/pages/public/PublicBlogList.tsx`
  - `/blog/:slug` → `frontend/src/pages/public/PublicBlogPost.tsx`
  - `/galerija` → `frontend/src/pages/public/PublicGallery.tsx`
  - `/kontakt` → `frontend/src/pages/public/PublicContact.tsx`
  - `/rezervacija` → `frontend/src/pages/public/PublicReserve.tsx`
  - `/profil` → `frontend/src/pages/Profile.tsx`
  - `/zadovoljni-klijenti` → `frontend/src/pages/public/PublicSatisfiedClients.tsx`

### Admin routes (dashboard)

Defined in `frontend/src/app/routes/admin.routes.tsx`:

- Root layout: `/admin` → `ProtectedRoute` → `frontend/src/layouts/DashboardLayout.tsx` → `frontend/src/features/shell/admin/admin-layout.tsx`
- Key pages (examples):
  - `/admin` → `frontend/src/pages/Dashboard.tsx`
  - `/admin/reservations` → `frontend/src/pages/Reservations.tsx`
  - `/admin/services` → `frontend/src/pages/Services.tsx`
  - `/admin/stylists` → `frontend/src/pages/Stylists.tsx`
  - `/admin/finance` → `frontend/src/pages/Finance.tsx`
  - `/admin/settings` → `frontend/src/pages/Settings.tsx`

### Standalone routes

Defined directly in `frontend/src/app/router.tsx`:

- **Admin calendar**: `/admin/reservations/calendar` → `ProtectedRoute` → `frontend/src/pages/ReservationsCalendar.tsx`
- **Auth pages**:
  - `/login` → `PublicOnlyRoute` → `frontend/src/pages/Login.tsx`
  - `/register` → `PublicOnlyRoute` → `frontend/src/pages/Register.tsx`
- **Account flow**:
  - `/force-change-password` → `ProtectedRoute` → `frontend/src/pages/ForceChangePassword.tsx`
  - `/onboarding/gender` → `ProtectedRoute` → `frontend/src/pages/onboarding/OnboardingGender.tsx`
  - `/onboarding/email` → `ProtectedRoute` → `frontend/src/pages/onboarding/OnboardingEmail.tsx`
- **Fallback**: `*` → `frontend/src/pages/NotFound.tsx`

## Layouts

### Public shell

- **File**: `frontend/src/features/shell/public/public-layout.tsx`
- **Responsibilities**:
  - Main public header/nav + footer + `<Outlet />`
  - Branding/logo from settings keys like `app_logo`, `app_title`, `app_logo_*`
  - Maintenance mode gate (reads `system_maintenance_mode` from `SettingsContext`)

### Admin shell

- **File**: `frontend/src/features/shell/admin/admin-layout.tsx`
- **Responsibilities**:
  - Sidebar + header + `<Outlet />`
  - Navigation list is defined in-file as `navItems`
  - Branding/logo is pulled from `SettingsContext` (same keys as public)

## Major features (by folder)

- **Shell**: `frontend/src/features/shell/*`
  - `frontend/src/features/shell/public/public-layout.tsx`
  - `frontend/src/features/shell/admin/admin-layout.tsx`
- **Reservations**: `frontend/src/features/reservations/*`
  - Scheduler UI: `frontend/src/features/reservations/components/ReservationScheduler.tsx`
  - Scheduler CSS overrides: `frontend/src/features/reservations/components/reservation-scheduler.css`
  - Shared types: `frontend/src/features/reservations/types.ts`
  - Status helpers: `frontend/src/features/reservations/status.ts`
- **Finance**: `frontend/src/features/finance/*` (page shell + multiple tabs)
  - Entry UI: `frontend/src/features/finance/finance-page.tsx`
  - Tabs: `frontend/src/features/finance/tabs/*`

## State management

### Zustand (auth)

- **Store**: `frontend/src/stores/auth.store.ts`
- **Persists**: token in `localStorage` under key `token`
- **Key actions**:
  - `login()` → `POST /auth/login` then fetches profile if needed (`GET /api/users/profile`)
  - `refreshProfile()` → `GET /api/users/profile`
  - `logout()` → clears token + Axios default header and hard-navigates to `/`

### TanStack Query

- **QueryClient**: `frontend/src/query/client.ts`
- **Provider**: installed in `frontend/src/app/providers.tsx`
- **Note**: many pages still do direct Axios + `useEffect` instead of Query hooks (examples: `frontend/src/pages/Reservations.tsx`, `frontend/src/pages/Services.tsx`).

## API / environment variables

- **Axios client**: `frontend/src/api/client.ts`
  - base URL: `import.meta.env.VITE_API_URL` (fallback: same-origin)
  - injects bearer token from Zustand (fallback: localStorage)
  - on `401` (non-auth endpoints) triggers `useAuthStore.getState().logout()` and redirects to `/login`
- **Upload URL helper**: `frontend/src/utils/uploadUrl.ts`
  - prefers `VITE_API_FILES_URL`, falls back to `VITE_API_URL`
- **Types**: `frontend/src/vite-env.d.ts` declares `VITE_API_URL` and `VITE_API_FILES_URL`

## UI system (Tailwind + shadcn-style components)

- **Tailwind config**: `frontend/tailwind.config.js`
  - `darkMode: ['class']`
  - brand colors under `theme.extend.colors.brand.*`
- **Global tokens**: `frontend/src/styles/globals.css`
  - defines CSS variables on `:root` and overrides under `.dark`
- **shadcn-style UI components**: `frontend/src/components/ui/*`
  - examples: `button.tsx`, `dialog.tsx`, `drawer.tsx`, `input.tsx`, `tabs.tsx`, `switch.tsx`
- **Classname utility**: `frontend/src/lib/cn.ts` (`clsx` + `tailwind-merge`)
- **Toasts**:
  - `frontend/src/lib/toast/toaster.tsx` (Sonner `Toaster` with light/dark classes)
  - `frontend/src/lib/toast/useAppToast.ts` (helpers + API error toast using `frontend/src/api/error.ts`)

## Forms

- **Library**: no `react-hook-form` detected in `frontend/src` (forms are manual/controlled inputs).
- **Pattern**: local `useState` + `onSubmit={(e) => e.preventDefault(); ... }` + Axios calls
  - Example: `frontend/src/pages/Register.tsx`

## i18n

- **Setup**: `frontend/src/i18n/index.ts`
  - languages: `bs` and `en` from `frontend/src/i18n/locales/*.json`
  - storage key: `APP_LOCALE` (localStorage)
  - helper: `setAppLanguage('bs' | 'en')`
- **Usage**: `useTranslation()` across pages and layouts (e.g. `frontend/src/features/shell/admin/admin-layout.tsx`)

## Theme (dark / light)

- **Support**: Tailwind dark variants + CSS variable overrides exist (`frontend/tailwind.config.js`, `frontend/src/styles/globals.css`).
- **Toggle**: no dedicated “theme switch” implementation found in `frontend/src` (no `classList.toggle('dark')` pattern detected); components still include `dark:*` classes for styling.

## Auth flow

### Key files

- `frontend/src/stores/auth.store.ts`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/app/providers.tsx` (bootstraps profile refresh)
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/components/PublicOnlyRoute.tsx`
- Redirect logic: `frontend/src/utils/clientOnboarding.ts`

### Route gating rules (high level)

- `ProtectedRoute`:
  - blocks when auth store isn’t ready yet (`isReady`)
  - no token → redirects to `/login` (preserves `location` in state)
  - `mustChangePassword` (non-staff) → forces `/force-change-password`
  - clients → forces onboarding steps via `getClientMandatoryOnboardingPath()`
- `PublicOnlyRoute`:
  - when authenticated, redirects to `getPostAuthRedirectPath(user)`

## Key pages (inventory)

### Public pages (`frontend/src/pages/public/*`)

- `PublicHome.tsx`, `PublicServices.tsx`, `PublicServiceDetail.tsx`
- `PublicBlogList.tsx`, `PublicBlogPost.tsx`
- `PublicGallery.tsx`, `PublicContact.tsx`, `PublicSatisfiedClients.tsx`
- Booking: `PublicReserve.tsx`

### Admin pages (`frontend/src/pages/*`)

- Core: `Dashboard.tsx`, `Reservations.tsx`, `ReservationsCalendar.tsx`
- Ops: `Services.tsx`, `Stylists.tsx`, `Salon.tsx`, `Users.tsx`
- Finance: `Finance.tsx` (feature UI in `frontend/src/features/finance/*`)
- Content: `Blog.tsx`, `Gallery.tsx`, `Reviews.tsx`
- System: `Settings.tsx`, `Notifications.tsx`, `EmailSettings.tsx`
- Analytics: `Analytics.tsx`, `ClientAnalytics.tsx`, `StylistAnalytics.tsx`
- Loyalty: `Loyalty.tsx`
