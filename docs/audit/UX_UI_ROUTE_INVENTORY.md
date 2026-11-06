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
| `/usluge` | `PublicServices` | Guest/public; redesigned editorial catalogue with search/category filters, keyboard-operable selected states, responsive service cards, localized counts, and salon-managed copy/background; source checks cover loading/recovery too, while rendered behavior remains open |
| `/usluge/:serviceId` | `PublicServiceDetail` | Guest/public; source checks cover service identity/gallery payload validation, load announcements, empty/error states, and stale-response guards; rendered behavior remains open |
| `/blog` | `PublicBlogList` | Public feature-gated |
| `/blog/:slug` | `PublicBlogPost` | Public feature-gated |
| `/galerija` | `PublicGallery` | Public feature-gated |
| `/kontakt` | `PublicContact` | Guest/public |
| `/rezervacija` | `PublicReserve` | Public booking flow; source checks cover form names, progress-step semantics, date/time legends, calendar states, distinct service/date/slot load failures with retry, and stale-response guards; rendered keyboard and assistive-technology behavior remains unverified |
| `/moje-rezervacije` | `MyReservations` | Client/account flow; source checks cover distinct loading/error/retry versus successful empty history and stale-request guards; auth/layout and rendered behavior remain open |
| `/moje-rezervacije/:id` | `MyReservationDetail` | Client/account flow; source checks cover loading, transient-error retry, 403/404 unavailability, response identity, and stale-request guards; rendered behavior remains open |
| `/moj-termin/:token` | `PublicReservationView` | Token-based reservation access; source checks cover payload validation, unavailable-link versus transient read failure, loading announcement/retry, and stale-request guards; rendered behavior remains open |
| `/unsubscribe` | `CampaignUnsubscribe` | Public confirmation flow |
| `/profil` | `Profile` | Account/profile flow; source checks cover semantic page heading, localized email-verification code name, polite loading/availability/save/email-action statuses, and stale username-availability/save/avatar-privacy/avatar-upload/email-verification handling; rendered behavior remains unverified |
| `/zadovoljni-klijenti` | `PublicSatisfiedClients` | Public feature-gated |

### Authentication, onboarding, and exceptional routes

| Route | Page/source | Persona / note |
|---|---|---|
| `/login` | `Login` | Signed-out |
| `/register` | `Register` | Signed-out |
| `/reset-password` | `ResetPassword` | Password recovery; source checks cover labeled fields, busy/success/error announcements, duplicate/stale-request guards, and token URL cleanup; mounted behavior remains unverified |
| `/force-change-password` | `ForceChangePassword` | Authenticated forced-change gate; source checks cover required labels, six-character minimums, and submission busy/duplicate/stale guards; rendered behavior remains unverified |
| `/onboarding/gender` | `OnboardingGender` | Authenticated onboarding; source checks cover the named choice group, pressed selection state, and guarded save/busy feedback; rendered behavior remains unverified |
| `/onboarding/email` | `OnboardingEmail` | Authenticated onboarding; source checks cover named OTP group, native submission/busy feedback, and duplicate/stale-request guards; rendered behavior remains unverified |
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
| `/admin/finance` | `Finance` | Source checks cover manual-income client labeling, shared table-loading status/error semantics, expense-upload recovery, KIF resync progress, KIF/KUF book-opening progress, and KIF/KUF sort-direction semantics; rendered finance flows remain unverified |
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

**Initial shared-dialog audit — responsive Finance dialogs (2026-11-06):** `ResponsiveDialog` rendered a plain heading and paragraph inside the mobile Radix drawer, so the visible title/description were not associated with the dialog primitive's accessible name/description. The mobile branch now uses the same Radix `DialogTitle`/`DialogDescription` semantics as desktop while preserving its existing visual styling. Three focused source-contract tests are registered in frontend CI; no mounted browser, keyboard, focus-return, or assistive-technology behavior is verified.

**Finance expense-category fields audit (2026-11-06):** the category-field editor's new-field, field-type, line-role, and default-value labels were not programmatically associated with their controls. The section's decorative `Label` was also not connected to a control, so it is now a semantic heading. Controls now have `useId`-scoped IDs referenced by their labels; three source-contract tests are registered in frontend CI. The required checkbox already used a wrapping native label. No browser or assistive-technology verification was performed.

**Finance expense-attachment upload recovery (2026-11-06):** bulk selection used `Promise.all`, so a single rejected file made successful sibling uploads disappear from the pending list; overlapping uploads also shared a boolean busy flag that could report idle too early. Uploads now retain successful files while reporting a failed sibling, track concurrent upload count, invalidate stale UI completions when the expense dialog resets/closes, and announce upload progress. Three source-contract tests cover these branches. These checks do not verify live upload persistence or cleanup of server-side files whose results are intentionally ignored after dialog reset; no live upload/browser test was performed.

**KIF integrity resynchronization (2026-11-06):** the mutation disabled and animated the sync button but exposed no progress status. The panel now marks the action busy and announces localized progress separately from the integrity read's own retryable error. Two source-contract tests cover that distinction; the actual live reconciliation, rendered announcement, and screen-reader behavior remain unverified.

**KIF/KUF month opening (2026-11-06):** while opening a book, the period button was disabled but the month/year selectors remained editable, so the visible period could diverge from the in-flight request. The shared picker now disables both selectors while pending, marks the open action busy, and announces loading. Two source-contract tests cover the pending state; server behavior, browser interaction, and actual announcements remain unverified.

**KIF/KUF sortable tables (2026-11-06):** clickable sort headers showed a directional icon visually but did not expose the active direction to assistive technology. Each sortable column now sets `aria-sort` to the active ascending/descending direction, leaving inactive columns unset. Two source-contract checks cover both tables; actual screen-reader and browser behavior remain unverified.

**Initial subflow audit — `/admin/reservations`:** a failed list request previously cleared rows and total, making a network/API failure look like a valid empty result. The page now distinguishes failure, announces loading/error states, provides localized retry, hides stale pagination during loading/error, and ignores out-of-order request completions including after effect cleanup. The desktop table also has a localized screen-reader caption and explicit column scopes. Focused source-contract tests cover these branches/semantics; they do not verify actual screen-reader announcements or browser layout.

**Initial subflow audit — `/moje-rezervacije`:** the client history read previously converted request failures into an empty list after only a toast. It now retains stored rows, presents a localized inline alert/retry instead of empty-history copy when the latest read fails, announces loading, and ignores superseded/unmounted request completions. Targeted source-contract tests are in CI; authenticated browser behavior, keyboard use, and actual announcements remain unverified.

**Initial subflow audit — `/moje-rezervacije/:id`:** the detail page previously used “not found” for every failed read. It now distinguishes 403/404 unavailability from other read failures, offers localized inline retry for transient failures, validates the returned reservation ID against the route ID, announces loading, and ignores superseded/unmounted responses. Focused source-contract tests are registered; mounted authenticated behavior and actual announcements remain unverified.

**Initial subflow audit — `/moj-termin/:token`:** the token view previously represented every API rejection as a missing/expired link. It now validates required response fields, keeps invalid/missing tokens and 404/410 responses distinct from retryable read failures, announces loading/errors, and ignores responses superseded by a token change or unmount. Targeted source-contract tests are registered; real emailed-link/browser behavior remains unverified.

**Initial subflow audit — `/usluge`:** the service catalogue already had separate load-error and empty states, but loading text was not announced and overlapping retry requests could overwrite newer results. It now exposes a polite loading status, validates the three response collections, and ignores stale/unmounted requests while preserving the current snapshot on a read failure. Focused source-contract tests are registered; rendered announcements and network behavior remain unverified.

**Owner-requested visual redesign — `/usluge`:** replaced the simple text-and-list page with a premium editorial hero, generated salon-interior photography (admin-configured background still takes precedence), booking/exploration CTAs, a three-step discovery strip, searchable and filterable localized service cards, count/empty/no-result feedback, and a final booking CTA. Admin-managed page title/subtitle and existing detail/booking routes are preserved. Source contracts, locale checks, and build do not substitute for the requested visual review in a real browser/device.

**Initial subflow audit — `/usluge/:serviceId`:** the detail page already offered retry for service/gallery failures, but loading text was not announced, and requests could update the page after a service-route change. It now validates the service ID and gallery item/page metadata, announces loading states, hides the decorative empty-state icon from assistive technology, and guards service/gallery responses against superseded or unmounted requests. Source-contract tests are registered; browser layout, focus, and screen-reader behavior remain unverified.

**Initial subflow audit — `/` public homepage content semantics (2026-11-06):** the configured hero title and about/CTA/highlight titles were styled `div` elements, leaving the page without a primary heading and major section headings. The hero title is now the sole `h1`; about, CTA, and highlight titles use `h2`, and decorative highlight icons are hidden from assistive technology. Three focused source-contract tests run in frontend CI. Browser layout and assistive-technology output remain unverified. A follow-up homepage before/after read pass validates the response and media paths, ignores stale/unmounted requests, retains the last valid pairs after retry failure, and exposes loading through a polite status; seven focused parser/source-contract tests are registered. A follow-up featured-review pass validates the optional review payload, ignores stale/unmounted reads, preserves the last valid review on retry failure, feature-gates requests, and exposes loading/error states in an independent labeled section; seven focused parser/source-contract tests are registered. Mounted network and assistive-technology behavior remain unverified.

**Initial subflow audit — `/unsubscribe` campaign email withdrawal (2026-11-06):** the mutation response was trusted through a TypeScript type, duplicate submissions were guarded only by rendered disabled state, and status copy changed without a live announcement. The flow now validates the exact success response, ignores results from stale/unmounted token requests, prevents duplicate POSTs, resets confirmation when the query token changes, and announces progress/success/failure with busy-state semantics. HTTP 400 remains a distinct invalid-link result; transient errors keep retry. Five focused parser/source-contract tests run in CI; real email-link/browser behavior is unverified.

**Initial subflow audit — `/login` credential form:** the card title was styled as a generic element, page-level loading had no live status, and the home action nested a button in a link. The form now has an `h1`, exposes form/submit busy state with a polite loading announcement, blocks duplicate submits, ignores completion after unmount, and renders the home action as one styled link. Four focused source-contract tests run in frontend CI; keyboard, browser, and assistive-technology behavior remain unverified.

**Initial subflow audit — `/register` registration form (2026-11-06):** the card title was not a heading, required server-validated fields had no native required/minimum-length semantics, avatar selection had no group legend and preview object URLs were not released, submission had no live busy announcement or duplicate/stale-request guard, and the home action nested a button in a link. The form now exposes one `h1`, labels and native validation for required credentials, an avatar fieldset legend, controlled preview URL cleanup, duplicate/unmounted request guards, a polite loading status, and a single styled home link. Five focused source-contract tests run in frontend CI; mounted browser, keyboard, screen-reader, and live registration behavior remain unverified.

**Initial subflow audit — `/onboarding/email` verification (2026-11-06):** the shared onboarding shell title was not a heading; the email form relied on custom validation, the six OTP fields were not grouped, and request progress had no live status or synchronous duplicate/stale-response guard. The shared shell now exposes its title as an `h1` and hides decorative icons; the email form has native email validation, the OTP uses a named fieldset and a submit form, and send/verify/resend operations share a duplicate guard, unmount generation check, and polite busy status. The shell change also improves the gender and forced-password onboarding headings. Focused source-contract tests are in frontend CI; browser, keyboard and screen-reader behavior, plus real email delivery/verification, remain unverified.

**Profile subflow audit — username availability (2026-11-06):** the debounced availability request could finish after the user had changed the input, replacing newer feedback with stale results; during the debounce interval, the previous availability state also remained actionable. Each edit now clears prior feedback and announces checking immediately, normalizes the query, validates the response fields/suggestion strings, ignores superseded/unmounted completions, and disables profile save while a check is pending. Three focused source-contract tests run in frontend CI; actual request ordering and browser announcements remain unverified.

**Profile subflow audit — profile save (2026-11-06):** the main profile mutation could be submitted repeatedly before React updated the disabled state and could show stale toasts or update local saving state after unmount. Submission now has a synchronous duplicate guard, a polite busy status, and generation guards for UI completion. The existing update → auth refresh → changed-email verification-code attempt → profile reload behavior is preserved. Focused source-contract tests run in frontend CI; persistence, mounted-network, and rendered screen-reader behavior remain unverified.

**Profile subflow audit — avatar visibility mutation (2026-11-06):** the visibility checkbox relied on render-time disabling alone, so rapid toggles could overlap and older completions could overwrite the latest state; pending progress was not announced. The mutation now uses a synchronous in-flight guard and generation checks, blocks overlap with profile saves, announces saving, validates the returned boolean with a safe requested-value fallback, retains the optimistic update/profile refresh, and rolls back to the previous value only when the privacy mutation itself fails; a later auth-profile refresh failure no longer falsely reverses the confirmed setting. Three focused source-contract tests run in frontend CI; persisted privacy settings and rendered announcements remain unverified.

**Profile subflow audit — email verification actions (2026-11-06):** send/verify requests relied only on render-time disabled controls, accepted untrimmed codes, allowed profile-save overlap, and had no polite request-progress status or stale/unmounted completion guard. The actions now share a synchronous in-flight/generation guard, block overlap with profile saves, trim and require the server's six-digit code shape before verification, expose numeric/one-time-code input hints, announce send/verify progress, prevent sending or consuming codes against an unsaved email draft, clear old codes when that draft changes, and clear the code only after a current successful verification and profile reload; a subsequent auth-context refresh failure is reported as a profile-refresh error instead of falsely labeling the server-confirmed verification as failed. Five focused source-contract tests run in frontend CI; actual email delivery, mounted-network behavior, and rendered announcements remain unverified.

**Profile subflow audit — avatar upload (2026-11-06):** upload progress was only represented by the changing button label, duplicate file events could overlap before React disabled controls, response fields were trusted without runtime checks, and a profile-refresh failure was reported as if the upload itself failed. The route now guards concurrent upload/profile mutations with a synchronous in-flight reference, suppresses stale/unmounted UI completion, validates the returned avatar path/visibility, updates the local profile from confirmed response data, resets rejected file selections, announces progress, and reports auth-profile refresh failure separately. The API continues to enforce its 10 MiB limit and image-content validation server-side; the frontend MIME hint is not treated as a security boundary. Four focused source-contract tests run in CI; browser selection behavior and real upload persistence remain unverified.

**Initial subflow audit — `/onboarding/gender` (2026-11-06):** the choices were plain buttons without an exposed group name or selected state, and saving had no live status or synchronous duplicate/stale-request guard. The options now live in a disabled-while-saving fieldset with a legend and `aria-pressed` state, and the profile save announces progress and ignores stale UI completions. Profile refresh still runs after a successful save to update authentication context before navigating to email verification. Three focused source-contract tests run in frontend CI; browser, keyboard, screen-reader, and live profile behavior remain unverified.

**Initial subflow audit — `/reset-password` (2026-11-06):** the route already had a semantic title, labels, and native minimum lengths, but submission had no live busy announcement or synchronous duplicate guard, and a query-token change could leave stale form/request state. The form now announces busy and success states, guards duplicate/unmounted/stale requests, derives its token from the current query and clears password state on token changes while removing the token from browser history. Four focused source-contract tests run in frontend CI; browser, keyboard and screen-reader behavior, and real reset-link/API operation remain unverified.

**Initial subflow audit — `/force-change-password` (2026-11-06):** required server-side fields lacked native required/minimum-length metadata, and submission had no live loading status or synchronous duplicate/unmount guard. The form now applies the DTO constraints, disables fields while submitting, announces progress, and ignores stale UI results. The successful token-rotation/profile-refresh/redirect sequence is preserved, including rotating the token even if the page unmounts while the successful mutation is being processed. Three focused source-contract tests run in frontend CI; browser, keyboard, screen-reader, and live auth behavior remain unverified.

**Initial subflow audit — `/zadovoljni-klijenti` transformations (2026-11-06):** paginated payloads were trusted through a TypeScript generic, infinite-scroll callbacks could overlap, the initial and incremental loading text was not announced, and pagination depended on scrolling alone. Responses now validate item/media and offset metadata, stale/unmounted and duplicate requests are guarded, failures retain existing rows and retry the failed offset, and loading is announced. A keyboard-operable “load more” button is available alongside guarded automatic scrolling; the home action is one styled link control. Eight focused parser/source-contract tests are registered; browser, screen-reader, and live API behavior remain unverified.

**Initial subflow audit — `/blog/:slug` detail read (2026-11-06):** the article response was trusted through a TypeScript cast and did not verify that the returned slug matched the route; overlapping requests could also let an old slug replace the current article. The route now validates required detail fields and route identity, ignores stale/unmounted reads, and announces initial loading while retaining the localized retryable error. Six focused parser/source-contract tests are registered; actual browser and screen-reader behavior remain unverified. The share controls now render each social destination as a single link (removing nested interactive controls), use safe new-tab relations, announce the new-tab behavior in both locales, and treat native-share cancellation as cancellation instead of unexpectedly copying the URL. Four focused source-contract tests are registered; actual browser/share-target behavior remains unverified.

**Initial subflow audit — public blog comments (2026-11-06):** the comments section used a generic `div` rather than a heading, the comment textarea relied on placeholder text without an associated visible label, and initial/next-page loading text was not exposed as a status announcement. It now uses an `h2`, a visible localized label linked to the textarea, and polite status regions for both loading states. Three focused source-contract tests run in frontend CI; no mounted screen-reader/browser acceptance is claimed. A subsequent read-recovery pass now validates paginated and legacy responses, guards stale/unmounted requests, retains existing rows after load-more failure, and retries the failed offset; six parser/source-contract tests are registered. The comment-submit flow now trims content, blocks duplicate submissions, ignores responses after a route change/unmount, resets the draft when changing article slugs, and announces submission progress; four source-contract tests are registered. Mutation behavior is not verified against a mounted API or real moderation workflow.

**Initial subflow audit — `/blog` list (2026-11-06):** the web list trusted a typed cast for both paginated and legacy array responses, so malformed payloads could crash rendering; overlapping/unmounted requests could also overwrite the current list. It now runtime-validates each post and pagination metadata while preserving the legacy array response, ignores stale/unmounted requests, retains existing rows after load-more failures, and announces initial/load-more loading. Card titles are `h2` headings and the calendar icon is decorative. Eight focused source-contract/data-parser tests run in frontend CI; rendered announcements and browser behavior remain unverified.

**Initial subflow audit — `/galerija` (2026-11-06):** initial gallery loading was not a live status, and the custom lightbox had no accessible name or dialog focus/keyboard management. Loading now uses a polite status; the lightbox uses the shared Radix dialog, a visually hidden localized title with category context, and the selected category as image alternative text. Gallery-open controls also include that category in their accessible name. Three focused source-contract tests are registered; browser, keyboard, focus-return, and assistive-technology behavior remain unverified.

**Initial subflow audit — `/kontakt` (2026-11-06):** the form and contact-information cards used styled `div` elements instead of section headings, and salon-hours loading/failure text had no announcement semantics. The cards now use `h2` headings, information subsections use `h3`, hours loading is a polite status, and hours failure is an alert with the existing retry action; focused source-contract tests are registered. Separate functional gap: the message form still simulates a successful send with a timer and toast, while source search found no backend contact-submission endpoint. This slice does not claim that messages are delivered; a real delivery path needs an owner-approved backend/email and abuse-control design.

### Stylist web shell

All routes are nested under the stylist guard/layout. `/stylist/profile` redirects to `/profil` rather than rendering a separate stylist page.

| Route | Page/source |
|---|---|
| `/stylist` | Redirect to `/stylist/inbox` |
| `/stylist/inbox` | `StylistInboxPage` | Source check covers announced profile/list loading, busy refresh, and distinct retryable error/empty states; rendered behavior remains unverified |
| `/stylist/workbook` | `WorkbookListPage` |
| `/stylist/workbook/new` | `WorkbookNewEntryPage` |
| `/stylist/workbook/reschedule-preview/:reservationId` | `WorkbookReschedulePreviewPage` | Stylist overrun now navigates directly to the route's single proposal read; focused source contract checks prevent duplicate requests; preview loading is announced with an accessible retry error; runtime proposal behavior remains unverified |
| `/stylist/workbook/:entryId` | `WorkbookDetailPage` |
| `/stylist/schedule` | `StylistSchedulePage` | Source check covers announced initial/refresh loading, distinct retryable error and empty states; rendered behavior remains unverified |
| `/stylist/schedule/new` | `StylistDirectBookingPage` | Source checks cover client/date/time/note labels, service-group legend, and pressed state for client/service choices; rendered interactions remain unverified |
| `/stylist/schedule/:reservationId` | `StylistReservationDetailPage` | Source check distinguishes retryable transient read failures from 403/404 unavailability and announces loading; rendered behavior remains unverified |
| `/stylist/debts` | `StylistDebtsPage` | Source check covers announced read/repayment progress with distinct retryable failures and empty results; rendered behavior remains unverified |
| `/stylist/stats` | `StylistStatsPage` |
| `/stylist/profile` | Redirect to `/profil` |

**Initial subflow audit — `/stylist/workbook/new` (2026-11-06):** source review found that client/service suggestions were pointer-only clickable list items, form labels were not connected to the search/date/payment/notes/discount controls, and repeated service-removal buttons had no service-specific accessible name. Suggestions are now buttons usable by keyboard, service choices expose `aria-pressed`, labels target `useId`-scoped controls, and removal button names include the selected service. Three source-contract tests are registered in frontend CI; no mounted browser, keyboard flow, or assistive-technology acceptance is claimed.

**Stylist schedule load/refresh states (2026-11-06):** reservation loading after the stylist profile was resolved did not render an announced progress status and could look like an empty region. The schedule now announces the list request while independently preserving retryable errors and the valid empty state; its refresh action exposes `aria-busy`. Two source-contract tests are registered in frontend CI. No rendered, mounted-network, or screen-reader verification was performed.

**Stylist debts read/repayment states (2026-11-06):** the initial query and repayment mutation showed plain text/button disabling without a live progress announcement. Both now expose polite status feedback, the repayment action declares `aria-busy`, and the existing retryable error and empty/search-empty states remain separate. Two source-contract tests are registered in frontend CI; no live debt API or rendered assistive-technology behavior was verified.

**Stylist inbox list reads (2026-11-06):** profile loading and reservations loading had no polite status announcement; refresh only disabled its button. The route now announces both profile and list reads, exposes refresh busy state, and keeps retryable failure separate from a valid empty inbox. Two source-contract tests are registered in frontend CI; actual browser and screen-reader behavior remain unverified.

**Stylist reservation detail read recovery (2026-11-06):** a failed reservation GET was rendered as “not found” for every status, and initial detail loading was not announced. The route now announces loading, preserves 403/404 as unavailable, exposes retry/back for transient errors, and keeps previously loaded data visible if a later refresh fails. Two source-contract tests are registered in frontend CI; authenticated runtime behavior remains unverified.

**Stylist overrun preview navigation (2026-11-06):** the detail action made and awaited a `POST /reschedule/propose`, discarded any error, then navigated to the preview route which made the same proposal call again. The detail action now navigates immediately; the preview route remains the single owner of proposal loading, visible failure, and retry. Two source-contract tests are registered in frontend CI; no live reschedule proposal/commit was tested.

**Stylist reschedule preview loading (2026-11-06):** the preview's initial/retry calculation showed only a decorative spinner. It now exposes a polite live status with localized loading text, preserving the existing retry/back failure view. Two source-contract tests are registered in frontend CI; mounted behavior and real assistive-technology announcements remain unverified.

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
