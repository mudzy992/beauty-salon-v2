# MATRIX — Pokrivenost ruta Aurum refaktorom

**Status:** 🟡 **PLAN (K0) — nijedna ruta još nije refaktorisana.**
**Izvor inventara (izmjeren 2026-11-11):** `frontend/src/app/router.tsx`, `app/routes/public.routes.tsx`, `app/routes/admin.routes.tsx`; unakrsno `docs/audit/UX_UI_ROUTE_INVENTORY.md`.
**Ukupno:** **58 deklaracija ruta** = javne 14 + auth/izuzeci 8 + admin 24 + stylist 12.
**Vlasnik plana:** `.cursor/plans/aurum-web-refactor/` · **Ažurirano:** 2026-11-11

**Legenda:** ⬜ nije započeto · 🟡 u kodu, nije provjereno u renderu · ✅ provjereno (test + CI run id) · ➖ redirect (nema vlastiti ekran)

---

## 1. Javne rute — `PublicLayout` (14)

| # | Ruta | Ekran / izvor | Segment | Ključni testovi | Status |
|---|---|---|---|---|---|
| 1 | `/` | `pages/public/PublicHome.tsx` | S2 | `test:public-home-accessibility`, `test:public-home-before-after-recovery`, `test:public-home-featured-review-recovery` | ⬜ |
| 2 | `/usluge` | `pages/public/PublicServices.tsx` | S2 | `test:public-services-redesign`, `test:public-services-recovery`, `test:public-catalog-i18n` | ⬜ |
| 3 | `/usluge/:serviceId` | `pages/public/PublicServiceDetail.tsx` | S2 | `test:public-service-detail-recovery`, `test:before-after-i18n` | ⬜ |
| 4 | `/blog` | `pages/public/PublicBlogList.tsx` (feature gate) | S3 | `test:public-blog-list-i18n`, `test:public-blog-list-recovery`, `test:public-blog-list-accessibility` | ⬜ |
| 5 | `/blog/:slug` | `pages/public/PublicBlogPost.tsx` (feature gate) | S3 | `test:public-blog-post-i18n`, `test:public-blog-post-read-recovery`, `test:public-blog-share-accessibility`, `test:public-blog-comments-*` | ⬜ |
| 6 | `/galerija` | `pages/public/PublicGallery.tsx` (feature gate) | S3 | `test:public-gallery-accessibility` | ⬜ |
| 7 | `/kontakt` | `pages/public/PublicContact.tsx` | S3 | `test:public-contact-i18n`, `test:public-contact-accessibility` | ⬜ |
| 8 | `/rezervacija` | `pages/public/PublicReserve.tsx` | S4 | `test:public-reservation-accessibility`, `test:reservation-errors`, `test:public-reservation-error` | ⬜ |
| 9 | `/moje-rezervacije` | `pages/public/MyReservations.tsx` | S4 | `test:my-reservations-recovery`, `test:client-reservation-errors` | ⬜ |
| 10 | `/moje-rezervacije/:id` | `pages/public/MyReservationDetail.tsx` | S4 | `test:my-reservation-detail-recovery` | ⬜ |
| 11 | `/moj-termin/:token` | `pages/public/PublicReservationView.tsx` | S4 | `test:public-reservation-view-recovery` | ⬜ |
| 12 | `/unsubscribe` | `pages/public/CampaignUnsubscribe.tsx` | S4 | i18n paritet + `role=status` | ⬜ |
| 13 | `/profil` | `pages/Profile.tsx` (koristi i stylist meni) | S4 | `test:profile-*`, `test:profile-api-errors` | ⬜ |
| 14 | `/zadovoljni-klijenti` | `pages/public/PublicSatisfiedClients.tsx` (feature gate) | S3 | `test:satisfied-clients-read-recovery` | ⬜ |

---

## 2. Auth / onboarding / izuzeci (8)

| # | Ruta | Ekran / izvor | Guard | Segment | Ključni testovi | Status |
|---|---|---|---|---|---|---|
| 15 | `/login` | `pages/Login.tsx` | `PublicOnlyRoute` | S5 | `test:login-i18n`, `test:login-accessibility` | ⬜ |
| 16 | `/register` | `pages/Register.tsx` | `PublicOnlyRoute` | S5 | `test:registration-errors`, `test:registration-accessibility` | ⬜ |
| 17 | `/reset-password` | `pages/ResetPassword.tsx` | nema | S5 | `test:reset-password-accessibility` | ⬜ |
| 18 | `/force-change-password` | `pages/ForceChangePassword.tsx` | `ProtectedRoute` | S5 | `test:force-change-password-i18n`, `test:force-change-password-accessibility` | ⬜ |
| 19 | `/onboarding/gender` | `pages/onboarding/OnboardingGender.tsx` | `ProtectedRoute` | S5 | `test:onboarding-gender-i18n`, `test:onboarding-gender-accessibility` | ⬜ |
| 20 | `/onboarding/email` | `pages/onboarding/OnboardingEmail.tsx` | `ProtectedRoute` | S5 | `test:onboarding-email-i18n`, `test:onboarding-email-accessibility` | ⬜ |
| 21 | `/admin/reservations/calendar` | `pages/ReservationsCalendar.tsx` (fullscreen, izvan layouta) | `ProtectedRoute` | S6 | `test:admin-reservations-calendar-i18n`, `test:admin-calendar-drawer-accessibility`, `test:calendar-aria-shim` | ⬜ |
| 22 | `*` | `pages/NotFound.tsx` | nema | S5 | `test:route-guards-i18n` | ⬜ |

---

## 3. Admin rute — `ProtectedRoute` + `DashboardLayout` (24)

| # | Ruta | Ekran / izvor | Segment | Ključni testovi | Status |
|---|---|---|---|---|---|
| 23 | `/admin` | `pages/Dashboard.tsx` | S6 | `test:dashboard-stat-parity`, `test:dashboard-states`, `test:dashboard-a11y` | ⬜ |
| 24 | `/admin/users` | `pages/Users.tsx` | S8 | `test:users-a11y`, `test:temporary-user-credentials` | ⬜ |
| 25 | `/admin/salon` | `pages/Salon.tsx` | S8 | `test:salon-services-stylists-a11y` | ⬜ |
| 26 | `/admin/services` | `pages/Services.tsx` | S8 | `test:salon-services-stylists-a11y` | ⬜ |
| 27 | `/admin/services/:serviceId/work-gallery` | `pages/ServiceWorkGallery.tsx` | S8 | `test:admin-gallery-keyboard` | ⬜ |
| 28 | `/admin/stylists` | `pages/Stylists.tsx` | S8 | `test:salon-services-stylists-a11y` | ⬜ |
| 29 | `/admin/reservations` | `pages/Reservations.tsx` | S6 | `test:admin-reservations-list-*`, `test:admin-reservation-details-i18n`, `test:reservation-list-accessibility` | ⬜ |
| 30 | `/admin/daily-log` | `pages/DailyLog.tsx` | S7 | `test:daily-log-*`, `test:daily-log-amount-parity` | ⬜ |
| 31 | `/admin/finance` | `pages/Finance.tsx` | S7 | `test:finance-summary-parity`, `test:finance-table-a11y` | ⬜ |
| 32 | `/admin/debtors` | `<Navigate to="/admin/finance?tab=debtors" replace />` | S7 | `test:settings-hub-redirect` obrazac | ➖ |
| 33 | `/admin/blog` | `pages/Blog.tsx` | S9 | `test:admin-blog-i18n`, `test:blog-language-a11y` | ⬜ |
| 34 | `/admin/gallery` | `pages/Gallery.tsx` | S9 | `test:admin-gallery-keyboard`, `test:admin-content-a11y` | ⬜ |
| 35 | `/admin/reviews` | `pages/Reviews.tsx` | S9 | `test:admin-reviews-i18n`, `test:admin-content-a11y` | ⬜ |
| 36 | `/admin/settings` | `pages/SettingsHub.tsx` (7 tabova) | S9 | `test:admin-settings-*`, `test:settings-semantic-tokens`, `test:admin-settings-controls-a11y` | ⬜ |
| 37 | `/admin/settings/operations` | `TabRedirect → /admin/settings?tab=operations` | S9 | `test:settings-hub-redirect` | ➖ |
| 38 | `/admin/settings/appearance` | `TabRedirect → /admin/settings?tab=appearance` | S9 (S1 za Q9 napomenu) | `test:settings-hub-redirect`, `test:admin-settings-operations-appearance-i18n` | ➖ |
| 39 | `/admin/settings/seo` | `TabRedirect → /admin/settings?tab=seo` | S9 | `test:settings-hub-redirect`, `test:admin-settings-seo-i18n` | ➖ |
| 40 | `/admin/app-releases` | `TabRedirect → /admin/settings?tab=releases` | S9 | `test:settings-hub-redirect` | ➖ |
| 41 | `/admin/notifications` | `TabRedirect → /admin/settings?tab=notifications` | S9 | `test:settings-hub-redirect`, `test:admin-notifications-i18n` | ➖ |
| 42 | `/admin/email-settings` | `TabRedirect → /admin/settings?tab=email` | S9 | `test:settings-hub-redirect`, `test:eslint-a11y-severity` | ➖ |
| 43 | `/admin/analytics` | `pages/AnalyticsHub.tsx` (3 taba) | S8 | `test:analytics-hub-redirect`, `test:text-contrast-allowlist` | ⬜ |
| 44 | `/admin/client-analytics` | `TabRedirect → /admin/analytics?tab=clients` | S8 | `test:analytics-hub-redirect` | ➖ |
| 45 | `/admin/stylist-analytics` | `TabRedirect → /admin/analytics?tab=stylists` | S8 | `test:analytics-hub-redirect`, `test:stylist-analytics-tables-a11y` | ➖ |
| 46 | `/admin/loyalty` | `pages/Loyalty.tsx` | S7 | `test:admin-loyalty-i18n`, `test:loyalty-a11y` | ⬜ |

---

## 4. Stylist rute — `StylistRoute` + `StylistLayout` (12 deklaracija: 10 ekrana + 2 redirecta)

| # | Ruta | Ekran / izvor | Segment | Ključni testovi | Status |
|---|---|---|---|---|---|
| 47 | `/stylist` | `<Navigate to="/stylist/inbox" replace />` | S10 | — | ➖ |
| 48 | `/stylist/inbox` | `features/stylist-portal/pages/stylist-inbox-page` | S10 | `test:stylist-status-messages-a11y`, `test:stylist-form-controls-a11y` | ⬜ |
| 49 | `/stylist/workbook` | `features/stylist-workbook/pages/workbook-list-page` | S10 | `test:stylist-workbook-list-i18n`, `test:workbook-loading-status-a11y` | ⬜ |
| 50 | `/stylist/workbook/new` | `features/stylist-workbook/pages/workbook-new-entry-page` | S10 | `test:workbook-form-groups-a11y`, `test:redundant-entry-a11y` | ⬜ |
| 51 | `/stylist/workbook/reschedule-preview/:reservationId` | `features/stylist-workbook/pages/workbook-reschedule-preview-page` | S10 | `test:stylist-workbook-reschedule-i18n`, `test:stylist-workbook-reschedule-accessibility` | ⬜ |
| 52 | `/stylist/workbook/:entryId` | `features/stylist-workbook/pages/workbook-detail-page` | S10 | `test:stylist-workbook-detail-i18n`, `test:stylist-workbook-read-accessibility` | ⬜ |
| 53 | `/stylist/schedule` | `features/stylist-portal/pages/stylist-schedule-page` | S10 | `test:stylist-dark-contrast-a11y` | ⬜ |
| 54 | `/stylist/schedule/new` | `features/stylist-portal/pages/stylist-direct-booking-page` | S10 | `test:stylist-form-controls-a11y` | ⬜ |
| 55 | `/stylist/schedule/:reservationId` | `features/stylist-portal/pages/stylist-reservation-detail-page` | S10 | `test:stylist-status-messages-a11y` | ⬜ |
| 56 | `/stylist/debts` | `features/stylist-portal/pages/stylist-debts-page` | S10 | `test:amount-format-consistency` | ⬜ |
| 57 | `/stylist/stats` | `features/stylist-portal/pages/stylist-stats-page` | S10 | `test:stylist-analytics-tables-a11y` | ⬜ |
| 58 | `/stylist/profile` | `<Navigate to="/profil" replace />` (ekran je red #13) | S10 | `test:profile-*` | ➖ |

---

## 5. Dijeljeni slojevi (nisu rute, ali su u obimu)

| Sloj | Fajl | Segment | Status |
|---|---|---|---|
| Javni shell | `features/shell/public/public-layout.tsx`, `public-ui.ts` | S1 (tema), S2 (stil) | ⬜ |
| Admin shell | `features/shell/admin/*`, `layouts/DashboardLayout.tsx` | S1 (tema), S6 (stil) | ⬜ |
| Stylist shell | `layouts/StylistLayout.tsx` | S1 (tema), S10 (stil) | ⬜ |
| Provideri | `app/providers.tsx` | S1 | ⬜ |
| Tokeni / Tailwind | `styles/globals.css`, `styles/index.css`, `tailwind.config.js` | S1 | ⬜ |
| Dijeljeni UI | `components/ui/*`, `components/brand/*`, `BeforeAfterSlider.tsx`, `media-image.tsx` | S1/S2 (aurum-scoped varijante) | ⬜ |
| Nove primitive | `features/shell/aurum/ui/*` | S1 (kreiranje), S6–S10 (migracija) | ⬜ |
| Stare primitive | `features/shell/admin/ui/*` | S11 (brisanje, 0 potrošača) | ⬜ |
| i18n | `i18n/locales/bs.json`, `en.json` | S1–S11 | ⬜ |
| Kontrast skript | `scripts/check_ui_contrast.py` | S1 | ⬜ |
| CI | `.github/workflows/ci.yml`, `scripts/check_ci_index.py` | S0, S1, S11 | ⬜ |
| Dizajn dokumenti | `docs/design/*` (3) | S0 | ✅ NEJRA 14 sekcija + v2/v3 koncepti; `test:design-spec` 2/2 |
| CI | `.github/workflows/ci.yml`, `scripts/check_ci_index.py` | S0, S1, S11 | 🟡 S0 dodan `test:design-spec` korak; 380/383; ostali koraci u S1/S11 |
| Dokumentacija | `docs/audit/CI.md`, `docs/codebase-map/FRONTEND.md`, `docs/audit/UX_UI_ROUTE_INVENTORY.md`, `SOURCE_OF_TRUTH.md` | S11 | ⬜ |

---

## 6. Pravilo ažuriranja

Svaki završeni segment u ovoj matrici postavlja svoje redove u **✅ samo uz dokaz** (ime testa + CI run id) ili **🟡 s razlogom**; redirecti ostaju ➖. Promjena logike/rute ⇒ update ove matrice + upis u `CHANGELOG.md` + uklanjanje mrtvog koda (`code-hygiene-and-matrices.mdc`). S11 završava s **58/58** obrađenih deklaracija.
