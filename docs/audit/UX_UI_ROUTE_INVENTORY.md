# UX/UI/A11Y/I18N route inventory — source pass 1

**Snapshot:** 2026-11-05, branch source at the time of inventory. This is a source-derived route/component inventory, not visual, browser, screen-reader, or physical-device acceptance.

## Scope and evidence boundaries

- Web route declarations: [`AppRouter`](../../frontend/src/app/router.tsx), [`publicRoutes`](../../frontend/src/app/routes/public.routes.tsx), and [`adminRoutes`](../../frontend/src/app/routes/admin.routes.tsx).
- Mobile route declarations: Expo Router files under [`mobile/app`](../../mobile/app); screen implementations under [`mobile/src/screens`](../../mobile/src/screens).
- Shared mobile controls: [`mobile/src/components`](../../mobile/src/components).
- Route names and ownership below are derived from source. “Source tests exist” is intentionally not inferred per route from a filename alone; the current guard/test coverage is selective and must be mapped as each route family is audited.
- This inventory does not claim that visible copy, runtime API errors, focus order, semantics, contrast on rendered content, reflow, or accessibility announcements have been verified.

## Web route inventory

### Public shell and client-facing routes

| Route | Page/source | Persona / note |
|---|---|---|
| `/` | `PublicHome` | Guest/public |
| `/usluge` | `PublicServices` | Guest/public |
| `/usluge/:serviceId` | `PublicServiceDetail` | Guest/public |
| `/blog` | `PublicBlogList` | Public feature-gated |
| `/blog/:slug` | `PublicBlogPost` | Public feature-gated |
| `/galerija` | `PublicGallery` | Public feature-gated |
| `/kontakt` | `PublicContact` | Guest/public |
| `/rezervacija` | `PublicReserve` | Public booking flow; source checks cover form names, progress-step semantics, date/time legends, calendar states, distinct service/date/slot load failures with retry, and stale-response guards; rendered keyboard and assistive-technology behavior remains unverified |
| `/moje-rezervacije` | `MyReservations` | Client/account flow; source checks cover distinct loading/error/retry versus successful empty history and stale-request guards; auth/layout and rendered behavior remain open |
| `/moje-rezervacije/:id` | `MyReservationDetail` | Client/account flow; source checks cover loading, transient-error retry, 403/404 unavailability, response identity, and stale-request guards; rendered behavior remains open |
| `/moj-termin/:token` | `PublicReservationView` | Token-based reservation access |
| `/unsubscribe` | `CampaignUnsubscribe` | Public confirmation flow |
| `/profil` | `Profile` | Account/profile flow; source checks cover semantic page heading, localized email-verification code name, and polite status roles for profile loading/username availability; rendered navigation/announcement behavior remains unverified |
| `/zadovoljni-klijenti` | `PublicSatisfiedClients` | Public feature-gated |

### Authentication, onboarding, and exceptional routes

| Route | Page/source | Persona / note |
|---|---|---|
| `/login` | `Login` | Signed-out |
| `/register` | `Register` | Signed-out |
| `/reset-password` | `ResetPassword` | Password recovery |
| `/force-change-password` | `ForceChangePassword` | Authenticated forced-change gate |
| `/onboarding/gender` | `OnboardingGender` | Authenticated onboarding |
| `/onboarding/email` | `OnboardingEmail` | Authenticated onboarding |
| `/admin/reservations/calendar` | `ReservationsCalendar` | Protected admin calendar; declared separately from the admin child route table |
| `*` | `NotFound` | Unknown route / recovery navigation |

### Admin shell

All routes below are nested under `/admin` and `ProtectedRoute`; the audit still needs to verify actual role-specific navigation, headings, and async states.

| Route | Page/source |
|---|---|
| `/admin` | `Dashboard` |
| `/admin/users` | `Users` |
| `/admin/salon` | `Salon` |
| `/admin/services` | `Services` |
| `/admin/services/:serviceId/work-gallery` | `ServiceWorkGallery` |
| `/admin/stylists` | `Stylists` |
| `/admin/reservations` | `Reservations` |
| `/admin/daily-log` | `DailyLog` |
| `/admin/finance` | `Finance` | Source checks cover manual-income client labeling and shared table-loading status/error semantics; rendered finance flows remain unverified |
| `/admin/debtors` | Redirect to `/admin/finance?tab=debtors` |
| `/admin/blog` | `Blog` |
| `/admin/gallery` | `Gallery` |
| `/admin/reviews` | `Reviews` |
| `/admin/settings` | `Settings` | Shared editor now labels typed controls and exposes request-load errors with retry; source/CI only |
| `/admin/settings/operations` | `SettingsOperations` | Uses shared settings editor/loading/error recovery |
| `/admin/settings/appearance` | `SettingsAppearance` | Uses shared settings editor/loading/error recovery |
| `/admin/settings/seo` | `SettingsSeo` | Uses shared settings editor/loading/error recovery |
| `/admin/app-releases` | `AppReleases` |
| `/admin/notifications` | `Notifications` |
| `/admin/email-settings` | `EmailSettings` | Shared safe modular editor and live sample preview for existing and campaign templates; raw HTML campaign mode remains; source/build evidence only, real email-client rendering remains unverified |
| `/admin/client-analytics` | `ClientAnalytics` |
| `/admin/stylist-analytics` | `StylistAnalytics` |
| `/admin/analytics` | `Analytics` |
| `/admin/loyalty` | `Loyalty` |

**Initial subflow audit — `/admin/finance` manual income:** source review found the client label remained associated with `manual-client` after the input was replaced by a selected-client display. The label is now conditional on the input, while the selected value is exposed as a named group and its remove action remains individually labelled. Two focused source-contract tests run in frontend CI. Browser rendering, keyboard/focus behavior, and the client-search interaction are not verified by these tests.

**Initial subflow audit — `/admin/reservations`:** a failed list request previously cleared rows and total, making a network/API failure look like a valid empty result. The page now distinguishes failure, announces loading/error states, provides localized retry, hides stale pagination during loading/error, and ignores out-of-order request completions including after effect cleanup. The desktop table also has a localized screen-reader caption and explicit column scopes. Focused source-contract tests cover these branches/semantics; they do not verify actual screen-reader announcements or browser layout.

**Initial subflow audit — `/moje-rezervacije`:** the client history read previously converted request failures into an empty list after only a toast. It now retains stored rows, presents a localized inline alert/retry instead of empty-history copy when the latest read fails, announces loading, and ignores superseded/unmounted request completions. Targeted source-contract tests are in CI; authenticated browser behavior, keyboard use, and actual announcements remain unverified.

**Initial subflow audit — `/moje-rezervacije/:id`:** the detail page previously used “not found” for every failed read. It now distinguishes 403/404 unavailability from other read failures, offers localized inline retry for transient failures, validates the returned reservation ID against the route ID, announces loading, and ignores superseded/unmounted responses. Focused source-contract tests are registered; mounted authenticated behavior and actual announcements remain unverified.

### Stylist web shell

All routes are nested under the stylist guard/layout. `/stylist/profile` redirects to `/profil` rather than rendering a separate stylist page.

| Route | Page/source |
|---|---|
| `/stylist` | Redirect to `/stylist/inbox` |
| `/stylist/inbox` | `StylistInboxPage` |
| `/stylist/workbook` | `WorkbookListPage` |
| `/stylist/workbook/new` | `WorkbookNewEntryPage` |
| `/stylist/workbook/reschedule-preview/:reservationId` | `WorkbookReschedulePreviewPage` |
| `/stylist/workbook/:entryId` | `WorkbookDetailPage` |
| `/stylist/schedule` | `StylistSchedulePage` |
| `/stylist/schedule/new` | `StylistDirectBookingPage` | Source checks cover client/date/time/note labels, service-group legend, and pressed state for client/service choices; rendered interactions remain unverified |
| `/stylist/schedule/:reservationId` | `StylistReservationDetailPage` |
| `/stylist/debts` | `StylistDebtsPage` |
| `/stylist/stats` | `StylistStatsPage` |
| `/stylist/profile` | Redirect to `/profil` |

## Mobile Expo Router inventory

The app currently has 50 non-test `.tsx` files under `mobile/app` (route screens, layouts, and the React Navigation wrapper), 56 non-test source files under `mobile/src/screens`, and 13 non-test source files under `mobile/src/components`. Counts describe source files, not unique visual screens. Route families:

| Route family | Concrete route patterns | Persona |
|---|---|---|
| Root/session gate | `/` | Routes signed-out users to login; routes authenticated users through role and onboarding gates |
| Auth | `/login`, `/register` | Signed-out |
| Onboarding | `/onboarding/change-password`, `/onboarding/email`, `/onboarding/gender`, `/onboarding/phone` | Authenticated setup |
| Client — home/content | `/home`, `/home/blog-list`, `/home/blog-post/:slug`, `/home/satisfied-clients` | Client; public content rendered within the signed-in app |
| Client — services/booking | `/services`, `/services/service-detail`, `/services/service-single-detail`, `/services/service-work-gallery`, `/services/reservation` | Client |
| Client — reservations | `/reservations`, `/reservations/:reservationId`, `/reservations/write-review` | Client |
| Client — profile | `/profile`, `/profile/edit`, `/profile/change-password`, `/profile/notifications`, `/profile/contact` | Client |
| Stylist — inbox | `/stylist/inbox` | Stylist |
| Stylist — daily log | `/stylist/daily-log`, `/stylist/daily-log/debts`, `/stylist/daily-log/detail/:entryId`, `/stylist/daily-log/new-entry`, `/stylist/daily-log/reschedule-preview/:reservationId` | Stylist |
| Stylist — schedule | `/stylist/schedule`, `/stylist/schedule/direct-booking`, `/stylist/schedule/reservation-detail/:reservationId` | Stylist |
| Stylist — statistics/profile | `/stylist/stats`, `/stylist/profile` | Stylist |

Expo group names such as `(tabs)` and `(auth)` are omitted from the user-visible URL patterns. Dynamic route params are shown with `:` for readability; source uses Expo Router bracket syntax.

## Shared component inventory — first-pass focus

| Component | Source | Existing evidence / next audit question |
|---|---|---|
| `Button` | `mobile/src/components/ui/Button.tsx` | Source-contract accessibility checks exist; verify loading/disabled visual and screen-reader behavior on device. |
| `Input` | `mobile/src/components/ui/Input.tsx` | Source-contract checks exist; verify label/error announcement order, field traversal, and text scaling. |
| `DateTimeField` | `mobile/src/components/ui/DateTimeField.tsx` | Source-contract checks and owner-reported device retest exist; physical acceptance remains owner evidence, not agent verification. |
| `EmptyState` | `mobile/src/components/ui/EmptyState.tsx` | Decorative icon is hidden from assistive technology and the title is exposed as a heading; focused source-contract test registered in mobile CI. Device announcement/reading order remains unverified. |
| `LoadingScreen`, `Card`, `Badge` | `mobile/src/components/ui/` | Review accessible announcements, decorative content, and state contrast where consumed. |
| `MediaImage`, `BeforeAfterSlider` | `mobile/src/components/` | Slider already exposes localized adjustable value/actions; its before/after image layers are now decorative children (focused source test). Other image instances still need per-use alt/decorative review; device announcement and touch behavior remain unverified. |
| Session/onboarding notices and shell | `mobile/src/components/` | Review announcement behavior, focus/reading order, and long-copy reflow. |

## Current acceptance boundary and next slices

- This document establishes the source route surface only. Per-route loading/empty/error/stale/success/disabled states, static versus server-provided copy, form labels/errors, focus behavior, contrast, and locale/date/number formatting remain to be recorded during implementation slices.
- Mobile resources remain Bosnian-only; English mobile scope is still an owner decision. Do not translate legal/media-consent text without approved wording/version.
- Current repo checks include selected source-contract and i18n guards, not mounted React Native/web browser coverage. No axe/Playwright browser acceptance is claimed here.
- Physical-device review remains with the owner. Existing owner-reported Android checks are preserved in the audit record and are not represented as independently reproduced.
- First shared-control source slice adds a focused `EmptyState` contract for decorative icon and title semantics. The public booking source slice adds focused form-label, fieldset-legend, calendar-name, and selected-state contracts; the profile slice covers its page heading and localized verification-code accessible name. These do not establish rendered focus order, keyboard interaction, screen-reader announcement quality, or physical-device acceptance. Continue through the remaining shared controls and route families; keep manual/browser/device checks explicitly pending until their respective reviewer supplies evidence.
