# MATRIX — Aurum theme / skin sustav

**Status:** 🟡 **PLAN (K0) + S0 ugovor u NEJRA — logika još nije implementirana.** Ovaj fajl postaje autoritativan tek nakon S1; model 3 stanja, fiksna paleta, kontrast 22/22 i ugovor izbornika sada su dokumentovani u NEJRA §10/§12 i pokriveni `test:design-spec`, ali se **ne tvrdi da runtime kod radi**.
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
| Klasična svijetla | `:root` (netaknut) | `check_ui_contrast.py` — 30 parova |
| Klasična tamna (uspavana) | `.dark` (netaknut) | `check_ui_contrast.py` — 30 parova |
| Aurum svijetla | `[data-skin="aurum"][data-mode="light"]` | **+30 parova u S1** |
| Aurum tamna | `.dark[data-skin="aurum"]` | **+30 parova u S1** |
| Mobile paleta | `mobile/src/theme/colors.ts` (netaknuta, Q3) | 20 parova |

Ukupno **80 → 140 parova** od S1. `test:theme-ssot-sync` (S1) čita NEJRA §10 i `globals.css` i poništava odstupanje koda od jedinog izvora istine. **Nijedna boja se ne koriguje bez odobrenja** (Q9): ako par padne → STOP + pitanje.

---

## 6. Izbornik teme — pojavljivanje (Q3: sve web rute)

| Kontekst | Fajl | Segment | Status |
|---|---|---|---|
| Javni header + mobilni drawer | `features/shell/public/public-layout.tsx` | S1 (montaža), S2 (stil) | ⬜ |
| Admin header | `features/shell/admin/admin-chrome.tsx` | S1 (montaža), S6 (stil) | ⬜ |
| Stylist header | `layouts/StylistLayout.tsx` | S1 (montaža), S10 (stil) | ⬜ |
| Auth / onboarding / NotFound | `pages/Login.tsx` i dr. | **S5** (mjesto = otvoreno pitanje O2) | ⬜ |
| Fullscreen kalendar (izvan layouta) | `pages/ReservationsCalendar.tsx` | **S6** (mjesto = O3) | ⬜ |

A11y ugovor izbornika: `role="group"` + i18n `aria-label`, 3× `button[aria-pressed]`, meta ≥44 px, `:focus-visible` prsten ≥3:1, `role="status"` najava, `prefers-reduced-motion`, bez oslanjanja samo na boju, `2.5.3 Label in Name`.

---

## 7. Testovi i CI pokrivenost

| Test / provjera | Garancija | CI korak | Status |
|---|---|---|---|
| `test:theme-state` | 3 stanja, default, normalize, DOM atributi, localStorage | S1 dodaje u `frontend` | ⬜ |
| `test:theme-switcher-a11y` | ARIA, i18n, 44 px, fokus, najava | S1 | ⬜ |
| `test:theme-brand-precedence` | Q9: override samo u classic | S1 | ⬜ |
| `test:theme-ssot-sync` | `globals.css` = NEJRA §10 | S1 | ⬜ |
| `check_ui_contrast.py --strict` | 140/140 parova | `repo-checks` | ⬜ |
| `check_i18n.py --strict` | novi `shell.theme.*` ključevi u BS+EN | `repo-checks` | ⬜ |
| `test:a11y-routes` (CI) | rendered axe za 3 stanja | `a11y-e2e`, **S11** | 🟡 |

---

## 8. Šta se ne smije promijeniti

- Default izgled (Q8), `:root` / `.dark` blokovi, `dark:` klase u 85 fajlova — **aktiviraju se u Aurum tamnoj** (R2 potvrđeno odlukom `dark_yes`).
- `buildBrandColorVariables`, `test:brand-colors`, `SettingsSocketSync`, svi setting ključevi.
- Rute, API, `queryKeys`, socket eventi, guardovi, podaci, formati, i18n značenje postojećih ključeva.
- Bez novih npm zavisnosti; bez diranja `/mobile` (Q3) i `/backend`.

---

## 9. Statusi dokaza

✅ izmjereno · 🟡 zadovoljeno u planu/kodu, nije provjereno u renderu · ❌ nije zadovoljeno · ➖ nije primjenjivo · ⬜ nije započeto.

**Trenutno:** cijela matrica je 🟡/⬜. Rendered potvrda 3 stanja dolazi isključivo iz `a11y-e2e` u S11; u sandboxu `test:a11y-routes` ispisuje `SKIPPED` i ne tvrdi prolaz.
