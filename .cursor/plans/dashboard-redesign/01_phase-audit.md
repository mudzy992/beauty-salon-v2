# Faza A1 — Audit trenutnog stanja

**Sve brojke u ovom dokumentu su izmjerene grep/wc/proračunom nad `frontend/` na commit-u `9df498a`, 2026-11-08.**
Ovo su činjenice iz koda, ne procjene. Gdje nešto nije moglo biti provjereno u renderu — eksplicitno je označeno.

---

## 1. Mapa ruta → page → feature → guard → dijeljene komponente

### 1.1 Admin (`/admin/*`) — `layouts/DashboardLayout` → `features/shell/admin/admin-layout.tsx`, guard `ProtectedRoute`

Definisano u [`frontend/src/app/routes/admin.routes.tsx`](../../../frontend/src/app/routes/admin.routes.tsx).

| Ruta | Page fajl | Linija | Feature folder | U navigaciji? |
|---|---|---:|---|---|
| `/admin` | `pages/Dashboard.tsx` | 39 | `features/dashboard` (7 fajlova / 788 ln) | ✅ `nav.home` |
| `/admin/analytics` | `pages/Analytics.tsx` | 397 | `features/analytics` | ✅ `nav.analytics` |
| `/admin/client-analytics` | `pages/ClientAnalytics.tsx` | 753 | `features/client-analytics` | ❌ **nije u navu** |
| `/admin/stylist-analytics` | `pages/StylistAnalytics.tsx` | ~130 | `features/stylist-analytics` | ❌ **nije u navu** |
| `/admin/reservations` | `pages/Reservations.tsx` | 660 | `features/reservations` | ✅ `nav.reservations` |
| `/admin/reservations/calendar` | `pages/ReservationsCalendar.tsx` | — | `features/reservations/components/ReservationScheduler.tsx` (1196 ln) | ⚠️ **izvan layouta** (standalone ruta u `router.tsx`) |
| `/admin/daily-log` | `pages/DailyLog.tsx` | ~120 | `features/daily-log` (21 fajl / 2922 ln) | ✅ `nav.dailyLog` |
| `/admin/salon` | `pages/Salon.tsx` | 603 | — (sve u page fajlu) | ✅ `nav.salon` |
| `/admin/services` | `pages/Services.tsx` | 1528 | — | ✅ `nav.services` |
| `/admin/services/:serviceId/work-gallery` | `pages/ServiceWorkGallery.tsx` | — | — | ❌ (deep link) |
| `/admin/stylists` | `pages/Stylists.tsx` | 482 | — | ✅ `nav.stylists` |
| `/admin/finance` | `pages/Finance.tsx` (5 ln) | 5 | `features/finance` (55 fajlova / 6798 ln) | ✅ `nav.finance` |
| `/admin/finance?tab=debtors` | `pages/Debtors.tsx` (embedded) | — | `features/debtors` | ✅ (tab) |
| `/admin/debtors` | — | — | **`<Navigate to="/admin/finance?tab=debtors" replace />`** | ➖ redirect |
| `/admin/loyalty` | `pages/Loyalty.tsx` | 296 | `features/loyalty` | ✅ `nav.loyalty` |
| `/admin/users` | `pages/Users.tsx` | **1535** | `features/users` | ✅ `nav.users` |
| `/admin/blog` | `pages/Blog.tsx` | ~400 | `features/blog` | ✅ `nav.blog` (+ badge brojač) |
| `/admin/gallery` | `pages/Gallery.tsx` | 600 | `features/gallery` | ✅ `nav.gallery` |
| `/admin/reviews` | `pages/Reviews.tsx` | 286 | `features/reviews` | ✅ `nav.reviews` |
| `/admin/settings` | `pages/Settings.tsx` | ~160 | `features/settings` | ✅ `nav.settings` |
| `/admin/settings/operations` | `pages/SettingsOperations.tsx` | — | `features/settings` | ❌ (pod-nav u `settings-shell`) |
| `/admin/settings/appearance` | `pages/SettingsAppearance.tsx` | — | `features/settings` | ❌ |
| `/admin/settings/seo` | `pages/SettingsSeo.tsx` | — | `features/settings` | ❌ |
| `/admin/app-releases` | `pages/AppReleases.tsx` | — | `features/app-releases` | ✅ `nav.appReleases` |
| `/admin/notifications` | `pages/Notifications.tsx` | 376 | `features/notifications` | ✅ `nav.notifications` |
| `/admin/email-settings` | `pages/EmailSettings.tsx` | **1377** | `features/email-settings` | ✅ `nav.emailSettings` |

### 1.2 Stylist (`/stylist/*`) — `layouts/StylistLayout.tsx` (162 ln), guard `StylistRoute`

Definisano inline u [`frontend/src/app/router.tsx`](../../../frontend/src/app/router.tsx) (**nema** `stylist.routes.tsx`).

| Ruta | Page | Linija |
|---|---|---:|
| `/stylist` | → `<Navigate to="/stylist/inbox">` | — |
| `/stylist/inbox` | `features/stylist-portal/pages/stylist-inbox-page.tsx` | 325 |
| `/stylist/workbook` | `features/stylist-workbook/pages/workbook-list-page.tsx` | — |
| `/stylist/workbook/new` | `workbook-new-entry-page.tsx` | 659 |
| `/stylist/workbook/reschedule-preview/:reservationId` | `workbook-reschedule-preview-page.tsx` | 365 |
| `/stylist/workbook/:entryId` | `workbook-detail-page.tsx` | 508 |
| `/stylist/schedule` | `stylist-schedule-page.tsx` | — |
| `/stylist/schedule/new` | `stylist-direct-booking-page.tsx` | 366 |
| `/stylist/schedule/:reservationId` | `stylist-reservation-detail-page.tsx` | — |
| `/stylist/debts` | `stylist-debts-page.tsx` | — |
| `/stylist/stats` | `stylist-stats-page.tsx` | — |
| `/stylist/profile` | → `<Navigate to="/profil">` | — |

Ukupno `features/stylist-portal` + `features/stylist-workbook`: **37 produkcijskih fajlova / 5782 linije / 26 testova.**

### 1.3 Autentifikovani onboarding (standalone, van oba layouta)

| Ruta | Guard | Page |
|---|---|---|
| `/force-change-password` | `ProtectedRoute` | `pages/ForceChangePassword.tsx` |
| `/onboarding/gender` | `ProtectedRoute` | `pages/onboarding/OnboardingGender.tsx` |
| `/onboarding/email` | `ProtectedRoute` | `pages/onboarding/OnboardingEmail.tsx` |

### 1.4 Granični slučajevi (odluka vlasnika — Q2)

| Ruta | Guard | Layout | Zaključak iz koda |
|---|---|---|---|
| `/login` | `PublicOnlyRoute` | `PublicLayout` | javno-orijentisano |
| `/register` | `PublicOnlyRoute` | `PublicLayout` | javno-orijentisano |
| `/reset-password` | **bez guard-a** | `PublicLayout` | javno-orijentisano |
| `/profil` | javna ruta | `PublicLayout` | koristi ga i `StylistLayout` meni → **dijeljeno** |

### 1.5 Navigacija

`features/shell/admin/admin-nav.ts` — **7 sekcija**: Pregled, Operativa, Salon, Finansije, Ljudi (`nav.sectionPeople`, samo Users), Sadržaj, Sistem.
`ClientAnalytics` i `StylistAnalytics` **nisu** u navigaciji; `admin-layout.tsx` ima hardkodiran fallback
`if (location.pathname.startsWith('/admin/client-analytics')) return t('nav.clientAnalytics')` — znak da je IA naknadno zakrpljena.

---

## 2. Veličina fajlova i prekoračenja pravila 100–150 linija

Top 20 produkcijskih fajlova u `frontend/src` (bez testova). **Podebljano = u obimu redizajna.**

| Linija | Fajl | U obimu |
|---:|---|---|
| **1535** | `pages/Users.tsx` | ✅ |
| **1528** | `pages/Services.tsx` | ✅ |
| **1377** | `pages/EmailSettings.tsx` | ✅ |
| **1196** | `features/reservations/components/ReservationScheduler.tsx` | ✅ |
| 1163 | `pages/public/PublicReserve.tsx` | ❌ javno |
| 841 | `pages/Profile.tsx` | ⚠️ Q2 |
| **753** | `pages/ClientAnalytics.tsx` | ✅ |
| **660** | `pages/Reservations.tsx` | ✅ |
| **659** | `features/stylist-workbook/pages/workbook-new-entry-page.tsx` | ✅ |
| 632 | `pages/public/PublicServiceDetail.tsx` | ❌ |
| **603** | `pages/Salon.tsx` | ✅ |
| **600** | `pages/Gallery.tsx` | ✅ |
| 544 | `pages/public/PublicServices.tsx` | ❌ |
| **508** | `features/stylist-workbook/pages/workbook-detail-page.tsx` | ✅ |
| **482** | `pages/Stylists.tsx` | ✅ |
| 473 | `features/shell/public/public-layout.tsx` | ❌ |
| **409** | `features/finance/income/income-book-detail.tsx` | ✅ |
| **397** | `pages/Analytics.tsx` | ✅ |
| 391 | `pages/public/PublicHome.tsx` | ❌ |
| **376** | `pages/Notifications.tsx` | ✅ |

Ukupno `frontend/src` (bez testova): **42 719 linija**. Prompt navodi 8 prekoračenja; stvarno stanje u obimu je **13 fajlova preko 375 linija** (dodata: `ReservationScheduler`, `ClientAnalytics`-susjedi, `workbook-*`, `income-book-detail`, `expense-book-detail` 369, `stylist-direct-booking-page` 366, `workbook-reschedule-preview-page` 365, `Notifications` 376).

---

## 3. Boje: sirove klase vs tokeni, i stvarno stanje dark teme

### 3.1 Sirove `slate-*` klase

**2222 pojavljivanja** `*-slate-N` utility klasa u **142 fajla**. Top:

| Klasa | Ukupno | Bez `dark:` prefiksa (light-mode) |
|---|---:|---:|
| `text-slate-500` | 380 | 378 |
| `text-slate-900` | 283 | 271 |
| `text-slate-50` | 238 | 1 |
| `text-slate-600` | 220 | 217 |
| `border-slate-200` | 214 | — |
| `border-slate-800` | 161 | (dark) |
| `text-slate-300` | 135 | 1 |
| `text-slate-700` | 77 | 75 |
| `bg-slate-50` | 77 | — |
| `text-slate-400` | 50 | **26** |

**Light-mode tekstualne klase i njihov stvarni kontrast na bijeloj** (proračun istim algoritmom kao `scripts/check_ui_contrast.py`):

| Klasa | HEX | Kontrast na `#FFFFFF` | 1.4.3 (4.5:1) |
|---|---|---:|---|
| `text-slate-400` | `#94A3B8` | **2.56:1** | ❌ **FAIL** |
| `text-slate-500` | `#64748B` | 4.76:1 | ✅ (marginalno) |
| `text-slate-600` | `#475569` | 7.58:1 | ✅ |
| `text-slate-700` | `#334155` | 10.35:1 | ✅ |
| `text-slate-800` | `#1E293B` | 14.63:1 | ✅ |
| `text-slate-900` | `#0F172A` | 17.85:1 | ✅ |
| `text-slate-950` | `#020617` | 20.17:1 | ✅ |
| `text-slate-300` | `#CBD5E1` | 1.48:1 | ❌ (1 upotreba) |
| `text-slate-200` | `#E2E8F0` | 1.23:1 | ❌ (4 upotrebe) |

**Konkretni 1.4.3 promašaji u dashboard modulima** (svaka linija provjerena grep-om):

| Fajl:linija | Šta je | Modul |
|---|---|---|
| `features/shell/admin/admin-nav-menu.tsx:43,44` | naslovi navigacijskih sekcija (11px uppercase) | Temelj |
| `features/finance/components/summary-cards.tsx:38` | `hint` tekst ispod iznosa | Finance |
| `features/finance/expense/expense-attachments.tsx:51` | „—“ placeholder | Finance |
| `features/finance/income/income-entries-table.tsx:219` | „—“ placeholder | Finance |
| `features/settings/setting-editor-display.tsx:54` | `suffix` uz vrijednost | Postavke |
| `pages/ClientAnalytics.tsx:316,575` | datum registracije / datum duga | Analitika |
| `features/daily-log/entry-form-fields.tsx:130,161`, `settings-module-page.tsx:54`, `Users.tsx:952`, `ReservationScheduler.tsx:1054`, `workbook-new-entry-page.tsx:330,376` | **Search ikona** (dekorativna uz vidljivu labelu) | razni — 1.4.11 procjena, ne 1.4.3 |
| `workbook-detail-page.tsx:137`, `workbook-new-entry-page.tsx:290,478`, `workbook-reschedule-preview-page.tsx:127` | **Loader2 spinner** | Stylist portal — 1.4.11 procjena |
| `features/media-consent/media-consent-panel.tsx:195,265` | placeholder ikone | (dijeljeno s javnim) |

Out of scope (javni sajt): `PublicHome.tsx:370`, `PublicReserve.tsx:188,248`.

### 3.2 Hardkodirani hex-ovi u `.tsx`

Najčešći: `#49332d` (25×), `#75645a` (15×), `#9d735d` (8×), `#e8ddd3` (6×), `#9b735f` (6×), `#806b5d` (6×), `#80553e` (6×), `#632238` (4×)…
Koncentrisani u **`features/settings/*`** — `settings-shell.tsx` koristi `#9d735d`, `#fffaf6`, `#49332d`, `#9b735f`, `#d9c4b5`, `#f3e8df`, `#6e493c`, `#fffdfa`.
To je **paralelna, „topla smeđa“ paleta** koja nije u `tailwind.config.js` niti u `globals.css` i **nije** bordo/zlatna brand paleta → krši §4 prompta (konzistentnost identiteta) i otežava runtime brand override.

Kontrast tih hex-ova: `#9b735f` na bijeloj **4.19:1** (prolazi 3:1 za focus ring, ne prolazi 4.5:1 za tekst), `#9d735d` **4.16:1**.

### 3.3 Dark tema — **ne može se aktivirati**

Provjereno:

| Traženo | Rezultat |
|---|---|
| `tailwind.config.js` → `darkMode: ['class']` | ✅ postoji |
| `globals.css` → `.dark { … }` blok sa svim tokenima | ✅ postoji |
| `classList.add('dark')` / `classList.toggle('dark')` / `documentElement.classList` | ❌ **0 pogodaka** u `frontend/src` |
| `ThemeProvider` / `useTheme` / `data-theme` | ❌ **0 pogodaka** |
| `prefers-color-scheme` | samo 1× u `globals.css` (`prefers-reduced-motion` blok je zaseban); **nema** media upita za temu |
| `index.html` | statičan `<html lang="bs">`, bez klase |

**Zaključak:** 106 fajlova sadrži `dark:` klase koje se nikad ne aktiviraju. To je mrtav stil, ne feature.
→ **Q1 u `00_overview.md`.** Referentni HTML prekidač teme je **samo demonstracija**; ne uvodimo ga bez odobrenja.

### 3.4 Tokeni u `globals.css` — izračunati problemi

Proračun (HSL → RGB → WCAG luminanca, identično `check_ui_contrast.py`):

| Par | Light | Dark | Prag | Status |
|---|---:|---:|---|---|
| `foreground` / `background` | 20.01:1 | 16.93:1 | 4.5 | ✅ |
| `muted-foreground` / `background` | 5.61:1 | 6.91:1 | 4.5 | ✅ |
| `muted-foreground` / `muted` | 5.10:1 | 5.42:1 | 4.5 | ✅ |
| `primary-foreground` / `primary` | 5.25:1 | 11.56:1 | 4.5 | ✅ |
| `destructive-foreground` / `destructive` | 4.99:1 | 9.58:1 | 4.5 | ✅ |
| **`input` / `background`** | **1.23:1** | **1.37:1** | **3.0 (1.4.11)** | ❌ **FAIL** |
| **`border` / `background`** | **1.23:1** | **1.37:1** | **3.0 (1.4.11)** | ❌ **FAIL** (kao okvir kontrole) |
| `ring` / `background` | 5.25:1 | 9.76:1 | 3.0 | ✅ |

Ovo potvrđuje dijagnozu iz referentnog HTML-a: **jedina neophodna korekcija palete je `--input`/okvir kontrole**.
Referenca predlaže `#767B86` (light, **4.24:1**) i `#6B7280` (dark, **3.48:1**) — oba vrijednosti sam nezavisno preračunao i potvrđujem.

### 3.5 Ostali kontrastni nalazi (postojeće komponente)

| Par | Omjer | Status |
|---|---:|---|
| `input.tsx` placeholder `slate-500` / bijela | 4.76:1 | ✅ |
| `button.tsx` destructive: bijela / `red-600 #DC2626` | 4.83:1 | ✅ ali **hardkodirano**, ne koristi `--destructive` |
| `badge.tsx` success `emerald-800/emerald-50` | 7.29:1 | ✅ |
| `badge.tsx` warning `amber-800/amber-50` | 6.84:1 | ✅ |
| `badge.tsx` danger `rose-800/rose-50` | 7.30:1 | ✅ |
| `data-state.tsx` ErrorState `rose-900/rose-50` | 8.71:1 | ✅ |
| admin nav badge: bijela / `rose-600 #E11D48` | 4.70:1 | ✅ |
| **`brand-gold` `#D4A843` kao tekst na bijeloj** | **2.21:1** | ❌ zato postoji `gold-text` |
| **`brand-gold` `#D4A843` kao pozadina + bijeli tekst** | **2.21:1** | ❌ ne koristiti |
| `brand-gold-text #8A641E` / champagne `#F5E6CC` | 4.35:1 | ⚠️ prolazi 3:1, **ne** 4.5:1 → aktivni nav item je 15px/600 → **nije „veliki tekst“** po WCAG (treba ≥18.66px bold ili 24px) → **mora se korigovati u fazi 0** |
| `brand-gold-text #8A641E` / champagne-20 na bijeloj (`~#FDFBF7`) | 5.18:1 | ✅ (ovo je trenutno stvarno stanje — `bg-brand-champagne/20`) |

---

## 4. Duplirani obrasci

### 4.1 `window.confirm` — **14 poziva u 8 fajlova** (prompt navodi 5 fajlova)

| Fajl:linija | Ključ | Modul |
|---|---|---|
| `pages/Users.tsx:432` | (složena poruka, privremena lozinka) | Users |
| `pages/Users.tsx:516` | `users.confirmDeactivate` | Users |
| `pages/Users.tsx:629` | `users.confirmRemoveRole` | Users |
| `pages/Services.tsx:356` | `services.confirmDeleteCategory` | Services |
| `pages/Services.tsx:367` | `services.confirmDeleteSubcategory` | Services |
| `pages/Gallery.tsx:161` | `gallery.admin.deleteCategoryConfirm` | Gallery |
| `pages/Gallery.tsx:197` | `gallery.admin.deleteImageConfirm` | Gallery |
| `pages/Reviews.tsx:77` | `reviews.deleteConfirm` | Reviews |
| `pages/Blog.tsx:97` | `blog.admin.deleteConfirm` | Blog |
| `pages/Blog.tsx:135` | `blog.admin.deleteCommentConfirm` | Blog |
| `pages/Salon.tsx:264` | `salon.confirmDeleteHoliday` | Salon |
| `pages/EmailSettings.tsx:757` | `emailSettings.campaigns.retryConfirmAtLeastOnce` | Email |
| `pages/EmailSettings.tsx:880` | `emailSettings.smtp.clearPasswordConfirm` | Email |
| `features/media-consent/media-consent-panel.tsx:131` | `mediaConsent.confirmRevoke` | ⚠️ **dijeljeno s javnim** — ne dirati bez dokaza |

Postoji već **`features/finance/components/confirm-dialog.tsx`** (sa fokusom, `aria-busy`, optional reason) — konsolidacija, ne nova komponenta.

### 4.2 Tabele

`table.app-table` koristi **20 fajlova**. `index.css` definiše:
`table.app-table { @apply w-full table-fixed text-sm }` i `.app-table-wrap { @apply w-full min-w-0 overflow-x-auto xl:overflow-x-visible }`.

| Provjera | Rezultat |
|---|---|
| `<th>` ukupno (16 fajlova) | 129 |
| `scope="col"` / `scope="row"` | **17** → većina `<th>` **nema scope** (1.3.1) |
| `<caption>` | **3** → gotovo nijedna tabela nema caption/aria-label (1.3.1) |
| `aria-sort` | **2 fajla** (`finance/expense/expense-table.tsx`, `finance/income/income-entries-table.tsx`) → ostale tabele sa sortiranjem nemaju `aria-sort` (4.1.2) |
| responzivni „card“ prikaz ispod 640px | **ne postoji** — samo `overflow-x-auto` (1.4.10 rizik) |
| `xl:overflow-x-visible` | ⚠️ na `xl` gubi horizontalni skrol → potencijalno odsijecanje; **nije verifikovano u renderu** |

### 4.3 Stanja (loading / empty / error)

Postoji **`features/finance/components/data-state.tsx`** sa `TableSkeleton` (`role="status"` + `sr-only`), `EmptyState`, `ErrorState` (`role="alert"` + retry).
**Koristi se samo u Finance.** Ostali moduli imaju svoje ad-hoc varijante (npr. `Dashboard.tsx` vraća običan `<div>` sa „Učitavanje...“, bez `role="status"`).

### 4.4 Stat kartice

`features/finance/components/summary-cards.tsx` (`SummaryCards`) — finance-only.
`features/daily-log/entry-stats.tsx`, `features/dashboard/finance-stats.tsx`, `features/dashboard/ops-stats.tsx`, `pages/ClientAnalytics.tsx` — svaki svoj markup.

### 4.5 Dijalozi / drawer-i

`features/finance/components/responsive-dialog.tsx` (Dialog na desktopu, Drawer na mobitelu, `useIsMobile` @767px) — finance-only.
Ostali moduli koriste sirovi `Dialog`/`Drawer` (32 fajla koristi `ui/dialog`, 7 `ui/drawer`).

### 4.6 Filteri

`features/reservations/components/reservation-filters.tsx`, `features/daily-log/entry-filters.tsx`, `features/finance/components/book-period-picker.tsx`,
inline u `Users.tsx`, `Services.tsx`, `ClientAnalytics.tsx`, `Loyalty.tsx`, `Reviews.tsx`, `Notifications.tsx`. **Nema zajedničkog `FilterBar`-a.**

---

## 5. A11Y gap analiza (pregled koda + postojećih testova)

### 5.1 Šta već postoji (pozitivno)

| Stavka | Dokaz |
|---|---|
| `<html lang>` prati i18n | `seo/useDocumentLang.ts` + `i18n.on('languageChanged')` → **3.1.1 ✅ u kodu** |
| Jedinstven `<title>` po ruti | `seo/SeoRouteDefaults.tsx` + `react-helmet-async` → **2.4.2 🟡** (admin/stylist rute dobijaju `noindex` i fallback naslov, ali **ne postoji mapa naslova po admin ruti** → naslovi dolaze iz SEO postavki ili `seo.defaultTitle`) |
| `role="status"` / `aria-live` | **143 pojavljivanja u 58 fajlova** → 4.1.3 djelimično pokriven |
| Fokus prsten na primitivima | `ui/button`, `ui/input`, `ui/badge`, `ui/otp-input` imaju `focus-visible:ring-*` |
| Route loading fallback | `role="status"` + `aria-live="polite"` + `aria-atomic` + `aria-busy` (testirano) |
| Drawer-i imaju pristupačno ime | `DialogTitle` + `sr-only` (testirano u `navigation-drawer-accessibility`) |
| `autocomplete` | Login/Register/Reset/ForceChange/OnboardingEmail/Profile — **3.3.8 djelimično** |
| OTP podržava paste | `ui/otp-input.tsx` → `handlePaste` cijelog koda ✅; `Profile.tsx:762` ima `autoComplete="one-time-code"` ✅; **ali `OtpInput` sam nema `autocomplete` atribut** → dopuniti |
| 155 test fajlova / 142 skripte | 38 `*-accessibility.test.mjs` |

### 5.2 Šta nedostaje (gap po kriteriju)

| WCAG | Gap | Dokaz |
|---|---|---|
| **2.4.1 Bypass blocks** | **Nema skip linka nigdje** | grep `skip` / `preskoči` → **0 pogodaka** u `src` |
| **2.4.7 / 2.4.13 Focus visible** | `focus-visible` se pojavljuje **svega 40×** u cijelom `src`; `ui/dropdown-menu` koristi `outline-none` + `focus:bg-slate-100` **bez prstena** → fokus samo promjenom pozadine | grep |
| **1.3.1 Info & relationships** | `<th>` bez `scope` (112 od 129), `<caption>` 3×, `nav` bez `aria-label` u admin shellu, `<h1>` nedostaje na **8 ekrana** (`ClientAnalytics`, `Finance`*, `ForceChangePassword`, `NotFound`, `Settings`*, `SettingsAppearance/Operations/Seo`*) — *ova četiri imaju h1 u `settings-shell.tsx`, `Finance` u `finance-page.tsx` → **stvarno bez h1: `ClientAnalytics`, `ForceChangePassword`, `NotFound`**; `Salon.tsx` ima **2 h1** | grep |
| **2.4.3 / focus-on-navigate** | Nema mehanizma koji vraća fokus na `h1` poslije promjene rute | grep `tabIndex={-1}` / `.focus()` → nema u layoutima |
| **2.4.11 Focus Not Obscured** | `header` je `sticky top-0 z-20` u oba layouta; **nema** `scroll-padding-top` / `scroll-margin` nigdje | grep |
| **2.5.7 Dragging** | `DragAndDropCalendar` sa `onEventDrop` + `onEventResize` (`ReservationScheduler.tsx:653,661`); `email-visual-editor.tsx` `draggable` blokovi (line 134) — **nema tastaturske alternative** | grep |
| **2.5.8 Target Size** | `size="icon"` = `h-10 w-10` (40px) ✅ ≥24; **61× `h-8 w-8` (32px)** i `h-7 w-7` (28px) — prolaze minimum, ispod AAA 44px; `admin-chrome` avatar trigger `h-9 w-9` (36px) | grep |
| **1.4.10 Reflow** | Nema „card“ prikaza tabela ispod 640px; `table-fixed` + `overflow-x-auto` | `index.css` |
| **1.4.11 Non-text contrast** | `--input`/`--border` 1.23:1 (vidi §3.4) | proračun |
| **1.4.1 Use of color** | `StatusBadge` = `Badge` sa **samo bojom** (`success/warning/danger/brand/secondary`) — tekst postoji, ali **nema ikone**; `SummaryCards` `tone` (positive/negative) mijenja **samo boju** | `ui/badge.tsx`, `summary-cards.tsx` |
| **2.2.2 Pause/stop/hide** | `admin-layout.tsx:63` — `setInterval(load, 60_000)` za `blog/comments/pending-count`, **bez pause kontrole**; `use-reservation-detail-status.ts:71` — 30s tick | grep |
| **1.4.13 Content on hover/focus** | `components/ui/tooltip.tsx` postoji ali **0 upotreba** → nema tooltipova; dropdown-ovi su Radix (persist on click) | grep |
| **3.2.6 Consistent help** | **Nema** „Pomoć“/kontakt elementa u shellu | grep |
| **3.3.7 Redundant entry** | Nije sistematski provjereno; kandidati: `workbook-new-entry` (klijent+usluga), `Users` forme | — |
| **3.3.4 Error prevention** | 14 `window.confirm` (vidi §4.1) — native dialog **nema** fokus trap ni vraćanje fokusa | grep |
| **Forced colors** | **0** `forced-colors` media upita u `src` | grep |
| **Grafikoni** | `pages/Analytics.tsx` — `ResponsiveContainer`/`LineChart`/`Tooltip`/`Legend`, **bez** tekstualnog sažetka, tabele podataka, `aria-label` ili `role="img"` → 1.1.1 ❌ | grep |
| **Kalendar** | `ReservationScheduler.tsx` 1196 ln, `toolbar={false}` (custom kontrole), `react-big-calendar` — **nema liste termina kao alternative** | čitanje koda |
| **Paginacija** | `nav` + `aria-current` → **`aria-current` se pojavljuje 0 puta u cijelom `src`** | grep |
| **`aria-current="page"` u navigaciji** | **0** — admin nav koristi samo klasu | `admin-nav-menu.tsx` |

### 5.3 Šta postojeći testovi **ne** pokrivaju

- Nijedan test ne provjerava skip link, `aria-current`, `scope`, `caption`, `scroll-padding`, target size, forced-colors, `prefers-reduced-motion` (osim app-logo animacije).
- **Nema rendered/axe/screen-reader testa** → potvrđuje `A11Y-01`: *„ostaje otvoren do rendered/browser/device/manual acceptance“* ([`docs/audit/FINDINGS.md`](../../../docs/audit/FINDINGS.md), A11Y-01).
- **ESLint nije instaliran** — `package.json` ima `"lint": "eslint . --ext ts,tsx"` ali `eslint` **nije u `devDependencies`** → `npm run lint` ne može proći. Potvrđuje napomenu iz audita.

---

## 6. Upotreba dijeljenih komponenti na javnom sajtu („zaštićeno“)

Izmjereno grep-om po `pages/public`, `features/public-catalog`, `features/shell/public`, `Profile`, `Login`, `Register`, `ResetPassword`:

| Dijeljeni resurs | Upotreba na javnom sajtu | Upotreba u dashboardu | Politika |
|---|---:|---:|---|
| `components/ui/button.tsx` | 15 | 104 | **ne mijenjati postojeće varijante**; nove = nove `cva` varijante |
| `components/ui/input.tsx` | 7 | 50 | ⚠️ okvir kontrole mora na 3:1 → **admin-scoped varijanta** ili globalna promjena uz dokaz |
| `components/ui/card.tsx` | 7 | 53 | ne mijenjati |
| `components/ui/label.tsx` | 6 | 57 | ne mijenjati |
| `components/ui/avatar.tsx` | 4 | 8 | ne mijenjati |
| `components/ui/textarea.tsx` | 2 | 28 | kao `input` |
| `components/ui/dialog.tsx` | 2 | 32 | ne mijenjati |
| `components/ui/dropdown-menu.tsx` | 1 | 4 | ⚠️ fokus prsten nedostaje → dopuna je **nekvarljiva** (dodaje, ne mijenja) |
| `components/ui/drawer.tsx` | 1 | 7 | ne mijenjati |
| `components/BeforeAfterSlider.tsx` | ✅ (`before-after-spotlight`) | ✅ (`Gallery`, `Services`, `ServiceWorkGallery`, `workbook-detail`) | ne mijenjati bez dokaza |
| `components/media-image.tsx` | ✅ | ✅ | ne mijenjati |
| `components/brand/app-logo.tsx`, `uploaded-brand-logo.tsx` | ✅ | ✅ (admin header) | ne mijenjati |
| `styles/globals.css` | ✅ (globalno) | ✅ | **tokeni se samo dodaju**, postojeće vrijednosti se ne mijenjaju bez dokaza |
| `index.css` (`app-table`) | ✅ | ✅ | ⚠️ promjena `table-fixed`/`xl:overflow-x-visible` utiče na obje strane |
| `lib/toast/toaster.tsx` | ✅ | ✅ | `role="status"` provjera (Sonner već ima live region — **nije verifikovano u renderu**) |

**`components/ui/tooltip.tsx` → 0 upotreba bilo gdje** = mrtav kod (kandidat za brisanje u fazi 13, uz provjeru).

---

## 7. Zavisnosti i ograničenja

### 7.1 Bundle

`scripts/check-bundle-budget.mjs` (pokreće se kao dio `npm run build`):

- inicijalni JS/CSS ≤ **300 KiB gzip** → trenutno **269.0 KiB** (31 KiB slobodno)
- `Analytics` ruta ≤ 140 KiB → **114.3 KiB**
- `ReservationsCalendar` ruta ≤ 125 KiB → **95.1 KiB**
- `recharts`, `rbc-calendar`, `rbc-time-content`, `react-big-calendar` **ne smiju** u inicijalni entry
- route-level `lazy()` je obavezan (čuva `src/app/route-code-splitting.test.mjs`)

Vite upozorenje „Some chunks are larger than 500 kB“ je **postojeće** (`index-*.js` 824 kB raw / 260.7 kB gzip) i nije CI gate.

### 7.2 i18n

- `bs.json` / `en.json`: **2575 leaf ključeva** svaki, strict parity **PASS**
- gate: `scripts/check_i18n.py --strict` (CI job `repo-checks`)
- nema hardkodiranih stringova, uključujući `aria-label`, `title`, `alt`, `placeholder`, toast, tooltip

### 7.3 Testovi koje redizajn **sigurno** dotiče

31 test fajl asertuje tačne `className` stringove (**57 asertacija**). Najrizičniji:

| Test | Šta asertuje |
|---|---|
| `features/settings/admin-settings-accessibility.test.mjs` | doslovno `<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">` |
| `features/shell/navigation-drawer-accessibility.test.mjs` | doslovno `<DrawerContent id="admin-mobile-navigation" className="p-5">` + import liniju |
| `features/finance/components/data-state-accessibility.test.mjs` | `className` u `data-state.tsx` |
| `features/reservations/reservation-list-accessibility.test.mjs` | `app-table` klase |
| `features/daily-log/daily-log-dialog-accessibility.test.mjs` | `className` u dijalogu |

Pravilo: **test se ažurira da zadrži istu garanciju** (npr. umjesto `text-slate-900` traži semantički `text-foreground`), uz obrazloženje u `CHANGELOG.md`. Nijedan test se ne briše i ne slabi.

### 7.4 Podatkovni sloj

- **29 fajlova** koristi direktan Axios (`api.get/post/...`) + `useEffect`
- **16 fajlova** koristi TanStack Query (`useQuery`/`useMutation`) — finance, stylist-portal, stylist-workbook, `Users`, `Debtors`
- `query/keys.ts` sadrži **samo** `auth.profile` i `settings.public` → ostali `queryKeys` su inline po modulima

**Pravilo za ETAPU B:** migracija sa Axios-a na Query **nije** dio redizajna (mijenja cache ponašanje = rizik po paritet). Ostavlja se kao zaseban nalaz/preporuka.

### 7.5 Polling / socket

| Lokacija | Mehanizam |
|---|---|
| `admin-layout.tsx:63` | `setInterval` 60s → `GET /api/blog/comments/pending-count` (**2.2.2**) |
| `use-reservation-detail-status.ts:71` | `setInterval` 30s (time tick) |
| `features/dashboard/use-dashboard-data.ts:113-117` | 5 socket event-a → reload |
| `features/reservations/use-reservation-socket-refresh.ts` | socket → reload |
| `features/daily-log/use-daily-log-data.ts:71-72` | socket + `daily-log:updated` |
| `context/SettingsContext.tsx:20` | `useSocketEvent` |
