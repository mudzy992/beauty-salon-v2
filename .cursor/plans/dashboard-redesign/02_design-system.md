# Faza A2 — Dizajn sistem

**Pravilo iz prompta §4: paleta se zadržava.** Ovo nije novi brand — ovo je **semantički sloj** preko postojeće palete.
Svi omjeri kontrasta u ovom dokumentu su **izračunati** istim algoritmom kao [`scripts/check_ui_contrast.py`](../../../scripts/check_ui_contrast.py)
(WCAG 2.x relativna luminanca), a ne prepisani iz reference. Tamo gdje se moj proračun i referenca slažu — naznačeno je.

---

## 1. Principi

1. **Ne mijenjamo postojeće tokene** (`--background`, `--foreground`, `--border`, `--input`, `--primary`…). Javni sajt ih koristi; promjena bi bila vizuelna regresija.
2. **Dodajemo nove semantičke tokene** koji se mapiraju na postojeću paletu. Dashboard koristi nove; javni sajt nastavlja sa starima.
3. **Jedina dozvoljena korekcija boje** je `--input`/okvir kontrole (1.4.11). Radi se **kao novi token** `--control-border`, ne kao izmjena `--input`.
4. **Runtime brand override ostaje netaknut** — `--brand-primary`, `--brand-accent` i derivacije iz `utils/brand-colors.mjs` se i dalje čitaju; nijedna brand boja se ne hardkodira u komponente.
5. Boja **nikad** nije jedini nosilac informacije → svaki status ima tekst **i** ikonu.

## 2. Semantički tokeni (boje)

Dodaje se u `frontend/src/styles/globals.css` (`:root` + `.dark`) i u `tailwind.config.js` kao `theme.extend.colors.*`.

### 2.1 Light

| Token | Vrijednost | Izvedeno iz | Kontrast (par) | Prag | Status |
|---|---|---|---:|---|---|
| `--surface` | `0 0% 100%` (#FFFFFF) | = `--card` | — | — | — |
| `--surface-muted` | `240 5% 96%` (#F4F4F6) | ≈ `--muted` | — | — | — |
| `--surface-sunken` | `210 40% 98%` (#F8FAFC) | referentni `--bg` | — | — | — |
| `--text` | `222.2 84% 4.9%` (#020817) | = `--foreground` | 20.01:1 / surface | 4.5 | ✅ (AAA ✅) |
| `--text-muted` | `#67676F` | = `--muted-foreground` | **5.61:1** / surface · 5.36:1 / sunken · **5.10:1** / surface-muted | 4.5 | ✅ (AAA ❌ 7:1) |
| `--line` | `214.3 31.8% 91.4%` (#E2E8F0) | = `--border` | dekorativna linija, **nije** okvir kontrole | — | ✅ |
| **`--control-border`** | **`#767B86`** | **NOVO** (korekcija 1.4.11) | **4.24:1** / surface · 4.06:1 / sunken | **3.0** | ✅ |
| `--on-primary` | `0 0% 100%` | = `--primary-foreground` | 11.56:1 / `--brand-primary` #632238 | 4.5 | ✅ |
| `--accent-text` | `var(--brand-accent-text)` | postojeći | 5.35:1 / surface | 4.5 | ✅ |
| `--nav-active-bg` | `#F5E6CC` | `brand.champagne` | — | — | — |
| `--nav-active-fg` | `var(--brand-primary-text)` #632238 | postojeći | **9.40:1** / champagne | 4.5 | ✅ |
| `--focus-ring` | `var(--brand-primary-ring)` #632238 | postojeći | **11.56:1** / surface | 3.0 | ✅ (3px + offset 2px) |
| `--danger` | `#D81313` | ≈ postojeći `destructive` | 5.22:1 / bijela | 4.5 | ✅ |
| `--on-danger` | `0 0% 100%` | — | 5.22:1 / danger | 4.5 | ✅ |
| `--ok-fg` / `--ok-bg` | `#166534` / `#DCFCE7` | NOVO | **6.49:1** | 4.5 | ✅ |
| `--warn-fg` / `--warn-bg` | `#7A3E00` / `#FEF3C7` | NOVO | **7.49:1** | 4.5 | ✅ |
| `--bad-fg` / `--bad-bg` | `#991B1B` / `#FEE2E2` | NOVO | **6.80:1** | 4.5 | ✅ |
| `--info-fg` / `--info-bg` | `#1E40AF` / `#DBEAFE` | NOVO | **7.15:1** | 4.5 | ✅ |
| `--neutral-fg` / `--neutral-bg` | `#3F3F46` / `#E4E4E7` | NOVO | **8.23:1** | 4.5 | ✅ |

### 2.2 Dark (`.dark` — vidi Q1: tema se trenutno ne može aktivirati)

| Token | Vrijednost | Kontrast | Prag | Status |
|---|---|---:|---|---|
| `--surface` | `240 5% 12%` (#1D1D20) | — | — | — |
| `--surface-muted` | `240 4% 20%` (#313135) | — | — | — |
| `--surface-sunken` | `240 5% 10%` (#18181B) | — | — | — |
| `--text` | `210 40% 98%` (#F8FAFC) | 16.07:1 / surface | 4.5 | ✅ |
| `--text-muted` | `#94A3B8` | **6.56:1** / surface | 4.5 | ✅ |
| `--line` | `240 4% 20%` (#313135) | dekorativno | — | ✅ |
| **`--control-border`** | **`#6B7280`** | **3.48:1** / surface | 3.0 | ✅ |
| `--on-primary` | `#1A1A1A` | 9.58:1 / `--primary` #E0BB7B | 4.5 | ✅ |
| `--accent-text` | `var(--brand-accent-text-dark)` #D4A843 | 7.59:1 / surface | 4.5 | ✅ |
| `--nav-active-bg` / `--nav-active-fg` | `#3A1B27` / `#E5B3C5` | **8.48:1** | 4.5 | ✅ |
| `--focus-ring` | `var(--brand-primary-ring)` #E5B3C5 | 9.28:1 / surface | 3.0 | ✅ |
| `--danger` / `--on-danger` | `#F87171` / `#1A1A1A` | 6.29:1 | 4.5 | ✅ |
| status ok/warn/bad/info/neutral | `#86EFAC`/`#123A24` · `#FCD34D`/`#40300A` · `#FCA5A5`/`#4A1818` · `#93C5FD`/`#142A55` · `#D4D4D8`/`#3A3A40` | 9.03 · 8.85 · 7.71 · 7.80 · 7.64 | 4.5 | ✅ |

> **Slaganje sa referencom:** svih 29 parova iz tabele tokena u `dashboard-reference.html` sam nezavisno preračunao i **svi se poklapaju** (20.01, 16.07, 5.61, 5.36, 11.56, 9.58, 5.35, 7.59, 9.40, 8.48, 4.24, 3.48, 11.56, 9.26, 5.22, 6.29, 6.49/7.49/6.80/7.15/8.23, 9.03/8.85/7.71/7.80/7.64).

### 2.3 Tokeni koji se **ne** mijenjaju, ali se moraju znati

| Token | Problem | Odluka |
|---|---|---|
| `--input` = `--border` = `#E2E8F0` | **1.23:1** na bijeloj → ne prolazi 1.4.11 | Ostaje za **dekorativne** granice (kartice, separatori). Okviri **kontrola** prelaze na `--control-border`. Time javni sajt ostaje vizuelno identičan. |
| `Button variant="destructive"` = `bg-red-600` (hardkodirano) | ne koristi `--destructive` | U fazi 0 dodaje se **nova** admin varijanta `danger` koja koristi `--danger`/`--on-danger`. Postojeća `destructive` varijanta se ne dira (koristi je javni sajt). |
| `brand-gold` `#D4A843` | 2.21:1 kao tekst na bijeloj; 2.21:1 kao pozadina sa bijelim tekstom | **Nikad** kao tekst/pozadina sa bijelim. Koristi se `gold-text`/`gold-ring` (već postoji). |
| `features/settings/*` hex paleta (`#49332d`, `#9d735d`, `#9b735f`, …) | paralelna „smeđa“ paleta van brand identiteta; `#9b735f` 4.19:1, `#9d735d` 4.16:1 | U fazi 10 zamjenjuje se semantičkim tokenima. `#9b735f` kao **focus ring** prelazi na `--focus-ring` (11.56:1). |

### 2.4 AAA opcija (odluka vlasnika — Q5)

Za **1.4.6 (7:1)** na sporednom tekstu, `--text-muted` bi morao postati tamniji: `#55555C` = **7.39:1** (samo svjetlina, ista nijansa).
Preporuka: **primijeniti u dashboardu** (admin-scoped `--text-muted` override), javni sajt ostavlja `#67676F`. Bez toga 1.4.6 ostaje ❌/➖ za sporedni tekst.

## 3. Ostali tokeni

### 3.1 Razmaci (postojeća Tailwind skala, bez novih vrijednosti)

| Uloga | Vrijednost | Primjer |
|---|---|---|
| `--space-page` | `p-4` (mobile) / `p-6` (≥sm) | `<main>` padding |
| `--space-section` | `space-y-5` / `gap-5` | između sekcija stranice |
| `--space-card` | `p-4` | unutar kartice |
| `--space-field` | `gap-1.5` label↔input, `gap-4` field↔field | forme |
| `--space-inline` | `gap-2` | dugmad u redu akcija |

### 3.2 Radijusi i sjene

| Token | Vrijednost | Upotreba |
|---|---|---|
| `--radius` | `0.5rem` (postojeći) | kartice, inputi, dijalozi |
| `rounded-full` | — | badge, avatar, pill dugmad (postojeći `button.tsx`) |
| `shadow-soft` | `0 1px 2px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.08)` (postojeći) | kartice, dijalozi |

### 3.3 Tipografija (zadržava se sistemski stack iz `tailwind.config.js`)

| Nivo | Klasa | Upotreba |
|---|---|---|
| `h1` | `text-2xl font-semibold tracking-tight` (28px) | jedan po stranici |
| `h2` | `text-lg font-semibold` (18px) | sekcije, naslovi tabela |
| `h3` | `text-base font-semibold` (16px) | podsekcije, kartice stanja |
| body | `text-sm` (14px) / `text-[15px]` | osnovni tekst |
| muted | `text-sm text-[--text-muted]` | opisi, pomoćni tekst |
| broj | `tabular-nums` | iznosi, datumi, brojači |

**Zabranjeno:** `text-[11px]` za nosivi tekst (trenutno u `admin-nav-menu.tsx` za naslove sekcija). Minimum za nosivi tekst: **12px (`text-xs`)** uz `--text-muted` ≥4.5:1.

### 3.4 Z-index

| Sloj | Vrijednost |
|---|---|
| sticky header | `z-20` (postojeće) |
| dropdown/popover | `z-50` (Radix default) |
| drawer/dialog overlay | `z-50` (Radix) |
| toast | `z-50` (Sonner) |
| skip link | `z-[100]` |

### 3.5 Motion

| Pravilo | Implementacija |
|---|---|
| Hover mijenja **samo** boju pozadine | bez `transform`/`scale` na hover |
| `prefers-reduced-motion: reduce` | globalni `@media` blok u `globals.css` koji gasi `animation`/`transition`/`scroll-behavior` (trenutno pokriva samo `app-logo`) |
| `active:scale-[0.99]` u `button.tsx` | ⚠️ 2.5.4 Motion actuation — aktivacija je na `click`, ne na animaciji → ✅; ali u admin varijanti se uklanja radi konzistentnosti |
| `framer-motion` | **ne koristi se u dashboardu** (potvrđeno grep-om) → nema novih animacija |

## 4. Katalog komponenti

Legenda: **K** = koristi se postojeće bez izmjene · **P** = proširuje se (nova varijanta, postojeće netaknuto) · **N** = novo (admin-scoped)

| Komponenta | Status | Izvor / lokacija | a11y ugovor | Tastatura |
|---|---|---|---|---|
| `Button` | **P** | `components/ui/button.tsx` | vidljiv tekst; ikona-dugme → `aria-label`; `aria-busy` pri čekanju; disabled **ostaje čitljiv** (`--text-muted` + isprekidan okvir, bez `opacity-50`) | `Tab`/`Enter`/`Space`; meta ≥ 44px (AAA) |
| `Input` / `Textarea` / `Select` | **P** | `components/ui/input.tsx` | vidljiv `<label>`; `aria-describedby` za hint+grešku; `aria-invalid`; `autocomplete` gdje je primjenjivo; okvir `--control-border` 3:1 | standardno |
| `Card` | **K** | `components/ui/card.tsx` | — | — |
| `Badge` | **P** | `components/ui/badge.tsx` | **tekst + ikona + boja** (1.4.1); `--*-fg`/`--*-bg` parovi ≥4.5:1; okvir `currentColor` | — |
| `Dialog` / `Drawer` | **K** | `components/ui/*` | Radix fokus trap, `Esc`, povrat fokusa na okidač, `aria-labelledby`/`aria-describedby` | `Tab` ciklus unutra, `Esc` izlaz |
| `DropdownMenu` | **P** | `components/ui/dropdown-menu.tsx` | **dodati fokus prsten** (trenutno `outline-none` + samo `focus:bg-*`) | Radix strelice |
| `Tabs` | **K** | `components/ui/tabs.tsx` | Radix; `?tab=` deep-link ostaje | strelice |
| `Switch` | **K** | `components/ui/switch.tsx` | Radix `role="switch"` + `aria-checked` | `Space` |
| `OtpInput` | **P** | `components/ui/otp-input.tsx` | **dodati** `autocomplete="one-time-code"`, `inputMode="numeric"`; paste cijelog koda već radi; `aria-label` po polju postoji | Backspace/strelice rade |
| `Tooltip` | ⚠️ | `components/ui/tooltip.tsx` — **0 upotreba** | ako se uvede: dismissible/hoverable/persistent (1.4.13) | — |
| **`PageHeader`** | **N** | `features/shell/admin/ui/page-header.tsx` | jedan `h1` sa `tabIndex={-1}`; breadcrumb `<nav aria-label>`; opis; slot za primarne akcije | fokus na `h1` nakon navigacije (2.4.3) |
| **`FilterBar`** | **N** | `features/shell/admin/ui/filter-bar.tsx` | `<form role="search" aria-label>`; vidljive labele; `aria-controls` prema tabeli; reset dugme | `Enter` submit |
| **`DataTable`** | **N** (konsolidacija `app-table`) | `features/shell/admin/ui/data-table.tsx` | `caption` (ili `aria-label`); `th scope="col"`; `aria-sort` na `th` + dugme unutra; `<time datetime>`; jedinstvena imena akcija po redu („Obriši – {ime}“); `role="region" tabindex="0"` oko horizontalno pomjerljivog omotača; ispod 640px → kartice sa `data-label` | sortiranje dugmetom; skrol region `Tab`-om |
| **`TablePagination`** | **N** | isto | `<nav aria-label>`; `aria-current="page"` (**trenutno 0 upotreba u repo-u**); „Stranica X od Y“ | `Tab` |
| **`StatCard` / `StatGrid`** | **N** (konsolidacija `SummaryCards`, `entry-stats`, `finance-stats`, `ops-stats`) | `features/shell/admin/ui/stat-card.tsx` | `<ul>`/`<li>`; labela+vrijednost+delta u jednom čitljivom nizu; `tabular-nums`; trend = **tekst + ikona**, ne samo boja | — |
| **`StatusBadge`** | **P** (`Badge` varijante) | `components/ui/badge.tsx` | mapiranje statusa → `{label, icon, tone}`; **boja nikad sama** | — |
| **`EmptyState` / `ErrorState` / `TableSkeleton`** | **P** (postoje u `features/finance/components/data-state.tsx`, koriste se samo u Finance) | promovisati u `features/shell/admin/ui/data-state.tsx` | `role="status"`+`sr-only` za skeleton; `role="alert"` za grešku; retry dugme | `Tab` do retry |
| **`ConfirmDialog`** | **P** (postoji `features/finance/components/confirm-dialog.tsx`) | promovisati u `features/shell/admin/ui/confirm-dialog.tsx` | `aria-labelledby`/`aria-describedby`; **„Odustani“ prvi fokusiran** (3.3.4); `aria-busy`; fokus se vraća na okidač; zamjenjuje svih 14 `window.confirm` | `Esc`, `Tab` trap |
| **`ResponsiveDialog`** | **P** (postoji u finance) | promovisati | Dialog ≥768px / Drawer ispod | — |
| **`FormSection` / `Field`** | **N** | `features/shell/admin/ui/form-section.tsx` | `fieldset`/`legend` za grupe; vidljiv `label`; `aria-describedby`; `required` vizuelno **i** programski; sažetak grešaka sa linkovima na polja za duge forme | — |
| **`SkipLink`** | **N** | `features/shell/admin/ui/skip-link.tsx` | prvi u tab redu; `href="#main"`; `z-[100]` (2.4.1) | `Tab` |
| **`ChartFigure`** | **N** | `features/analytics/ui/chart-figure.tsx` | `role="img"` + `aria-label` **ili** `<figure>` sa `<figcaption>`; **tabela podataka kao alternativa**; pristupačna legenda; tooltip dostupan tastaturom | `Tab` kroz podatkovnu tabelu |
| **`AccessibleCalendar`** | **P** | `features/reservations/components/*` | lista/agenda alternativa; statusi tekst+ikona; **2.5.7 alternativa za drag&drop** (dugme „Promijeni termin“ → postojeći drawer) | lista = potpuno tastaturna |

## 5. Shell specifikacija

### 5.1 Landmark-i i redoslijed (oba shell-a)

```
<a class="skip" href="#main">        ← 2.4.1, prvi u tab redu
<header>                             ← banner
  [Meni (mobile disclosure)]  [brand]   …   [jezik] [Pomoć] [korisnički meni]
<div class="layout">
  <aside> <nav aria-label="Glavna navigacija"> … </nav> </aside>   ← desktop
  <main id="main" tabindex="-1">                                    ← fokus nakon navigacije
```

| Zahtjev | Admin | Stylist |
|---|---|---|
| Skip link | ❌ nema → **dodati** | ❌ nema → **dodati** |
| `<nav aria-label>` | ❌ nema → dodati | ❌ nema (dva `<nav>` bez labele) → dodati |
| `aria-current="page"` | ❌ 0 → dodati | ❌ 0 → dodati |
| `main` landmark | ✅ `<main>` | ✅ `<main>` |
| `main tabindex="-1"` + fokus na navigaciju | ❌ → dodati | ❌ → dodati |
| Jedinstven `<title>` po ruti | ⚠️ `SeoRouteDefaults` daje `seo.defaultTitle` za admin rute → **dodati mapu naslova po ruti** (2.4.2) | isto |
| Language switcher | ✅ `LanguageSwitcher` u headeru | ✅ |
| Consistent help (3.2.6) | ❌ → **dodati „Pomoć“ na isto mjesto u headeru** (link na `/kontakt` ili postavke) | ❌ → dodati |
| `scroll-padding-top` (2.4.11) | ❌ → `html { scroll-padding-top: calc(header-h + 1rem); scroll-padding-bottom: 5rem }` | isto |
| Polling sa pause kontrolom (2.2.2) | ⚠️ 60s `setInterval` za blog badge → dodati `document.visibilityState` guard **ili** ostaviti i obrazložiti kao ➖ (badge nije „moving content“ koji ometa) — **odluka u fazi 0** | ✅ socket-based |

### 5.2 Mobilni disclosure vs drawer

Trenutno: admin koristi **Radix Drawer** (fokus trap, `Esc`, `aria-expanded`/`aria-controls` — testirano).
Referenca koristi običan `hidden`/`aria-expanded` disclosure.
**Odluka:** zadržati **Drawer** (jači a11y ugovor, već testiran u `navigation-drawer-accessibility.test.mjs`). Reference je ilustracija, prompt kaže da je HTML mjerodavan za izgled/strukturu, ne za zamjenu boljeg postojećeg obrasca.

### 5.3 Stylist shell — ujednačavanje

`StylistLayout.tsx` (162 ln) ima **dva `<nav>`** (`sm:hidden` horizontalni skrol + `hidden sm:flex`) — duplirani markup, isti `navItems`.
Cilj: jedan izvor navigacije, responzivan; isti `SkipLink`, `aria-current`, `PageHeader`, focus-on-navigate.
**Ne mijenja se:** sadržaj navigacije (inbox, workbook, schedule, debts, stats), `LanguageSwitcher`, korisnički meni, „Switch to client“, `useStylistPortalSocketRefresh`.

## 6. Predlog nove informacione arhitekture

### 6.1 Navigacijske grupe

| Trenutno (7 sekcija) | Predlog (6 sekcija) | Obrazloženje |
|---|---|---|
| Pregled: Početna, Analitika | **Pregled:** Početna, **Analitika** (3 taba) | Analitika postaje hub |
| Operativa: Rezervacije, Dnevna knjiga | **Operativa:** Rezervacije, Dnevna knjiga | bez izmjene |
| Salon: Salon, Usluge, Frizeri | **Salon:** Salon, Usluge, Frizeri | bez izmjene |
| Finansije: Knjige, Lojalnost | **Finansije:** Knjige i dužnici, Lojalnost | Lojalnost ostaje (ima smisla: bodovi = novčana vrijednost) |
| Ljudi: Korisnici | **Ljudi:** Korisnici | bez izmjene |
| Sadržaj: Blog, Galerija, Recenzije | **Sadržaj:** Blog, Galerija, Recenzije | bez izmjene ruta; zajednički **obrazac stranice** |
| Sistem: Postavke, AppReleases, Notifikacije, Email | **Sistem:** Postavke (hub), Notifikacije | Postavke hub sa podnavigacijom |

### 6.2 Mapa objedinjavanja (stari URL → novi) — **traži odobrenje (Q3)**

| # | Šta se spaja | Novi URL | Stari URL-ovi (ostaju kao `<Navigate replace>`) | Šta se **ne** mijenja | Rizik |
|---|---|---|---|---|---|
| M1 | `Analytics` + `ClientAnalytics` + `StylistAnalytics` | `/admin/analytics` sa tabovima `?tab=overview\|client\|stylist` | `/admin/client-analytics` → `/admin/analytics?tab=client`<br>`/admin/stylist-analytics` → `/admin/analytics?tab=stylist` | svi API pozivi (`/api/analytics/dashboard`, `/api/users/{id}/analytics`, `/api/stylists/{id}/analytics`), filteri, grafikoni, tabele, izvozi; `?tab=` deep-link obrazac već postoji u Finance | Srednji: `ClientAnalytics` (753 ln) ima vlastiti router state (`useSearchParams`) — mora se pažljivo spojiti sa postojećim `tab` parametrom |
| M2 | `Settings` + `Operations` + `Appearance` + `SEO` (+ `EmailSettings`, `Notifications`, `AppReleases` kao pod-nav) | `/admin/settings` hub sa podnavigacijom: `?tab=site\|operations\|appearance\|seo\|email\|notifications\|releases` | `/admin/settings/operations` → `/admin/settings?tab=operations` (itd.)<br>`/admin/email-settings` → `/admin/settings?tab=email`<br>`/admin/app-releases` → `/admin/settings?tab=releases` | svi API pozivi, registry, `settings-shell` navigacija (već postoji kao 4 kartice), `EmailSettings` vizuelni editor, kampanje | Srednji: 4 zasebna `SettingsModulePage` poziva + 3 nezavisna ekrana; `Notifications` ima vlastiti socket/realtime sloj |
| M3 | Blog + Gallery + Reviews — **samo zajednički obrazac** | **bez promjene ruta** | — | sve | Nizak |
| M4 | `/admin/debtors` | već redirect na `/admin/finance?tab=debtors` | ✅ već radi | — | — |

**Preporuka:** odobri **M1 i M2**; M3 bez spajanja ruta. Bez odobrenja — **ne implementira se ništa od ovoga**.

## 7. Proširenje `scripts/check_ui_contrast.py`

Skripta trenutno provjerava **44 para** (web + mobile) i prolazi `--strict`.
U fazi 0 dodaju se parovi iz §2 (light + dark): `text/surface`, `text-muted/surface`, `text-muted/surface-muted`,
`control-border/surface`, `on-primary/brand-primary`, `accent-text/surface`, `nav-active-fg/nav-active-bg`,
`focus-ring/surface`, `on-danger/danger`, 5 status parova × 2 teme = **~24 nova para**.

Zahtjev: skripta mora naučiti čitati **HEX** vrijednosti iz `:root`/`.dark` bloka (trenutno `parse_css_vars` prihvata **samo HSL** — provjereno u kodu) i mora moći upariti `var(--x)` reference. To je promjena **samo u skripti**, ne u produkcijskom kodu.

## 8. Šta referentni HTML **ne** pokriva (potrebne dopune šablona)

Prompt §0a traži da se ovo predloži. Referenca ilustruje samo listu (Rezervacije). Nedostaje:

| Potreba | Modul | Predlog |
|---|---|---|
| **Kalendar** (mjesec/sedmica/dan/agenda) | Rezervacije, Stylist schedule | `AccessibleCalendar`: custom toolbar sa `role="group"`, dugmad za view/navigaciju ≥44px, **agenda/lista kao podrazumijevana alternativa**, drag&drop zamijenjen dugmetom „Promijeni termin“ (2.5.7) |
| **Grafikoni** | Analytics, ClientAnalytics, StylistAnalytics, Dashboard | `ChartFigure` + obavezna `<details>`/tabela podataka ispod; `aria-label` sa ključnim brojevima |
| **Višekoračne forme / wizard** | Finance `category-wizard-dialog`, Onboarding | `FormSection` + indikator koraka kao **ol/tekst** (ne samo boja); 3.3.7 — ne tražiti ponovno iste podatke |
| **Upload zona** | Gallery, Blog, EmailSettings, Workbook, Users avatar | dugme „Odaberi fajl“ (native input) + progress sa `role="progressbar"` + `aria-valuenow`; **bez obaveznog drag&drop-a** (2.5.7) |
| **Vizuelni email editor** (drag&drop blokovi) | EmailSettings | reorder **dugmadima** (gore/dolje) pored drag&drop-a; `aria-live` najava promjene |
| **Before/After slider** | dijeljeno s javnim | već ima i18n + accessible label (testirano); **ne dirati**; samo provjeriti 2.5.7 (ima li tastaturnu alternativu — provjera u fazi 13) |
| **Guste akcije u redovima tabele** | Users, Services, Finance | icon-dugmad ≥24px sa **jedinstvenim** `aria-label`; na <640px u kartici postaju tekstualna dugmad |
| **Toast trajanje** | globalno | Sonner `closeButton` ✅ postoji; dodati `duration` koji omogućava čitanje (≥6s za greške) i ne otima fokus (4.1.3) |
