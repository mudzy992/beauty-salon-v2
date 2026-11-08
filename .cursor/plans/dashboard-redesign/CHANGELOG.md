# CHANGELOG — Dashboard redesign

Format: datum · šta · zašto · dokaz.

---

## 2026-11-08 — ETAPA A (plan)

### Urаđeno

- Pročitani svi dokumenti iz `PROMPT_dashboard_redesign.md` §0: `SOURCE_OF_TRUTH.md`, `.cursorrules`,
  `.cursor/rules/{plan-first,code-hygiene-and-matrices,testing-strategy,full-stack-workflow}.mdc`,
  `docs/audit/FINDINGS.md` (A11Y-01, I18N-01), `docs/codebase-map/FRONTEND.md`,
  `.cursor/plans/{frontend_refactor_modularity,frontend_chakra_removal,admin_drawer_+_full_responsive_pass}_*.plan.md`.
- Analiziran `docs/refaktor/dashboard-reference.html` (450 linija): tokeni, šabloni, a11y ugovor, WCAG oznake.
- Kreiran plan folder `.cursor/plans/dashboard-redesign/` sa `00_overview.md`, `01_phase-audit.md`,
  `02_design-system.md`, 14 faznih dokumenata (`03`–`16`), `CHECKLIST.md`, `CHANGELOG.md`, `HANDOFF.md`.
- Kreirana WCAG 2.2 matrica `.cursor/docs/matrices/dashboard-a11y/MATRIX.md` + `CHANGELOG.md`.

### Izmjereno (baseline, 2026-11-08)

| Provjera | Rezultat |
|---|---|
| `cd frontend && npm ci --no-audit --no-fund` | 313 paketa, 0 grešaka |
| `npm run build` (`tsc -b` + `vite build` + bundle budget) | **PASS** |
| Inicijalni JS/CSS | **269.0 KiB gzip** (budžet 300) |
| `Analytics` ruta | 114.3 KiB (budžet 140) |
| `ReservationsCalendar` ruta | 95.1 KiB (budžet 125) |
| 142 `test:*` skripte | **142/142 PASS**, 412 asertacija, 0 fail |
| `check_i18n.py --strict` | **PASS** — 2575/2575 leaf ključeva |
| `check_ui_contrast.py --strict` | **PASS** — 44/44 para |
| `check_repo_hygiene.py` | **PASS** — 1611 tracked pathova |
| `check_doc_links.py` | **PASS** — 622 linka / 180 fajlova |

### Ključni nalazi (svaki potvrđen u kodu)

1. **Dark tema se ne može aktivirati** — 0 pogodaka za `classList.add('dark')`, `ThemeProvider`, `data-theme`,
   `prefers-color-scheme` u `frontend/src`. 106 fajlova ima `dark:` klase koje se nikad ne aktiviraju.
2. **`--input`/`--border` = `#E2E8F0` na bijeloj = 1.23:1** → ne prolazi 1.4.11 (3:1).
3. **`text-slate-400` (#94A3B8) na bijeloj = 2.56:1** → ne prolazi 1.4.3; 26 light-mode upotreba, 8 nosi stvarni tekst u dashboardu.
4. **`text-orange-600` (#EA580C) u `features/dashboard/ops-stats.tsx` = 3.56:1** → ne prolazi 1.4.3 **i** boja je van brand palete.
5. **Nema skip linka** (0 pogodaka) ni **`aria-current`** (0 pogodaka) u cijelom `frontend/src`.
6. **`<caption>` 3×, `th scope` 17×** naspram 129 `<th>`; `aria-sort` samo u 2 finance tabele.
7. **`window.confirm` 14× u 8 fajlova** (prompt navodio 5).
8. **`components/ui/tooltip.tsx` — 0 upotreba** (mrtav kod).
9. **ESLint nije instaliran** — `lint` skript postoji, `eslint` nije u `devDependencies`.
10. **31 test fajl asertuje tačne `className` stringove** (57 asertacija) → krhki na promjenu tokena.
11. **`features/settings/*` koristi paralelnu „smeđu“ hex paletu** (`#49332d`, `#9d735d`, `#9b735f`, …) van brand identiteta.
12. **`ClientAnalytics.tsx` nema `<h1>`**; `Salon.tsx` ima **2 `<h1>`**.
13. **`Analytics.tsx` grafikoni (recharts) nemaju nikakvu tekstualnu alternativu** → 1.1.1 ❌.
14. **Svi omjeri kontrasta iz `dashboard-reference.html` su tačni** — 29/29 parova se poklapa sa nezavisnim proračunom.
15. **Korekcija tvrdnje iz prompta:** `--destructive` u dark temi (`0 62.8% 30.6%` = `#7F1D1D`) sa `--destructive-foreground`
    daje **9.58:1** → **prolazi**. Problem je samo kao tekst na `--background` (1.77:1). Uz to `Button variant="destructive"`
    uopšte ne koristi token nego hardkodirani `bg-red-600`.

### Produkcijski kod

**Nije mijenjan.** `git status` pokazuje samo nove fajlove u `.cursor/plans/dashboard-redesign/`
i `.cursor/docs/matrices/dashboard-a11y/`.

### Otvoreno

Q1–Q7 iz [`00_overview.md` §7](00_overview.md) — bez odgovora nema ETAPE B.

---

## 2026-11-08 — ETAPA B, faza 0 (Temelj)

Plan odobren; Q1–Q7 riješeni po preporuci ([`00_overview.md` §7](00_overview.md)).

### Commit 1 — `a11y/ui(tokens)`

- **Šta:** semantički sloj tokena u `globals.css` (`:root` + `.dark`), Tailwind aliasi,
  globalni a11y base (focus-visible prsten, `scroll-padding`, `prefers-reduced-motion`,
  `forced-colors` scoped na `.admin-shell`).
- **Zašto:** 1.4.3 / 1.4.11 / 2.4.7 / 2.4.11 / 2.4.13 / 2.3.3 / 1.4.1.
- **Dokaz:** `check_ui_contrast.py --strict` **80/80 parova** (bilo 44); parser proširen za
  HEX + `var()` rezoluciju, `.dark` nasljeđuje `:root`. Svaki HSL round-trip provjeren
  (hex → HSL → hex) prije upisa.
- **Odluka:** nijedan postojeći token nije mijenjan; 1.4.11 se rješava **novim** tokenom
  `--control-border`, ne izmjenom `--input`.

### Commit 2 — `a11y/shell`

- **Šta:** `SkipLink`, `useFocusOnNavigate`, `aria-current` na nav linkovima, `pageTitles`
  mapa (31 ruta), „Pomoć“ link, spajanje dva duplicirana `<nav>` u `StylistLayout`.
- **Dokaz:** `test:shell-a11y` **7/7**; `check_i18n --strict` **2611/2611**.
- **Korekcija kontrasta:** aktivni nav `text-brand-gold-text` na `bg-brand-champagne/20`
  = **4.35:1** (ispod 4.5) → `bg-nav-active` + `text-brand-rose-text` = **9.39:1** light /
  **8.47:1** dark.

### Commit 3 — `a11y/ui(primitives)`

- **Šta:** `--input-border` indirection, `focus-visible` prsten u `dropdown-menu`,
  `autoComplete="one-time-code"` na `OtpInput`, nove **aditivne** varijante
  `Button variant="danger"`, `Badge variant="info"|"neutral"|"outlineStrong"`.
- **Zašto:** javni sajt koristi iste primitive. `--input-border` default je **tačno**
  današnji `slate-200` (light) / `slate-800` (dark), pa javni sajt ostaje vizuelno
  identičan; `.admin-shell` ga prebacuje na `--control-border`.
- **Dokaz:** build **271.7 KiB** (budžet 300); 143/143 testova.

### Commit 4 — `a11y/ui(templates)`

- **Šta:** promovisane `data-state`, `confirm-dialog`, `responsive-dialog` iz
  `features/finance/components/` u `features/shell/admin/ui/`; na starim putanjama ostali
  **re-exporti** (19 importa radi bez izmjene). Novi šabloni: `page-header`, `stat-card`,
  `form-section`, `filter-bar`, `data-table`, `table-pagination`, `status-badge` +
  responzivni card-mod za `.data-table` (ispod 640px, `data-label` čuva naziv kolone).
- **Novi i18n namespace** `table.*` (17 ključeva); `status-badge` **reuzima** postojeće
  `reservations.statuses.*` (11 statusa), bez duplikata prijevoda.
- **Dokaz:** `test:admin-templates-a11y` **9/9**; build **272.2 KiB** (budžet 300).

### Izmjena postojećeg testa — obrazloženje

`responsive-dialog-accessibility.test.mjs` je hardkodirao **tačno tri** `../` u import
putanji do `components/ui/dialog`. Premještanjem komponente nivo dublje asertcija je pala,
iako je njena garancija — „koristi Radix `DialogTitle`/`DialogDescription`, ne goli
`h2`/`p`“ — i dalje ispunjena.

Regex je promijenjen u `(?:\.\.\/)+components\/ui\/dialog`, odnosno **neovisan o lokaciji
fajla**. Garancija nije oslabljena: i dalje traži iste Radix primitive iz istog modula, a
ostale dvije asertcije u tom testu (`DialogTitle`/`DialogDescription` u mobile i desktop
grani) su netaknute. Test: **3/3 PASS**.

### Izmjereno nakon faze 0

| Provjera | Rezultat |
|---|---|
| `npm run build` | **PASS** — inicijalni JS/CSS **272.2 KiB gzip** (budžet 300, +3.2 od baseline) |
| `test:*` skripte | **144/144 PASS** (bilo 142; +`test:shell-a11y`, +`test:admin-templates-a11y`) |
| `check_i18n.py --strict` | **PASS** — 2611/2611 (bilo 2575; +17 `table.*`, +4 `shell.*`, +15 `pageTitles.*`) |
| `check_ui_contrast.py --strict` | **PASS** — 80/80 parova (bilo 44) |
| `check_repo_hygiene.py` | **PASS** |
| `check_doc_links.py` | **PASS** |

### Otvoreno (nije verifikovano u renderu)

🟡 **Nije provjereno u browseru:** stvarni prikaz skip linka, fokus prstena, card-mod
tabele ispod 640px, `forced-colors` ponašanje. Ovo su source-level dokazi (testovi +
proračun kontrasta), ne audit renderovanog UI-ja. Ručna provjera: M1–M12 u
[`CHECKLIST.md`](CHECKLIST.md).

➖ `@axe-core/playwright` i `eslint-plugin-jsx-a11y` su **instalirani** (Q4 odobren), ali
još **nisu** povezani ni u jedan `test:*` skript ni u CI — to je planirano uz fazu 13.
