# S1 — Temelj: tokeni, 3-state tema, novi dizajn-sistem

**Status:** 🟡 čeka odobrenje S0 · **Tip:** jedini segment koji uvodi **novi feature** (izbornik teme, Q8) i postavlja sloj koji S2–S10 konzumiraju.

---

## 1. Cilj

U kodu uspostaviti ono što je `NEJRA – …html` (S0, §10–§12) proglasio jedinim izvorom istine:

- **3 stanja teme** (Q8): `Klasična svijetla` (default, današnji izgled) / `Aurum svijetla` / `Aurum tamna`. Nema classic+tamna.
- **Aurum fiksira paletu** (Q9): runtime `theme_primary`/`theme_accent` override je neaktivan dok je Aurum odabran, uz vidljivu napomenu u Postavke → Izgled.
- **Nove primitive dizajn-sistema** (Q4): zamjena postojećih admin šablona novim, aurum-svjesnim šablonima, bez promjene ponašanja i bez novih zavisnosti.
- **Sve troje stanje kontrasta** provjerljivo u `check_ui_contrast.py --strict`.

---

## 2. Ulaz

- S0 završen, CI zelen (5/5), NEJRA §10 sadrži točne hex/HSL vrijednosti i izračunate omjere za 3 stanja.
- Ako bilo koji par u §10 **ne prolazi** ciljani omjer → **STOP + pitanje** (ne izmišljamo nove nijanse; Q9 zabranjuje promjenu palete bez odobrenja).
- `SettingsContext.tsx` i `utils/brand-colors.mjs` pročitani (inline `--brand-*` na `<html>`); `.dark` je uspavan (baseline §4).

---

## 3. Fajlovi — tačan spisak

**Novo (`frontend/src/features/shell/theme/`):**

| Fajl | Svrha (≤150 linija) |
|---|---|
| `theme-state.mjs` | čista funkcija stanja: `ThemeChoice = 'classic' \| 'aurum-light' \| 'aurum-dark'`; `normalizeTheme`, `applyTheme(root)`, `readStoredTheme`, `writeStoredTheme`; bez React-a, lako testirljivo |
| `theme-context.tsx` | `ThemeProvider` + `useTheme()`; primjenjuje stanje na `document.documentElement` (`data-skin`, `data-mode`, klasa `dark`, `color-scheme`, `<meta name="theme-color">`); pamti u `localStorage` |
| `theme-switcher.tsx` | jedan izbornik s 3 opcije; Radix `DropdownMenu` ili grupa `button[aria-pressed]`; i18n, 44 px mete, vidljiv fokus, `aria-live` najava promjene |
| `theme-state.test.mjs` / `theme-switcher-a11y.test.mjs` / `theme-brand-precedence.test.mjs` / `theme-ssot-sync.test.mjs` | 4 nova source-contract testa |

**Novo (`frontend/src/features/shell/aurum/ui/`):** `page-header.tsx`, `stat-card.tsx`, `filter-bar.tsx`, `data-table.tsx`, `status-badge.tsx`, `data-state.tsx`, `confirm-dialog.tsx`, `form-section.tsx` — nove primitive po NEJRA §11. Stare `features/shell/admin/ui/*` **ostaju** dok ih S6–S10 ne zamijene; brišu se u **S11** kad nijedan potrošač ne ostane („odmah briši mrtav kod" se primjenjuje na kraju migracije, ne usred nje).

**Izmjena:**

| Fajl | Šta |
|---|---|
| `frontend/src/app/providers.tsx` | `<ThemeProvider>` iznad `<SettingsProvider>` (da `SettingsContext` može čitati `useTheme()`); `MotionConfig reducedMotion="user"` ostaje netaknut |
| `frontend/src/context/SettingsContext.tsx` | `buildBrandColorVariables(...)` se primjenjuje **samo** za `skin=classic`; za Aurum se uklanjaju inline `--brand-*` varijable s `<html>` (Q9) |
| `frontend/src/styles/globals.css` | 2 nova bloka: `[data-skin="aurum"][data-mode="light"]` i `.dark[data-skin="aurum"]` (veća specifičnost od `:root` / `.dark`); zadržati `:root` i `.dark` **netaknutima** radi klasičnog pariteta; `color-scheme: dark` za Aurum tamnu; globalni `prefers-reduced-motion` ostaje |
| `frontend/tailwind.config.js` | dodati `fontFamily.serif` = Palatino/Georgia stack iz NEJRA §02 (bez vanjskih fontova); postojeći semantički tokeni ostaju (mapirani su na CSS varijable koje Aurum samo poništava) |
| `frontend/src/features/shell/public/public-layout.tsx` | `<ThemeSwitcher />` u header (desktop + mobilni drawer) |
| `frontend/src/features/shell/admin/admin-chrome.tsx` | `<ThemeSwitcher />` u admin header |
| `frontend/src/layouts/StylistLayout.tsx` | `<ThemeSwitcher />` u stylist header |
| `frontend/src/pages/SettingsAppearance.tsx` | napomena „Aurum paleta je aktivna; primarna/akcent boja iz postavki se ne primjenjuje" (Q9), i18n ključevi |
| `frontend/src/i18n/locales/bs.json`, `en.json` | novi ključevi `shell.theme.*` + `adminSettings.appearance.aurumNote*`; **paritet** |
| `frontend/index.html` | `<meta name="theme-color">` početna vrijednost ostaje; runtime je održava `theme-state.mjs` |
| `scripts/check_ui_contrast.py` | parser proširen na 2 nova selektora s naslijeđenim `:root` tokenima; **+60 parova** (30 postojećih × 2 Aurum stanja) → ukupno 140 |
| `frontend/package.json`, `.github/workflows/ci.yml` | 4 nove `test:*` skripte + 4 nova CI koraka (`check_ci_index.py` gate) |
| `.cursor/docs/matrices/aurum-theme/{MATRIX,CHANGELOG}.md`, `aurum-route-coverage/*` | status ✅ za temelj; ostalo 🟡 |

---

## 4. Ugovor (šta se ne smije promijeniti)

1. **Default = današnji izgled.** Bez ikakvog korisničkog odabira, `skin=classic`, `mode=light`, sve `:root` vrijednosti i sve `dark:` klase ponašaju se **točno kao prije**. Dokaz: `test:brand-colors`, `test:text-contrast-allowlist`, `test:settings-semantic-tokens`, `test:dashboard-a11y`, `test:shell-a11y` ostaju zeleni bez izmjena.
2. `buildBrandColorVariables` i `test:brand-colors` se **ne mijenjaju**; mijenja se samo *kada* se poziva (Q9).
3. Nijedna ruta, API poziv, `queryKey`, socket event, guard, iznos, datum, status, filter, sort, paginacija ni zbir se ne mijenja.
4. `check_i18n.py --strict` zeleno; nema hard-coded stringova, uključujući `aria-label`/`title`/`alt`/`placeholder`/toast.
5. Bez novih npm zavisnosti; bez promjena `/mobile`, `/backend`, `.env`, migracija.
6. **Aurum tamna i `.dark`:** ✅ **R2 potvrđeno odlukom `dark_yes` (2026-11-11).** `Aurum tamna` dodaje klasu `dark` na `<html>` kako bi postojeće `dark:` varijante u 85 fajlova radile; Aurum tokeni imaju veću specifičnost, pa pobjeduju. Alternativa „samo `data-mode` bez `.dark`" je odbijena i ne implementira se. S1 i dalje ne počinje bez 5/5 CI S0 i eksplicitnog odobrenja.

---

## 5. Koraci

1. `theme-state.mjs`: definirati 3 stanja, `normalizeTheme` (nepoznata vrijednost iz `localStorage` → `classic`), `applyTheme` koji na `<html>` postavlja `data-skin=classic|aurum`, `data-mode=light|dark`, klasu `dark` (samo za `aurum-dark`), `style.colorScheme` i `meta[name=theme-color]`. **Bez čitanja sistemske teme** (Q8: 3 fiksna stanja, default classic).
2. `ThemeProvider` u `providers.tsx`; `useTheme()` izlaže `{ choice, setChoice, skin, mode }`.
3. `SettingsContext`: u `useEffect` koji piše `--brand-*` dodati uvjet `if (skin !== 'classic') { ukloni sve inline --brand-*; return }`; pri povratku na `classic` ponovo primijeniti `buildBrandColorVariables`. `test:brand-colors` ostaje zelen jer se sama funkcija ne dira.
4. `globals.css`: dodati dva Aurum bloka isključivo s vrijednostima iz NEJRA §10 (kopirati **točne** vrijednosti, ne zaokruživati). `check_ui_contrast.py`: `css_block()` već escapa selector, pa se `[data-skin="aurum"][data-mode="light"]` i `.dark[data-skin="aurum"]` mogu direktno parsirati; naslijeđeni `:root` tokeni se spajaju kao i za `.dark`.
5. `tailwind.config.js`: `fontFamily.serif`; naslovi u Aurum stanju koriste `font-serif` kroz `data-[skin=aurum]:` varijantu ili jedno CSS pravilo u `globals.css` — **ne** mijenja se klasični font stack.
6. `ThemeSwitcher`: 3 `button[aria-pressed]` u `role="group"` s `aria-label` iz i18n; promjena najavljuje `role="status"`; fokus ostaje na dugmetu; meta ≥44 px; `prefers-reduced-motion` poštovan. Montirati u 3 layouta (public/admin/stylist). Auth/onboarding i fullscreen kalendar dobijaju ga u **S5/S6**.
7. Nove `features/shell/aurum/ui/*` primitive po NEJRA §11, s istim a11y ugovorom kao stari (caption, `aria-sort`, jedinstvena imena akcija, `th scope`, kartice <640 px, `ConfirmDialog` fokus-povratak, `role="status"`/`role="alert"`, `fieldset/legend`, `aria-describedby`, `aria-invalid`). **Ne mijenjaju se** stari šabloni niti njihovi potrošači u ovom segmentu.
8. `SettingsAppearance.tsx` + i18n: napomena o neaktivnom overrideu dok je Aurum aktivan.
9. 4 nova testa + `test:*` skripte + CI koraci; `check_ci_index.py`.
10. Matrice: `aurum-theme/MATRIX.md` prelazi iz „PLAN" u „IMPLEMENTIRANO" s točnim stanjima, testovima i CI koracima.

---

## 6. Testovi (svi novi su `node --test`, isti stil kao repo)

| Test | Garancija (uključuje mutacijske provjere) |
|---|---|
| `test:theme-state` | 3 stanja, default, `normalizeTheme` odbacuje nepoznato, `applyTheme` postavlja točne atribute/klasu/meta, `localStorage` round-trip |
| `test:theme-switcher-a11y` | `aria-pressed`, `role=group`, i18n ključevi (bez hard-coded teksta), 44 px meta, fokus, `role=status` najava, `prefers-reduced-motion` |
| `test:theme-brand-precedence` | Aurum → `setProperty('--brand-*')` se ne poziva / inline varijable uklonjene; classic → poziva se; `buildBrandColorVariables` netaknut |
| `test:theme-ssot-sync` | hex/HSL vrijednosti u `globals.css` Aurum blokovima **točno odgovaraju** NEJRA §10 (čita HTML + CSS); sprječava odstupanje koda od jedinog izvora istine |
| `check_ui_contrast.py --strict` | 140/140 parova (80 klasičnih + 60 Aurum) |
| postojećih 199 `test:*` | zeleno; nijedan se ne briše/slabi; `test:hooks-order` pazi na novi provider |

---

## 7. CI provjere

Lokalno: 5 Python provjera + puna `test:*` petlja (**203/203**) + `npm run build` (budžet ≤300 KiB; izmjeriti delta novog CSS/JS) + `typecheck:e2e` + `git diff --check`.
Push → `gh run watch` → **5/5 success**. Posebno paziti:

- `repo-checks`: `check_ui_contrast.py` s 140 parova, `check_i18n.py` s novim ključevima, `check_ci_index.py` sa 4 nova koraka.
- `frontend`: `npm run build` + Docker build (root context) + svi test koraci.
- `a11y-e2e`: rendered axe nad 32 rute na **default (classic) stanju** mora ostati zelen — to je dokaz da klasični izgled nije regresirao.

---

## 8. Definition of Done + dokazi

- ✅ 3 stanja rade, default je današnji izgled, izbor se pamti; izbornik u 3 shella.
- ✅ Q9: override neaktivan u Aurumu + napomena u postavkama; `test:brand-colors` zelen.
- ✅ `test:theme-ssot-sync` potvrđuje da kod = NEJRA §10.
- ✅ 140/140 kontrastnih parova; BS/EN paritet; 203/203 testova; build unutar budžeta.
- ✅ Nove primitive postoje, stari šabloni još rade (migracija je S6–S10); nema mrtvog koda koji se više ne koristi, a nije planiran za brisanje u S11.
- 🟡 Rendered a11y **Aurum stanja** još nije provjerena (axe u CI pokriva default); S11 dodaje pokrivenost za sva 3 stanja.
- ✅ Commit sha + run id + 5/5 + delta bundle-a u evidenciji.
- **STOP** → pitanje: „Odobravaš li S2 (javni shell + Početna + Usluge + Detalj)?" R2 je već potvrđen (`dark_yes`) i ne traži se ponovo.

---

## 9. Rizici / pitanja

- **R2 (§4.6) je riješeno** odlukom `dark_yes` prije S1; više nije nejasnoća ovog segmenta.
- Ako `check_ui_contrast.py` pokaže da neki Aurum par iz NEJRA §10 pada → **STOP**, ne korigirati boju bez odobrenja (Q9 + „ne izmišljaš").
- Ako novi provider pokvari `test:hooks-order` ili `test:admin-render-smoke` → analizirati uzrok; test se ažurira samo uz obrazloženje u `CHANGELOG.md`.
- Ako se pokaže da `data-[skin=aurum]:` varijante traže promjenu `tailwind.config.js` koja bi dirala klasični izgled → admin-scoped CSS pravilo umjesto toga (pravilo iz starog prompta: dijeljena komponenta se ne mijenja ako postoji rizik za javni sajt).
