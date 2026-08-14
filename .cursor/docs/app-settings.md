# App settings contract (app_settings)

## Overview

`app_settings` is a key/value store used for:
- **PUBLIC**: branding, CMS copy, feature flags, SEO, theme colors, maintenance
- **PRIVATE**: email/SMTP, loyalty, reservation timeouts, push master switch, comments

Authoritative contract: `backend/src/settings/settings-registry.ts`

## Admin UI modules

- `/admin/settings` — public CMS + flags + comments
- `/admin/settings/operations` — timezone, reservation hours, appointment reminder, push
- `/admin/settings/appearance` — logo, title, theme colors
- `/admin/settings/seo` — SEO titles/descriptions/OG
- `/admin/email-settings` — SMTP + templates (`system_notif_email_*`, `system_public_app_url`)
- `/admin/loyalty` — all loyalty keys (UI, not JSON)

## Deprecated / removed keys

Removed from registry (legacy DB rows may remain):
`public_hero_cta_link`, `public_services_peek_*`, `public_service_*`, `public_footer_copyright`, `app_logo_icon`, `app_logo_text`, `system_app_version`, `system_email_provider`, `system_reservation_lock_minutes`, `system_reservation_auto_cancel`, `public_contact_working_hours_text`.

Working hours on contact pages come from `GET /api/salon` (`workingHours`), not app_settings.
Reservation lock minutes stay on `SalonSettings`.

## Consumers

- Public web: `SettingsContext` → `GET /api/settings/public`
- Mobile: `publicSettings.ts`
- Backend: notifications (email + `system_push_enabled`), loyalty, comments, reservation dates/reminders
