# MATRIX — Pokrivenost ruta Aurum refaktorom

> **S10 status (lokalno, 2026-11-26):** nastavak je odobren 2026-11-25. Workbook new-entry, direct booking, schedule, debts i completion dialog su refaktorisani u fokusirane module; local Node suite **1041/1041**, strict TypeScript, `typecheck:e2e` i build prolaze. Commit `4996d1d` ima CI **45775652262 5/5**, ali taj run ne sadrži naknadne lokalne schedule/debts/completion izmjene. U tabeli S10 🟡 znači lokalna implementacija/provjere postoje, konačni S10 CI/rendered gate ostaje pending. Redirecti ostaju ➖; S10 nije zatvoren. Dokazi: `.cursor/plans/aurum-web-refactor/27_s10_stylist_portal.md`.

> **Aktuelni M2 status:** završen na osnovu korisnikove prijave pregleda u Brave i Edge na Windowsu (200%/400%, text-spacing, sve rute/uloge/jezici/teme, verzija `718fbe0`) i automatizovanih 320px fiksura. [CI 44940081950](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44940081950) 5/5, rendered 1505/0/0. Prijava nije nezavisni audit; viewport i pojedinačna stanja nisu specificirani. Ostaju zasebne provjere tastature, čitača ekrana, stvarnog forced-colors i reduced-motion te nepotpuni axe nalazi. Detalji: `.cursor/plans/aurum-web-refactor/15_rucni-pregled.md`. Stariji statusi ispod su historijski.

> **Najnoviji M2 dokaz:** `2c98530` / CI `44920510427` **5/5, rendered 1343 prošlo / 0 palo / 0 preskočeno**. 48 fiksurnih token-proposal stanja (BS/EN, oba Aurum režima, 320 CSS px/200% root/text-spacing), uključujući nepotpun odgovor, retry i gost/prijavljeni prikaz; 320px + spacing i automatizovani Tab/Enter uz forced-colors emulaciju. Ispravljen razlomljeni tekst oznaka. Vizuelno su pregledani ciljani statični snimci i šest uzoraka legende analitike; ostali nepotpuni kontrastni uzorci i širi stvarni ručni/AT pregled ostaju otvoreni. Fiksure ne dokazuju stvarne transakcije. Detalji: `.cursor/plans/aurum-web-refactor/16_ciljani-vizuelni-pregled.md`.

> **Najnoviji M2 paket:** `99240d0` / CI `44825519292` **5/5, rendered 1247 prošlo / 0 palo / 0 preskočeno**. 48 dodatnih fiksurnih kombinacija: popunjena knjiga prihoda i edit dijalog bez spremanja; direktna stylist rezervacija s odabirom klijenta/usluge ili nedostajućim spolom, bez slanja. BS/EN, Aurum light/dark, 320 CSS px / simulirani 200% root / text-spacing. Ispravljen overflow knjige na 320px; automatizacija nije ručni pregled ni dokaz stvarne finansijske transakcije. Ručni protokol je dopunjen, ali ručni text-spacing i širi pristupni pregled ostaju otvoreni.

> **Novi M2 paket:** `f5dd479` / CI `44797026431` **5/5, rendered 1199/1199**. Dodatno 72 fiksurna slučaja za popunjena admin/stylist dugovanja i statistiku te neuspješan booking i retry; Aurum visoki javni header prelazi u normalni tok da ne prekrije kontrole. Detalji, ograničenja i preostali rad u `CHANGELOG.md`.

> **Novi M2 paket:** `794f0b9` / CI `44760046621` **5/5, rendered 1127/1127**. Potvrđeno 96 fiksurnih kombinacija za admin blog komentar/galeriju/recenziju s potvrdama, parametrizirani stylist preview/confirm/retry i token otkazivanje/retry u BS/EN, oba Aurum režima, 320 CSS px i simuliranom 200% root tekstu/text-spacingu. Korisnik je prijavio da je stvarni browser prošao, bez specifikacije browsera, tema ili obima; to ne zatvara sve M2 slučajeve ni ručni text-spacing. Detalji i preostali rad: `CHANGELOG.md`.

## Najnoviji M2 dokaz — CI `44740804314`

`fb34344` / [CI 44740804314](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44740804314): **5/5; rendered 1031 prošlo, 0 palo, 0 preskočeno**. Fiksurno su potvrđeni popunjena knjiga rashoda i edit dijalog, stylist inbox/odbijanje/no-show/pomjeranje (60 slučajeva), booking i token stanja (108, prethodni CI `44731561761`), te analitika i postavke; opseg i raniji nalazi su u `CHANGELOG.md`. Mjere su 320 CSS px, simulirani 200% root tekst i text-spacing; nisu stvarni browser zoom ni dokaz svih podataka i stanja. Knjiga ima imenovanu, tastaturom skrolabilnu regiju. Axe kontrast na 66 ruta: 57 prošlo, 9 incomplete, 0 violations; nepotpune nalaze treba ručno pregledati.

**Otvoreno:** ostali admin paneli/dijalozi i booking/stylist/token stanja, stvarni zoom i ručni text-spacing, tastatura/fokus, čitač ekrana, forced-colors, vizuelni pregled i reduced-motion. Korisnik je ranije prijavio 200%/400% prolaz prioritetnih ruta bez specifikacije browsera/teme; to ne zatvara cijeli M2. S8 razbijanje velikih fajlova nije odobreno; nema merge/deploy. Stariji statusi ispod su historijski i ne nadjačavaju ovaj blok.

> **S9 — admin sadržaj + postavke hub, motion i boje (lokalno, 2026-11-25):** admin rute `33–42` su refaktorisane u orkestrator-stranice (`pages/Blog.tsx` 90, `Gallery.tsx` 132, `Reviews.tsx` 65, `SettingsHub.tsx` 67, `Settings.tsx` 28, `SettingsOperations.tsx` 33, `SettingsAppearance.tsx` 65, `SettingsSeo.tsx` 20, `AppReleases.tsx` 56, `Notifications.tsx` 68, `EmailSettings.tsx` 101 linija) sa logikom u `features/{gallery,reviews,blog,email-settings,notifications,app-releases,settings}/`. `EmailSettings` je razbijeno na 11 modula (SMTP hook 273 → `use-email-smtp-state` / `-config` / `-actions`; kampanje → `-settings` / `-audience` / `-job`; vizuelni editor → orkestrator / `-blocks` / `-preview`). Svih **31** `animate-*` instanci u S9 opsegu ima `motion-reduce:animate-none` (30 `animate-spin` + 1 `animate-pulse`); `transition-all` svedeno na `transition-[width] motion-reduce:transition-none`. S9 paleta je pretvorena u semantičke tokene (`text-ok-foreground`, `text-danger`, `text-info-foreground`, `text-brand-rose-text`, `bg-danger`, `bg-ok`, `bg-warn`); tri obrazložena izuzetka (email preview okvir, gallery photo scrim, native color picker). Dokazi: `tsc --noEmit` čist, ESLint **0 grešaka / 5 upozorenja** (sva 5 postojeća i u fajlovima van S9 opsega), `test:*` skripti **209/210** (jedini pad `test:auth-session-rendered` — Playwright nema instaliran browser; `cdn.playwright.dev` je blokiran), build zelen (initial **294,6/300 KiB**, Analytics 116,4/140, Calendar 101,1/125, public home 45,1, admin dashboard 15,3, stylist inbox 19,2), kontrast 148/148, `test:s9-reduced-motion` **5/5**, `test:s9-semantic-colors` **6/6** (uključujući forced-colors tvrdnju), pet Python provjera PASS, `git diff --check` PASS. **CI [45694496238](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45694496238)** za `bef75dc` je **5/5** (repo higijena, mobilni TypeScript, backend build+testovi, frontend typecheck+build, rendered a11y nad izolovanom CI bazom), a i **CI [45702072097](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45702072097)** za `071ad50` (dokumentacija + forced-colors tvrdnja) je **5/5**, kao i **CI [45709806591](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45709806591)** za `7f61060`. `AdminConfirmDialog` tok u `Reviews` je revidiran prema S6 — poruka, uvjet, efekat i fokus-povratak identični su originalu. **Nema merge/deploya i nema S10 bez zasebnog odobrenja.**

> **S8 — navigacija i analitički pickeri (lokalno, 2026-11-25):** bočna traka nosi **jednu stavku po području**; pod-pogledi analitike žive u tablistu `/admin/analytics`, a „Klijenti“ i „Stilisti“ imaju vlastite pickere umjesto skoka na `/admin/users` / `/admin/stylists`. Zadani analitički tab više ne piše `?tab=` (isto pravilo kao finansije i postavke), pa stavka u traci i tablist daju istu adresu za isti pogled (2.4.9). Dokazi: **cijeli `chromium` browser projekat 2355/2355**, ciljani S8 analitički specovi **22/22**, `test:*` skripti **207/207**, `tsc --noEmit` čist, ESLint 0 grešaka / 6 upozorenja, build zelen (initial 294,8/300 KiB, Analytics 116,4/140 KiB), pet Python provjera PASS, backend picker E2E **5/5** i cijeli backend E2E **7/7 suita / 106/106**, te **autentificirani** admin/stylist a11y suite uz pravi backend/PostgreSQL/Redis (prvi run 828/2 — oba pada zastarjela očekivanja; **ponovljeni run 830/830** potpuno zelen). **CI [45662884896](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45662884896)** za `cf147bd` (tačno završni HEAD) je **5/5**; stvarni AT/400% i ručni pregled ostaju otvoreni. Nema merge/deploya i nema S9 bez odobrenja.


## Aktuelna matrica dokaza — CI `44567932983`

> Historijske tabele od naslova **Arhiva S0–S5** nadalje zadržane su radi traga odluka; njihovi statusi, brojke i tvrdnje o politici teme nisu aktuelni. Ispod je trenutni opseg testova, a ne tvrdnja da je svaka ruta ili svako stanje završeno. Popis ruta i guardova održava se u `frontend/src/app/router.tsx`, `app/routes/admin.routes.tsx` i `public.routes.tsx`.

### Izmjereni admin početni prikazi

Svaki red: `a11y-admin.spec.ts` provjerava Aurum light i dark axe, a dodatno mjeri širinu dokumenta na **320 CSS px** u oba režima; CI `44567932983` (`7081698`) je 5/5, cijeli rendered suite 493/493 bez skipova. Ove provjere nisu dokaz svih stanja, unutrašnjeg clippinga, rada kontrola ili stvarnog zooma.

| Ruta | Aurum light/dark axe | 320 CSS px širina dokumenta |
|---|---|---|
| `/admin` | ✅ | ✅ |
| `/admin/users` | ✅ | ✅ |
| `/admin/salon` | ✅ | ✅ |
| `/admin/services` | ✅ | ✅ |
| `/admin/stylists` | ✅ | ✅ |
| `/admin/reservations` | ✅ | ✅ |
| `/admin/daily-log` | ✅ | ✅ |
| `/admin/finance` | ✅ | ✅ |
| `/admin/blog` | ✅ | ✅ |
| `/admin/gallery` | ✅ | ✅ |
| `/admin/reviews` | ✅ | ✅ |
| `/admin/settings` | ✅ | ✅ |
| `/admin/analytics` | ✅ | ✅ |
| `/admin/loyalty` | ✅ | ✅ |
| `/admin/reservations/calendar` | ✅ | ✅ |

### Dodatni opseg i otvorene rupe

| Područje | Dokaz / ograničenje |
|---|---|
| Analytics child paneli | `?tab=clients` i `?tab=stylists`, popunjene fiksure, oba Aurum režima: četiri zasebne axe provjere; 320px sweep iznad odnosi se na podrazumijevani hub, ne sve child stanja. |
| Javne rute | `theme-policy.spec.ts` i ostali rendered specovi testiraju izričito navedene rute i stanja; ne zaključivati da su sve deklaracije ili svi podaci testirani. |
| Stylist portal | `a11y-stylist.spec.ts` pokriva navedene rute s prijavljenim nalogom; parametrizirani detalji nisu dio tog sweepa. Ne tvrditi isti M2 obuhvat kao za 15 admin ruta. |
| Admin detalji i tabovi | `services/:serviceId/work-gallery`, postavke i finansije sa svim query tabovima, dijalozi i različiti podaci nisu iscrpno pokriveni 320px sweepom. Redirect nije zaseban renderirani ekran. |
| O4 potvrde | Svih 13 ranijih tokova ima interaktivne fiksure; `5407b13` / CI `44579698293` 5/5, 503/503 ukupno. Novi tokovi su testirani na desktop prikazu, korisničke deaktivacije i na 320px; nisu dokaz svih uređaja, jezika ili ručnog čitača ekrana. |
| Ručno | M2 zaključen po korisnikovoj potvrdi i fiksurama; M1, M4 čitač ekrana i M5 forced-colors ostaju otvoreni. |

---

## Arhiva S0–S5 — historijski inventar i statusi, ne aktuelni dokaz

**Status:** 🟡 **S0–S5 završeni (svaki 5/5).** ✅ je **20/58 deklaracija** = 14/14 javnih (#1–#14) + 6/8 auth/izuzeci (#15–#20, #22); preostalih **38** (fullscreen kalendar #21, admin, stylist) čeka S6–S10. **S5:** `90acca2` / run `43181880043` / 5/5; default-classic axe 252/252 / 32 rute, artifact `13926547985`.
**Izvor inventara (izmjeren 2026-11-11):** `frontend/src/app/router.tsx`, `app/routes/public.routes.tsx`, `app/routes/admin.routes.tsx`; unakrsno `docs/audit/UX_UI_ROUTE_INVENTORY.md`.
**Ukupno:** **58 deklaracija ruta** = javne 14 + auth/izuzeci 8 + admin 24 + stylist 12.
**Vlasnik plana:** `.cursor/plans/aurum-web-refactor/` · **Ažurirano:** 2026-11-11

**Legenda:** ⬜ nije započeto · 🟡 u kodu, nije provjereno u renderu · ✅ provjereno (test + CI run id) · ➖ redirect (nema vlastiti ekran)

---

## 1. Javne rute — `PublicLayout` (14)

| # | Ruta | Ekran / izvor | Segment | Ključni testovi | Status |
|---|---|---|---|---|---|
| 1 | `/` | `pages/public/PublicHome.tsx` | S2 | `test:public-home-accessibility`, `test:public-home-before-after-recovery`, `test:public-home-featured-review-recovery`, `test:public-aurum-hero-contrast` | ✅ **S2** (`43110763869` / `d1fb55d`) |
| 2 | `/usluge` | `pages/public/PublicServices.tsx` | S2 | `test:public-services-redesign`, `test:public-services-recovery`, `test:public-catalog-i18n` | ✅ **S2** (`43110763869` / `d1fb55d`); `FilterBar`/`EmptyState`/`ErrorState`/`TableSkeleton` u Aurum grani |
| 3 | `/usluge/:serviceId` | `pages/public/PublicServiceDetail.tsx` | S2 | `test:public-service-detail-recovery`, `test:before-after-i18n` | ✅ **S2** (`43110763869` / `d1fb55d`); `PageHeader`/`StatusBadge` u Aurum grani |
| 4 | `/blog` | `pages/public/PublicBlogList.tsx` (feature gate) | S3 | `test:public-blog-list-i18n`, `test:public-blog-list-recovery`, `test:public-blog-list-accessibility` | ✅ **S3** (`43116167107` / `a12cf5b`); `EmptyState`/`ErrorState`, `data-aurum-surface`, Aurum hero |
| 5 | `/blog/:slug` | `pages/public/PublicBlogPost.tsx` (feature gate) | S3 | `test:public-blog-post-i18n`, `test:public-blog-post-read-recovery`, `test:public-blog-share-accessibility`, `test:public-blog-comments-*` | ✅ **S3** (`43116167107` / `a12cf5b`); `data-aurum-article*`, share `aria-label`, `fieldset/legend` |
| 6 | `/galerija` | `pages/public/PublicGallery.tsx` (feature gate) | S3 | `test:public-gallery-accessibility` | ✅ **S3** (`43116167107` / `a12cf5b`); `DialogDescription`, ikona kategorije, `data-aurum-lightbox` |
| 7 | `/kontakt` | `pages/public/PublicContact.tsx` | S3 | `test:public-contact-i18n`, `test:public-contact-accessibility` | ✅ **S3** (`43116167107` / `a12cf5b`); `PageHeader`, 3 kartice, `autoComplete="name"` |
| 8 | `/rezervacija` | `pages/public/PublicReserve.tsx` | S4 | `test:public-reservation-accessibility`, `test:reservation-errors`, `test:redundant-entry-a11y` | ✅ **S4** (`43177106881` / `7d2ab0e`); `data-aurum-page/progress/cta`, 0 diff FSM-a i idempotencyja |
| 9 | `/moje-rezervacije` | `pages/public/MyReservations.tsx` | S4 | `test:my-reservations-recovery`, `test:client-reservation-errors` | ✅ **S4** (`43177106881` / `7d2ab0e`); `CancelReservationDialog` + fokus-povratak, `<time>` u kartici |
| 10 | `/moje-rezervacije/:id` | `pages/public/MyReservationDetail.tsx` | S4 | `test:my-reservation-detail-recovery` | ✅ **S4** (`43177106881` / `7d2ab0e`); `<time dateTime>`, `PaymentSummaryBlock` u Aurum tokenima |
| 11 | `/moj-termin/:token` | `pages/public/PublicReservationView.tsx` | S4 | `test:public-reservation-view-recovery` | ✅ **S4** (`43177106881` / `7d2ab0e`); 404/410 vs transient greška netaknuti, `<time dateTime>` |
| 12 | `/unsubscribe` | `pages/public/CampaignUnsubscribe.tsx` | S4 | `test:campaign-unsubscribe-accessibility`, `test:campaign-unsubscribe-data`, `test:campaign-unsubscribe-recovery` | ✅ **S4** (`43177106881` / `7d2ab0e`); `role={isErrorStatus ? "alert" : "status"}`, jedan primarni CTA |
| 13 | `/profil` | `pages/Profile.tsx` (koristi i stylist meni) | S4 | `test:profile-*`, `test:profile-api-errors`, `test:profile-accessibility` | ✅ **S4** (`43177106881` / `7d2ab0e`); javni + stylist kontekst, `ConfirmDialog` u `MediaConsentPanel` |
| 14 | `/zadovoljni-klijenti` | `pages/public/PublicSatisfiedClients.tsx` (feature gate) | S3 | `test:satisfied-clients-read-recovery` | ✅ **S3** (`43116167107` / `a12cf5b`); `EmptyState` sa sljedećim korakom, `data-aurum-satisfied-card` |

---

## 2. Auth / onboarding / izuzeci (8)

| # | Ruta | Ekran / izvor | Guard | Segment | Ključni testovi | Status |
|---|---|---|---|---|---|---|
| 15 | `/login` | `pages/Login.tsx` | `PublicOnlyRoute` | S5 | `test:login-i18n`, `test:login-accessibility` | ✅ **S5** (`43181880043` / `90acca2`); `AuthCardHeader` iznad `<h1>`, `data-aurum-auth-card`, `<h1>` regex netaknut |
| 16 | `/register` | `pages/Register.tsx` | `PublicOnlyRoute` | S5 | `test:registration-errors`, `test:registration-accessibility` | ✅ **S5** (`43181880043` / `90acca2`); 8 polja/`autoComplete`/avatar `fieldset` 0 diff |
| 17 | `/reset-password` | `pages/ResetPassword.tsx` | nema | S5 | `test:reset-password-accessibility` | ✅ **S5** (`43181880043` / `90acca2`); token cleanup i stale zaštite 0 diff |
| 18 | `/force-change-password` | `pages/ForceChangePassword.tsx` | `ProtectedRoute` | S5 | `test:force-change-password-i18n`, `test:force-change-password-accessibility` | ✅ **S5** (`43181880043` / `90acca2`); preko `OnboardingShell` |
| 19 | `/onboarding/gender` | `pages/onboarding/OnboardingGender.tsx` | `ProtectedRoute` | S5 | `test:onboarding-gender-i18n`, `test:onboarding-gender-accessibility` | ✅ **S5** (`43181880043` / `90acca2`); `aria-pressed` + `data-aurum-progress` |
| 20 | `/onboarding/email` | `pages/onboarding/OnboardingEmail.tsx` | `ProtectedRoute` | S5 | `test:onboarding-email-i18n`, `test:onboarding-email-accessibility` | ✅ **S5** (`43181880043` / `90acca2`); OTP/`otp-input.tsx` 0 diff |
| 21 | `/admin/reservations/calendar` | `pages/ReservationsCalendar.tsx` (fullscreen, izvan layouta) | `ProtectedRoute` | S6 | `test:admin-reservations-calendar-i18n`, `test:admin-calendar-drawer-accessibility`, `test:calendar-aria-shim` | ⬜ |
| 22 | `*` | `pages/NotFound.tsx` | nema | S5 | `test:route-guards-i18n` | ✅ **S5** (`43181880043` / `90acca2`); jedan `<h1>` (2.4.6), jedan primarni CTA na `/` |

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
| 33 | `/admin/blog` | `pages/Blog.tsx` + `features/blog/*` | S9 | `test:admin-blog-i18n`, `test:blog-language-a11y`, `test:admin-content-a11y` | 🟡 **S9**: orkestrator 90 ln; `test:*` 209/210, `tsc` čist, ESLint 0 grešaka, build zelen — nema merge/deploya |
| 34 | `/admin/gallery` | `pages/Gallery.tsx` + `features/gallery/*` | S9 | `test:admin-gallery-keyboard`, `test:admin-content-a11y` | 🟡 **S9**: orkestrator 132 ln; keyboard 5/5, i18n 4/4 — nema merge/deploya |
| 35 | `/admin/reviews` | `pages/Reviews.tsx` + `features/reviews/*` | S9 | `test:admin-reviews-i18n`, `test:admin-content-a11y` | 🟡 **S9**: orkestrator 65 ln; i18n 3/3, admin content a11y 10/10; `AdminConfirmDialog` tok revidiran prema S6 — poruka/uvjet/efekat/fokus-povratak identični |
| 36 | `/admin/settings` | `pages/SettingsHub.tsx` (7 tabova) + `features/settings/*` | S9 | `test:admin-settings-*`, `test:settings-semantic-tokens`, `test:admin-settings-controls-a11y`, `test:s9-semantic-colors`, `test:s9-reduced-motion` | 🟡 **S9**: hub 67 ln + 4 stranke (28/33/65/20 ln); fokus suite 46/46, motion 5/5, boje 5/5 |
| 37 | `/admin/settings/operations` | `TabRedirect → /admin/settings?tab=operations` | S9 | `test:settings-hub-redirect`, `test:admin-settings-operations-appearance-i18n` | ➖ |
| 38 | `/admin/settings/appearance` | `TabRedirect → /admin/settings?tab=appearance` | S9 (S1 za Q9 napomenu) | `test:settings-hub-redirect`, `test:admin-settings-operations-appearance-i18n` | ➖ |
| 39 | `/admin/settings/seo` | `TabRedirect → /admin/settings?tab=seo` | S9 | `test:settings-hub-redirect`, `test:admin-settings-seo-i18n` | ➖ |
| 40 | `/admin/app-releases` | `TabRedirect → /admin/settings?tab=releases` | S9 | `test:settings-hub-redirect`, `test:app-releases-i18n`, `test:raw-api-error-exposure` | ➖ |
| 41 | `/admin/notifications` | `TabRedirect → /admin/settings?tab=notifications` | S9 | `test:settings-hub-redirect`, `test:notifications-campaign-consent` | ➖ |
| 42 | `/admin/email-settings` | `TabRedirect → /admin/settings?tab=email` | S9 | `test:settings-hub-redirect`, `test:eslint-a11y-severity`, `test:email-settings-*-i18n`, `test:admin-settings-controls-a11y` | ➖ |
| 43 | `/admin/analytics` | `pages/AnalyticsHub.tsx` (3 taba, pickeri za klijente/stiliste) | S8 | `test:analytics-hub-redirect`, `test:analytics-link-purpose`, `test:text-contrast-allowlist`, `s8-admin-sidebar-navigation.spec.ts` | ✅ **S8**: browser 2355/2355 (cijeli `chromium` projekat), ciljani analitički S8 22/22, `tsc` čist, Node 207/207, backend E2E 106/106, autentificirani a11y 830/830; CI 45662884896 5/5 — nema stvarnog AT audita |
| 44 | `/admin/client-analytics` | `TabRedirect → /admin/analytics?tab=clients` | S8 | `test:analytics-hub-redirect`, `backend/test/analytics-picker.e2e-spec.ts` | ➖ |
| 45 | `/admin/stylist-analytics` | `TabRedirect → /admin/analytics?tab=stylists` | S8 | `test:analytics-hub-redirect`, `test:stylist-analytics-tables-a11y`, `backend/test/analytics-picker.e2e-spec.ts` | ➖ |
| 46 | `/admin/loyalty` | `pages/Loyalty.tsx` | S7 | `test:admin-loyalty-i18n`, `test:loyalty-a11y` | ⬜ |

---

## 4. Stylist rute — `StylistRoute` + `StylistLayout` (12 deklaracija: 10 ekrana + 2 redirecta)

| # | Ruta | Ekran / izvor | Segment | Ključni testovi | Status |
|---|---|---|---|---|---|
| 47 | `/stylist` | `<Navigate to="/stylist/inbox" replace />` | S10 | — | ➖ |
| 48 | `/stylist/inbox` | `features/stylist-portal/pages/stylist-inbox-page` | S10 | `test:stylist-status-messages-a11y`, `test:stylist-form-controls-a11y` | 🟡 local · CI pending |
| 49 | `/stylist/workbook` | `features/stylist-workbook/pages/workbook-list-page` | S10 | `test:stylist-workbook-list-i18n`, `test:workbook-loading-status-a11y` | 🟡 local · CI pending |
| 50 | `/stylist/workbook/new` | `features/stylist-workbook/pages/workbook-new-entry-page` | S10 | `test:workbook-form-groups-a11y`, `test:redundant-entry-a11y` | 🟡 local · CI pending |
| 51 | `/stylist/workbook/reschedule-preview/:reservationId` | `features/stylist-workbook/pages/workbook-reschedule-preview-page` | S10 | `test:stylist-workbook-reschedule-i18n`, `test:stylist-workbook-reschedule-accessibility` | 🟡 local · CI pending |
| 52 | `/stylist/workbook/:entryId` | `features/stylist-workbook/pages/workbook-detail-page` | S10 | `test:stylist-workbook-detail-i18n`, `test:stylist-workbook-read-accessibility` | 🟡 local · CI pending |
| 53 | `/stylist/schedule` | `features/stylist-portal/pages/stylist-schedule-page` | S10 | `test:stylist-dark-contrast-a11y` | 🟡 local · CI pending |
| 54 | `/stylist/schedule/new` | `features/stylist-portal/pages/stylist-direct-booking-page` | S10 | `test:stylist-form-controls-a11y` | 🟡 local · CI pending |
| 55 | `/stylist/schedule/:reservationId` | `features/stylist-portal/pages/stylist-reservation-detail-page` | S10 | `test:stylist-status-messages-a11y` | 🟡 local · CI pending |
| 56 | `/stylist/debts` | `features/stylist-portal/pages/stylist-debts-page` | S10 | `test:amount-format-consistency` | 🟡 local · CI pending |
| 57 | `/stylist/stats` | `features/stylist-portal/pages/stylist-stats-page` | S10 | `test:stylist-analytics-tables-a11y` | 🟡 local · CI pending |
| 58 | `/stylist/profile` | `<Navigate to="/profil" replace />` (ekran je red #13) | S10 | `test:profile-*` | ➖ |

---

## 5. Dijeljeni slojevi (nisu rute, ali su u obimu)

| Sloj | Fajl | Segment | Status |
|---|---|---|---|
| Javni shell | `features/shell/public/public-layout.tsx`, `public-ui.ts` | S1 (tema), S2 (stil) | ✅ **S2** (`43110763869` / `d1fb55d`); `aria-current` + oblik, 44 px mete, `SkipLink`/drawer netaknuti |
| Admin shell | `features/shell/admin/*`, `layouts/DashboardLayout.tsx` | S1 (tema), S6 (stil) | ⬜ |
| Stylist shell | `layouts/StylistLayout.tsx` | S1 (tema), S10 (stil) | 🟡 local · CI pending |
| Provideri | `app/providers.tsx` | S1 | ✅ `ThemeProvider` iznad `SettingsProvider`; `MotionConfig` netaknut; `test:theme-brand-precedence` |
| Tokeni / Tailwind | `styles/globals.css`, `styles/index.css`, `tailwind.config.js` | S1 | ✅ 2 Aurum bloka + `fontFamily.serif`; `test:theme-ssot-sync`; `:root`/`.dark` netaknuti |
| Dijeljeni UI | `components/ui/*`, `components/brand/*`, `BeforeAfterSlider.tsx`, `media-image.tsx` | S1/S2 (aurum-scoped varijante) | ✅ **S2: 0 diff** (grep dokaz); Aurum varijanta ostvarena u `globals.css` bez diranja dijeljenih komponenti |
| Nove primitive | `features/shell/aurum/ui/*` + `features/auth/auth-card-header.tsx` | S1, S2, **S4 (`confirm-dialog`)**, **S5 (`AuthCardHeader`)**, S6–S10 | ✅ **S2 6/8 + S4 `ConfirmDialog` + S5 `AuthCardHeader`** (`ThemeSwitcher` + `LanguageSwitcher` u zaglavlju 7 kartica); `data-table`/`form-section` čekaju S6–S10 |
| Stare primitive | `features/shell/admin/ui/*` | S11 (brisanje, 0 potrošača) | ⬜ namjerno ostaju do S11 |
| Izbornik teme | `features/shell/theme/*` | S1 | ✅ `ThemeSwitcher` u 3 shella; `test:theme-state`, `test:theme-switcher-a11y` |
| i18n | `i18n/locales/bs.json`, `en.json` | S1–S11 | ✅ **S4: 2730/2730** (S1 +6, S3 +11, S4 +2 s `{{service}}`/`{{date}}`); `check_i18n.py --strict` PASS |
| Kontrast skript | `scripts/check_ui_contrast.py` | S1 | ✅ **140/140** (80 klasičnih + 60 Aurum; odluka `use_140_four`) |
| Dizajn dokumenti | `docs/design/*` (3) | S0 | ✅ NEJRA 14 sekcija + v2/v3 koncepti; `test:design-spec` 2/2 |
| CI (S0 dio) | `.github/workflows/ci.yml`, `scripts/check_ci_index.py` | S0 | ✅ `test:design-spec` korak + odobreni `ci_fallback`; run `43043182552` 5/5, rendered axe 252/252 |
| CI (S1 dio) | `.github/workflows/ci.yml`, `frontend/package.json` | S1 | ✅ **4 nova koraka** + 4 skripte; `check_ci_index.py` 384/387; 203/203 `test:*`; run **`43100889990`** na `ae87acf` = **5/5 success**, default-classic axe 252/252 / 32 rute |
| CI (S11 dio) | `.github/workflows/ci.yml` | S11 | ⬜ rendered axe za 3 stanja teme |
| Dokumentacija | `docs/audit/CI.md`, `docs/codebase-map/FRONTEND.md`, `docs/audit/UX_UI_ROUTE_INVENTORY.md`, `SOURCE_OF_TRUTH.md` | S11 | ⬜ |

---

## 6. Pravilo ažuriranja

Svaki završeni segment u ovoj matrici postavlja svoje redove u **✅ samo uz dokaz** (ime testa + CI run id) ili **🟡 s razlogom**; redirecti ostaju ➖. Promjena logike/rute ⇒ update ove matrice + upis u `CHANGELOG.md` + uklanjanje mrtvog koda (`code-hygiene-and-matrices.mdc`). S11 završava s **58/58** obrađenih deklaracija.
