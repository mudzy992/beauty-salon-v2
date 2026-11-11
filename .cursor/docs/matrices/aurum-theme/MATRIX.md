# MATRIX — Aurum theme / skin sustav

**Status:** ✅ **S1 ZAVRŠEN (2026-11-11, 5/5 CI `43100889990`).** Runtime logika postoji i lokalno je izmjerena: `features/shell/theme/*`, `ThemeProvider` iznad `SettingsProvider`, `ThemeSwitcher` u 3 shella, 2 Aurum CSS bloka, `check_ui_contrast.py --strict` **140/140**, 4 nova `test:*` (203/203 ukupno). **CI:** commit `ae87acf` (`ae87acfbde4b2b2411afcd3ed5ade5c20ed72ec4`), run **`43100889990`** = **5/5 success**; `a11y-e2e` job `130791757930`: **252 passed | 0 failed | 0 skipped** nad 32 rute na **default `classic`**, artifact `playwright-a11y-report.zip` ID `13891846859` (331192 B); 4 nova S1 koraka (`130791757438` #155–#158) su `success`. Rendered axe za `aurum-light`/`aurum-dark` i dalje 🟡 do S11 — ovo je source-only + default-classic rendered dokaz, ne potvrda sva 3 stanja u browseru.
**Vlasnik:** `.cursor/plans/aurum-web-refactor/` · **Izvori odluka:** `00_overview.md` §2, `02_phase-1-foundation.md`
**Ažurirano:** 2026-11-11

---

## 1. Model stanja (Q8: jedan izbornik, 3 opcije)

| `ThemeChoice` | `data-skin` | `data-mode` | `.dark` klasa | `color-scheme` | `<meta theme-color>` | Je li default |
|---|---|---|---|---|---|---|
| `classic` | `classic` | `light` | ❌ ne | `light` | današnja `#0f172a` | **✅ DA** |
| `aurum-light` | `aurum` | `light` | ❌ ne | `light` | Aurum svijetla iz NEJRA §10 | ne |
| `aurum-dark` | `aurum` | `dark` | ✅ da (**R2 potvrđeno odlukom `dark_yes`, 2026-11-11**) | `dark` | Aurum tamna iz NEJRA §10 | ne |

**Nepostojanje 4. stanja:** kombinacija `classic` + `dark` **nije** ponuđena (Q8). Nepoznata vrijednost iz `localStorage` → `classic` (fail-closed na današnji izgled).

---

## 2. State machine i perzistencija

| Prijelaz | Trigger | Efekat |
|---|---|---|
| init | mount `ThemeProvider` | `readStoredTheme()` → `normalizeTheme()` → `applyTheme(document.documentElement)` |
| `classic → aurum-light` | klik na opciju | `data-skin=aurum`, `data-mode=light`, uklanja `.dark`, gasi runtime brand override, najava `role="status"` |
| `aurum-light → aurum-dark` | klik | `data-mode=dark`, dodaje `.dark`, `color-scheme=dark`, meta |
| bilo koje → `classic` | klik | vraća inline `--brand-*` iz `buildBrandColorVariables`, skida `.dark`, `data-skin=classic` |
| reload | — | `localStorage` (ključ `nejra.theme`) vraća zadnje stanje; bez vrijednosti → `classic` |

Fokus ostaje na kliknutom dugmetu; bez otimanja fokusa; promjena se najavljuje `role="status"` i18n ključem.

---

## 3. Primjena na DOM (vlasništvo)

| Element | Atribut | Vlasnik |
|---|---|---|
| `<html>` | `data-skin`, `data-mode`, klasa `dark`, `style.colorScheme`, inline `--brand-*` | `features/shell/theme/theme-state.mjs` + `theme-context.tsx` |
| `<meta name="theme-color">` | `content` | `theme-state.mjs` |
| `<html lang>` | prati i18n BS/EN | postojeći `i18n` (ne dira se) |
| CSS tokeni | `:root`, `.dark`, `[data-skin="aurum"][data-mode="light"]`, `.dark[data-skin="aurum"]` | `styles/globals.css` (S1) |

**Specifičnost:** Aurum blokovi (0,2,0) pobjeduju `:root` / `.dark` (0,1,0). Inline stilovi s `<html>` pobjeduju sve → zato se u Aurumu **moraju ukloniti** (Q9).

---

## 4. Precedencija boja (Q9) — najvažnije pravilo

| Stanje | `theme_primary` / `theme_accent` iz postavki | Šta pobjeduje |
|---|---|---|
| `classic` | primjenjuju se (`SettingsContext.tsx` → `buildBrandColorVariables` → inline `--brand-*`) | **korisnički override** (današnje ponašanje, netaknuto) |
| `aurum-light` / `aurum-dark` | **ne primjenjuju se**; inline `--brand-*`-varijable se uklanjaju s `<html>` | **fiksna Aurum paleta** iz NEJRA §10 |

- `buildBrandColorVariables` i `test:brand-colors` se **ne mijenjaju**; mijenja se samo *uvjet poziva*.
- U `Postavke → Izgled` (`pages/SettingsAppearance.tsx`) vidljiva i18n napomena da je override neaktivan dok je Aurum odabran.
- Povratak na `classic` ponovo primjenjuje iste korisničke boje (bez gubitka postavki).

---

## 5. Tokeni i kontrast

| Skup | Selektor | Provjera |
|---|---|---|
| Klasična svijetla | `:root` (netaknut) | `check_ui_contrast.py` — **26** parova |
| Klasična tamna (uspavana) | `.dark` (netaknut) | `check_ui_contrast.py` — **26** parova |
| Aurum svijetla | `[data-skin="aurum"][data-mode="light"]` | **30** parova: 26 postojećih + 4 NEJRA §10 (`text/page`, `muted/page`, `brand/page`, `accent/page`) |
| Aurum tamna | `.dark[data-skin="aurum"]` | **30** parova: ista struktura |
| Mobile paleta | `mobile/src/theme/colors.ts` (netaknuta, Q3) | **28** parova (22 tema + 6 statusa) |

Ukupno **80 → 140 parova** (52 web klasična + 28 mobile + 60 Aurum), izmjereno **140/140 PASS**. **Ispravka K0 broja:** plan je pisao „30 postojećih", a stvarni parser ih je imao 26; odlukom vlasnika `use_140_four` (2026-11-11) razlika je popunjena s 4 stvarna para iz NEJRA §10 po Aurum stanju, bez izmišljanja boja. `test:theme-ssot-sync` čita NEJRA §10 `const T` i `globals.css` i poništava odstupanje koda od jedinog izvora istine (12 tačnih hexova + izvedeni HSL/raw tokeni). **Nijedna boja se ne koriguje bez odobrenja** (Q9): ako par padne → STOP + pitanje. Rasponi: light 3,73–17,55:1, dark 3,70–16,89:1.

---

## 6. Izbornik teme — pojavljivanje (Q3: sve web rute)

| Kontekst | Fajl | Segment | Status |
|---|---|---|---|
| Javni header + mobilni drawer | `features/shell/public/public-layout.tsx` | S1 (montaža), S2 (stil) | ✅ **S2 stil gotov** (`43110763869` / `d1fb55d`): Aurum-only semantički tokeni, `aria-current` + oblik, 44 px mete; 2× `<ThemeSwitcher />` iz S1 |
| 5 javnih sadržajnih stranica | `pages/public/PublicBlog*.tsx`, `PublicGallery.tsx`, `PublicContact.tsx`, `PublicSatisfiedClients.tsx` | **S3** | ✅ **S3** (`43116167107` / `a12cf5b`): `isAurum` grana + `data-aurum-*`, `EmptyState`/`ErrorState`/`PageHeader`, `DialogDescription`, semantički tokeni, 44 px mete, `forced-colors`; klasični markup netaknut |
| Admin header | `features/shell/admin/admin-chrome.tsx` | S1 (montaža), S6 (stil) | ✅ **S1 montirano** unutar `AdminUserMenu`; stil u S6 |
| Stylist header | `layouts/StylistLayout.tsx` | S1 (montaža), S10 (stil) | ✅ **S1 montirano** prije korisničkog menija; stil u S10 |
| Auth / onboarding / NotFound | `pages/Login.tsx` i dr. | **S5** (mjesto = otvoreno pitanje O2) | ⬜ |
| Fullscreen kalendar (izvan layouta) | `pages/ReservationsCalendar.tsx` | **S6** (mjesto = O3) | ⬜ |

A11y ugovor izbornika: `role="group"` + i18n `aria-label`, 3× `button[aria-pressed]`, meta ≥44 px, `:focus-visible` prsten ≥3:1, `role="status"` najava, `prefers-reduced-motion`, bez oslanjanja samo na boju, `2.5.3 Label in Name`.

---

## 7. Testovi i CI pokrivenost

| Test / provjera | Garancija | CI korak | Status |
|---|---|---|---|
| `test:theme-state` | 3 stanja, default, normalize, DOM atributi, localStorage | ✅ `Test NEJRA 3-state theme state machine (S1)` | ✅ **5/5** |
| `test:theme-switcher-a11y` | ARIA, i18n, 44 px, fokus, najava | ✅ `Test NEJRA theme switcher accessibility (S1)` | ✅ **6/6** |
| `test:theme-brand-precedence` | Q9: override samo u classic | ✅ `Test Aurum brand color precedence (S1)` | ✅ **5/5** |
| `test:theme-ssot-sync` | `globals.css` = NEJRA §10 | ✅ `Test Aurum CSS tokens against NEJRA SSOT (S1)` | ✅ **8/8** |
| `check_ui_contrast.py --strict` | 140/140 parova | `repo-checks` | ✅ **140/140** |
| `check_i18n.py --strict` | novi `shell.theme.*` + `adminSettings.appearance.aurumNote` u BS+EN | `repo-checks` | ✅ **2717/2717** |
| `check_ci_index.py` | 203 frontend `test:*` skripti, svaka ima CI korak | `repo-checks` | ✅ **384/387** |
| `test:a11y-routes` (CI) | rendered axe za 3 stanja | `a11y-e2e`, **S11** | 🟡 (S1: samo default `classic`) |
| CI S1 cjelina | 5 poslova + 4 nova S1 koraka | `43100889990`, `ae87acf` | ✅ **5/5 success**; default-classic axe **252/252** / 32 rute |

---

## 8. Šta se ne smije promijeniti

- Default izgled (Q8), `:root` / `.dark` blokovi, `dark:` klase u 85 fajlova — **aktiviraju se u Aurum tamnoj** (R2 potvrđeno odlukom `dark_yes`).
- `buildBrandColorVariables`, `test:brand-colors`, `SettingsSocketSync`, svi setting ključevi.
- Rute, API, `queryKeys`, socket eventi, guardovi, podaci, formati, i18n značenje postojećih ključeva.
- Bez novih npm zavisnosti; bez diranja `/mobile` (Q3) i `/backend`.

---

## 9. Statusi dokaza

✅ izmjereno · 🟡 zadovoljeno u planu/kodu, nije provjereno u renderu · ❌ nije zadovoljeno · ➖ nije primjenjivo · ⬜ nije započeto.

**Trenutno (S1):** state mašina, provider, switcher, CSS tokeni, Q9 precedencija, kontrast, i18n i 4 nova testa/CI koraka su ✅ (lokalno izmjereno; CI **5/5 `43100889990`** na `ae87acf`, 4 nova S1 koraka `success`). 🟡 ostaju: rendered axe za `aurum-light`/`aurum-dark`, zoom/reflow, čitač ekrana, `forced-colors` ručna provjera i `1.4.6` AAA — sve do S11. U sandboxu `test:a11y-routes` ispisuje `SKIPPED` i ne tvrdi prolaz; CI `a11y-e2e` rendered axe trenutno pokriva isključivo **default `classic`** (**252 passed | 0 failed | 0 skipped** nad 32 rute). `140/140` je source-only; u CI logu ostaju nepotpuni `1.4.3`/`2.5.3` i poznati `1.4.6` AAA padovi.
