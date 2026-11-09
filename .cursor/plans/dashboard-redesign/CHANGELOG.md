# CHANGELOG — Dashboard redesign

Format: datum · šta · zašto · dokaz.

---

## 2026-11-08 — ETAPA A (plan)

### Urađeno

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
(`not ok 2`), ostalih 7 ostaje zeleno. Test stvarno izvršava aritmetiku, ne prolazi prazno.
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

---

## 2026-11-08 — FAZA 4, commit 3: Debtors 1.3.1 + korekcija pogrešne tvrdnje

### Korekcija: `pages/Debtors.tsx` NEMA tabelu

Ranije u ovoj sesiji tvrdio sam da `pages/Debtors.tsx` sadrži `<table>` s `<thead>`, tri
`<th>` i `<td colSpan={3}>`, i na osnovu toga zaključio da D6 (caption/scope) tamo pripada.
**Ta tvrdnja je bila pogrešna.**

Direktna provjera: `grep -c "table" pages/Debtors.tsx` → **0** (exit 1). Fajl ima 7547 B,
200 linija; linije 1-45 su importi i hookovi (`const rows` je na **ln 77**), pa markup iz
onog `sed -n '1,45p'` ispisa **nije mogao** biti iz ovog fajla — pogrešno sam ga pripisao.

Stvarna struktura (ln 121-167): `Card` → ternarni lanac `isLoading` / `isError` /
`rows.length === 0` / **`<div className="grid gap-2">`** s `<div>` karticama po dugu.
**Nema tabele**, pa caption/`scope` ovdje ne pripada. Ispravka je bitna jer je pogrešna
tvrdnja vodila ka pogrešnom zaključku o obimu D6.

### Stvarni nalaz: 1.3.1 — lista dugovanja bez semantike liste

`rows.map()` je renderovao `<div>` stavke unutar `<div className="grid gap-2">`. Vizualno su
stavke grupisane (border + padding), ali **programski neodredljivo** — čitač ekrana dobije
ravan niz teksta bez naznake da su to zasebni zapisi niti koliko ih ima.

Popravka:
- `<div className="grid gap-2">` → **`<ul className="grid gap-2">`**
- `<div key={d.id} …>` → **`<li key={d.id} …>`**, uz odgovarajuća zatvaranja
- usput `border-slate-200 dark:border-slate-800` → **`border-line`** (konzistentnost)

Rezultat: `ul=1 /ul=1 li=1 /li=1` (jedan par, kako i treba za jednu listu).

**Sigurnost izmjene:** `features/debtors/debtors-i18n.test.mjs` zaključava samo
`formatLocalizedAmount(Number(d.amount), i18n.language)`, `formatDateOnlyLocale`,
`queryKey: ['debts','all','OPEN',…]`, `status: 'OPEN'`, `totalAmount` i debounce od 350 ms —
**ništa od div strukture**. Test i dalje PASS.

### Stanje faze 4 nakon tri commita

| kategorija | broj | prag | prije → poslije |
|---|---|---|---|
| granice form kontrola (1.4.11) | **8** | 3:1 | 1.23 / 1.48 → **4.24** |
| tekst (1.4.3) | **5** | 4.5:1 | 2.56 / 3.19 → **5.61 / 8.34** |
| semantika liste (1.3.1) | **1** | — | `div` grid → **`ul`/`li`** |

**Plan stavke:** D2/D4/D6/D10 ✅ · D1 već gotov · D3/D7/D8 opovrgnuti · D5 zadovoljen ·
D9 faza 11. Tabovi (4.1.2), 4.1.3 i 3.3.1–3.3.4 **nisu prekršaji** (Radix, `role="alert"`).
2.4.7 zadovoljen (`outline-none` se u finance pojavljuje **0** puta + globalni `:focus-visible`
na `globals.css:208`).

### Otvoreno, nije verificirano

`expense-filters.tsx:90` — `<label className="flex items-center gap-2 text-xs …">` oko
checkboxa **nema visine**, pa je efektivni cilj ~16 px, ispod 24 px iz WCAG 2.5.8. Označeno
kao **granično, ne potvrđen prekršaj**: 2.5.8 ima izuzetak za razmak, a bez browsera ne mogu
izmjeriti stvarnu geometriju ni razmak do susjednih kontrola. Nije "popravljeno" nasumičnim
povećanjem jer bi to promijenilo vizualni dizajn filtera.

### Verifikacija

| Provjera | Rezultat |
|---|---|
| `test:*` skripte | **152/152 PASS**, 0 fail |
| `test:debtors-i18n` | **PASS** |
| `npm run build` | **PASS**, **272.6 KiB gzip** (budžet 300) |
| `check_i18n.py --strict` | **PASS** — 2622/2622 |
| `check_ui_contrast.py` | **PASS** — 80/80 |
| `check_doc_links.py` | **PASS** — 670 / 202 |
| `finance.types.ts`, `api/*`, `hooks/*` | **bez diff-a** |
| `MATRIX.md` | **netaknut** |

---

## 2026-11-08 — FAZA 5: Lojalnost (`Loyalty.tsx` + `loyalty-program-settings.tsx`)

Modul: **478 linija** (`Loyalty.tsx` 296 + `loyalty-program-settings.tsx` 182), 1 test.
Inventar iz plana §1 se pokazao **tačnim**.

### Recon: dvije planirane stavke opovrgnute, dvije potvrđene

| Stavka | Plan tvrdi | Nalaz iz izvora |
|---|---|---|
| **D1** | `PageHeader` + `FilterBar` + `DataTable` + `StatGrid` | **djelimično tačno** — nijedan šablon se ne koristi |
| **D2** | Adjust/redeem → `ConfirmDialog` (3.3.4) | **❌ OPVRGNUTO** |
| **D3** | Stat kartice → `StatGrid` | **❌ OPVRGNUTO** — kartica nema |
| **D4** | `th scope`, `caption` | **✅ potvrđeno** |
| **D5** | Tokeni umjesto `slate-*` (1.4.3) | **nije prekršaj** — sve vrijednosti prolaze |
| **D6** | Card prikaz ispod 640px | **✅ potvrđeno** |

**D2 opovrgnut.** `handleRedeemConfirm` (ln 104) zahtijeva `redeemPoints > 0` **i** neprazan
`redeemIdempotencyKey`; `handleAdjustConfirm` (ln 122) zahtijeva `adjustDelta !== 0` **i**
ključ. Markup ima dva `<Dialog>` (ln 213, 255) s `DialogTitle`, poljima i `DialogFooter`
dugmadima. Tok je dakle: dugme → dijalog → unos bodova/razloga → eksplicitni confirm. To
**jeste** „confirmed before finalizing" iz 3.3.4, a idempotency ključ čuva od dvostrukog
slanja. `ConfirmDialog` povrh toga bio bi treći suvišni korak, ne popravka.

**D3 opovrgnut.** Grep po `stat|Stat|total|grid` u `Loyalty.tsx` ne nalazi ništa; `Card` se
koristi **jednom** (ln 151) kao omotač tabele. Struktura je `<h1>` + opis →
`<LoyaltyProgramSettings />` → `<Card>` s `<h2>` i tabelom. Nema stat kartica za migraciju.

**D5 nije prekršaj.** Izmjerene vrijednosti: `slate-900` 17.85, `slate-600` 7.58,
`slate-500` 4.76 — sve prolaze 4.5:1. `border-slate-200` se pojavljuje 2× i **oba su
dekorativna**: na `<tr>` zaglavlja tabele (ln 168) i na `<div>` kontejneru skrolive liste
(`loyalty-program-settings.tsx:141`). **Nijedna granica form kontrole** → nema 1.4.11
prekršaja u ovom modulu.

### Stvarni nalaz koji plan NIJE naveo: 4 neasocirana labela

`<Label>` na ln 221, 234, 263, 274 — **nijedan nije imao `htmlFor`**, a uz svaki ide
`<Input>`/`<Textarea>` bez `id`. Čitač ekrana nije mogao povezati naziv s poljem (1.3.1/4.1.2).
Ista klasa defekta kao u fazi 2 (drawer-i) i fazi 3 (daily-log).

Dodato: `redeem-points`, `redeem-note`, `adjust-delta`, `adjust-note` (par `htmlFor`/`id`).

### Implementirano

| # | Izmjena | WCAG |
|---|---|---|
| 1 | 4× `<Label htmlFor>` + `id` na kontrolama | 1.3.1, 4.1.2 |
| 2 | 7× `<th scope="col">` + `<caption className="sr-only">` | 1.3.1 |
| 3 | `data-table` klasa + 7× `<td data-label={t(…)}>` | 1.4.10 |
| 4 | `PageHeader` umjesto ručnog `<h1>` + opisa (neto −94 B) | 2.4.6, konzistentnost |

**Namjerno NIJE rađeno:** migracija na `DataTable` šablon. Tabela ima `Switch` za aktivaciju
računa i dva akcijska dugmeta po redu, a modul dira bodove koje koriste Rezervacije i Dnevna
knjiga — isti rizik kao u fazi 4, gdje je migracija tabele odgođena. Umjesto toga je dodata
`data-table` klasa, što daje card-mode bez diranja strukture podataka.

Novi i18n ključ: `loyaltyAdmin.caption` (BS + EN).

### Novi test: `test:loyalty-a11y` (5 testova)

Modul je imao **1** test, pa je plan §6 tražio sigurnosnu mrežu prije refaktora.
`frontend/src/features/loyalty/loyalty-a11y.test.mjs` zaključava: tačno 7 `<th scope="col">`,
1 lokalizovan `<caption>`, 7 dinamičkih `data-label` **u tačnom redoslijedu** (inače card-mode
prikazuje pogrešne nazive), `data-table` klasu + da `index.css` i dalje cilja
`table.data-table tbody td::before`, i 4 asocirana labela.

**Verifikacija mutacijom — svih 5 palo na predviđenom testu:**

| mutacija | rezultat |
|---|---|
| `scope="col"` → `scope="row"` (1 od 7) | `not ok 1` |
| uklonjen `<caption>` | `not ok 2` |
| `data-label` user → email (redoslijed) | `not ok 3` |
| uklonjena `data-table` klasa | `not ok 4` |
| uklonjen `htmlFor="redeem-points"` | `not ok 5` |

Registrovano u `frontend/package.json` (**159** skripti) i `.github/workflows/ci.yml`
(korak „Test loyalty table and dialog accessibility", ln 497-499).

### Dvije greške uhvaćene vlastitom provjerom

**1. Moj test je imao istu zamku koju sam dokumentovao u fazi 4.** Asertacija
`/<th(?![ >]*scope=)/` je padala s „1 !== 0" jer obrazac **hvata `<thead>`** — `<thead`
također počinje s `<th`. Ispravljeno na `/<th\b[^>]*>/` (word-boundary iza `th`), uz
eksplicitan komentar u testu.

**2. `json.dumps(..., indent=2)` je reformatovao cijele locale fajlove.** Diff je pokazivao
**81/74** (bs) i **74/72** (en) izmjena, a stvarno novog sadržaja je bila **1 linija**
(`grep -c "^+.*caption"` → 1): compact objekti poput `"app": { "title": …, "admin": … }`
rašireni su u višelinijske. Fajlovi vraćeni (`git checkout`) i ključ umetnut hirurški.
Prvi pokušaj umetka je imao **pogrešno uvlačenje** (0 razmaka) jer sam `indent` računao od
pozicije navodnika umjesto od početka linije — ispravljeno preko `s.rindex('\n', 0, j) + 1`.
Konačni diff: **1 umetanje / 0 brisanja** po fajlu, 4 razmaka uvlačenja.

### Verifikacija

| Provjera | Rezultat |
|---|---|
| `test:*` skripte | **153/153 PASS**, 0 fail (baseline 152) |
| `test:admin-loyalty-i18n` | **PASS** |
| `test:loyalty-a11y` | **5/5 PASS**, mutacijski verificirano |
| `npm run build` | **PASS**, **272.7 KiB gzip** (budžet 300) |
| `check_i18n.py --strict` | **PASS** — 2623/2623 (baseline 2622) |
| `check_ui_contrast.py` | **PASS** — 80/80 |
| `check_repo_hygiene.py` | **PASS** — 1661 paths |
| `check_doc_links.py` | **PASS** — 670 / 202 |
| `git diff --check` | čist |
| API sloj (`/api/loyalty/*`) | **bez diff-a** |
| `MATRIX.md` | **netaknut** |

**Nije render-verificirano:** vizualni card-mode prikaz tabele ispod 640 px i izgled
`PageHeader`-a (potreban browser).

---

## 2026-11-08 — FAZA 6: Analitika (`Analytics.tsx`, `ClientAnalytics.tsx`, `StylistAnalytics.tsx`)

Modul: **1377 linija** (397 + 753 + 227). Plan je za `StylistAnalytics.tsx` tvrdio „~130" —
stvarno je **227**.

### Kritični nalaz: 1.1.1 — graf bez ijedne tekstualne alternative

`Analytics.tsx:306-317` ima `<ResponsiveContainer>` → `<ComposedChart data={chartData}>` s tri
`<Bar>` serije (income/expenses/tips). **Nije bilo** `role="img"`, `aria-label`, `<figure>`,
`<figcaption>` ni tabele podataka. Čitač ekrana nije mogao dobiti **nijedan** podatak s grafa.

Popravka:
- `<figure className="m-0">` omotač
- `role="img"` + `aria-label={t('adminAnalytics.chartAriaLabel', chartSummary)}` gdje
  `chartSummary` (novi `useMemo`) **stvarno sabira** `income`/`expenses`/`tips` preko
  `chartData` i formatira iznose — nije placeholder
- `<details>` s `<summary>` i **tabelom podataka** (5 kolona: mjesec, prihodi, rashodi,
  napojnice, neto), `<caption>`, `scope="col"`, `data-label`

### Recon: dvije planirane stavke opovrgnute

**D6 (filteri) — opovrgnuto za labele.** Plan traži „Filteri → FilterBar". Date inputi na
`ClientAnalytics.tsx:279,285` **već imaju** `<Label htmlFor="client-from">` i
`htmlFor="client-to"` — asocijacija je ispravna. `FilterBar` migracija je kozmetika.

**`text-amber-400` (1.67:1) i `text-slate-200` (1.23:1) — nisu prekršaji.** Oba su na
`<Star aria-hidden="true">` (ln 139), a brojčana vrijednost rejtinga je dati kao tekst
(`{…}/5` na ln 714, 722). Dekorativna grafika s tekstualnim ekvivalentom ne podliježe 1.4.3.

### Stvarni nalaz koji plan NIJE naveo: 1.4.11 progress bar

`ClientAnalytics.tsx:380` — `bg-emerald-500` (#10B981) kao ispuna progress bara protiv
`bg-slate-100` trake = **2.32:1**, protiv bijele **2.54:1**. Oba padaju ispod 3:1 za
značajnu grafiku.

Zamjena na `bg-ok-foreground` (`--ok-fg` = #166534): **6.51:1** protiv trake, **7.13:1**
protiv bijele. Vrijednosti izračunate, ne pretpostavljene.

### Implementirano

| # | Izmjena | WCAG | prije → poslije |
|---|---|---|---|
| 1 | `figure` + `role="img"` + `aria-label` + tabela podataka | **1.1.1** | ništa → potpuna alternativa |
| 2 | `bg-emerald-500` → `bg-ok-foreground` | 1.4.11 | 2.32 → **6.51** |
| 3 | 2× `text-slate-400` → `text-content-muted` | 1.4.3 | 2.56 → **5.61** |
| 4 | `PageHeader` u `ClientAnalytics.tsx` | 2.4.6 | 0 `<h1>` → **1** |
| 5 | 17× `<th scope="col">` + 3× `<caption>` | 1.3.1 | 0 → 17 / 0 → 3 |
| 6 | `data-table` + 17× `<td data-label>` | 1.4.10 | 0 → 17 |

**D3 (2.4.6) detalj:** naslov je **statički** (`clientAnalyticsPage.title`), a ime klijenta ide
u `description` kad je učitano — jer 2.4.6 traži zaglavlje u **svim** stanjima, uključujući
loading i error. `StylistAnalytics.tsx` koristi dinamičko ime kao `<h1>` (ln 148), što nije
uzeto kao uzor upravo iz tog razloga.

Novi i18n ključevi (**9**): `clientAnalyticsPage.{title,servicesCaption,reservationsCaption,
manualEntriesCaption}` + `adminAnalytics.{chartAriaLabel,showDataTable,chartTableCaption,
month,net}`.

### Novi test: `test:analytics-a11y` (6 testova)

`frontend/src/features/analytics/analytics-a11y.test.mjs` zaključava: `role="img"` +
`aria-label` s `chartSummary` + da `chartSummary` **stvarno sabira** sve tri serije,
`<figure>`, `<details>` tabelu s 5 kolona i `scope`, `<h1>` preko `PageHeader`, 17 `<th>` sa
`scope` + 3 `<caption>` + 17 `data-label` (od 19 `<td>`, 2 su `colSpan` empty-state),
card-mode CSS, i da se `text-slate-400`/`bg-emerald-500` **ne vrate**.

**Verifikacija mutacijom — svih 6 palo na predviđenom testu:**

| mutacija | rezultat |
|---|---|
| `role="img"` → `data-x="img"` | `not ok 1` |
| `aria-label` → `"x"` | `not ok 1` |
| `<details>` → `<div>` | `not ok 2` |
| `description` → `undefined` | `not ok 3` |
| `text-content-muted` → `text-slate-400` | `not ok 6` |
| `bg-ok-foreground` → `bg-emerald-500` | `not ok 6` |

Registrovano u `frontend/package.json` (**160** skripti) i `.github/workflows/ci.yml`
(korak „Test analytics chart and table accessibility", ln 392-394).

### Greška uhvaćena build-om

Prvi pokušaj je pao na `tsc`: `Analytics.tsx(154,24): error TS2304: Cannot find name
'useMemo'`. Uslov za dodavanje importa je provjeravao `'useMemo' not in s.split('\n')[0]` —
React import **jeste** na liniji 1, pa je uslov bio tačan, ali `replace` je tražio pattern
`import { useEffect, useState }` dok stvarna linija glasi
`import { useCallback, useEffect, useState }`. Zamjena je tiho prošla bez efekta. Ispravljeno
na tačan string; build sada **273.2 KiB**.

### Verifikacija

| Provjera | Rezultat |
|---|---|
| `test:*` skripte | **154/154 PASS**, 0 fail (baseline 153) |
| `test:analytics-a11y` | **6/6 PASS**, mutacijski verificirano |
| `admin/client/stylist-analytics-i18n` | **PASS** |
| `npm run build` | **PASS**, **273.2 KiB gzip** (budžet 300) |
| `check_i18n.py --strict` | **PASS** — 2632/2632 (baseline 2623) |
| `check_ui_contrast.py` | **PASS** — 80/80 |
| `check_repo_hygiene.py` | **PASS** — 1662 paths |
| `check_doc_links.py` | **PASS** — 670 / 202 |
| `git diff --check` | čist |
| locale fajlovi | **9/0** po fajlu — bez reformata |
| API sloj | **bez diff-a** |
| `MATRIX.md` | **netaknut** |

**Nije render-verificirano:** vizualni izgled grafa unutar `<figure>`, `<details>` otvaranje,
card-mode ispod 640 px. Kontrast je izračunat iz hex vrijednosti.

---

## 2026-11-08 — FAZA 7: Korisnici (`pages/Users.tsx`)

Modul: **1535 linija**, 1 produkcijski fajl, 1 test. Najveći fajl u repou.

### Recon: tri planirane stavke opovrgnute

**D4 (`text-slate-400`, 1.4.3) — opovrgnuto.** `Users.tsx:952` je
`<Search className="… text-slate-400" aria-hidden="true" />` — **dekorativna ikona** unutar
polja za pretragu, ne tekst. Ima tekstualni ekvivalent (placeholder + labela). Ista zamka kao
`Trash2` u fazi 4 i `Star` u fazi 6.

**D5 (role badge-evi, 1.4.1) — opovrgnuto.** `Badge` na ln 709-711 renderuje
`{getRoleLabel(roleName)}` — **tekst postoji**, boja je samo pojačanje. 1.4.1 zadovoljen.

**D3 (3.3.1–3.3.3) — djelimično opovrgnuto.** `fieldset`/`legend`/`aria-invalid`/
`aria-describedby` = 0, ali `role="alert"` = **1** — greške se najavljuju. Isti obrazac kao
daily-log (faza 3) i finance (faza 4), gdje 3.3.1 nije bio prekršaj.

**D2 (3× `window.confirm`) — nije WCAG prekršaj.** `window.confirm` (ln 432, 516, 629) jeste
pristupačan (nativni dijalog, čitljiv čitaču ekrana, dostupan tastaturom) i **jeste** korak
potvrde koji 3.3.4 traži. Nije 2.1.2 (nema keyboard trap). Modul već koristi `ConfirmDialog`
(ln 1471), pa je ovo **konzistentnost**, ne usklađenost — namjerno nije mijenjano pod
izgovorom a11y popravke.

### Stvarni prekršaji

**2.4.4 / 4.1.2 — generička pristupna imena akcija.** Akcijska dugmad po redu imala su
`aria-label={t('users.aria.edit')}`, `.deactivate`, `.analytics`, `.resetLinkAction` — bez
identifikatora korisnika. Čitač ekrana je u svakom redu tabele čuo **isto** ime („Uredi
korisnika" × N), pa korisnik nije mogao razlikovati na koga se akcija odnosi.

Popravka: `{{username}}` interpolacija u sva 4 ključa + novi `users.aria.resetLink`.
Uzorak je već postojao u `users.aria.removeRole` (`{{role}}`), pa je dosljedan.

**1.3.1 — tabela bez semantike.** 1 tabela, 8 `<th>`, **0 `scope`**, **0 `<caption>`**.

**1.4.10 — bez card-mode.** Tabela nije imala `data-table` klasu ni `data-label` na `<td>`.

### Implementirano

| # | Izmjena | WCAG |
|---|---|---|
| 1 | 4× `aria-label` s `{ username: u.username }` | 2.4.4, 4.1.2 |
| 2 | 8× `<th scope="col">` + `<caption className="sr-only">` | 1.3.1 |
| 3 | `data-table` klasa + 8× `<td data-label={t(…)}` | 1.4.10 |

**D1 nije rađen:** `<h1>` već postoji (ln 930). Migracija na `PageHeader`/`FilterBar`/
`DataTable`/`TablePagination` je strukturna, a testovi čitaju ovaj fajl po putanji — odgođeno
na fazu 13 uz Playwright/axe, kao i u fazama 4-6.

Novi i18n ključevi: `users.caption` + `users.aria.resetLink`; ažurirani
`users.aria.{analytics,edit,deactivate}`.

### Novi test: `test:users-a11y` (5 testova)

`frontend/src/features/users/users-a11y.test.mjs` zaključava: 4 jedinstvena aria-labela s
`username` **i** da generičke varijante ne postoje, 8 `<th>` sa `scope` + 1 `<caption>`,
`data-table` + 8 dinamičkih `data-label` + card-mode CSS. Uz to **dva regresiona čuvara za
opovrgnute stavke** — da `Search` ostane `aria-hidden` (D4) i da role badge i dalje renderuje
`getRoleLabel` (D5), kako ih neko kasnije ne bi "popravio" u nepostojeći defekt.

**Verifikacija mutacijom — svih 6 palo na predviđenom testu:**

| mutacija | rezultat |
|---|---|
| `username` uklonjen iz `aria.edit` | `not ok 1` |
| `username` uklonjen iz `aria.deactivate` | `not ok 1` |
| `scope="col"` uklonjen (1 od 8) | `not ok 2` |
| `<caption>` uklonjen | `not ok 2` |
| `data-table` klasa uklonjena | `not ok 3` |
| `data-label` uklonjen | `not ok 3` |

Registrovano u `frontend/package.json` (**161** skripti) i `.github/workflows/ci.yml`
(korak „Test users table and row action accessibility", ln 557-559).

### Dvije greške uhvaćene vlastitom provjerom

**1. i18n umetanje na pogrešno mjesto.** `s.index('"users"')` je našao **prvo** pojavljivanje
stringa (u `nav`), pa je `users.caption` završio u **`pageTitles`**. Uz to je logika za
dodavanje zareza prije novog ključa proizvela **nevalidan JSON** (`line 1047 column 58`).
Rješenje: `find_block()` traži ključ po **tačnom uvlačenju** (`\n  "users": {`), a novi ključ
se umeće **odmah nakon otvarajuće zagrade** tako da zarez ide na našu liniju i ništa drugo se
ne dira. Provjera `pageTitles.caption === False` dodana u samu skriptu.

**2. Regex mog testa.** Asertcija za aria-label završavala je s `\)\)`, a stvarni JSX je
`aria-label={t(...)}` — treba `\)\}`. Implementacija je bila ispravna; pao je test.

### Verifikacija

| Provjera | Rezultat |
|---|---|
| `test:*` skripte | **155/155 PASS**, 0 fail (baseline 154) |
| `test:users-a11y` | **5/5 PASS**, mutacijski verificirano |
| `test:temporary-user-credentials` | **PASS** |
| `npm run build` | **PASS**, **273.3 KiB gzip** (budžet 300) |
| `check_i18n.py --strict` | **PASS** |
| `check_ui_contrast.py` | **PASS** — 80/80 |
| `check_repo_hygiene.py` | **PASS** — 1663 paths |
| `check_doc_links.py` | **PASS** — 670 / 202 |
| `git diff --check` | čist |
| locale fajlovi | **8/3** po fajlu — bez reformata |
| API sloj, role guard, `client-debts` | **bez diff-a** |
| `MATRIX.md` | **netaknut** |

**Nije render-verificirano:** vizualni card-mode ispod 640 px i ponašanje `window.confirm`
dijalogova (namjerno netaknuti).

---

## 2026-11-08 — FAZA 8: Salon / Usluge / Frizeri (`Salon.tsx`, `Services.tsx`, `Stylists.tsx`, `ServiceWorkGallery.tsx`)

Modul **2839 linija** u 4 fajla, do ove faze **0 testova** — prvi test za modul je
`test:salon-services-stylists-a11y`. Direktoriji `features/{salon,services,stylists}/` nisu
postojali; test je kolociran u `features/salon/`.

### Recon: četiri planirane stavke opovrgnute

| Stavka | Tvrdnja plana | Šta izvor stvarno kaže |
|---|---|---|
| **D1** | `Salon.tsx` ima 2 `<h1>` → 1.3.1 | `grep` **ima 2**, ali su u **međusobno isključivim granama**: jedan na ln 305 unutar ranog return-a `if (noSalonExists \|\| !salon)` (ln 301-302), drugi na ln 348 u konačnom `return`. **Renderuje se tačno jedan.** |
| **D2** | `window.confirm` → 3.3.4 | 3× (`Salon.tsx:264`, `Services.tsx:356`, `:367`). Nativni dijalog **je** pristupačan i **jeste** korak potvrde. Konzistentnost s `ConfirmDialog`-om, ne usklađenost. |
| **D6** | Upload je drag-only → 2.5.7 | `Services.tsx:936` native `<input type="file" accept="image/*" className="hidden">` + `:951` `onClick={() => svcFileRef.current?.click()}`. Single-pointer alternativa **postoji**. |
| **D9 / 1.4.11** | Kontrast + granice | Kontrast sweep po 4 fajla: **nijedna rizična klasa** (sve sirove palete prolaze). 1.4.11 kandidati `Salon.tsx:582` i `Stylists.tsx:442` su **dekorativni kontejneri** (`<div>` oko `Switch`-a; `<label>` kartica oko checkboxa koji nema border). |

### Stvarni prekršaji

**4.1.2 — 8 `<Switch>` bez ijednog pristupačnog imena.** `components/ui/switch.tsx` je Radix
omotač (`SwitchPrimitives.Root` sa `{...props}`) → renderuje `<button role="switch">`.
Susjedni `<Label className="mb-0">` **nema `htmlFor`**, pa veza ne postoji ni u DOM-u:

| Fajl | Linija | Kontekst |
|---|---|---|
| `Salon.tsx` | 464 | radni dan, tabela radnog vremena (**7 redova**) |
| `Salon.tsx` | 587 | `sendPush` u dijalogu praznika |
| `Services.tsx` | 842, 895, 1039, 1048 | kategorija / potkategorija / usluga aktivna, loyalty |
| `Stylists.tsx` | 359 | `isActive` profila |
| `Stylists.tsx` | 381 | radni dan, tabela radnog vremena (**7 redova**) |

**1.3.1 / 1.4.10 — 5 tabela bez semantike:** 27 `<th>`, **0 `scope`**, **0 `<caption>`**,
**0 `data-label`**, **0 `data-table`** (dakle nijedna nije opt-in u card-mode).

| Fajl | Tabla | `<th>` |
|---|---|---|
| `Salon.tsx` | radno vrijeme, praznici | 9 |
| `Services.tsx` | usluge | 8 |
| `Stylists.tsx` | frizeri, radno vrijeme | 10 |
| `ServiceWorkGallery.tsx` | — | 0 |

### Nalaz koji plan NIJE naveo: 4 time inputa bez imena

`<Input type="time">` u tabelama radnog vremena — **`Salon.tsx` 2** (`openTime`/`closeTime`),
**`Stylists.tsx` 2** (`startTime`/`endTime`). Renderuju se po jednom po danu →
**7 redova × 2 = 14 kontrola**. U tabličnom modu `scope="col"` daje kontekst, ali u card-mode
(ispod 640 px, gdje `display` postaje `block` i tabela gubi semantiku) čitač ne bi znao **ni
dan ni svrhu**. Dodano `aria-label` s interpolacijom dana.

### Dizajn odluka: interpolacija po danu

Switch-evi i time inputi u **tabeli radnog vremena** imaju 7 redova → `{{day}}` interpolacija
je **nužna** (inače 7 identičnih imena). Switch-evi u **dijalozima** (`Services` 4, `Stylists`
`isActive`) uređuju **jedan** entitet → bez interpolacije, naslov dijaloga ga identifikuje.
Za `Stylists` profil identifikator je `selectedStylist`, a `form` **nema polje `name`**
(`{bio, specialization, isActive, hireDate}`, ln 76) — ime se čita iz `StylistProfile.user?.username`.
`formatWeekday(dayOfWeek, i18n.language)` je već importovan u oba fajla (`Salon.tsx:8`,
`Stylists.tsx:13`).

### Implementirano

- **4.1.2:** 8 `<Switch>` → `aria-label={t(...)}`. Za `Salon.tsx:587` **reuse postojećeg**
  `salon.holidayForm.sendPush` („Pošalji push obavijest") umjesto novog ključa.
- **4.1.2 (novi nalaz):** 4 `<Input type="time">` → `aria-label` s interpolacijom dana.
- **1.3.1:** `scope="col"` na **27/27 `<th>`**; `<caption className="sr-only">` na **5/5** tabela.
- **1.4.10:** `data-table` klasa na **5/5** tabela + `data-label={t(...)}` na **27 `<td>`**
  (28. je `colSpan` empty-state). Svi lokalizovani, **0 hardkodovanih literala**.
- **i18n:** **16 novih leaf ključeva** (`bs` + `en`, numstat **18/18** po fajlu — 16 ključeva
  + 2 linije za novi `salon.aria` blok). Hirurški umetak stringom, **bez re-serializacije**.

### Novi test: `test:salon-services-stylists-a11y` (7 testova)

Registrovan u `frontend/package.json` (162 skripti) **i** `.github/workflows/ci.yml` (korak
„Test salon services and stylists accessibility", ln 560-562).

| # | Test | Šta čuva |
|---|---|---|
| 1 | svaki `Switch` ima pristupačno ime | 4.1.2 — broji **tačno 8** |
| 2 | time inputi imaju pristupačno ime | 4.1.2 — po fajlu i po ključu |
| 3 | ime uključuje dan | sprječava 7 identičnih imena |
| 4 | 5 tabela ima `scope` + `caption` | 1.3.1 — broji **tačno 27 `<th>` i 5 `<caption>`** |
| 5 | 5 tabela opt-in u card mode | 1.4.10 + `<td>` bez `data-label` + 0 literala |
| 6 | **D1 regresioni čuvar** | ranom return-u mora ostati — da se ne "popravi" nepostojeći prekršaj |
| 7 | **D6 regresioni čuvar** | native file input + `svcFileRef` + **ne smije** se pojaviti `onDrop=` |

**Mutacijska provjera — 7/7 palo na predviđenom testu:**

| Mutacija | Pao test |
|---|---|
| `aria-label` → `data-x` na Salon `Switch` | 1 |
| `aria-label` → `data-x` na `opensTime` | 2 |
| uklonjen `scope="col"` (Services) | 4 |
| uklonjen `<caption>` (Stylists) | 4 |
| uklonjen `data-table` (Services) | 5 |
| uklonjen `data-label` (Stylists) | 5 |
| `svcFileRef.current?.click()` → `void 0` | 7 |

### Tri greške uhvaćene vlastitom provjerom

1. **`s.find('\n    "aria": {', brace)` bez gornje granice** pogodio je `aria` **kasnijeg**
   namespace-a → `opensTime`/`closesTime` završili na **vrhu `salon` bloka** kao
   `salon.opensTime`. JSON je bio validan i kapija je prošla, pa greška **nije pala ni na
   jednoj automatskoj provjeri** — otkrivena tek ispisom `sorted(d['salon']['aria'])`.
   Rješenje: `find_block(s, key, indent, lo, hi)` s granicama namespace-a.
2. **Hardkodovani brojevi linija za `<td>`** — ubacivanje `<caption>` linije **pomjerilo je
   sve indekse za 1**, pa je asertija `lines[646]` uhvatila `>` umjesto `<td>`. Rješenje:
   tražiti linije **dinamički nakon** svih izmjena.
3. **Raw-string `\'` u Pythonu** upisao je **doslovne** backslash-navodnike u JSX
   (`t(\'stylists.aria…\')`) — sintaksna greška koja je prošla jer build te faze još nije
   bio pokrenut. Uz to je `workingDayToggle` bio **pogrešan ključ** za time inpute.
   Ispravljeno na `startTime`/`endTime` uz provjeru `s.count("\\'") == 0`.

### Verifikacija

| Provjera | Rezultat |
|---|---|
| 156 `test:*` skripti | **156/156 PASS** |
| `test:salon-services-stylists-a11y` | **7/7 PASS**, mutacijski verificirano 7/7 |
| `npm run build` | **PASS**, **273.9 KiB gzip** (budžet 300) |
| `check_i18n.py --strict` | **PASS** — 2650/2650 leaf ključeva |
| `check_ui_contrast.py` | **PASS** — 80/80 |
| `check_repo_hygiene.py` | **PASS** — 1664 paths |
| `check_doc_links.py` | **PASS** — 670 / 202 |
| `git diff --check` | čist |
| locale fajlovi | **18/0** po fajlu — bez reformata |
| `MATRIX.md` | **netaknut** (sve izmjene prezentacijske) |
| Javni sajt | **nije diran** — nijedan fajl nije importovan izvan admin-a |

**Nije render-verificirano:** vizualni card-mode ispod 640 px (5 tabela) i ponašanje
`window.confirm` dijalogova (namjerno netaknuti).

**Odgođeno na fazu 13:** razbijanje `Services.tsx` (1533 ln) i migracija 5 tabela na
`DataTable` (rizik za paritet podataka).

---

## 2026-11-08 — FAZA 9: Sadržaj — Blog / Galerija / Recenzije

Modul **1623 linije** u 10 admin fajlova. Do ove faze postojala su 3 i18n testa
(`admin-blog-i18n`, `admin-gallery-i18n`, `admin-reviews-i18n`) koji asertuju markup,
ali **nijedan a11y test**. Novi test je kolociran u `features/content/`.

### Recon: pet planiranih stavki opovrgnuto, jedna djelimično tačna

| Stavka | Tvrdnja plana | Šta izvor stvarno kaže |
|---|---|---|
| **D1** | `DataTable` za sva tri ekrana | `Gallery.tsx` **nema tabelu** (`grep '<table'` = 0) — grid je. Blog tabela je u `features/blog/blog-posts-table.tsx`, ne u `pages/Blog.tsx`. |
| **D2** | `window.confirm` → 3.3.4 | 5× (`Blog.tsx:97,135`, `Gallery.tsx:161,197`, `Reviews.tsx:77`) — linije su **tačne**, ali nativni dijalog je pristupačan i **jeste** korak potvrde. |
| **D4** | Upload → native input, bez obaveznog drag&drop-a | **0 `onDrop` u cijelom modulu.** `Gallery.tsx:472` i `blog-post-form-dialog.tsx:158` su već native `<input type="file">`; Gallery ima i `<Label htmlFor="gallery-manual-file">`. 2.5.7 zadovoljen. |
| **D5** | `alt` obavezan i provjeren | Sve **3** slike već imaju `alt` (`Gallery.tsx:382` dinamički, `:536` `alt=""` dekorativno, `blog-post-form-dialog.tsx:160`). |
| **D7** | Status badge (tekst + ikona) | `getApprovalBadge` već vraća `<Badge variant="…">{t('reviews.…')}</Badge>` — tekst postoji, nije samo boja. |
| **D8** | Tokeni / kontrast | 5 kandidata (`emerald-600` ×2, `teal-600`, `yellow-400`, `slate-300`) — **svih 5 na `aria-hidden="true"` ikonama** uz tekstualni ekvivalent. Nisu 1.4.3. |
| **D3** | `fieldset`/`legend`, `aria-describedby` | **Djelimično tačno.** SEO sekcija jeste vizuelno izdvojena (okvir + `<p>SEO</p>`) → migrirana na `FormSection`. Ostatak blog forme **nema** vizuelnih sekcija, pa `fieldset` tamo nije potreban. |

### Stvarni prekršaji

**4.1.2 — 2 `<Switch>` bez ijednog pristupačnog imena.** Tekst je bio u `<p className="text-sm font-medium">` sibling-u, bez programske veze:

| Fajl | Linija | Polje |
|---|---|---|
| `blog-post-form-dialog.tsx` | 121 | `isPublished` |
| `blog-post-seo-fields.tsx` | 55 | `noIndex` |

**1.3.1 — 7 kontrola bez imena izneasociranih labela.** Šest u `Gallery.tsx` (2 dijaloga × 3 polja, `<Label>` sibling bez `htmlFor`) + jedan **orphan `<Label>{label}</Label>`** u `ImageUpload` koji nije labelovao nijednu kontrolu.

**1.3.1/1.4.10 — 2 tabele bez semantike:** 15 `<th>`, **0 `scope`**, **0 `<caption>`**, **0 `data-label`**, **0 `data-table`**.

| Fajl | `<th>` | `<td>` |
|---|---|---|
| `Reviews.tsx` | 9 | 10 (9 + 1 `colSpan`) |
| `blog-posts-table.tsx` | 6 | 7 (6 + 1 `colSpan`) |

### Nalaz koji plan NIJE naveo: 1.1.1 `Stars` bez tekstualne alternative

`Stars` (ln 26) renderuje 5 `<Star aria-hidden="true">`. U **detaljnom panelu** (ln 239-248)
uz njih stoji `<span>{formatLocalizedNumber(...)}/5</span>` — ali u **tabeli** (ln 164, 166)
**nije stajalo ništa**. Pošto su ikone `aria-hidden`, ćelije „Ocjena usluge" i „Ocjena frizera"
su za čitač ekrana bile **potpuno prazne**. Dodano `role="img"` + `aria-label` na omotač
(kanonski obrazac za ocjene zvjezdicama), s interpolacijom `{{value}}`/`{{max}}`.

### Implementirano

- **4.1.2:** 2 `<Switch>` → `aria-label`. **Reuse postojećih ključeva** (`blog.published`,
  `blog.admin.noIndex`) jer `<p>` pored njih već koristi te iste ključeve — nula novih.
- **1.3.1:** 6 `<Label>` u Gallery → `htmlFor`/`id` parovi (`gallery-category-{name,description,sort-order}`,
  `gallery-image-{title,description,sort-order}`). Ključevi `gallery.admin.description` i
  `.sortOrder` pojavljuju se 2×, pa su parovi razdvojeni po formi u `onChange` (`catForm` vs `imgForm`).
- **1.3.1:** orphan `<Label>` u `ImageUpload` → `<p id>` + `role="group"` + `aria-labelledby`;
  hint povezan s dugmetom preko `aria-describedby` (prije je lebdio). `useId` za stabilne id-ove.
- **1.1.1:** `Stars` → `role="img"` + `aria-label={t('reviews.aria.ratingValue', { value, max })}`.
- **1.3.1:** SEO sekcija → `FormSection` (`<fieldset>` + `<legend>` + opis), −162 B.
- **1.3.1/1.4.10:** `scope="col"` na **15/15 `<th>`**, `<caption>` **2/2**, `data-table` **2/2**,
  `data-label={t(...)}` na **15 `<td>`** (2 su `colSpan` empty-state). 0 hardkodovanih literala.
- **i18n:** **3 nova leaf ključa** (`blog.admin.tableCaption`, `reviews.tableCaption`,
  `reviews.aria.ratingValue`) — numstat **5/5** po fajlu (3 ključa + 2 linije za novi
  `reviews.aria` blok). `find_block` s granicama namespace-a, bez re-serializacije.

### Novi test: `test:admin-content-a11y` (10 testova)

Registrovan u `frontend/package.json` (163 skripti) **i** `.github/workflows/ci.yml`
(korak „Test admin content page accessibility", ln 563-565).

**Mutacijska provjera — 14/14 palo:** Switch ×2, `htmlFor`, `role="img"`, `aria-label` zvjezdica,
`scope`, `caption`, `data-table`, `data-label`, `<FormSection>`, te 3 regresona čuvara
(uklonjen tekst badgea → D7, dodan `onDrop` → D4, uklonjen `alt` → D5, ×2 fajla).

### Tri greške uhvaćene vlastitom provjerom

1. **`s[j:nl].strip().endswith('>')` gdje je `nl = s.index('>', j)`** — `index` vraća poziciju
   **prije** `>`, pa je guard provjeravao `'<Label'` i pucao s **pogrešnom porukom**
   („Label već ima htmlFor"). `Gallery.tsx` nije upisan.
2. **Prag `total >= 20` napisan napamet** — stvarno ih je **14**. Asertija je pala i natjerala
   brojanje; zamijenjeno tačnom brojkom.
3. **🔴 D5 čuvar je bio PRAZAN:** asertija `/alt=/` **prolazi i na `data-alt=`**, pa mutacija
   „ukloni alt" nije padala. Ispravljeno na `/(^|\s)alt=/` + `assert.equal(total, 3)` — tek
   tada su obje mutacije pale. Ovo je ista klasa greške kao „green nije dokaz": čuvar koji
   ne može pasti nije čuvar.

### Verifikacija

| Provjera | Rezultat |
|---|---|
| 157 `test:*` skripti | **157/157 PASS** |
| `test:admin-content-a11y` | **10/10 PASS**, mutacijski verificirano 14/14 |
| `admin-blog-i18n` / `admin-gallery-i18n` / `admin-reviews-i18n` | **PASS** — ugovori očuvani |
| 10 `public-blog-*` / `public-gallery-*` testova | **PASS** |
| `npm run build` | **PASS**, **274.1 KiB gzip** (budžet 300) |
| `check_i18n.py --strict` | **PASS** — 2653/2653 leaf ključeva |
| `check_ui_contrast.py --strict` | **PASS** — 80/80 |
| `check_repo_hygiene.py` | **PASS** — 1665 paths |
| `check_doc_links.py` | **PASS** — 670 / 202 |
| `git diff --check` | čist |
| locale fajlovi | **5/0** po fajlu — bez reformata |
| Javni sajt | **bez diff-a** — `Gallery`/`Reviews` importuje samo `admin.routes.tsx`; blog fajlove samo `pages/Blog.tsx`. Javne rute koriste zasebne `PublicBlogList`/`PublicGallery`/`PublicSatisfiedClients` |
| `MATRIX.md` | **netaknut** |
| `MediaImage`, `BeforeAfterSlider`, sanitizacija | **netaknuti** (dijeljeni s javnim) |

**Nije render-verificirano:** vizualni card-mode ispod 640 px (2 tabele), ponašanje
`window.confirm` dijalogova (namjerno netaknuti), najava `role="status"` pri moderaciji.

**Odgođeno na fazu 13:** razbijanje `Gallery.tsx` (600 ln) po panelima i migracija 2 tabele
na `DataTable` (rizik za paritet podataka); `fieldset` za cijelu blog formu ako se uvedu
vizuelne sekcije.

---

## 2026-11-08 — FAZA 10 (djelimično): Postavke — tokeni + ime kontrola

Modul **3879 linija / 24 fajla / 18 testova**. Završen a11y dio u **2 commita**
(`ba59834`, `44b0eed`). **M2 (D11) NIJE rađen** — vidi ispravku na kraju.

### Commit 1 (`ba59834`) — paralelna smeđa paleta → brand tokeni + 1.4.3

`features/settings` je koristio zasebnu smeđu hex skalu koja se ne poklapa s brand
identitetom (`--brand-primary: #632238` burgund). Uklonjeno **svih 14 pojava u 4 fajla**, 0 preostalih.

**Ovo NIJE bio WCAG prekršaj.** Izmjereni parovi su prolazili:

| Par | Kontrast | Prag | |
|---|---:|---:|---|
| `text-#49332d` / `bg-#fffaf6` | 11.29:1 | 4.5 | PASS |
| `text-white` / `bg-#49332d` | 11.70:1 | 4.5 | PASS |
| `text-#6e493c` / `bg-#f3e8df` | 6.50:1 | 4.5 | PASS |
| `border-#9d735d` | 4.16:1 | 3.0 | PASS |
| `ring-#9b735f` (fokus) | 4.19:1 | 3.0 | PASS |

Razlog zamjene je **konzistentnost identiteta**, ne usklađenost. Plan je D2 označio kao
2.4.13 prekršaj — **nije**: 4.19:1 prelazi 3:1 koliko 1.4.11 traži za indikator fokusa.

**D3 je bio stvaran 1.4.3 prekršaj:** `setting-editor-display.tsx:54` suffix u
`text-slate-400` (#94A3B8) = **2.56:1 FAIL** → `text-content-muted` = **5.61:1 PASS**.

**Netaknuto s razlogom:**
- `EmailSettings.tsx:270,280` i `email-visual-editor.tsx:244,249` — generisani HTML za
  email klijente (`renderCampaignHtml`) i njegov vjerni preview. Email klijenti ne
  podržavaju CSS varijable.
- `pages/public/PublicServiceDetail.tsx`, `PublicServices.tsx` — javni sajt, van obima.
- `<h1>` u `settings-shell.tsx` — ima doslovan test ugovor u
  `admin-settings-accessibility.test.mjs` i koristi slate (17:1), ne smeđu. Mijenjanje
  bi slomilo test bez a11y dobiti.

### Commit 2 (`44b0eed`) — 4.1.2 ime kontrola, 2.4.4, 1.3.1 tabele

**4.1.2/1.3.1 — 28 `<Label>` u `EmailSettings.tsx`** bilo je sibling svojih kontrola bez
`htmlFor`/`id`. Popravljeno 27 parova (ukupno **29 `htmlFor`, svi jedinstveni**, svaki s
tačno jednim `id`): 21× `<Input>`/`<Textarea>`/`<select>` + 7× `<Switch>`
(`secure`, `rejectUnauthorized`, `requireTls`, `ignoreTls`, `pool`, `onlyActiveAudience`,
`createInAppNotification`).

Radix `Switch` renderuje `<button>`, koji **jeste labelabilan element** — pa `<Label htmlFor>`
+ `<Switch id>` daje ime. To je **obrazac koji projekt već koristi** u
`setting-editor-boolean.tsx:34`, asertovan postojećim testom.

**1.3.1 — nalaz koji plan nije naveo:** `<Label>{t('…htmlPreviewSource')}</Label>` stajao je
uz `<pre>`. **`<pre>` nije labelabilan element**, pa label nije imenovao ništa. Zamijenjeno
običnim `<p id>` (iste klase, bez vizuelne promjene) + `aria-labelledby` na `<pre>`.

**2.4.4 — `markAsRead`** je imao isto ime za svaku obavijest → `markAsReadNamed` s
`{{title}}` (obrazac iz faze 7). Ikona `<Check>` dobila `aria-hidden`.

**1.3.1/1.4.10 — tabela postavki obavijesti:** `scope="col"` 3/3, `<caption>`, `data-table`, `data-label` 3/3.

### Recon: pet stavki opovrgnuto

| Stavka | Tvrdnja plana | Stvarnost |
|---|---|---|
| **D4** | `role="status"` za rezultat pretrage | **Već postoji** — `settings-module-page.tsx:75,85,102` + `aria-controls="settings-groups-list"` (ln 62) |
| **D5** | `window.confirm` → `ConfirmDialog` | `EmailSettings.tsx:757,880` — linije tačne, ali nije prekršaj |
| **D6** | Dodati gore/dolje dugmad vizuelnom editoru | **Već postoje** — `email-visual-editor.tsx:145-161`, `aria-label` `moveUp`/`moveDown`/`deleteBlock` uz `draggable` (134-137). 2.5.7 zadovoljen |
| **D10** | AppReleases upload → native input | **Već jeste** — `app-release-create-form.tsx:67` `<Input id="apk" type="file">` + `<Label htmlFor="apk">`, 0 `onDrop` |
| **D1/D2** | 1.4.3 / 2.4.13 | **Nisu prekršaji** (tablica gore) |

**D7** nije provjeren do kraja: `type="password"` postoji (ln 862), `autoComplete` **nedostaje**,
`onPaste` blokiranja **nema** (što je dobro). Ostavljeno za zaseban prolaz.

### Novi testovi

| Test | Testova | Mutacije |
|---|---:|---:|
| `test:settings-semantic-tokens` | 5 | 5/5 palo |
| `test:admin-settings-controls-a11y` | 9 | 9/9 palo |

Oba registrovana u `frontend/package.json` (165 skripti) i `ci.yml` (ln 566-568, 570-572).
Ukupno **5 regresionih čuvara** za opovrgnute D4/D6/D10 i za smeđu paletu.

### Verifikacija

| Provjera | Rezultat |
|---|---|
| 159 `test:*` skripti | **159/159 PASS** |
| 23 testa modula | **PASS** — uklj. `test:brand-colors` bez izmjene i `admin-settings-accessibility` s očuvanim `<h1>` ugovorom |
| `npm run build` | **PASS**, **274.1 KiB gzip** (budžet 300) |
| `check_i18n.py --strict` | **PASS** — 2655/2655 |
| `check_ui_contrast.py --strict` | **PASS** — 80/80 |
| `check_repo_hygiene.py` | **PASS** — 1667 paths |
| `git diff --check` | čist |
| locale fajlovi | **2/0** po fajlu — bez reformata |
| `MATRIX.md` | **netaknut** |

---

### 🔴 ISPRAVKA: M1 je u fazi 6 preskočen pogrešno

U fazi 6 sam u `CHECKLIST.md` i `CHANGELOG.md` zapisao **„M1 nije odobren, preskočen"**.
**Ta tvrdnja je netačna.** `00_overview.md` §7 nosi naslov *„Otvorena pitanja — ODLUČENO
2026-11-08"* s napomenom *„Vlasnik: postupi po svojoj preporuci. Sve odluke su prihvaćene
i važe za ETAPU B"*, a:

- **Q3:** „**M1 i M2 ODOBRENI** (Analitika → tabovi; Postavke → hub). M3 = zajednički obrazac
  bez spajanja ruta. Sve stare rute ostaju `<Navigate replace>`, `?tab=` i postojeći query
  parametri rade."
- **Q7:** „`client-analytics` / `stylist-analytics` **postaju tabovi** unutar `/admin/analytics`
  (posljedica Q3/M1); stare rute redirectuju."

Dakle su **M1 (faza 6) i M2 (faza 10) oba odobrena i oba neurađena**. Uzrok greške: oslonio
sam se na sažetak sesije („M1 nije rađen, Q3 neodgovoren") umjesto da pročitam `00_overview.md`
— isti obrazac kao i ranije tvrdnje koje je izvor opovrgao.

**Stanje ruta sada** (`app/routes/admin.routes.tsx:53-62`): `settings`,
`settings/operations`, `settings/appearance`, `settings/seo`, `email-settings`,
`notifications`, `app-releases` (M2 = 7 ruta) · `analytics`, `client-analytics`,
`stylist-analytics` (M1 = 3 rute). `SettingsShell` trenutno ima **4** kartice
(`site`, `operations`, `appearance`, `seo`).

Oba su **arhitektonske** izmjene (deep linkovi, navigacija, `<Navigate replace>`), za razliku
od prezentacijskih a11y popravki koje su dosad rađene — zato nisu ubačene usput.

---

## 2026-11-08 — M2 (`56cee86`) i M1 (`9e4bdbc`): Postavke i Analitika u hub-ove s tabovima

Arhitektonske izmjene odobrene u `00_overview.md` §7 (**Q3**: „M1 i M2 ODOBRENI";
**Q7**: „`client-analytics` / `stylist-analytics` postaju tabovi unutar `/admin/analytics`,
stare rute redirectuju"). Rađene zajedno jer dijele obrazac.

### M2 — `/admin/settings?tab=…` (`56cee86`)

| Šta | Zašto |
|---|---|
| `pages/SettingsHub.tsx` (novi fajl) | 7 modula na jednoj ruti; `lazy` + `Suspense` jer `EmailSettings.tsx` ima 1377 linija |
| `features/settings/settings-tab-nav.tsx` (novi) | `SETTINGS_TABS` + `aria-current` eksplicitno — `NavLink` gleda samo `pathname`, pa bi svih 7 tabova bilo „aktivno" |
| `features/shell/admin/tab-redirect.tsx` (novi) | `TabRedirect` čuva postojeći query (`new URLSearchParams(searchParams)`) i dodaje `?tab=` |
| 6 starih ruta → `TabRedirect` | `settings/operations`, `settings/appearance`, `settings/seo`, `email-settings`, `notifications`, `app-releases` |
| `settings-shell.tsx` 62 → 33 ln | Nav izdvojen; `settings-semantic-tokens.test.mjs` ažuriran da prati nav u novi fajl |
| `admin-nav.ts` `tab` / `tabDefault` / `adminNavItemHref` / `searchTab` | Sidebar stavke sada znaju za `?tab=`; `key={adminNavItemHref(item)}` jer `item.path` daje 4 duplikata |

**Dokaz:** `test:settings-hub-redirect` 7/7, **5/5 mutacija pada** · code-splitting očuvan
(`SettingsHub` 6.31 KiB, `EmailSettings` 39.50 KiB zaseban chunk) · 160/160 `test:*` ·
build 274.1 KiB.

### M1 — `/admin/analytics?tab=…` (`9e4bdbc`)

| Šta | Zašto |
|---|---|
| `pages/AnalyticsHub.tsx` (novi fajl) | 3 panela; `lazy` + `Suspense` (`ClientAnalytics.tsx` 764 ln) |
| `features/analytics/analytics-tab-nav.tsx` (novi) | `ANALYTICS_TABS`, `min-h-target` (2.5.5), `focus-visible:ring-focus-ring` (2.4.7) |
| `client-analytics` / `stylist-analytics` → `TabRedirect` | Čuva `userId` / `stylistId` / `fromDate` / `toDate` |
| 6 deep linkova prebačeno | `entry-table.tsx` (2), `recent-reservations.tsx`, `Users.tsx`, `Stylists.tsx`, `Reservations.tsx` |
| **`dashboardTitleKey(pathname, search)`** | **Regresija 2.4.2 koju sam sam uveo i uhvatio**: funkcija je gledala samo `pathname`, pa bi svih 10 tabova dijelilo generički naslov dokumenta — čitač ekrana ne bi znao gdje je. `SeoRouteDefaults.tsx` sada šalje `search`; test **izvršava** funkciju (esbuild) i provjerava 13 kombinacija |
| `admin-layout.tsx` `currentLabel` | Naslov tekućeg taba analitike umjesto mrtvih `startsWith('/admin/client-analytics')` grana |
| `check-bundle-budget.mjs` | `entry.dynamicImports` navodi samo **direktne** importe, pa bi hub-ovi dali lažno crvenu; dodata tranzitivna dosežnost **plus stvarni guard** da teška ruta nije u inicijalnom statičkom bundleu |

**Dokaz:** `test:analytics-hub-redirect` 7/7, **11/11 mutacija pada** · `analytics` ruta
114.6 KiB (budžet 140) · inicijalni bundle **274.1 KiB** (budžet 300) · `Analytics` 386.65 KiB,
`ClientAnalytics` 23.13 KiB, `StylistAnalytics` 6.31 KiB — svi `isDynamicEntry`.

### Zajedničke odluke

- **Moduli ostaju u `pages/`** — 13 testova ih čita po putanji; hub-ovi su **novi** fajlovi.
  Novi test asertuje da nijedan modul nije ispražnjen (`size > 500`).
- **Zadani tab nema `?tab=`** — isto pravilo kao referentni `finance-page.tsx`.
- **`MATRIX.md` netaknut** — izmjene su navigacijske, ne poslovna logika.
- `test:reservation-list-api-contract` je dobio CI korak — **dug iz faze 3** (skripta je
  postojala u `package.json` ali nikad u `ci.yml`).

### Provedene provjere

| Provjera | M2 | M1 |
|---|---|---|
| `test:*` skripte | 160/160 | **161/161** |
| `npm run build` (uklj. bundle budget) | 274.1 KiB | 274.1 KiB |
| `check_i18n.py --strict` | PASS | PASS (+6 ključeva/jezik, `numstat` 6/0 + 6/0) |
| `check_ui_contrast.py --strict` | 80/80 | 80/80 |
| `check_repo_hygiene.py` | 1668 | 1672 |
| `check_doc_links.py` | 670/202 | 670/202 |
| `git diff --check` | čist | čist |

### 🔴 Greška u procesu (zabilježiti)

Mutacijska skripta je na kraju pozivala **`git checkout -- .`**, što je vratilo **sve
nekcommitane** izmjene (i18n ključeve, `dashboard-titles.ts`, deep linkove, `ci.yml`), a ne
samo mutirani fajl. Otkriveno jer je sljedeći anchor vratio `0`. Sve izmjene su ponovljene i
potvrđene buildom. **Pravilo: restaurirati samo mutirani fajl iz sačuvane kopije; nikad
`git checkout -- .` dok postoji nekcommitan rad.**

---

## 2026-11-08 — Faza 11 (commit 1): audit stylist portala + 4.1.3

Audit **iz izvora** (plan je do sada bio netačan u 8 navrata), pa tek onda izmjene.

### Plan vs. izvor

| Stavka plana | Presuda | Dokaz |
|---|---|---|
| **D1** shell (skip link, `aria-current`, jedan `navItems` izvor, focus-on-navigate) | **već urađeno u fazi 0** | `layouts/StylistLayout.tsx` ima `skip-link`, `aria-current`, tačno 1 `<nav`, `aria-label={t('shell.mainNavigation')}`, `id="main"`, `tabIndex={-1}` |
| **D4** 3.3.7 redundant entry | **opovrgnuto** | klijent i usluga se traže **jednom** (`workbook-new-entry-page.tsx:328` i `:369`) |
| **D5** 4 loadera → 1.4.3 / 1.4.11 | **3 od 4 opovrgnuta; 1 stvaran, ali kao 4.1.3** | `workbook-detail-page:137` i `workbook-reschedule-preview-page:127` već imaju `role="status" aria-live="polite"` + vidljiv tekst; `workbook-new-entry-page:478` uz spinner ima `t('common.loading')`. **Stvarni prekršaj** je `workbook-new-entry-page:290`: samo spinner, bez statusa i bez teksta — učitavanje za AT **nije postojalo** |
| **D6** search ikone `text-slate-400` → 1.4.11 | **opovrgnuto** | obje (`:330`, `:376`) su `aria-hidden="true"` uz `<Label htmlFor>` + placeholder — dekorativne |

**Sistematski sweep** (ne samo 4 linije iz plana): **11 `<Loader2>`** u stylist
portalu/workbook-u. 7 su submit spinneri unutar `<Button disabled=…>` koji **mijenjaju
naziv dugmeta** (`finishing` / `creating` / `sending` / `uploadInProgress`) → nisu prekršaj.
4 su samostalna; **jedan** (`new-entry:290`) nije imao indikator.

**Izmjereni kontrasti:** `slate-400` na `surface` = **2.56:1** (FAIL i za 4.5 i za 3.0), ali
svi slučajevi su `aria-hidden` dekorativne ikone → 1.4.3/1.4.11 se **ne primjenjuju**.
`slate-500`/`slate-600` tekstovi: 4.76:1 / 7.58:1 na svjetloj, a `dark:slate-400` = 6.96:1 →
**nisu prekršaji**, pa tekstualne klase nisu dirane (ostavljeno za sweep u fazi 13).

### 🔴 Moja greška u ovom auditu

Tvrdio sam da `stylist-reservation-detail-page.tsx` **nema `<h1>`** jer `grep '<h1|PageHeader'`
nad `pages/` nije našao ništa. **Netačno** — `<h1>` je u `features/stylist-portal/components/reservation-detail-summary.tsx:36`,
koju stranica renderuje. **Svih 10 stylist ekrana ima tačno jedan `<h1>`.** Pouka: grepati
**cijeli feature folder**, ne samo `pages/`, i provjeriti komponente koje stranica uvozi.

### Izmjene

- `workbook-new-entry-page.tsx:288` — loader dobija `role="status" aria-live="polite"` +
  vidljiv `{t('common.loading')}` (**4.1.3**)
- `workbook-new-entry-page.tsx:472` — loyalty `<p>` dobija `role="status" aria-live="polite"`
  (sadržaj se mijenja `loading → summary/unavailable`)
- 5 dekorativnih ikona `text-slate-400` → `text-content-muted` (konzistentnost, ne prekršaj;
  `--text-muted` ima dark varijantu 6.56:1)

### Dokaz

Novi test **`test:workbook-loading-status-a11y`** (4 testa) — broji svih 11 loadera, za
samostalne traži `role="status"` (tekst **nije** dovoljan jer se ne najavljuje), a za submit
spinnere asertuje **tačne** nazive koji mijenjaju ime dugmeta. **10/10 mutacija pada.**
Registrovan u `package.json` (168) i `ci.yml`.

| Provjera | Rezultat |
|---|---|
| `test:*` | **162/162** |
| `npm run build` | 274.1 KiB gzip |
| `check_i18n.py --strict` | PASS |
| `check_ui_contrast.py --strict` | 80/80 |
| `check_repo_hygiene.py` | 1675 |
| `check_doc_links.py` | 669/202 |

---

## 2026-11-08 — Faza 11 (commit 2): statusne poruke (4.1.3 / 3.3.1) i `text-rose-600` (1.4.3)

### Plan vs. izvor (nastavak)

| Stavka plana | Presuda | Dokaz |
|---|---|---|
| **D3** dijalozi → `ConfirmDialog` / `ResponsiveDialog` (2.1.2, 3.3.4) | **opovrgnuto** | svih 12 dijalogâ već ima `<DialogTitle>` **i** `<DialogDescription>`; Radix daje focus trap + `Esc` (2.1.2). Migracija bi bila konzistentnost, ne ispravka |
| **D7** schedule → `AccessibleCalendar` (2.5.7) | **opovrgnuto** | `stylist-schedule-page.tsx` **ne koristi kalendar** — renderuje sekcije po danima (`buildSections`). `AccessibleCalendar` uopšte **ne postoji** u kodu; `react-big-calendar` je samo u adminu (`ReservationScheduler.tsx`) |
| **D8** upload → native input + `role="progressbar"` | **djelomično** | input **jeste** native (`type="file"`, `accept="image/*"`). `className="hidden"` ga čini nefokusabilnim, **ali** omotavajući `<label>` sadrži fokusabilno `<Button>` koje tastaturom (Enter/Space → click → label) otvara picker — **2.1.1 nije prekršen**. Stvarni prekršaj je bio drugi (dolje) |
| **D10** mete ≥24 px (2.5.8) | **već zadovoljeno** | svih 17 dugmadi je `size="sm"` = `h-9 px-3` (`button.tsx:33`) = **36 px** ≥ 24 px |

### Stvarni nalazi (plan ih nije naveo)

| # | Mjesto | WCAG | Šta |
|---|---|---|---|
| 1 | `workbook-detail-page.tsx:403` | **4.1.3** | Upload status (`uploadInProgress`) se dinamički pojavljivao/nestajao **bez** `role="status"` — AT to nije vidio |
| 2 | `daily-log-disposition-panel.tsx:181` | **4.1.3 / 3.3.1** | Error u disposition dijalogu bez `role="alert"` |
| 3 | `workbook-new-entry-page.tsx:374` | **4.1.3 / 3.3.1** | „Potreban je spol klijenta" bez `role="alert"` |
| 4 | 4× `text-rose-600` | **1.4.3** | Nema dark varijantu: **3.80:1** na tamnoj površini (4.70:1 na svjetloj, 4.49:1 na `surface-muted`) |

**Sistematski sweep file inputa (cijeli `src/`):** 12 `<input type="file">`, od toga **5** s
`display:none` (`workbook-detail` ×2, `Profile`, `Register`, `Services`). Za **svih 5**
postoji fokusabilno dugme koje ih aktivira (`<label>` omotač ili `ref.click()`), pa
**2.1.1 nije prekršen** ni na jednom mjestu — nalaz je provjeren, ne pretpostavljen.

### Izmjene

- upload status → `role="status" aria-live="polite"` + `text-content-muted`
- disposition error i „spol klijenta" → `role="alert"` + `text-bad-foreground`
- `text-rose-600` → `text-bad-foreground` (4 mjesta; **0** preostalo u stylist portalu)

### Dokaz

Novi test **`test:stylist-status-messages-a11y`** (4 testa) — uključujući test koji
**izvršava** izračun kontrasta čitajući stvarne HSL vrijednosti `--bad-fg` iz `globals.css`
za obje teme (svjetlo ≥ 4.5, tamno ≥ 4.5) i potvrđuje da `rose-600` na tamnoj pada ispod 4.5.
**7/7 mutacija pada.** Registrovan u `package.json` (169) i `ci.yml`.

| Provjera | Rezultat |
|---|---|
| `test:*` | **163/163** |
| `npm run build` | 274.1 KiB gzip |
| `check_i18n.py --strict` / `check_ui_contrast.py --strict` | PASS / 80/80 |
| `check_repo_hygiene.py` / `check_doc_links.py` | 1676 / 669 |

---

## 2026-11-08 — Faza 11 (commit 3): sweep imena kontrola (4.1.2 / 1.3.1)

Umjesto preostalih stavki plana (**D2** migracija na `DataTable`/`StatGrid` je
**bespredmetna** — u stylist portalu nema nijedne `<table>` ni stat kartica; **D10** reflow
je vizuelan i ne može se verificirati bez browsera), urađen je **sistematski sweep** svih
`<Input>` / `<Textarea>` u `features/stylist-portal` i `features/stylist-workbook`.

### Rezultat sweepa

**27 kontrola, 1 bez imena.** `workbook-reschedule-preview-page.tsx:212`: orphan `<Label>`
(bez `htmlFor`) uz `<Input>` bez `id`-a i bez `aria-label` — **4.1.2 / 1.3.1**: label nije
imenovao ništa, pa čitač ekrana za polje „ručno pomjeranje" nije imao ime.

Ispravka: `useId()` → `manualShiftId`, `<Label htmlFor={manualShiftId}>` + `<Input id={manualShiftId}>`
(isti obrazac kao `workbook-new-entry-page.tsx:38-42`).

### 🔴 Greška u mojoj heuristici (zabilježiti)

Prva verzija sweepa je tražila samo `id={izraz}` i **nije** prepoznavala `id="literal"`,
pa je prijavila **21 lažno pozitivnih od 27 kontrola** — npr. `<Textarea id="cancelReason">`
uz `<Label htmlFor="cancelReason">` u `cancel-reservation-dialog.tsx:47`. Da nisam otvorio
izvor prije tvrdnje, „popravio" bih 20 ispravnih kontrola. **Pravila:**

1. Regex za JSX atribute mora pokrivati **oba** oblika vrijednosti (`{izraz}` i `"literal"`).
2. Sweep mora **brojati** ukupno provjerenih stavki — inače tiho „prođe" na praznom skupu.
   Zato test asertuje `rows.length >= 27`.

### Dokaz

Novi test **`test:stylist-form-controls-a11y`** (3 testa): sweep svih kontrola, sweep orphan
`<Label>`-a, i provjera `manualShift` uparivanja. **6/6 mutacija pada** — uključujući
„ukloni `htmlFor` s `reorderStart`" (orphan label). Napomena: mutacija „ukloni `aria-label`
s `reorderStart`" **ispravno ne pada**, jer ta kontrola ima **oba** imena; to je mutacija
koja ne mijenja svojstvo koje čuvar čuva, pa je zamijenjena onom koja mijenja.

Registrovan u `package.json` (170) i `ci.yml`.

| Provjera | Rezultat |
|---|---|
| `test:*` | **164/164** |
| `npm run build` | 274.1 KiB gzip |
| `check_i18n.py --strict` / `check_ui_contrast.py --strict` | PASS / 80/80 |
| `check_repo_hygiene.py` / `check_doc_links.py` | 1677 / 669 |

---

## 2026-11-08 — Faza 11 (commit 4): 1.4.3 u tamnoj temi (`text-slate-500` ×32)

Sweep koji je ranije otkrio `text-rose-600` proširen je na **sve** tekstualne paleta-klase u
`features/stylist-portal` i `features/stylist-workbook` (122 instance), s izračunatim
kontrastom na tamnoj površini (`slate-900`).

### Nalaz

**`text-slate-500` na 32 mjesta bez `dark:` varijante.** Na svjetloj površini **4.76:1**
(PASS), na tamnoj **3.75:1** — **1.4.3 prekršaj koji je vidljiv samo u tamnoj temi**.
Zamijenjeno s `text-content-muted` (`--text-muted`: 5.61:1 svjetlo / 6.56:1 tamno);
2 mjesta koja su imala `dark:text-slate-400` time su postala suvišna i pojednostavljena.

**Nakon zamjene: 0 prekršaja** u tamnoj temi među svih 122 paleta-klasa.

Izmjereno za referencu (na `slate-900`): `slate-600` 2.36 · `slate-700` 1.72 · `rose-700` 2.84 ·
`emerald-700` 3.26 · `green-700` 3.56 · `red-600` 3.70 · `rose-600` 3.80 — svi FAIL;
`emerald-600` 4.74 · `amber-600` 5.60 — PASS.

### DoD faze 11 — verificirano

| Stavka | Dokaz |
|---|---|
| 12 rezervacijskih akcija radi identično | `stylist-portal.api.ts` **nije diran** ni u jednom od 4 commita (`git diff --name-only`) |
| Mobilna aplikacija bez diff-a | `git diff --stat 9df498a..HEAD -- mobile/` = **0** |
| 26 postojećih testova zeleno | 165/165 `test:*` |
| Iznosi u dnevnoj knjizi identični | nijedan fajl s izračunima nije diran (samo `className`/`role`/`aria`) |

### Odgođeno na fazu 13 (uz obrazloženje)

- **`FormSection` (`<fieldset>` + `<legend>`)** na forme u stylist portalu: samo
  `stylist-direct-booking-page` ima `fieldset`; `workbook-new-entry-page` ima 6 kontrola u
  5 `<Card>` sekcija bez programskog grupisanja (1.3.1). Zamjena `<Card>` → `<fieldset>`
  mijenja **vizuelni** izgled i traži nove i18n ključeve za `<legend>`, a bez browsera se ne
  može verificirati — zato se ne radi „na slijepo".
- **D10 reflow** ispod 640 px (1.4.10) — vizuelno.

### Test

Novi **`test:stylist-dark-contrast-a11y`** (3 testa) radi **isti sweep** koji je nalaz otkrio:
ugrađena Tailwind paleta, izračun kontrasta na tamnoj površini, i provjera da
`--text-muted` (čitan iz `globals.css`) prolazi 4.5:1 u obje teme.

**7/7 mutacija s očekivanim ishodom**, uključujući **negativnu kontrolu**: zamjena
`content-muted` → `emerald-600` (4.74:1, prolazi) **ispravno ne pada**. To je dokaz da čuvar
nije ni preslab ni prestrog.

> Usput ispravljeno: prvi prag `muted >= 40` bio je **napamet odabran** i padao je na
> bezopasnoj zamjeni. Suština čuvara je `slate500 === 0`; prag je sada `>= 30` s komentarom.

Postojeći ugovor `workbook-new-entry-drawer-accessibility.test.mjs:9` asertovao je doslovno
`className="text-xs text-slate-500"` — **ažuriran uz obrazloženje**, ne obrisan.

| Provjera | Rezultat |
|---|---|
| `test:*` | **165/165** |
| `npm run build` | 274.1 KiB gzip |
| `check_i18n.py --strict` / `check_ui_contrast.py --strict` | PASS / 80/80 |
| `check_repo_hygiene.py` / `check_doc_links.py` | 1678 / 669 |

---

## 2026-11-08 — 🔴 REGRESIJA: React #310 na `/admin/analytics` (ispravljeno)

**Prijavio vlasnik:** analitika baca u konzolu
`Minified React error #310` i ruši se pri učitavanju.

### Šta je #310 (potvrđeno iz izvora, ne iz sjećanja)

`scripts/error-codes/codes.json` iz React repoa (599 kodova):

> **310** → „Rendered **more** hooks than during the previous render."
> (300 → „Rendered fewer hooks than expected…")

Dakle komponenta je u nekom renderu pozvala **više** hookova nego u prethodnom — klasičan
znak hooka pozvanog **nakon** uslovnog `return`.

### Uzrok

`git blame` na `pages/Analytics.tsx`:

| Linija | Commit | Sadržaj |
|---|---|---|
| 127 / 135 | `7eb3d61` | `if (loading) return …` / `if (!data) return …` (postojali otprije) |
| **154** | **`87eeabc` (faza 6, moj)** | **`const chartSummary = useMemo(…)` — dodan ISPOD tih return-a** |

Prvi render (`loading=true`) pozove 9 hookova; kada podaci stignu, pozove se i `useMemo` →
**10 hookova** → React #310. Rušilo se pri **svakom** učitavanju analitike.

**Ovo je moja regresija iz faze 6** (1.1.1 tekstualna alternativa za graf), ne posljedica M1.

### Zašto je prošla kroz sve provjere

Svi a11y testovi u ovom repou čitaju **izvor**, a ne renderuju komponente; `npm run build`
(`tsc`) ne provjerava pravila hookova, a ESLint (`react-hooks/rules-of-hooks`) **nije
konfigurisan** u ovom projektu. Nijedan postojeći čuvar nije mogao ovo vidjeti.

### Ispravka

`chartData` je sada `useMemo` s `data?.monthlyFinance ?? []` (računa se i dok je `data`
`null`), a `chartSummary` ostaje `useMemo` nad njim — **oba iznad** `if (loading)` /
`if (!data)`. Redoslijed hookova je time identičan u svakom renderu.

### Sistematska provjera (ne samo analitika)

Skenirano **54 komponente** u `src/`: nakon ispravke **0** hookova nakon early return-a.
Prije ispravke — **tačno 1** (`Analytics.tsx`). Prvi, naivni detektor dao je 34 pogotka jer je
hvatao i `return` iz pomoćnih funkcija unutar modula; sužen je na tijelo komponente
(indent 2) + `return` unutar `if`-bloka (indent 4).

### Novi čuvar

**`test:hooks-order`** (2 testa) pokriva **cijeli `src/`**: nijedan hook ne smije biti pozvan
nakon early return-a, i asertuje konkretan redoslijed u `Analytics.tsx`. Broji i skenirane
komponente (`>= 50`) da ne „prođe" na praznom skupu.

**3/3 mutacije padaju**, uključujući generalizaciju (novi `useMemo` ubačen iza early return-a
u `StylistAnalytics.tsx`). Registrovan u `package.json` (172) i `ci.yml`.

### Preporuka (nije urađeno — treba odluku)

`eslint-plugin-react-hooks` s pravilom `rules-of-hooks` bi ovu klasu grešaka hvatao pri
svakom `npm run lint`. ESLint trenutno **nije konfigurisan** u frontend-u (zabilježeno još u
fazi 0); uvezivanje je odgođeno na fazu 13.

| Provjera | Rezultat |
|---|---|
| `test:*` | **166/166** |
| `npm run build` | 274.1 KiB gzip |
| `check_i18n.py --strict` / `check_ui_contrast.py --strict` | PASS / 80/80 |
| `check_repo_hygiene.py` / `check_doc_links.py` | 1679 / 669 |

> ⚠️ **Nije verificirano u browseru** — ispravka je dokazana statički (redoslijed hookova) i
> buildom. Vlasnik treba potvrditi da se `/admin/analytics` sada učitava bez greške u konzoli.

---

## 2026-11-09 — ESLint uvezan: `react-hooks/rules-of-hooks` = error

Neposredan povod je React #310 regresija iz prethodnog unosa: klasu greške „hook pozvan
nakon early return-a" **nije mogao** uhvatiti nijedan postojeći alat (`tsc` ne provjerava
pravila hookova, a svi testovi čitaju izvor).

### Stanje prije

- `eslint@8.57.1` i `eslint-plugin-jsx-a11y@6.10.2` **jesu** bili u `devDependencies`
- `npm run lint` = `eslint . --ext ts,tsx` **postojao**, ali **bez konfiguracijskog fajla** →
  padao je s „Oops! Something went wrong!". Dakle lint **nikad nije ni radio**.

### Šta je dodato

| Paket | Verzija | Zašto |
|---|---|---|
| `eslint-plugin-react-hooks` | `^5.2.0` | `rules-of-hooks`; v5 podržava ESLint 8 **i** 9 (v7 traži 9) |
| `@typescript-eslint/parser` | `^7.18.0` | peer dep `eslint ^8.56.0` — odgovara na 8.57.1 |
| `@typescript-eslint/eslint-plugin` | `^7.18.0` | TS pravila |

Novi **`frontend/.eslintrc.cjs`** (ESLint 8 = eslintrc, ne flat config).

**Nivoi:**
- `react-hooks/rules-of-hooks` → **error** (jedino blokirajuće pravilo; ruši aplikaciju)
- `react-hooks/exhaustive-deps` → warn (7 mjesta; mijenjanje bi diralo cache ponašanje)
- `jsx-a11y/*` → warn (uvezano sada, puna primjena je faza 13)

### Dokaz da pravilo radi

Na **namjerno pokvarenom** `Analytics.tsx` (isti raspored kao u `87eeabc`):

```
163:24  error  React Hook "useMemo" is called conditionally. React Hooks must be
               called in the exact same order in every component render. Did you
               accidentally call a React Hook after an early return?
               react-hooks/rules-of-hooks
```

exit code **1**. Nakon restauracije: exit **0**.

### Rezultat linta na postojećem kodu: **0 errors, 17 warnings**

Svih 12 prvobitnih „grešaka" je provjereno iz izvora — **nijedna nije stvarni prekršaj**,
osim jednog gapa:

| Nalaz | Presuda |
|---|---|
| `Gallery.tsx:426`, `PublicReserve.tsx:1032` — `label-has-associated-control` | **lažno pozitivan** — `<label>` omata `<input type="checkbox">` i sadrži vidljivi tekst u `<span>` (validna implicitna asocijacija). ESLint ne prepoznaje tekst ugniježden u `<span>` |
| `Gallery.tsx:322`, `Services.tsx:515` — `click-events-have-key-events`, `no-static-element-interactions` | **lažno pozitivan** — `onClick={(e) => e.stopPropagation()}` na omotaču ne vrši akciju, samo sprječava da klik na dugme aktivira cijeli red; dugmad su fokusabilna, 2.1.1 nije prekršen |
| `alert.tsx:36`, `card.tsx:35` — `heading-has-content` | **lažno pozitivan** — shadcn primitivi (`<h5 {...props} />`) dobijaju sadržaj od pozivaoca; isključeno za `src/components/ui/**` |
| 🔴 **`ReservationScheduler.tsx:1086`** — `no-noninteractive-element-interactions` | **STVARNO** — `<ul>/<li>` dropdown s `onClick`, a u cijelom fajlu nema `onKeyDown`, `role="listbox"`, `role="option"`, `aria-selected` ni `tabIndex` → **2.1.1 + 4.1.2**. Ispravka je combobox obrazac iz faze 3, prevelika za ovaj commit → **faza 13**; pravilo je zato warn, s komentarom da se vrati na error |

Svako spuštanje na warn ima komentar **zašto** i **kad ga vratiti na error** — da warn ne
postane trajno skrivanje problema.

### CI

Novi korak **„Lint frontend (rules-of-hooks)"** u `frontend` jobu (172 koraka). Lint sada
**radi** prvi put u ovom repou.

| Provjera | Rezultat |
|---|---|
| `npm run lint` | **0 errors**, 17 warnings |
| `test:*` | **166/166** |
| `npm run build` | 274.1 KiB gzip |
| `check_i18n.py --strict` / `check_ui_contrast.py --strict` | PASS / 80/80 |
| `check_repo_hygiene.py` / `check_doc_links.py` | 1680 / 669 |

---

## 2026-11-09 — 🔴 ISPRAVKA moje kvalifikacije iz faze 11: tamna tema se ne može aktivirati

U fazi 11 (commit 4) sam `text-slate-500` ×32 nazvao **„1.4.3 prekršaj koji je vidljiv samo u
tamnoj temi"**. Provjera iz izvora pokazuje da je ta **kvalifikacija pogrešna**.

### Dokaz

| Šta | Gdje | Rezultat |
|---|---|---|
| `darkMode: ['class']` | `tailwind.config.js:4` | tamna tema traži `.dark` klasu na pretku |
| `.dark { … }` CSS | `styles/globals.css:68` | pravila **postoje** |
| `class="dark"` u `<html>` | `index.html:2` | **nema** — `<html lang="bs">` |
| Inline skripta u `index.html` | — | **nema** |
| `classList` + `dark` u cijelom `src/` | grep | **0 pogodaka** |
| `ThemeProvider` / `setTheme` / `useTheme` / `colorScheme` | grep | **0 pogodaka** |
| `SettingsContext` | `context/SettingsContext.tsx:66-70` | postavlja samo CSS varijable za **brand boje**, ne temu |

**Zaključak: tamna tema se u ovoj aplikaciji ne može aktivirati.** Svi `dark:` Tailwind
varianti i sva `.dark` CSS pravila su **mrtvi kod**.

### Šta to znači za nalaz iz faze 11

- `text-slate-500` na svjetloj površini = **4.76:1 → PASS**. Kako se tamna tema ne prikazuje,
  **1.4.3 nije prekršen u praksi.** Moja tvrdnja „stvarni prekršaj" bila je **preuveličana** —
  upravo obrazac na koji je vlasnik upozorio.
- **Zamjena ipak ostaje valjana**, ali iz drugih razloga: `text-content-muted` je semantički
  token (5.61:1, **bolji** kontrast od 4.76:1) i radi ispravno ako se tamna tema ikad uvede.
  Dakle: poboljšanje konzistentnosti i rezerve, **ne** ispravka prekršaja.
- Isto važa za `text-rose-600` → `text-bad-foreground` iz commita 2: na svjetloj je 4.70:1
  (PASS); zamjena je konzistentnost, ne ispravka.

### Šta ostaje tačno

Stvarni prekršaji iz faze 11 **nisu** dovedeni u pitanje — oni ne ovise o temi:
**4.1.3** (loader bez `role="status"`, upload status, dva errora bez `role="alert"`) i
**4.1.2/1.3.1** (orphan `<Label>` u reschedule preview).

### Posljedica za test

`test:stylist-dark-contrast-a11y` **ostaje**, ali mu je premisa u komentaru ispravljena: on
nije dokaz prekršaja nego **čuvar konzistentnosti** (semantički tokeni umjesto sirovih
paleta-klasa) i rezerva za slučaj da se tamna tema uvede. Pragovi i sweep su nepromijenjeni.

> **Pouka:** prije tvrdnje „prekršaj u tamnoj temi" provjeriti **da li tamna tema postoji**.
> `grep dark: <broj>` nije dokaz da se tema koristi — treba naći ko postavlja `.dark` klasu.

---

## 2026-11-09 — Faza 12: Onboarding / ForceChangePassword (audit + 3.3.1)

### Plan vs. izvor

| Stavka plana | Presuda | Dokaz |
|---|---|---|
| **D1** `ForceChangePassword` nema `<h1>` | **opovrgnuto** | `components/OnboardingShell.tsx:140` **bezuvjetno** renderuje `<h1>{title}</h1>`; sve tri stranice (`ForceChangePassword`, `OnboardingEmail`, `OnboardingGender`) koriste `<OnboardingShell>` |
| **D2** dodati `autocomplete="one-time-code"` | **opovrgnuto** | `otp-input.tsx:60` već ima `autoComplete={i === 0 ? 'one-time-code' : 'off'}` (samo prvo polje — preporučeno) |
| **D3** nema blokiranja paste-a | **zadovoljeno** | `handlePaste` čita `clipboardData`; nijedan `onPaste` ne poziva `preventDefault` → 3.3.8 |
| **D4** bez kognitivnih testova | **zadovoljeno** | 0 pogodaka za `captcha`/`reCAPTCHA`/`hCaptcha` u svih 5 fajlova |
| **D7** `role="alert"` za greške | **opovrgnuto** | greške idu preko `toast.warning` → **sonner**, a `sonner/dist/index.mjs:1145` već postavlja `"aria-live": "polite"` |
| **D5/D6** zahtjevi za lozinku | **djelomično stvarno** | vidi dolje |
| **D9** tokeni umjesto `slate-*` | **nije prekršaj** | `text-slate-500/600/700/900` u onboarding lancu prolaze na svjetloj (4.76–17.85:1), a tamna tema se ne može aktivirati (vidi prethodni unos) |

### Stvarni nalaz — 3.3.1 / 3.3.2

Zahtjev „najmanje 6 znakova" postojao je **samo** kao `minLength={6}` (programski) i kao
toast **nakon** neuspjeha (`onboarding.passwordTooShort`). Korisnik zahtjev nije mogao
vidjeti prije unosa.

**Ispravka:** novi ključ `onboarding.passwordRequirements` (BS/EN) + vidljiv
`<p id="newPasswordRequirements">` + `aria-describedby` na polju. `passwordTip`
(„Odaberite jaku lozinku…") je već bio prikazan preko `OnboardingShell`, ali **ne navodi
broj znakova**.

### 🔴 Važno: moja ranija greška s `<h1>` se ponovila — i ovog puta je uhvaćena

U fazi 11 sam tvrdio da `stylist-reservation-detail-page.tsx` nema `<h1>` jer grep nad
`pages/` nije našao ništa (bio je u komponenti). **Isti obrazac** se pojavio i ovdje: plan
tvrdi da `ForceChangePassword` nema `<h1>`, a grep nad stranicom to „potvrđuje" — ali naslov
daje `OnboardingShell`. Razlika je što sam ovaj put **provjerio komponentu prije tvrdnje**.

### Test

**`test:onboarding-a11y`** (4 testa): 3.3.1/3.3.2 ugovor, te tri **auditska** testa koji
zakucavaju opovrgnute stavke (D1 — shell ima bezuvjetni `<h1>`; D2/D3 — `one-time-code` i
paste koji nije blokiran; D7 — sonner ima `aria-live`). **7/7 mutacija pada**, uključujući
„`onPaste={(e) => e.preventDefault()}`" (3.3.8) i „`<h1>` → `<h2>` u shellu".

Registrovan u `package.json` (173) i `ci.yml`.

| Provjera | Rezultat |
|---|---|
| `test:*` | **167/167** |
| `npm run lint` | 0 errors, 17 warnings |
| `npm run build` | 274.1 KiB gzip |
| `check_i18n.py --strict` | PASS (`numstat` 1/0 + 1/0) |
| `check_ui_contrast.py --strict` / hygiene / doc_links | 80/80 / 1681 / 669 |
