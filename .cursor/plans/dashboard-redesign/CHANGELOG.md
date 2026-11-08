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

---

## 2026-11-08 — ETAPA B, faza 1 (Dashboard pilot)

### Commit 1 — `a11y/ui(dashboard): page header + stat grid + semantic tokens`

- **Šta:** `PageHeader` na `/admin`; `StatGrid` (`<ul>`/`<li>`) kao novi template;
  `StatCard` proširen `tone` propom; `finance-stats` i `ops-stats` migrirani na
  `StatGrid` + semantičke tokene; loading grana dobila `role="status"` +
  `aria-live="polite"` + `sr-only` tekst uz `aria-hidden` skelet.
- **Zašto:** 1.3.1, 1.4.1, 2.4.6, 4.1.3.
- **Korekcija kontrasta:** `text-orange-600` na „Recenzije na čekanju" bio je
  **3.56:1** (ispod 4.5:1) i **van brand palete** → `tone: 'warn'` (`--warn-fg`,
  **7.49:1** light / **8.85:1** dark) + `AlertCircle` ikona + tekstualna oznaka
  `dashboard.pendingReviewsAttention`. Naglasak više nije samo boja (1.4.1).
- **Neto prihod:** predznak je bio samo boja (zelena/crvena). Sada `trend.direction`
  (strelica) **i** `trend.label` (`dashboard.netPositive` / `dashboard.netNegative`).
  Formula `net = (services + tips) - expenses` je **netaknuta** — zakucana testom.
- **Paritet:** `formatLocalizedAmount` / `formatLocalizedNumber` i dalje jedini put
  do prikaza; nijedan broj nije promijenjen.

### Commit 2 — `a11y/ui(dashboard): data table, split outbox`

- **Šta:** `recent-reservations` migriran na `DataTable` (`<caption>`, `scope="col"`,
  `data-label`, `<time datetime>`) + `StatusBadge` s dinamičkom oznakom; link klijenta
  uvijek podvučen (1.4.1). `outbox-diagnostics.tsx` (**343 → 128 ln**) podijeljen na
  `use-outbox.ts` (116) + `outbox-events-table.tsx` (118) + `outbox-replay-dialog.tsx`
  (102) + panel. Mrtav `statusClassMap` obrisan iz `types.ts` (nula referenci).
- **Zašto:** 1.3.1, 1.4.1, 2.4.6, 4.1.2; cilj veličine fajla ~100–150 ln.
- **4.1.2:** replay dugme ima jedinstveno ime po retku
  (`dashboard.outbox.replayForEvent`, `{{eventId}}`), ne isto „Ponovi" u svakom redu.
- **Paritet outboxa:** endpoint, `confirmAtLeastOnce: true`, `AbortController`,
  `refreshKey` i role gate (`SYSTEM_ADMIN`/`OWNER` u `Dashboard.tsx`) su preneseni
  1:1 — upoređeno s `git show HEAD:…` prije commit-a.

### ⚠️ Nalaz: D9 iz plana je pogrešan (nije implementiran)

Plan [`04_phase-1-dashboard.md`](04_phase-1-dashboard.md) tvrdi (linija 74) da
dodavanje error stanja „nije novi feature nego isto stanje koje danas prikazuje
**prazan ekran**". **Provjereno i netačno.**

`use-dashboard-data.ts` ima `.catch(() => …)` fallback na **svih 8** `api.get(...)`
poziva (`{ data: { total: 0 } }`, `{ data: [] }`, `{ data: null }`) i
`.finally(() => setLoading(false))`. Zato `Promise.all` **nikad ne odbija**,
`setStats` se uvijek izvrši, a `Dashboard.tsx` nema error granu.

Posljedica: pri **potpunom** padu backenda dashboard prikazuje **nule koje izgledaju
kao stvarni podaci** — gore od praznog ekrana, jer je tiho. Ispravka zahtijeva
izmijenu `use-dashboard-data.ts`, koji je zakucan `dashboard-count-contract.test.mjs`,
i mijenja vidljivo ponašanje. Zato D9 **nije implementiran** — po napomeni samog plana
(„označiti i pitati prije implementacije") i po ograničenju „funkcionalnost identična".

### Izmjene postojećih testova (garancija zadržana)

- **`dashboard-i18n.test.mjs`** — `sources[4]` je sada **spoj** četiri outbox fajla
  umjesto jednog. Sve četiri asertcije (`/api/reservations/ops/outbox`,
  `confirmAtLeastOnce: true`, `replayAcknowledged`, `event.status === 'DEAD_LETTER'`)
  ostaju **nepromijenjene**; garancija „gate + auditan at-least-once replay" je ista,
  samo je raspoređena na nove module. **4/4 PASS.**
- **`templates-a11y.test.mjs`** — dvije asertcije repointovane:
  (1) `{t(status.labelKey)}` → `{label ?? t(status.labelKey)}` jer je `label` opciono
  prepisivanje za dinamičke statuse s fallback-om; tekst je i dalje uvijek prisutan.
  (2) brojanje `labelKey` ograničeno na `reservationStatusMap` (i dalje **tačno 11**),
  a fallback ključ `resolveReservationStatus` se provjerava **zasebno** u oba jezika.
  Garancija nije oslabljena, pokrivenost je veća. **9/9 PASS.**

### Novi testovi

| Skripta | Asertcija | Rezultat |
|---|---|---|
| `test:dashboard-stat-parity` | formule, izvori brojača, bez `slate`/hex u cijelom dashboardu | **6/6** |
| `test:dashboard-states` | loading/empty/error najavljeni; outbox hook postavlja `failed` | **7/7** |
| `test:dashboard-a11y` | jedan `<h1>`, `<ul>`/`<li>`, `<caption>`+`scope`, `<time datetime>`, jedinstvena imena akcija | **9/9** |

Sva tri su dodana u `frontend/package.json` i kao zasebni koraci u `.github/workflows/ci.yml`.

### Izmjereno nakon faze 1

| Provjera | Rezultat |
|---|---|
| `npm run build` | **PASS** — **272.2 KiB gzip** (budžet 300; nepromijenjeno od faze 0) |
| `test:*` skripte | **147/147 PASS** (bilo 144; +3 nova dashboard testa) |
| `check_i18n.py --strict` | **PASS** — 2615/2615 (bilo 2611; +`dashboard.netPositive`, `netNegative`, `pendingReviewsAttention`, `outbox.replayForEvent`) |
| `check_ui_contrast.py --strict` | **PASS** — 80/80 parova |
| `check_repo_hygiene.py` | **PASS** |
| `check_doc_links.py` | **PASS** |

### Otvoreno (nije verifikovano u renderu)

🟡 **Nije provjereno u browseru:** stvarni prikaz `StatGrid` rasporeda na 2/4/5 kolona,
card-mod `DataTable` ispod 640px, vizuelni izgled `tone` tonova, `PageHeader` poravnanje
s akcijama. Ovo su source-level dokazi (testovi + proračun kontrasta), ne audit
renderovanog UI-ja.

❌ **D9 (error stanje + retry)** — namjerno **nije** implementirano; čeka odluku vlasnika.

---

## 2026-11-08 — REGRESIJA iz faze 1: runtime pad `DataTable` (ispravljeno)

### Šta se desilo

Vlasnik je prijavio production pad:

```
TypeError: Cannot read properties of undefined (reading 'direction')
    at Dashboard-CRomWNhV.js:51:6467
    at [Array.map] (<anonymous>)
```

Uzrok u `data-table.tsx`:

```tsx
const isSorted = sort?.key === column.sortKey
const direction = isSorted ? sort!.direction : null
```

`sort` je opciono. Za kolonu **bez** `sortKey` i poziv **bez** `sort` dobije se
`undefined === undefined` → `isSorted === true` → `sort!.direction` → **TypeError**.
Dashboard tabele (`recent-reservations`, `outbox-events-table`) upravo tako zovu
`DataTable`, pa je svaka od njih padala pri renderu.

### Zašto testovi nisu uhvatili

**Ovo je procesni propust, ne samo greška u kodu.** Svi postojeći a11y testovi
(`templates-a11y`, `dashboard-a11y`, `shell-a11y`) čitaju **tekst izvora** regex-om.
Nijedan nikad ne renderuje komponentu, pa runtime pad ne mogu detektovati. Faza 1 je
prošla s **147/147 zelenih** i 4/4 gateova, a dashboard je bio neupotrebljiv.

### Ispravka

1. **Kod:** `direction` se sada računa bez non-null asertije:
   ```tsx
   const direction =
     sort && column.sortKey && sort.key === column.sortKey ? sort.direction : null
   ```
   `sort!` je uklonjen iz fajla.

2. **Proces — novi `test:admin-render-smoke` (32 scenarija).** Pravi render, ne regex:
   esbuild bundle-uje komponente, `react-dom/server` ih renderuje. Pokriva `DataTable`
   (bez `sort`, sa `sort` asc/desc, `sort` na drugoj koloni, loading/error/empty),
   `StatCard` (svi tonovi, s/bez trenda), `StatGrid`, `PageHeader`, `FilterBar`,
   `TablePagination` (prva/srednja/total 0), `FormSection`, `StatusBadge` (svi statusi
   + nepoznat fallback), data states, i **dashboard feature komponente**
   (`DashboardFinanceStats`, `DashboardOpsStats`, `DashboardRecentReservations`).

   **Dokaz da test radi:** pokrenut **prije** popravke pao je na **6/32** s tačno
   production porukom `Cannot read properties of undefined (reading 'direction')`,
   uključujući `DashboardRecentReservations`. Nakon popravke **32/32**.

   Registrisan u `frontend/package.json` **i** `.github/workflows/ci.yml` (korak
   „Render admin templates and dashboard"), tako da ubuduće **nijedna** faza ne može
   proći s komponentom koja pada pri renderu.

### Izmjereno nakon ispravke

| Provjera | Rezultat |
|---|---|
| `npm run build` | **PASS** — 272.2 KiB gzip |
| `test:*` skripte | **148/148 PASS** (bilo 147; +`test:admin-render-smoke`) |
| `test:admin-render-smoke` | **32/32** (prije popravke 26/32) |
| `check_i18n` / `check_ui_contrast` / `check_repo_hygiene` / `check_doc_links` | **PASS** / **80/80** / **PASS** / **670-202** |

### Pouka za ostale faze

Statički (regex) testovi dokazuju **prisustvo markupa**, ne **ispravnost izvršavanja**.
Od faze 2 nadalje svaki modul koji uvodi nove komponente mora imati barem jedan
render scenario u `render-smoke.test.mjs` — to je sada kapija, ne preporuka.

---

## Faza 2 — Rezervacije (commit 1: lista)

### Opseg

`frontend/src/pages/Reservations.tsx` (660 → 675 ln) + novi modul
`frontend/src/features/reservations/reservation-status-view.ts` (40 ln).
**Netaknuto (parity ugovor):** `status.ts`, `reservation-list.api.ts`, `types.ts`.

### Audit koji je opovrgnuo plan

Prije izmjena je proveden audit samog modula. **Dvije tvrdnje iz `05_phase-2-reservations.md`
nisu tačne** i zato nisu implementirane:

| Tvrdnja plana | Stvarno stanje (izmjereno) |
|---|---|
| D10: „`Search` ikona `text-slate-400`" u listi | `text-slate-400` postoji **samo** u `ReservationScheduler.tsx:1054`; u listi ga nema |
| D3: tabeli treba dodati `caption` + `scope="col"` | Tabela liste **već ima** `<caption className="sr-only">` i tačno **8×** `scope="col"` |

Radeni su samo defekti koji su **stvarno izmjereni** u izvornom kodu.

### Izmjene

| WCAG | Izmjena |
|---|---|
| **1.4.1** | `<Badge variant={getStatusBadgeVariant(...)}>` (boja-only, `text-[10px]`) → `<StatusBadge>` (ikona + tekst + ton) na **3** mjesta; `getStatusBadgeVariant` (13 ln duplirane logike) obrisan kao mrtav kod |
| **1.4.3** | **55** zamjena cijelih `className` vrijednosti: `slate/emerald/rose/amber/blue-*` → `content/content-muted/content-strong/surface/surface-muted/line/ok-foreground/bad-foreground/info-foreground/warn/danger`. Rezultat: **0** sirovih paletnih klasa u fajlu |
| **2.4.1** | Paginacija više nije anonimni `<div>` — sada `<nav aria-label={t('table.pagination')}>` |
| **2.4.6** | Ručni `<h1>` blok → dijeljeni `PageHeader` (jedinstveni `h1` + actions slot) |
| **2.5.5/2.5.8** | Dugme „Detalji" `h-8 w-8` (32 px) → primitiv `size="icon"` (40 px) |
| **4.1.3** | Socket osvježavanje više nije tiho: `handleSocketRefresh` puni `role="status"` live region; indikator stranice `{page+1}/{totalPages}` dobio `role="status" aria-live="polite"` + `tabular-nums` |
| **1.4.4** | `text-[10px]` (3×) → `text-xs` (12 px), minimum dizajn sistema |
| — | Cancel dugme: hardkodirane `rose-*` klase → `variant="danger"` (5.22:1, verificirano u fazi 0) |

### Novi i18n ključ

`reservations.adminList.autoRefreshed` (BS + EN) — **2615 → 2616**.

### Promjena testa (opravdanje)

`admin-reservations-list-page-i18n.test.mjs` je rezao `listMarkup` od literala
`<div className="mb-4 flex flex-wrap items-center justify-between gap-3">`. Taj `div` je
zamijenjen `PageHeader`-om pa je `indexOf` vratio `-1`. **Anchor je repointan na `<PageHeader`,
garantija je nepromijenjena** — i dalje se reže isključivo markup liste (od zaglavlja do
detaljnog dijaloga), tako da se ključevi detaljnog dijaloga ne mogu prokrijumčariti u assertion.
Nijedan assertion nije oslabljen.

### Dokaz izvršavanja (nije samo regex)

Po pravilu uvedenom nakon production pada, nova logika je **izvršena**, ne samo pregledana.
Dodana su **4 render scenarija** u `render-smoke.test.mjs`:

1. `reservationStatusDescriptor` za svih **11** statusa iz `status.ts`
2. specijalni slučaj `CANCELLED_BY_CLIENT` + `'Nije potvrđen dolazak u roku'` → `CANCELLED_UNCONFIRMED_ATTENDANCE`
3. nepoznat status ne pada (neutralni fallback)
4. `effectiveReservationStatus` mapiranje (3 asertirane grane)

Scenarij 2 je upravo onaj koji je u fazi 1 prošao neprimijećen: posebna logika labela koja se
lako izgubi pri refaktoru. **`render-smoke`: 32 → 36/36.**

> Usputna greška uhvaćena vlastitom kapijom: prvi pokušaj scenarija koristio je backtick
> template-literal **unutar** `ENTRY` stringa (koji je sam backtick literal), što je prerano
> zatvorilo string i dalo `SyntaxError`. Kapija je to uhvatila prije commit-a.

### Izmjereno

| Provjera | Rezultat |
|---|---|
| `npm run build` | **PASS** — 272.3 KiB gzip (budget 300) |
| `ReservationsCalendar` chunk | **94.6 KiB gzip** (budget 125) — parity zadovoljen |
| `test:*` skripte | **148/148 PASS** |
| `test:admin-render-smoke` | **36/36** (bilo 32) |
| `check_i18n --strict` | **PASS** — 2616/2616 |
| `check_ui_contrast --strict` | **PASS** — 80/80 |
| `check_repo_hygiene` / `check_doc_links` | **PASS** / **PASS** |

---

## Faza 2 — Rezervacije (commit 2: kalendar)

### Opseg

`frontend/src/features/reservations/components/ReservationScheduler.tsx`
(1196 ln, +84/−78). **Netaknuto:** `status.ts`, `reservation-list.api.ts`, `types.ts`;
potpisi `onMoveRequest` / `onResizeRequest` i redoslijed polja u payloadu nepromijenjeni.

### Nalaz verificiran iz izvora biblioteke (`react-big-calendar` 1.20.0)

Umjesto pretpostavki iz plana, pročitani su fajlovi biblioteke:

| Prikaz | Fokusabilnost eventa | Izvor |
|---|---|---|
| `timeGridWeek` / `timeGridDay` | **DA** — `tabIndex: 0` | `TimeGridEvent.js:65` |
| `dayGridMonth` | **NE** — `props` se širi bez `tabIndex` | `EventCell.js:75-93` |
| `agenda` | **NE** — `<td onClick>` | `Agenda.js:65-72` |

Oba fokusablena puta žicaju `onKeyDown → onKeyPress → onKeyPressEvent`
(`EventCell.js:91`, `TimeGridEvent.js:69`), ali scheduler **nije prosljeđivao
`onKeyPressEvent`** (`grep -c` = **0**). Znak/Enter na fokusiranom eventu nije radio ništa.

### Izmjene

| WCAG | Izmjena |
|---|---|
| **2.1.1** | Dodan `onKeyPressEvent`: Enter/Space na fokusiranom eventu otvara detalje. Time week/day prikaz postaje upotrebljiv tastaturom, a s njim i drawer s formom za pomjeranje |
| **1.4.3** | Event tekst: uklonjen `opacity-80`. **Izmjereno:** amber event (PENDING) s `opacity-80` = **4.41:1 → FAIL**; bez njega **6.84:1 → PASS**. Ostali: emerald 7.29, rose 7.30, brand 8.15, slate 16.30 |
| **1.4.4** | `text-[10px]` (3×) i `text-[11px]` (1×) → `text-xs` (12 px minimum) |
| **1.4.11** | Status swatchevi u legendi: `bg-emerald-500` **2.54:1 FAIL** → `bg-ok-foreground` 7.13:1; `bg-amber-500` **2.15:1 FAIL** → `bg-warn-foreground` 8.34:1; `bg-rose-500` 3.67:1 → `bg-bad-foreground` 8.31:1 |
| **1.4.3** | **79** zamjena className vrijednosti (59 literalnih + 20 u ternary izrazima): `slate/emerald/rose/amber-*` → semantički tokeni. Rezultat: **0** sirovih paletnih klasa u fajlu |

### Namjerno NIJE dirano

`opacity-80` na booking-mode dugmadima (linije ~952, ~966) je **izračunat i prolazi**:
neizabrano `slate-700 @80%` na bijeloj = **5.74:1**, izabrano `white @80%` na `slate-900`
= **11.67:1**. Nije defekt, pa nije mijenjan.

### Ograničenje koje nije riješeno (iskreno)

**Mjesečni (`dayGridMonth`) i agenda prikaz i dalje nisu dostupni tastaturom** —
`EventCell.js` i `Agenda.js` ne postavljaju `tabIndex`, a to se ne može ubaciti kroz
`eventPropGetter` (RBC iz njega čita samo `style` i `className`).

Razmatrana je alternativa: učiniti `components.event` fokusabilnim `<button>`-om (radi u
sva 4 prikaza). **Odbijeno** jer bi dugme progutalo `mousedown` koji `withDragAndDrop`
koristi za inicijaciju prevlačenja, a drag&drop se u ovom okruženju ne može interaktivno
testirati — rizik po parity „funkcionalnost ostaje identična" je prevelik.

Praktična mitigacija koja **jeste** uspostavljena: week/day prikaz je sada puno dostupan
tastaturom i vodi u isti drawer s istom formom (`reservationDate` / `startTime` / `endTime`
→ `onMoveRequest`), pa tastaturska alternativa za 2.5.7 postoji i funkcionalna je.
Dugme za prebacivanje prikaza je pravo `<button>`, dakle dostupno.

**Ostaje otvoreno** za fazu 13 (Playwright/axe): treba potvrditi da mjesečni prikaz zaista
nema fokusabilan event, i tada riješiti ili custom `eventWrapper`-om ili vlastitom listom.

### Izmjereno

| Provjera | Rezultat |
|---|---|
| `npm run build` | **PASS** — 272.4 KiB gzip (budget 300) |
| `ReservationsCalendar` chunk | **95.0 KiB gzip** (budget 125) — parity zadovoljen |
| `test:*` skripte | **148/148 PASS** |
| `test:admin-render-smoke` | **36/36** |
| `check_i18n` / `check_ui_contrast` / `check_repo_hygiene` / `check_doc_links` | **PASS** / **80/80** / **PASS** / **670-202** |

---

## Faza 2 — Rezervacije (commit 3: drawer-i)

### Opseg

`frontend/src/features/reservations/components/ReservationScheduler.tsx` (+890 B).
Ugovorni test `admin-calendar-drawer-accessibility` **2/2 PASS** bez izmjene.

### Nalaz verificiran iz izvora

Brojanje je ispravilo moju raniju procjenu: drawer ima **11 `<Label>`**, **11 `<Input>`**
i **2 `<Textarea>`** (13 kontrola, ne 13 labela). Prije izmjene `htmlFor` se u fajlu
pojavljivao **0 puta**, a `<Label>` i `<Input>` su bili **susedi unutar `<div className="space-y-2">`**,
ne ugniježdeni — dakle nije postojala ni implicitna ni eksplicitna asocijacija.

Prvo je provjereno da je izmjena izvediva bez diranja dijeljenih primitiva:
`label.tsx` je Radix `LabelPrimitive.Root` sa `{...props}` (prosljeđuje `htmlFor`),
`input.tsx` širi `{...props}` na `<input>` (prosljeđuje `id`).

### Izmjene

| WCAG | Izmjena |
|---|---|
| **1.3.1 / 4.1.2** | **9** parova `<Label htmlFor>` ↔ `<Input id>`: `res-details-date/-start/-end`, `res-create-client/-service/-date/-start/-end/-note` |
| **1.3.1** | **2** labele koje opisuju **grupu dugmadi** (booking mode, stylist) dobile `id`, a kontejner `role="group"` + `aria-labelledby` — ranije su bile „viseće" labele bez ikakve veze s kontrolom |
| **3.3.2** | `Textarea` za razlog otkazivanja imao je **samo placeholder** (placeholder nestaje pri kucanju i nije zamjena za labelu). Naslov `cancelTitle` je dobio `id="res-details-cancel-title"`, a Textarea `aria-labelledby` koji pokazuje na njega — ime postaje identično vidljivom tekstu (**2.5.3**) |

Ukupno: **11/11 labela asocirano**, `htmlFor` 0 → **9**, `aria-labelledby` 0 → **3**.

### Namjerno nepotpuno (dokumentovano)

Grupa booking-mode i grupa stylist-a su **međusobno isključivi izbori**, pa bi semantički
najtačniji bio `role="radiogroup"` + `role="radio"` + roving tabindex + navigacija strelicama.
**Nije implementirano** jer se ne može interaktivno testirati u ovom okruženju, a nepotpun
radiogroup je gori od `role="group"`. Dugmad su pravi `<button>` elementi i **sva su
dostupna Tab-om**, pa 2.1.1 nije narušen. Ostaje za fazu 13.

### Nije dirano

`label.tsx` i `input.tsx` i dalje nose sirovu paletu (`text-slate-700 dark:text-slate-200`,
`bg-white … dark:bg-slate-950`). **Namjerno**: oba su dijeljena s javnim sajtom
(7 uvoznika za `Input`), a `02_design-system.md:69` zahtijeva da javni sajt ostane vizuelno
identičan. Migracija ovih primitiva je zaseban korak koji mora uključiti javni sajt.

### Izmjereno

| Provjera | Rezultat |
|---|---|
| `test:admin-calendar-drawer-accessibility` | **2/2 PASS** (ugovor netaknut) |
| `npm run build` | **PASS** — 272.3 KiB gzip (budget 300) |
| `ReservationsCalendar` chunk | **95.2 KiB gzip** (budget 125) |
| `test:*` | **148/148 PASS** |
| `test:admin-render-smoke` | **36/36** |
| 4 python gate-a | **PASS** / **80/80** / **PASS** / **670-202** |

---

## Faza 2 — Rezervacije (commit 4: filteri + ispravka vlastitog audita)

### Ispravka dvije tvrdnje iz mog ranijeg audita

Audit u ovoj fazi je vođen iz izvora, a ne iz plana, i **dvije moje ranije tvrdnje su pale**:

1. **„`eventPropGetter` je stvarni 1.4.1 prekršaj jer eventi renderuju samo `event.title`" — NETOČNO.**
   `SchedulerEventContent` (ln 72-76) renderuje status **i kao tekst**:
   `t(reservationStatusTranslationKey(event.status, …))`. Boja iz `eventPropGetter`
   (ln 460-476) je dakle **redundantna potvrda**, ne jedini nosilac informacije.
   **1.4.1 nije prekršen i taj „popravak" nije urađen.**

2. **„`reservation-filters.tsx` ima 5 sirovih boja" — neprecizno.** Fajl ima **jedan**
   `<select>` (ln 77) koji sadrži 5 paletnih tokena. `Label htmlFor` asocijacije
   (`res-from`, `res-to`, `res-status`, `res-client`) su tamo već bile uredne.

### Stvarni defekt koji je popravljen (1.4.11)

`<select>` je koristio `border-slate-200`, dok njegovi **susedni** `<Input>` elementi
koriste `border-input-border`. Razlika je odlučujuća:

| Okvir | Boja | Kontrast na `#FFFFFF` | 1.4.11 (3:1) |
|---|---|---|---|
| `select` **prije** | `#E2E8F0` | **1.23:1** | **FAIL** |
| `Input` van `.admin-shell` | `#E2E8F0` | 1.23:1 | FAIL |
| `Input` **u** `.admin-shell` → `--control-border` | `#767B86` | **4.24:1** | **PASS** |

`--input-border` je namjerno dvojak (`globals.css:45-49`): default ostaje slate-200 da javni
sajt bude netaknut, a **unutar `.admin-shell` se prebacuje na `--control-border`** (`globals.css:218`).
`<select>` je bio jedini koji tu popravku **nikad nije dobijao** — ostao je na 1.23:1
upravo pored inputa koji imaju 4.24:1.

Sigurno za javni sajt: `reservation-filters.tsx` ima **tačno jednog** koristnika —
`pages/Reservations.tsx` (admin), provjereno grep-om.

### Izmjene

`reservation-filters.tsx` (−97 B): `border-slate-200` → `border-input-border`,
`bg-white` → `bg-surface`, `text-slate-900` → `text-content`, uklonjene mrtve `dark:` varijante
(tokeni su već tematski svjesni kroz `.dark` blok). Rezultat: **0** sirovih paletnih klasa u fajlu.

### Odluka: razbijanje `ReservationScheduler.tsx` (1196 ln) NIJE urađeno

Plan §4 traži razbijanje na 7 fajlova (`scheduler/*`). **Nije izvršeno**, namjerno:

- Dva ugovorna testa čitaju fajl **po putanji**: `admin-calendar-drawer-accessibility.test.mjs:5`
  i `admin-reservations-calendar-i18n.test.mjs:9` (`readFileSync(new URL('./components/ReservationScheduler.tsx', …))`).
  Razbijanje ih lomi, a jedina mitigacija (`.join('\n')` više fajlova u isti slot) **slabi ugovor** —
  test bi prolazio i kad se sadržaj premjesti između fajlova, što je upravo garancija koju
  čitanje po putanji daje.
- Razbijanje je **čisto strukturno**: ne donosi nijednu a11y ili funkcionalnu vrijednost.
- Površina je **interaktivna i netestabilna ovdje** (drag&drop preko `withDragAndDrop`).
  Već je dokumentovano da se DnD ne može provjeriti u ovom okruženju; premještanje koda
  koji upravlja `onEventDrop`/`onEventResize` bez te provjere je neopravdan rizik po parity.

Preporuka: razbijanje odraditi **uz** Playwright/axe harness (faza 13), kada se regresija
može dokazati, a ne naslijepo.

### Izmjereno

| Provjera | Rezultat |
|---|---|
| `npm run build` | **PASS** — 272.4 KiB gzip (budget 300) |
| `ReservationsCalendar` chunk | **95.2 KiB gzip** (budget 125) |
| `test:*` | **148/148 PASS** |
| 4 python gate-a | **PASS** / **80/80** / **PASS** / **670-202** |

---

## Faza 3 — Dnevna knjiga (commit 1)

### Opseg

`frontend/src/features/daily-log/` — 10 produkcijskih `.tsx` fajlova (12 fajlova u diffu,
+113/−98) + 2 lokala (+1/+1). **Netaknuto:** `entry-status-label.ts`, `amounts.ts`,
`date-range.ts`, `types.ts`, `use-daily-log-data.ts`, `use-daily-log-mutations.ts`,
`form-helpers.ts`, `use-daily-log-form.ts` (logika).

### Izmjene

| WCAG | Izmjena |
|---|---|
| **1.3.1 / 4.1.2** | **12** `htmlFor` ↔ `id` parova u modulu (bilo 4). `entry-form-fields`: stylist, client, services, date, status, notes. `pricing-panel`: amountPaid. `entry-delete-dialog`: reason |
| **1.3.1** | `pricing-panel` Label nad **grupom** servisa (`map`) dobio `id`, kontejner `role="group"` + `aria-labelledby` |
| **1.3.1** | `entry-form-fields` loyalty Label (stoji nad **uslovnim** `Input`-om) dobio `id`, a Input `aria-labelledby` — radi i kad Input postoji i kad ne |
| **1.3.1** | `entry-table`: dodan `<caption className="sr-only">` i `scope="col"` na **svih 12** `<th>` (bilo 0 i 0) |
| **1.4.11** | 2× `text-slate-400` Search ikona → `text-content-muted` (2.56:1 → 5.61:1) |
| **1.4.11** | 2× `<select>` u `entry-form-fields` i 1× u `entry-filters`: `border-slate-200` (1.23:1) → `border-input-border`, koji se u `.admin-shell` diže na `--control-border` (4.24:1) |
| **1.4.4** | **5×** `text-[10px]` → `text-xs` (`entry-table` 3, `entry-detail-dialog` 2) |
| **1.4.3** | **48** zamjena cijelih `className` vrijednosti (31 distinct) → semantički tokeni |

**Rezultat: 0 sirovih paletnih klasa, 0 `text-[NNpx]`, 0 `text-slate-400` u cijelom modulu.**

### Izmjereno, pa **namjerno nije mijenjano**

| Mjesto | Solid | S `opacity` | Odluka |
|---|---|---|---|
| `entry-restore-dialog` info-kutija (info) | 8.01:1 | **5.01:1** | PASS |
| `entry-restore-dialog` info-kutija (neutral) | 9.90:1 | **5.58:1** | PASS |
| `entry-table` obrisani red `opacity-70` | — | **7.91:1** | PASS — **zadržano**, jer je vizuelni signal za soft-delete |

`opacity-80` u restore kutiji je **prolazio**, pa njegovo uklanjanje nije WCAG popravak
nego usklađivanje; `opacity-70` na obrisanom redu je ostao jer nosi značenje.

### Dvije greške koje je uhvatila vlastita provjera

1. **Broj `<th>` nije 13 nego 12.** Raniji `grep -c '<th'` brojao je i `</th>` linije.
   Asertcija `n1 + n2 == 13` je pala (`NASAO 7+5`) i **fajl nije zapisan**.
   Pouka: `grep -c` po linijama ≠ broj elemenata; koristiti `grep -o '<th ' | wc -l`.
2. **Otvorio sam `<div role="group">` bez zatvarajućeg `</div>`** u `pricing-panel.tsx`.
   Uhvaćeno provjerom div-balansa **prije** builda; ispravljeno na 9/9.

Uz to, jedna skripta je pala na Python `SyntaxError` (backslash u f-string izrazu) —
to je greška pri parsiranju, pa **ništa nije izvršeno**; potvrđeno provjerom stanja
prije/poslije (0 → 0).

### Novi i18n ključ

`dailyLog.table.caption` (bs/en) — **2617/2617 PASS**.

### Izmjereno

| Provjera | Rezultat |
|---|---|
| `npm run build` | **PASS** — 272.4 KiB gzip (budget 300) |
| `test:*` | **148/148 PASS** |
| `check_i18n` | **PASS** — 2617/2617 |
| `check_ui_contrast` / `check_repo_hygiene` / `check_doc_links` | **80/80** / **PASS** / **670-202** |

---

## Faza 3 — Dnevna knjiga (commit 2: combobox pickeri)

### Opseg

`entry-form-fields.tsx` (+113/−6), novi `daily-log-form-a11y.test.mjs` (14 asertacija),
`package.json` (+1 script), `.github/workflows/ci.yml` (+1 korak), daily-log `CHANGELOG.md`.

### Nalaz: pickeri su bili nedostupni tastaturom

Iz izvora: `<li>` opcije u **oba** pickera imale su `onClick` i `onMouseDown preventDefault`,
ali **ni `tabIndex`, ni `role`, ni `onKeyDown`**. Tastaturni korisnik nije mogao izabrati
klijenta ni servis — ovo je **2.1.1**, ne samo 4.1.2 iz plana §5.

Za razliku od `react-big-calendar` slučaja iz faze 2, ovo je **naš kod** i izmjena je
**čisto aditivna**: `onClick` i `onMouseDown` su ostali nepromijenjeni (test to asertuje).

### Izmjene

| WCAG | Izmjena |
|---|---|
| **2.1.1 / 4.1.2** | Oba pickera → combobox: input dobija `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant`; `<ul>` dobija `role="listbox"` + `id`; svaki `<li>` dobija `role="option"`, `id`, `aria-selected` |
| **2.1.1** | `onKeyDown` s ArrowDown/ArrowUp/Home/End (kroz zajednički `stepIndex`), Enter (izbor) i Escape (zatvaranje). `e.preventDefault()` na svim granama — bez toga Enter submitira formu |
| **4.1.2** | Service picker je `aria-multiselectable="true"` s `aria-selected={form.serviceIds.includes(svc.id)}` (odražava izbor, ne tastaturski fokus); client picker je jednostruki izbor |

Stanje navigacije je **lokalno UI stanje** (`useState(-1)`) — ne dira poslovno stanje forme,
koje i dalje dolazi isključivo iz props-a.

### Novi test (§7) — i njegovo ograničenje

`test:daily-log-form-a11y` (14 asertacija, **14/14 PASS**), uključen u `package.json` i CI.
Suite je porastao **148 → 149**.

Test namjerno provjerava **ožičenje**, ne samo prisustvo atributa: da prefiks u
`aria-activedescendant` odgovara prefiksu u `id` opcije (ako se raziđu, čitač ekrana gubi
aktivnu opciju), da broj `aria-selected` odgovara broju `role="option"`, da su sve tipke
pokrivene, i da mouse ponašanje nije uklonjeno.

**Iskreno: test NE renderuje komponentu.** Cijeli daily-log modul testira regex-čitanjem
izvora, pa je i ovaj test takav. Tastatursko ponašanje comboboxa **nije verificirano
izvršavanjem** — ostaje za Playwright/axe (faza 13). Build PASS dokazuje samo da TypeScript
kompajlira.

### `MATRIX.md` namjerno NIJE mijenjan

DoD traži „`MATRIX.md` + `CHANGELOG.md` daily-log ažurirani", ali `MATRIX.md` dokumentuje
**poslovnu logiku** (statusi, prelazi, dozvole, nuspojave). Ove izmjene su isključivo
prezentacijske. Potvrda: **`amounts.ts` ima nula diff-a**, a `entry-status-label.ts`,
`types.ts`, `use-daily-log-data.ts`, `use-daily-log-mutations.ts`, `form-helpers.ts` i
`use-daily-log-form.ts` su netaknuti. Upisivanje a11y bilješki u poslovnu matricu bi je
zagađivalo, pa je bilješka otišla u daily-log `CHANGELOG.md`.

### Jedna greška koju je uhvatila asertcija

Prvi pokušaj umetanja CI koraka je pao: moj regex je očekivao `run:` odmah nakon `- name:`,
a stvarni koraci imaju `working-directory: frontend` između. Asertcija je to uhvatila,
ništa nije zapisano; ispravljeno čitanjem stvarnog formata.

### Izmjereno

| Provjera | Rezultat |
|---|---|
| `npm run build` | **PASS** — 272.4 KiB gzip (budget 300) |
| `test:*` | **149/149 PASS** (bio 148) |
| `test:daily-log-form-a11y` | **14/14** |
| `amounts.ts` diff | **prazan** |
| `check_i18n` / `check_ui_contrast` / `check_repo_hygiene` / `check_doc_links` | **PASS** / **80/80** / **PASS** / **670-202** |

---

## Faza 3 — Dnevna knjiga: nalaz koji **opovrgava** planiranu stavku 3.3.1

Plan §5 navodi `3.3.1–3.3.4` kao WCAG stavke modula, a audit je našao **0 `aria-invalid`**,
**0 `aria-describedby`** i **0 `role="alert"`** u `features/daily-log/`. Na prvi pogled to
izgleda kao prekršaj 3.3.1. **Nije**, i zato `aria-invalid` / sažetak grešaka **nisu
implementirani**.

### Zašto

Validacija u `use-daily-log-form.ts:197-210` javlja greške preko `warning(...)`, koji dolazi
iz `useAppToast` → `toast.warning` iz biblioteke **sonner**. Prvi grep po našim fajlovima
(`lib/toast/toaster.tsx`, `lib/toast/useAppToast.ts`) nije našao nijedan `aria-live`, ali to
**nije dokaz** — ta dva fajla su samo omotači; markup renderuje sonner.

Provjera `frontend/node_modules/sonner/dist/index.mjs` (verzija **2.0.8**):

```
aria-live": "polite"          (1 pojavljivanje)
aria-atomic": "false"
aria-relevant": "additions text"
```

Dakle toast **ima live region** i greška se **najavljuje** čitaču ekrana. Poruke
(`dailyLog.form.validation.stylistAndServiceRequired`, `…paidAmountInvalid`,
`…debtsAmountInsufficient`, `…clientRequiredForDebt`) **imenuju polje u grešci**, što je
upravo ono što 3.3.1 traži („stavka u grešci je identifikovana i greška je opisana tekstom").

### Metoda — greška koju je trebalo izbjeći

Prvi grep je tražio literal `aria-live="polite"` s dvostrukim navodnicima. Minificirani React
bundle postavlja atribute kao **svojstva objekta** (`"aria-live":"polite"`), pa taj obrazac
**ne može** pogoditi. Prazan rezultat je bio artefakt obrasca, ne odsustvo atributa.
Ponovljeni labaviji grep (`aria-live` bez navodnika) našao ga je odmah.

**Pouka:** prije tvrdnje da atribut nedostaje, provjeriti i third-party izlaz, i koristiti
labavi obrazac. Isti obrazac greške se već pojavio s `node_modules/react-big-calendar/lib/Event.js`
(fajl ne postoji → grep prazan → pogrešan zaključak).

### Šta **jeste** slabije (ali nije WCAG prekršaj)

- Nema `aria-invalid` na polju, pa korisnik koji se kasnije vrati na polje ne saznaje da je u grešci
- Nema `aria-describedby` koji veže poruku uz polje
- Fokus se ne pomjera na polje u grešci

Ovo su poboljšanja, ne usklađenost. Ostavljeno svjesno; ako se ikad radi, treba ići uz
Playwright/axe (faza 13), ne naslijepo.

---

## 2026-11-08 — D9 (error stanja dashboarda) + `test:daily-log-amount-parity`

Odrađeno **prije** ulaska u fazu 4, po eksplicitnoj instrukciji vlasnika.

### D9 — dashboard više ne prikazuje nule kad backend padne

**Stanje prije (izvor, ne plan):** `use-dashboard-data.ts` ima **8** `api.get(…)` poziva i
**svaki** ima svoj `.catch(() => ({ data: … }))`. `Promise.all` zato **nikad ne odbacuje**,
`.finally(() => setLoading(false))` uvijek postavi `loading = false`, i `stats` bude popunjen
nulama. `Dashboard.tsx:18` ima samo `if (loading || !stats)` → skeleton; **error grane nema**.
Neto: potpuni pad backenda renderuje **nule koje izgledaju kao stvarni podaci**.

Plan (`04_phase-1-dashboard.md:74`) je tvrdio da pad daje „bijeli ekran". **To je netačno** —
`.catch()` na svakom pozivu sprječava reject. Popravka je zato drukčija od planirane.

**Odluka (hibrid, ne čista A/B/C):** padovi su **po endpointu, ne sve-ili-ništa**. Čista
opcija „prikaži error umjesto podataka" uništila bi 7 ispravnih brojeva zbog pada jednog
izvora. Zato:

- **djelimični pad** → `role="alert"` banner + ispravni podaci + retry
- **potpuni pad (svih 8)** → error stanje + retry, umjesto nula

**Izmjene:**

- `use-dashboard-data.ts`: `DASHBOARD_SOURCES` (8 ključeva) + `DASHBOARD_SOURCE_COUNT`;
  `const failed: string[] = []` unutar `loadData`; **svih 8** `.catch()` sada radi
  `failed.push(DASHBOARD_SOURCES.x)` pa vraća isti fallback kao prije; `setFailedSources(failed)`
  u `.then()`; return proširen s `failedSources`, `loadError` (= `failedSources.length >= 8`) i
  `reload: loadData`. **Fallback vrijednosti nisu dirane**, pa se ponašanje pri djelimičnom padu
  nije promijenilo.
- `pages/Dashboard.tsx`: `loadError` grana (`role="alert"` + `dashboard.loadError` + retry)
  **nakon** loading skeletona (jer `stats` nije null ni pri potpunom padu), i banner
  (`role="alert"` + `dashboard.partialLoadError` + retry) iznad `<DashboardFinanceStats>`.
- i18n: `dashboard.loadError` + `dashboard.partialLoadError` u oba lokala → **2619/2619**.
  `common.retry` već postoji (bs „Pokušaj ponovo" / en „Try again").

**Ugovor nije slomljen:** `dashboard-count-contract.test.mjs` zaključava putanje, `params`,
`summaryCount(…)` pozive i `doesNotMatch` obrasce, ali **ne zaključava `.catch()` rukovaoce** —
provjereno čitanjem fajla prije izmjene. **2/2 PASS** nakon izmjene.

**Verifikacija izvršavanjem, ne regexom:** dodana 3 scenarija + 3 asertivna testa u
`render-smoke.test.mjs`. Hook i `useAuth` su stubovani esbuild pluginom, stanje hooka se čita s
`globalThis.__dashboardState`. Rezultat **42/42** (bilo 36), uz:

```
ok 2 - D9: Dashboard prikazuje error stanje kad padnu svi izvori
ok 3 - D9: djelimični pad daje banner ali zadržava ispravne brojeve
ok 4 - D9: bez ijednog pada nema banner-a ni error stanja
ok 37/38/39 - renderuje bez pada: (tri nova scenarija)
```

Grane su se **stvarno renderovale** — nije samo kompajliralo.

**Dva pada usput (oba u harnessu, ne u produkciji):**

1. `Could not resolve "../../../pages/Dashboard"` — `resolveDir` je `features/shell/admin/ui`,
   pa `../../..` daje `features`, ne `src`. Postojeći importi koriste 3 nivoa jer ciljaju unutar
   `features/`; `pages/` je jedan više → `../../../../pages/Dashboard`.
2. `ReferenceError: localStorage is not defined` pa `TypeError: Cannot read properties of
   undefined (reading 'VITE_API_URL')` — `Dashboard.tsx` transitivno vuče auth store i
   `api/client.ts`, koji pri inicijalizaciji modula čitaju `localStorage` i `import.meta.env`.
   Riješeno `localStorage` shimom **prije** `require`-a bundle-a i
   `define: { 'import.meta.env': … }` u esbuild konfiguraciji.

### `test:daily-log-amount-parity` — novčana matematika usklađena između frontend i backend

Plan (`06_phase-3-daily-log.md:67`) samo **imenuje** test, bez specifikacije. Značenje je
izvedeno iz izvora.

**Nalaz:** iznosi se računaju **na oba kraja**. Backend ima `daily-log/daily-log.amounts.ts`
(`getServiceAmount(actualPrice, tipAmount)`) i `daily-log/daily-log.pricing.ts`
(`computeTipAndShortfall`, `computeDebtPaymentTip`); frontend ima `features/daily-log/amounts.ts`
i `form-helpers.ts`. Ako se formule razdvoje, KIF i dnevnik prikazuju različite brojeve za isti
unos, a to se ne vidi dok neko ne uporedi papir i ekran.

**Konvencija (dokumentirana u backend modulu):** `actualPrice` = ukupno naplaćeno za usluge
(napojnica uključena); `serviceAmount` (KIF `amount`) = `actualPrice − tipAmount`.

**Paritetni invariant:** server računa `paidForServices = totalPaid − settledDebtsSum`
(`daily-log.service.ts:219`) i snima `actualPrice: paidForServices` (ln 238), dok frontend
rekonstruiše `getTotalAmount = actualPrice + settledDebtsSum`. Dakle **ukupni iznos koji UI
prikaže nakon snimanja jednak je onome što je operater upisao**.

**Usput ispravljena vlastita sumnja:** frontend šalje `actualPrice: paidRaw` (ukupno, s
dugovima), pa sam posumnjao da se dugovi broje dvaput. **Sumnja je pogrešna** — server ignoriše
taj `actualPrice` i računa vlastiti iz `paidAmount`. Bez čitanja `daily-log.service.ts:185-238`
to bi bilo prijavljeno kao defekt.

**Test (`daily-log-amount-parity.test.mjs`, 8 testova):** **izvršava stvarne module s oba kraja**
preko esbuild bundle-a (`feAmounts`, `beAmounts`, `bePricing`, `feFormHelpers`) — ništa nije
reimplementirano. `backend/node_modules` ne postoji, ali `daily-log.amounts.ts` ima **0 importa**,
pa se bundle-uje direktno; `@nestjs/common` (samo `BadRequestException` u pricing modulu) je
stubovan pluginom. Pokriveno: slaganje `getServiceAmount` na dosežnom domenu, paritet
upisano/prikazano, dekompozicija `total === services + tips + debts`, `tip <= actualPrice`,
slaganje formule napojnice forma↔server, clamp negativnih/NaN, dokumentirano razilaženje izvan
dosežnog domena, i zaključavanje konvencije u oba izvora.

**Dosežni domen je izveden iz serverovih validacija** (`totalPaid >= 0` ln 187,
`totalPaid >= settledDebtsSum` ln 212, `unitPrice >= 0` u `resolveServiceItems`), pa je
`tip = max(0, paidForServices − unitsSum) <= paidForServices` zagarantovan — zato invariant
vrijedi bez izuzetaka.

**Mutacijska provjera:** očekivani ukupni iznos namjerno pomaknut za +1 → **tačno test 2 pada**
(`not ok 2`), ostalih 7 ostaje zeleno. Test stvarno izvršava aritmetiku, ne prolazi празno.
Dodatno, test 7 tvrdi da se frontend i backend **razilaze** za `NaN` tip (backend 0, frontend
100) — to ne može proći ako je isti modul učitan dvaput.

### Registracija i verifikacija

- `frontend/package.json`: `test:daily-log-amount-parity` (ukupno **156** skripti)
- `.github/workflows/ci.yml`: korak „Test daily-log amount parity" (ln 485-487), s
  `working-directory: frontend` između `name` i `run`

| Provjera | Rezultat |
|---|---|
| `test:*` skripte | **150/150 PASS**, 0 fail |
| `test:daily-log-amount-parity` | **8/8 PASS** |
| `test:admin-render-smoke` | **42/42 PASS** (bilo 36) |
| `test:dashboard-count-contract` | **2/2 PASS** (ugovor netaknut) |
| `npm run build` | **PASS**, **272.5 KiB gzip** (budžet 300) |
| `check_i18n.py --strict` | **PASS** — 2619/2619 |
| `check_ui_contrast.py` | **PASS** — 80/80 |
| `check_repo_hygiene.py` | **PASS** — 1658 paths |
| `check_doc_links.py` | **PASS** — 670 linkova / 202 fajla |
| `features/daily-log/amounts.ts` | **bez diff-a** |
| `MATRIX.md` | **netaknut** (prezentacijske izmjene) |

**Ispravka izvještavanja:** ranije je rečeno „`test:*` 149/149". Skripta `test:all` **ne
postoji** — `package.json` ima pojedinačne `test:*` skripte bez agregatnog runnera. Pokretanje
`npm run test:all` dalo je prazan log uz exit 1. Brojka se odnosi na **broj skripti**, a sve se
moraju pokrenuti pojedinačno.

---

## 2026-11-08 — FAZA 4, commit 1: Finansije (D2/D4/D6/D10) + 2 nova testa

### Recon: plan je izvor, ne lista defekata — 4 stavke opovrgnute

Prije ijedne izmjene svaka D-stavka je provjerena u izvoru. Rezultat:

| Stavka | Presuda | Dokaz |
|---|---|---|
| D1 (promovisati `data-state`/`confirm-dialog`/`responsive-dialog`) | **već gotovo** | sva tri fajla u `finance/components/` su 8-linijski **re-export shimovi** na `features/shell/admin/ui/` (faza 0) |
| D2 (`SummaryCards` hint 2.56:1) | **tačno** | `summary-cards.tsx:38` `text-[11px] text-slate-400` |
| D3 (ton mijenja samo boju → dodati ikonu) | **OPVRGNUTO** | pozivna mjesta: `totalExpenses`→negative, `revenue`→default, `tips`→muted, `totalCollected`→positive. Labela **već tekstualno nosi značenje**; boja je suvišan naglasak, ne jedini nosilac. WCAG 1.4.1 se ne primjenjuje. Dodavanje ✓/✗ bi impliciralo prolaz/pad koji ne postoji |
| D4 (dije em-dash u `slate-400`) | **tačno** | `expense-attachments.tsx:51`, `income-entries-table.tsx:219` |
| D5 (`aria-sort` proširiti) | **tačno, ali zaključano** | `table-sort-accessibility.test.mjs:10` asertuje tačan izraz → nije dirano |
| D6 (caption/scope na sve tabele) | **preširoko** | `expense-table` 4/4 i `income-entries-table` 5/5 **već imaju** puno scope; zaostajala samo `expense-invoice-preview.tsx` (2 `<th>`, 0 scope, bez captiona) |
| D7 (`export-menu` `role="menu"`) | **OPVRGNUTO** | `export-menu.tsx` su dva `<Button>` s vidljivim tekstom CSV/PDF i `aria-hidden` ikonama. Nema menija; `role="menu"` ne pripada. 2.5.3 zadovoljen |
| D8 (`category-wizard-dialog` 3.3.7) | **OPVRGNUTO** | fajl (222 ln) nema nijedan `step` — jedan `ResponsiveDialog` s `onSubmit`, ne višekoračna forma |
| D9 (Dužnici repay/write-off → `ConfirmDialog`) | **pogrešno smješteno** | `pages/Debtors.tsx` (199 ln) je **read-only** (samo paginacija, ln 173-190). Repay UI je u `features/stylist-portal/pages/stylist-debts-page.tsx` → **faza 11**. `lookups.api.ts` exporti nemaju pozivaoca u frontendu |
| D10 (card prikaz ispod 640px) | **tačno, ali uzrok drugačiji** | vidi dolje |

### D10 — ispravka vlastite tvrdnje, dva puta

Prvo sam grepao **komponente** za `@media`/`data-label`, dobio prazno i zaključio „nema
card-mode". **Pogrešno** — card-mode je globalan u `frontend/src/index.css:23-45`.

Zatim sam grepao `className="data-table` i dobio **0 fajlova**, pa zaključio da je card-mode
**mrtav CSS**. **Opet pogrešno** — obrazac je bio preuzak: `data-table.tsx:73` renderuje
`<table className="app-table data-table w-full">`, a ln 117 postavlja `data-label={t(column.headerKey)}`.

**Stvarno stanje:** card-mode je živ za šablon `DataTable`, ali finance tabele nose **samo**
`app-table` i imaju **0 `data-label`** — pa za njih card-mode nije važio. Popravak: dodata
`data-table` klasa + `data-label` na svaku tbody ćeliju (16 ukupno: expense-table 6,
income-entries-table 8, expense-invoice-preview 2). `tfoot` ne treba `data-label` jer CSS
cilja `tbody td::before`.

### Kontrast: 232 sirove klase ≠ 232 prekršaja

Izmjereno, ne pretpostavljeno. Od **232** pojavljivanja sirovih paletnih klasa (36 distinct),
stvarni prekršaji u light modu su **5**:

| fajl | ln | klasa | kontrast | prag | tip |
|---|---|---|---|---|---|
| `book-period-picker.tsx` | 89 | amber-600 | 3.19 | 4.5:1 | tekst 1.4.3 |
| `expense-attachments.tsx` | 51 | slate-400 | 2.56 | 4.5:1 | tekst 1.4.3 |
| `income-entries-table.tsx` | 219 | slate-400 | 2.56 | 4.5:1 | tekst 1.4.3 |
| `manual-entry-dialog.tsx` | 193 | amber-600 | 3.19 | 4.5:1 | tekst 1.4.3 |
| `manual-entry-dialog.tsx` | 161 | slate-400 | 2.56 | 3:1 | ikona (dekorativna) |
| `summary-cards.tsx` | 38 | slate-400 | 2.56 | 4.5:1 | tekst 1.4.3 (D2) |

**Tri korekcije vlastite brojke usput — sve tri u smjeru smanjenja:**

1. **`text-rose-500` (3.67) — svih 5 su `Trash2` ikone** s `aria-hidden`. Prag za netekstualnu
   grafiku je 1.4.11 = **3:1**, ne 4.5:1 → **svih 5 prolazi**. Prvobitno sam ih brojao kao FAIL.
2. **`dark:` varijante nisu light-mode padovi.** `book-list.tsx:62` je `text-slate-500
   dark:text-slate-400` → light klasa 4.76 **prolazi**; `history-panel.tsx:61` je
   `text-slate-600 dark:text-slate-300` → 7.58 **prolazi**. Ukupno 41 `dark:text-*`
   pojavljivanja je mrtav kod.
3. **`manual-entry-dialog.tsx:161` nije tvrdi prekršaj.** `Check` ikona se renderuje
   **bezuslovno za svaki red** u pickeru, ne samo za odabranog — dakle je dekoracija, a 1.4.11
   se odnosi na grafiku *neophodnu za razumijevanje*. Token swap je ipak urađen (jeftin).

`text-slate-500` (35×, **4.76**) i `text-rose-600` (3×, **4.70**) **prolaze** AA — nisu dirani
kao prekršaji.

### Izmjene

- `summary-cards.tsx`: 7 zamjena → `text-content`/`text-ok-foreground` (7.13)/`text-bad-foreground`
  (8.31)/`text-content-strong` (7.39)/`border-line`/`bg-surface`/`text-content-muted` (5.61);
  `text-[11px]` → `text-xs`. **0 sirovih paletnih klasa, 0 `text-[NNpx]`**.
- `book-period-picker.tsx`, `manual-entry-dialog.tsx` ×2: amber-600/slate-400 → tokeni
- D4: obje em-dash ćelije dobile token **i** `sr-only` kontekst (sama „—" čitaču ekrana ne
  znači ništa) — novi ključevi `finance.expenseForm.noAttachments`, `finance.incomeList.noActions`
- D6: `expense-invoice-preview.tsx` — `<caption className="sr-only">` + 2× `scope="col"`,
  novi ključ `finance.expenseList.invoiceItemsCaption`
- D10: 3 tabele — `app-table data-table` + 16 `data-label`

### Novi testovi (§7) — oba izvršavaju stvarni kod, oba mutacijski provjerena

**`test:finance-summary-parity` (5 testova)** — esbuild bundle izvršava `summarizeIncomeRows`
i `sumExpenses`, ništa nije reimplementirano. Zaključava `total === revenue + tips` (tri KIF
kartice moraju izlaziti na isto), da su `revenue`/`tips` zbir svojih kolona, prazan skup →
nule (ne NaN), i `sumExpenses` toleranciju na string/null/NaN.

**`test:finance-table-a11y` (8 testova)** — po fajlu zaključava caption + `scope` + `data-table`
klasu + tačan broj `data-label`, uz asertciju da `data-label` nije hardkodovan, i da
`index.css` card-mode i dalje cilja `table.data-table tbody td::before`.

**Mutacijska provjera (3/3 pala na predviđenom testu):**

| mutacija | pao | ostalo |
|---|---|---|
| `total +1` u summary-parity | `not ok 1` | 4 pass |
| `scope: 2→3` u table-a11y | `not ok 5` (invoice-preview) | 7 pass |
| `td: 6→5` u table-a11y | `not ok 2` (expense-table data-label) | 7 pass |

Usput: test 8 je pao jer sam napisao `../../../index.css` (→ `frontend/index.css`, ne postoji);
ispravno je `../../index.css` (→ `src/index.css`), potvrđeno `os.path.normpath`.

### Verifikacija

| Provjera | Rezultat |
|---|---|
| `test:*` skripte | **152/152 PASS**, 0 fail |
| `test:finance-summary-parity` | **5/5 PASS** |
| `test:finance-table-a11y` | **8/8 PASS** |
| `npm run build` | **PASS**, **272.6 KiB gzip** (budžet 300) |
| `check_i18n.py --strict` | **PASS** — 2622/2622 |
| `check_ui_contrast.py` | **PASS** — 80/80 |
| `check_repo_hygiene.py` | **PASS** — 1659 paths |
| `check_doc_links.py` | **PASS** — 670 linkova / 202 fajla |
| `finance.types.ts`, `api/*`, `hooks/*` | **bez diff-a** |
| `finance` / `client-debts` `MATRIX.md` | **netaknut** (prezentacijske izmjene) |
| `package.json` | 158 skripti (+2) |
| `ci.yml` | +2 koraka (ln 464-469) |

**Nije render-verificirano:** vizualno ponašanje card-modea ispod 640px (CSS media query;
potreban Playwright, faza 13). Strukturni uslovi su zaključani testom.

---

## 2026-11-08 — FAZA 4, commit 2: 1.4.11 okviri form kontrola + token migracija

### Recon: tri područja za koja se ispostavilo da NISU prekršaji

Prije commita 2 provjerena su preostala područja iz plana §5. Sva tri su **odbačena**,
ne implementirana:

**Tabovi (4.1.2) — nije prekršaj.** `finance-page.tsx` (61 ln) nema nijedan `role=`,
`aria-selected`, `aria-controls`, `tabIndex` ni `onKeyDown`. Ali koristi **Radix** primitiv:
`components/ui/tabs.tsx` je omotač nad `@radix-ui/react-tabs` (`TabsPrimitive.Root`/`.List`/
`.Trigger`), koji daje `role="tablist"`/`"tab"`/`"tabpanel"`, `aria-selected`, `aria-controls`
i tastaturnu navigaciju. **Prazan grep nije dokaz odsustva** — ista zamka kao sonner
`aria-live` u fazi 3.

**Statusne poruke (4.1.3) — već pokriveno.** `shell/admin/ui/data-state.tsx` ima
`TableSkeleton` → `role="status" aria-live="polite"` (ln 16) i `ErrorState` → `role="alert"`
(ln 71), a finance ih koristi. Uz to finance ima **10 vlastitih live regiona**:
`expense-dialog.tsx:98,103,109,224`, `book-period-picker.tsx:84`, `integrity-panel.tsx:45,103`,
`line-items-editor.tsx:61`, `expense-book-detail.tsx:300`, `category-wizard-dialog.tsx:215`.

**Greške u formama (3.3.1–3.3.4) — nije prekršaj.** `aria-invalid`/`aria-describedby` nema,
ali greške se **najavljuju** preko `role="alert"` (`expense-dialog.tsx:224`,
`category-wizard-dialog.tsx:215`). Identičan nalaz kao daily-log u fazi 3, gdje je 3.3.1
već bio zadovoljen live regionom. Neću implementirati popravku nepostojećeg defekta.

### Stvarni nalaz: 7 prekršaja WCAG 1.4.11 (okviri form kontrola)

Tražeći form kontrole sa sirovim slate okvirima — jer granica kontrole mora imati **3:1**
prema podlozi — nađeno je **7** stvarnih prekršaja. `border-slate-200` (#E2E8F0) je
**1.23:1**, `border-slate-300` (#CBD5E1) **1.48:1** na bijeloj.

| fajl | ln | kontrola | bilo | kontrast |
|---|---|---|---|---|
| `book-period-picker.tsx` | 22 | `selectClass` → 2× `<select>` (period-month/year) | slate-200 | 1.23 |
| `category-fields-editor.tsx` | 237 | `<select id={fieldTypeId}>` | slate-200 | 1.23 |
| `category-fields-editor.tsx` | 257 | `<select id={lineRoleId}>` | slate-200 | 1.23 |
| `category-fields-editor.tsx` | 285 | `<input type="checkbox">` (isRequired) | slate-300 | 1.48 |
| `expense-dialog.tsx` | 122 | `<select id="expense-cat">` | slate-200 | 1.23 |
| `expense-filters.tsx` | 51 | `<select id="expense-category">` | slate-200 | 1.23 |
| `expense-filters.tsx` | 93 | `<input type="checkbox">` (onlyWithAttachments) | slate-300 | 1.48 |

Svih 7 prebačeno na `border-input-border`, koji se unutar `.admin-shell` rezolvira na
`--control-border` (#767B86) = **4.24:1 → PASS**. Svaka zamjena je potvrđena čitanjem
konteksta (da je stvarno `<select>`/`<input>`, ne dekorativni `div`).

**Kako je nađeno:** heuristički grep (kontrola u ±4 linije + `border-slate-200|300`) dao je
6 kandidatata; svi su ručno potvrđeni. Sedmi (`selectClass`) je nađen jer je **konstanta**,
ne inline `className` — pa ga enumeracija `className="…"` vrijednosti nije uhvatila.

### Token migracija (konzistentnost, NIJE a11y popravka)

Četiri fajla prebačena na semantičke tokene: `book-list.tsx`, `book-period-picker.tsx`,
`history-panel.tsx`, `finance-page.tsx` — **10 zamjena**, sve na `text-content` /
`text-content-muted` / `text-content-strong` / `border-line` / `bg-surface`.

**Eksplicitno: ovo nije WCAG popravka.** Sve zamijenjene klase su **prolazile** kontrast
(`slate-900` 17.85, `slate-600` 7.58, `slate-500` 4.76, `slate-200` kao *border* ne podliježe
1.4.3). Vrijednost je jedan izvor istine za boje, ne usklađenost.

**Metoda:** zamjena **cijelih** `className="…"` vrijednosti s asertacijom tačnog broja po
fajlu — ne substring zamjena (substring zamke su u fazi 2 dale pogrešan broj 12 umjesto 16).

### Greška uhvaćena vlastitom provjerom

Nakon migracije, mjerenje je javilo „1 preostala light-mode klasa" u `book-period-picker.tsx`.
Ispostavilo se da je to **moj vlastiti komentar** na ln 21 (`// 1.4.11: … border-slate-200`) —
regex je pogodio naziv klase u tekstu komentara. Poznata zamka: *komentar može poraziti
vlastiti guard*. Mjerenje je ponovljeno sa `strip_comments()` (blokovski `/* */` pa linijski
`//`) i rezultat je **light=0, dark=0** za sva 4 fajla.

### Verifikacija

| Provjera | Rezultat |
|---|---|
| `test:*` skripte | **152/152 PASS**, 0 fail |
| `npm run build` | **PASS**, **272.6 KiB gzip** (budžet 300) |
| `check_i18n.py --strict` | **PASS** — 2622/2622 |
| `check_ui_contrast.py` | **PASS** — 80/80 |
| `check_repo_hygiene.py` | **PASS** — 1661 paths |
| `check_doc_links.py` | **PASS** — 670 / 202 |
| `finance.types.ts`, `api/*`, `hooks/*` | **bez diff-a** |
| `MATRIX.md` (finance, client-debts) | **netaknut** |

**Nije render-verificirano:** vizualni izgled `<select>`/`<input>` okvira nakon zamjene
(potreban browser). Kontrast je izračunat iz hex vrijednosti tokena, a zamjene su
strukturno identične (border → border), pa je rizik nizak.

---

## 2026-11-08 — FAZA 4, commit 2 (dopuna): osmi 1.4.11 prekršaj

### Korekcija prethodnog unosa: bilo je 8 prekršaja, ne 7

Prethodni commit (`2ba25dd`) je tvrdio **7** prekršaja WCAG 1.4.11. **Ta brojka je bila
nepotpuna.** Naknadni sweep po **konstantama** klasa (ne samo inline `className="…"`) našao
je i osmi:

| fajl | ln | kontrola | bilo | kontrast |
|---|---|---|---|---|
| `income/manual-entry-dialog.tsx` | 24-25 | `selectClass` → 2× `<select>` (`manual-stylist`, `manual-service`) | slate-200 | 1.23 |

**Zašto je promakao:** heuristički grep iz commita 2 tražio je `<select>`/`<input>` u
kontekstu od ±4 linije **oko linije s `border-slate-200`**. Kod `selectClass` je deklaracija
konstante na ln 24-25, a upotreba (`className={selectClass}`) na ln 79 i 99 — dakle **55+
linija daleko**, izvan kontekstnog prozora. Isti uzrok kao i `selectClass` u
`book-period-picker.tsx`, koji je nađen tek jer je enumeracija cijelih `className`
vrijednosti slučajno uključila i konstante.

**Ispravka metode:** sweep je ponovljen regexom po **konstantama** (`const \w*[Cc]lass\w* = '…'`)
uz `strip_comments()`. Nađene su tačno 2 takve konstante:
- `manual-entry-dialog.tsx` → `selectClass` — **stvarni prekršaj**, popravljen
- `expense-attachments.tsx` → `actionClass` (`text-slate-600` 7.58 PASS, `hover:bg-slate-100`) —
  **nije prekršaj**: dugme bez okvira, pa 1.4.11 za granice ne pripada

Nakon popravke, ponovljeni sweep po svim `.tsx` fajlovima (kontrola u ±6 linija +
`border-slate-200|300`) daje **0 preostalih kandidata**.

### Ukupno u fazi 4: 8 prekršaja 1.4.11 + 5 prekršaja 1.4.3

| kategorija | broj | prag | prije → poslije |
|---|---|---|---|
| granice form kontrola (1.4.11) | **8** | 3:1 | 1.23 / 1.48 → **4.24** |
| tekst (1.4.3) | **5** | 4.5:1 | 2.56 / 3.19 → **5.61 / 8.34** |

Sve zamjene su na `border-input-border` (→ `--control-border` unutar `.admin-shell`) odnosno
`text-content-muted` / `text-warn-foreground`.

### Verifikacija

| Provjera | Rezultat |
|---|---|
| `test:*` skripte | **152/152 PASS**, 0 fail |
| `npm run build` | **PASS**, **272.6 KiB gzip** (budžet 300) |
| `check_i18n.py --strict` | **PASS** — 2622/2622 |
| `check_ui_contrast.py` | **PASS** — 80/80 |
| `check_repo_hygiene.py` | **PASS** — 1661 paths |
| `check_doc_links.py` | **PASS** — 670 / 202 |
| Sweep: form kontrole sa sirovim borderom | **0 preostalih** |
| `finance.types.ts`, `api/*`, `hooks/*` | **bez diff-a** |
| `MATRIX.md` | **netaknut** |

**Preostalo u finance modulu (nije prekršaj):** ~110 light-mode sirovih paletnih klasa koje
**prolaze** kontrast (`slate-900` 17.85, `slate-600` 7.58, `slate-500` 4.76, `slate-100`/`50`
kao pozadine). Migracija na tokene je kozmetika dizajn sistema, ne usklađenost — namjerno
nije rađena pod izgovorom a11y popravke.
