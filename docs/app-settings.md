# App settings contract (app_settings)

## Overview

`app_settings` is a key/value store used for:
- **PUBLIC**: content and branding consumed by the public website and mobile home (logo, hero text, contact, etc.)
- **PRIVATE**: system/admin configuration (email/notifications, loyalty rules, maintenance flags)

The authoritative contract is defined in:
- `backend/src/settings/settings-registry.ts`

## API endpoints

### Public (no auth)
- `GET /api/settings/public`
  - Returns only **PUBLIC** keys
  - Payload: `Array<{ key: string; value: string }>`

### Admin (SYSTEM_ADMIN/OWNER)
- `GET /api/settings`
  - Returns admin list. Secret values are **never returned** in plaintext.
  - Payload includes `isSecret` and `isConfigured`
- `GET /api/settings/registry`
  - Returns the current settings contract (keys, scope, types, constraints)
- `GET /api/settings/:key`, `PUT /api/settings/:key`, `DELETE /api/settings/:key`

## Secrets (encryption at rest)

Some keys (e.g. `system_email_password`) are marked as `isSecret` in the registry:
- Stored encrypted in DB `app_settings.value` when `APP_SETTINGS_ENCRYPTION_KEY` is configured
- Decrypted only inside backend services via `SettingsService.getValue()`
- Admin list endpoints return `value: null` and expose `isConfigured` instead

### Required env

Backend `.env` / `.env.example`:
- `APP_SETTINGS_ENCRYPTION_KEY` — base64 of 32 random bytes (AES-256-GCM)

## Validation and types

All writes go through the registry contract:
- Unknown keys are rejected
- Types are normalized on write (`boolean`, `number`, `json`, `string`)
- JSON keys must be valid JSON and some keys have extra shape checks

## Deprecated keys

These keys exist for backward compatibility / migration visibility but are **not** used by reservation logic:
- `system_reservation_lock_minutes`
- `system_reservation_attendance_hours`
- `system_reservation_auto_cancel`

Reservation timing is controlled by `SalonSettings` (admin → Salon page), e.g.:
- `SalonSettings.reservationLockMinutes`

## Consumers map

- **Frontend (public)**: `frontend/src/context/SettingsContext.tsx` → `GET /api/settings/public`
- **Frontend (admin)**: `frontend/src/pages/Settings.tsx`, `frontend/src/pages/EmailSettings.tsx`
- **Mobile**: `mobile/src/services/publicSettings.ts` → `GET /api/settings/public`
- **Backend**:
  - `backend/src/notifications/notifications.service.ts` reads email config/templates via `SettingsService`
  - `backend/src/loyalty/loyalty.service.ts` reads loyalty config via `SettingsService`

