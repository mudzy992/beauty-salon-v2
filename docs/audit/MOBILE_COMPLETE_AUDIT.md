# Mobile source audit — 2026-10-30

## Status and boundary

The requested **source-level audit of the Mobile application is complete**. Per the agreed sequence, this audit introduced **no application-code changes**; existing MOB-01–MOB-06 fixes are recorded below as already completed, and remaining items are an implementation backlog for the next phase.

Scope reviewed: Expo Router route/layout inventory; client, stylist, auth and onboarding screen families; shared UI/media/navigation components; auth and notification stores; API, catalog, public-settings and upload URL services; refresh, socket and push hooks; Android updater; app/EAS configuration and mobile package/dependency audit; and the mobile API request paths against corresponding NestJS controller routes/guards and relevant DTO/service response shapes. The source tree contains 55 non-test files under `mobile/src/screens` and 51 non-test TypeScript route/layout/component files under `mobile/app`.

**This is not device certification.** No live API requests, production data operations, Android/iOS native binary install, permission prompt, screen-reader session, visual device review, or injected network/native fault was run. Expo's iOS JavaScript export and repository CI are useful evidence, not proof of runtime behavior on a device. The user plans physical-device visual verification after implementation; those checks remain an explicit final gate.

## Executive summary

- Prioritized profile, auth/session, push-task and booking-availability defects from MOB-01–MOB-06 have been addressed and CI-verified.
- No additional definite backend route/path mismatch was confirmed in the source comparisons performed. The mobile code has many TypeScript response annotations, but these do not validate JSON at runtime; several screens still dereference API payloads as if the annotations guaranteed the received shape.
- The clearest newly identified runtime risks are malformed debt/loyalty, notification, daily-log, catalog and gallery responses; an unvalidated Socket.IO availability payload; and refresh failures that look like legitimate empty data.
- **Important before the planned developer build:** the `development` EAS profile points `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_API_FILES_URL` at the same live API host used by `production` (`mobile/eas.json:6-21,38-47`). Mutating through that developer build will call the production backend unless a different environment overrides these values. Use a staging/test API or explicitly isolate test data before making bookings, accepting/rejecting reservations, collecting debts or completing daily logs.
- Accessibility/copy guards, native integration testing and full user-visible error handling are incremental rather than comprehensive.

## Already addressed (MOB-01–MOB-06)

- **MOB-01:** corrected the profile roles shape crash; hardened profile/media-consent/debt handling; confirmed private upload content requires authenticated access and public avatar access is explicit/opt-in.
- **MOB-02:** added a shared refresh gate for the five polling screens; contained refresh callback errors.
- **MOB-03:** validates auth user payloads and makes logout/401 cleanup best-effort without leaving stale in-memory auth.
- **MOB-04:** contains asynchronous/native push-notification failures and late cold-start navigation.
- **MOB-05:** distinguishes SecureStore read failure from signed-out state and shows retryable bootstrap/profile-refresh errors without clearing recoverable sessions.
- **MOB-06:** validates booking date/slot responses, ignores stale availability responses, exposes retry, and uses safe reservation-submit error handling.

These fixes have focused source/helper tests. They do not constitute rendered React Native, live-service, or device acceptance.

## Findings and implementation backlog

Severity is about user/runtime impact and confidence from source review, not exploitability in a deployed environment.

### MOB-AUD-01 — Developer EAS build is configured against the production API (P1 operational safety)

**Evidence:** `mobile/eas.json` sets the same `https://api.nejra.ba101.top` API and uploads host for `development`, `preview` and `production` profiles (`:9-13`, `:31-35`, `:42-46`). Development is an internal Android debug APK/iOS device build, but there is no separate staging URL in that profile.

**Impact:** visual/device testing can unintentionally create or mutate real production reservations, profile data, debts, daily-log records, notifications and uploaded media. This is not merely a UI concern.

**Implementation/acceptance:** before a developer build is used for workflows that submit data, select a staging/test API and matching file host, or otherwise explicitly isolate/approve a production test account and data. Do not silently change the environment without confirming the intended target. Verify the built app's resolved endpoint without exposing credentials.

### MOB-AUD-02 — Typed API responses are still trusted in crash-prone screens (P2)

**Evidence:** the reservation screen stores `/api/loyalty/client/me` directly as `LoyaltyInfo` and later calls `service.maxDiscountAmount.toFixed(2)` (`ReservationScreen.tsx:327-332,748-764`). Its debt preview checks only `Array.isArray`; a null row then fails at `d.amount` (`:340-345`). Home repeats the debt reduction, and the exception is absorbed by its broader silent catch (`HomeScreen.tsx:201-217`). Notification state calls `data.filter` with no array/row validation (`notificationStore.ts:19-27`). The stylist daily-log list assigns a typed response directly to `entries`, then iterates it (`DailyLogListScreen.tsx:53-68`). Stylist inbox similarly stores an unvalidated array before calling `.filter` (`StylistInboxScreen.tsx:42-54,67-72`). Public gallery screens validate the page's `items` container but trust each row's nested `before`/`after` paths, which the renderer dereferences (`ServiceWorkGalleryScreen.tsx:58-68,92+`; `SatisfiedClientsScreen.tsx:35-48,63-69`). Notification parsing is inside a catch, so its malformed-payload failure is contained, but it leaves old state or an empty list without an error notice (`notificationStore.ts:19-27`).

**Impact:** an unexpected successful HTTP payload (null row, wrong field type, or incomplete nested media DTO) can throw during data processing/rendering in some screens; other failures are caught but silently lose/retain stale data. Invalid numeric values can make debt totals silently wrong. This is not a claim that these endpoints currently return malformed data.

**Implementation direction:** define narrow runtime validators per DTO or shared parsing helpers for notification, debt, loyalty, daily-log, catalog and before/after rows; reject/skip invalid rows with an observable degraded-data state; add tests for nulls, wrong primitives, missing nested objects and invalid numeric/date fields. Keep backend checks authoritative for booking/payment decisions.

### MOB-AUD-03 — Several network failures are indistinguishable from valid empty results (P2)

**Evidence:** catalog screens swallow failures and transition to an empty list (`ServicesScreen.tsx:42-55`, `ServiceDetailScreen.tsx` catalog effect); daily-log fetch replaces data with `[]` on any error (`DailyLogListScreen.tsx:65-68`); the notification store catches failures and only clears `isLoading`, while retaining previously loaded notifications (`notificationStore.ts:19-27`); booking side reads clear loyalty/debt values on failure (`ReservationScreen.tsx:331-345`). Home's general fetch catch is silent (`HomeScreen.tsx:200-266`).

**Impact:** users can interpret a timeout, 401/403, server error or malformed response as “no services/debts/entries/notifications.” Some views retain stale data without indicating it is stale. In the booking flow the authoritative submit endpoint still enforces its rules, but the preview may mislead.

**Implementation direction:** separate loading, empty, stale-data and error states; show a localized retry where recovery is possible; preserve known-good data only with a visible stale indicator. Do not reset security/session state for recoverable failures.

### MOB-AUD-04 — Stale async responses and cross-user notification state are not uniformly guarded (P2)

**Evidence:** debounced stylist client search clears only the timer; once a query is sent, its response has no request-generation check and can overwrite newer results (`use-stylist-direct-booking-form.ts:32-51`). Gallery pagination also has no request-generation guard when `serviceId` changes (`ServiceWorkGalleryScreen.tsx:53-90`); several detail fetches set state directly after awaiting. The notification store has no user identity key, request generation, or logout reset (`notificationStore.ts:14-41`), while it is reused globally by root and both navigation areas.

**Impact:** an older search/page/profile response can replace newer screen data. In a fast account-switch flow, previously loaded notification state can remain visible until the next successful fetch; it may also briefly surface a prior user's unread badge/list. Server access controls remain in force, but this is a client state-isolation and privacy-display concern.

**Implementation direction:** cancel or generation-guard screen requests; scope/reset notification data on logout and account change, and refuse to apply responses for a different identity. Test route changes, rapid search changes, unmount and logout/login overlap.

### MOB-AUD-05 — Availability socket event trusts an unknown payload (P2)

**Evidence:** `useAvailabilitySocketRefresh.ts:14-23` casts `data as AvailabilityChangedPayload` and immediately reads `payload.serviceIds`/`payload.serviceId` whenever selected IDs exist. A null/primitive payload can throw in the socket event callback; typed TypeScript annotations do not constrain wire data.

**Impact:** malformed or version-skewed realtime events can produce an uncaught callback exception. Normal transport disconnect/reconnect is handled by the existing recovery helper; this finding concerns payload validation, not the reconnect mechanism.

**Implementation direction:** parse `unknown` as a non-null record, validate scalar/list IDs and optional date, ignore invalid events safely, and test null/string/array/wrong-field payloads plus valid single/multiple-service events.

### MOB-AUD-06 — Mutation errors and multi-step uploads are inconsistent (P2/P3)

**Evidence:** a shared safe parser exists, but several mutation screens still read `error.response.data.message` directly or rely on `any`, including client reservation actions, review submission, stylist direct booking/inbox, and daily-log image linking. Some handlers account for message arrays; others pass raw values into native alert APIs. Daily-log image creation is two requests: upload file, then attach its `uploadId` to the entry (`DailyLogDetailScreen.tsx:205-217`).

**Impact:** malformed/network errors may show generic, raw or unusable alerts; if the upload succeeds and the attach request fails, the client has no retry/cleanup flow at that point. This is a possible partial-success/orphan-media path; whether a backend cleanup process later removes an unattached upload was not established by this client audit.

**Implementation direction:** centralize all mutation error display through a safe, localized parser; prevent duplicate submissions where appropriate; design the upload/attach flow for retry or compensation, then test failure between the two requests. Preserve idempotency for booking and verify it for any other retryable write before adding retries.

### MOB-AUD-07 — APK updater metadata and download bounds are not validated at runtime (P3)

**Evidence:** `fetchLatestAndroidRelease()` casts `res.json()` directly to `LatestAndroidRelease` and `fetch` has no timeout (`apk-update.ts:43-48`). Download uses the metadata URL and `versionCode`; SHA-256 is checked before installation, which is a valuable integrity control, but the code does not validate release field types, constrain an absolute APK host, or compare downloaded size against `apkSizeBytes` before computing the hash/install (`:95-120`).

**Impact:** malformed/version-skewed metadata or an unavailable/slow release endpoint can make update checks fail silently (automatic checks) or the install flow fail; an unexpectedly large download can consume cache/storage before hash validation. No evidence of a current malicious release was found.

**Implementation direction:** runtime-validate the release object, use bounded network timeouts and size limits, validate URL scheme/host against the intended release host policy, and test invalid metadata, oversized/truncated files, hash mismatch and interrupted download. Keep the current hash verification.

### MOB-AUD-08 — Accessibility and localization checks do not cover the whole UI (P2/P3)

**Evidence:** the automated raw-copy guard checks seven files (`scripts/check-mobile-i18n.cjs`); many other screens are protected only by narrowly scoped source-copy tests, not a whole-app localization scan or rendered locale test. Source review also found gesture/icon controls without complete screen-reader semantics, e.g. the before/after slider is a gesture-handled `View` without an accessible adjustable value (`components/BeforeAfterSlider.tsx`), and review star buttons do not provide per-star accessibility labels/selected state (`screens/client/ReviewsScreen.tsx`, `StarRating`).

**Impact:** unreviewed copy can miss a translation key or accessibility label; some controls may not be operable or understandable with VoiceOver/TalkBack. This audit did not run assistive technology or a visual contrast/layout matrix.

**Implementation direction:** expand the copy guard incrementally to all user-facing screens; add semantic roles/labels/state and accessible interaction alternatives; validate translated layouts, scaling, focus order, contrast and touch targets in the planned physical-device session.

### MOB-AUD-09 — External-link failures can escape the contact screen (P3)

**Evidence:** contact links call `Linking.openURL` directly, and the web-map fallback is awaited after the native-link catch (`ContactScreen.tsx`, `SocialLink` and `openMaps`). If the OS cannot open the URL, there is no final catch/user-facing recovery.

**Impact:** a rejected native link promise can become an unhandled event-handler rejection. This is limited to external link actions; it does not indicate failure of the API client.

**Implementation direction:** validate allowed schemes and contain `canOpenURL/openURL` failures with a localized fallback or message; test missing-handler cases.

## Mobile API inventory reviewed

Source call sites were grouped and compared with Nest controller routes/guards; this list is the mobile-side surface, not a claim of live endpoint success.

- **Identity/profile/onboarding:** `/auth/login`, `/auth/register`, `/auth/change-password`, `/auth/send-verification-email`, `/auth/verify-email`; `/api/users/profile` (GET/PUT), avatar upload and visibility; daily-log client search; stylist profile discovery. MOB-01/03/05 cover the critical user/role/session/avatar paths; onboarding and response-state behavior still need rendered/device acceptance.
- **Catalog/public content:** public settings, salon working hours, service categories/subcategories/services/popular, stylist/service listing, blog list/detail/comments, reviews/featured review, before/after galleries. Contracts are source-mapped, but page/row runtime validation and recoverable error states remain uneven (AUD-02/03/04).
- **Client reservations:** list/detail, availability dates/slots, create with idempotency key, cancel/attendance confirmation/reschedule accept/decline; loyalty and debt preview reads. Availability/create were hardened in MOB-06; mutation response/error UX and preview reads remain.
- **Stylist operations:** inbox reservation list and lock/unlock/accept/reject; schedule/detail/start/staff-confirm/cancel/no-show/reorder/reschedule; direct booking; daily-log list/detail/create/update/complete/dispose/delete/image upload; debt list/repay; stats. Request paths correspond to guarded route families in the Nest reservations, daily-log, finance/client-debts, users and uploads controllers. Response validation, stale/error UI, partial mutation flows and physical acceptance remain.
- **Notifications/realtime:** notification list/read, push token register/remove, Socket.IO reservation/daily-log/settings/availability events and notification refresh. Push promise containment and socket reconnect handling are implemented; notification state isolation and event payload validation remain.
- **Platform/update/media:** SecureStore, ImagePicker, Expo Notifications, app-update metadata/download/installer, authenticated private uploads, explicit public media and fallback images. Private upload access and image fallback behavior were source-reviewed; updater validation and native permissions/install are not device-verified.

## Dependency and build verification

- Latest CI before this audit: GitHub Actions `41029530788`, all four jobs passed. The mobile job includes the full Node test set (141 tests at the MOB-06 code revision), TypeScript check and Expo SDK57 iOS JavaScript export. It is not an iOS/Android native binary build.
- `npm audit` on `mobile` reports **10 low, 0 moderate, 0 high and 0 critical** advisories. One identified package is transitive `deepmerge@4.3.1` under Expo config (`GHSA-gcqx-w48m-w2h4`); it is build/config tooling rather than an identified application runtime call path. Several remaining npm entries have broad/canary metadata ranges and npm suggests major/downgrade fixes (including Expo 51), so the output is not a safe blanket-upgrade plan. No dependency changes were made. Review each advisory against installed dependency paths before any targeted change; do not force-upgrade Expo/RN/Router as a batch.
- Current code has clean typecheck, CI and Expo iOS export evidence from MOB-06. There has not been an Android Expo export/native build in this audit turn, nor a native device test.

## Suggested implementation order after audit

1. Decide staging/test backend and file-host strategy for the developer profile before any physical workflow testing (AUD-01).
2. Add DTO validators and regression fixtures across reservation previews, home, notifications, catalog/gallery and stylist daily-log/inbox surfaces (AUD-02/AUD-05).
3. Add visible retry/error/stale states and isolate async requests/store data by route and signed-in identity (AUD-03/AUD-04).
4. Unify mutation error handling and make multi-step upload/action behavior safe under partial failures (AUD-06).
5. Harden updater metadata/download limits and external-link failure paths (AUD-07/AUD-09).
6. Expand localization/accessibility audits while implementing the affected UI (AUD-08).
7. After code slices are committed and CI-verified, produce the user's developer build against the agreed non-production API; then complete physical-device visual, permission, VoiceOver/TalkBack, network-fault and role-flow acceptance before production build.
