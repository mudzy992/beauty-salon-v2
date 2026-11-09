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

---

## 2026-11-09 — Faza 13 (commit 1): 2.1.1 + 4.1.2 — izbor usluge u ReservationScheduler bio samo mišem

### Nalaz (iz izvora, prije ispravke)

`features/reservations/components/ReservationScheduler.tsx:1084-1101`:

```jsx
<ul className="...">                                  // bez role="listbox"
  <li className="cursor-pointer ..."                  // bez role="option"
      onMouseDown={(ev) => ev.preventDefault()}       // bez tabIndex
      onClick={() => toggleServiceId(svc.id)}>        // bez onKeyDown
```

Tastaturni korisnik je mogao **kucati** u pretragu i vidjeti filtriran spisak, ali nijednu
opciju **nije mogao dosegnuti niti aktivirati**. Provjereno da nema alternativnog puta: od
dva poziva `toggleServiceId` onaj na `:1116` je dugme za **uklanjanje** već izabrane usluge.

→ **2.1.1 Keyboard** (tvrd prekršaj) + **4.1.2 Name, Role, Value**.

### Ispravka

Preslikan obrazac iz `features/daily-log/entry-form-fields.tsx` (**multi-select** varijanta,
već pokrivena testom `daily-log-form-a11y`): `role="combobox"` + `aria-expanded` +
`aria-controls` + `aria-autocomplete="list"` + `aria-activedescendant` na ulazu;
`role="listbox"` + `aria-multiselectable="true"` + `aria-label` na `<ul>`;
`role="option"` + `aria-selected` + `id` na `<li>`; `onKeyDown` sa ArrowDown/ArrowUp/Home/
End/Enter/Escape. `stepIndex` je zadržan **lokalno** jer `daily-log-form-a11y:77` pinuje
`if (key === '…')` unutar tog fajla — ekstrakcija u dijeljeni modul bi slomila ugovor.

### Test

`test:reservation-scheduler-combobox` (3 testa): combobox ugovor, tastaturne grane, i
**globalni čuvar** koji za cijeli `src/` traži klikabilan `<li>` bez `role="option"`
(trenutno 3 klikabilna `<li>`, sva 3 ispravna; donja granica `checked >= 3` sprječava tiho
prolaženje na praznom skupu).

**12/12 mutacija pada** — uključujući `role="combobox"`→`role="text"`, `role="listbox"`→
`role="list"`, `role="option"`→`role="listitem"`, `onKeyDown`→`onKeyDownUnused`,
`if (false)` na Enter/Escape, i `aria-controls` s pogrešnim id-jem.

### Dvije greške u mom vlastitom testu (ispravljene prije commita)

1. `const SRC = join(root, '..')` — a `root` u kolociranom testu **već jeste** `frontend/src`,
   pa je sweep tražio fajlove u `frontend/`. (Ista zamka kao ranije.)
2. `/<li\b[^>]*>/` nalazi **0** klikabilnih `<li>`: `[^>]*` se lomi na `=>` iz arrow-funkcija
   u atributima (`onMouseDown={(ev) => ev.preventDefault()}`). Zamijenjeno skenerom koji
   poštuje dubinu `{}` i stringove → 3 pogodaka.

| Provjera | Rezultat |
|---|---|
| `test:*` | **168/168** |
| `npm run lint` | 0 errors, **16** warnings (bilo 17 — popravka je uklonila `no-noninteractive-element-interactions`) |
| `npm run build` | 274.1 KiB gzip (calendar chunk 95.5 KiB) |
| `npx tsc --noEmit` | čist |
| `check_i18n` / `check_ui_contrast` / hygiene / doc_links | PASS / 80 / 1682 / 669 |

---

## 2026-11-09 — Faza 13 (commit 2): D3 sweep sirovih boja — 4 stvarna prekršaja, ne 1965

### Zašto nije „sweep sirovih boja"

Plan (§D3) traži „grep `text-slate-*`/hex → allowlist". Ali **sirova paleta-klasa nije
prekršaj ako kontrast prolazi**, a zabrana klasa bi bila čist churn: u admin/stylist kodu
ima **883 svjetle** upotrebe paleta-klasa. Zato test **mjeri kontrast** i traži obrazloženje
samo za one ispod 4.5:1.

### Trijaža (svaki nalaz provjeren iz izvora)

| Grupa | Broj | Presuda |
|---|---|---|
| Ikone (`aria-hidden="true"`, `1.4.11` prag **3:1**) | 18 | PASS — `rose-500` 3.67, `emerald-600` 3.77, `teal-600` 3.74, `amber-600` 3.19, `slate-400` 2.56 (dekorativne) |
| Zvjezdice ocjena (`fill-*`, imaju tekstualnu alternativu) | 4 | PASS |
| Tekst na **nebijeloj** pozadini | 4 | PASS — `badge` `slate-50` na `bg-slate-900` (≈17:1); `Login`/`Register`/`PublicHome` `slate-200` na `bg-gradient-to-t from-black/80` |
| **Tekst na bijeloj ispod 4.5:1** | **4** | **PREKRŠAJ — ispravljeno** |

### Ispravljeno (1.4.3)

| Mjesto | Bilo | Sada |
|---|---|---|
| `stylist-direct-booking-page.tsx:295` | `text-amber-600` **3.19:1** | `text-warn-foreground` **8.35:1** |
| `workbook-new-entry-page.tsx:363` | `text-emerald-600` **3.77:1** | `text-ok-foreground` **7.14:1** |
| `Users.tsx:1186` | `text-emerald-600` **3.77:1** | `text-ok-foreground` **7.14:1** |
| `Users.tsx:1373` | `text-emerald-600` **3.77:1** | `text-ok-foreground` **7.14:1** |

Svi `<p>`-ovi stoje na `bg-white` (`card.tsx:10`). U `Users.tsx` trostanje dostupnosti
korisničkog imena ostaje mješovito **namjerno**: `slate-500` (4.76:1), `rose-600` (4.70:1)
i `blue-600` (5.17:1) **prolaze**, pa ih ne diram — popravljam prekršaje, ne prolazan kod
(inače bi to bilo 22 izmjene bez a11y vrijednosti).

### 🔴 Posljedica moje ranije pogrešne premise

`amber-600` 3.19:1 i `emerald-600` 3.77:1 na **bijeloj** su prekršaji, ali test iz faze 11
(`stylist-dark-contrast-a11y`) ih **nije** uhvatio jer je računao kontrast na **tamnoj**
površini (`amber-600` 5.60:1, `emerald-600` 4.74:1 — oba PASS). Tamna tema se ne može
aktivirati, pa je taj test mjerio površinu koja se ne prikazuje. Novi test mjeri **bijelu**.

### Dvije greške u mom sweepu (uhvaćene prije commita)

1. `(?<!dark:)text-` isključuje samo `dark:` **neposredno** ispred `text-`, pa su
   `dark:[&>svg]:text-slate-50` i `dark:hover:text-slate-500` prošli kao svjetle upotrebe
   (3 lažno pozitivna). Rješenje: parsiranje po **tokenima klase** i provjera da li se
   `dark` nalazi **bilo gdje** u prefiksu tokena.
2. `EXCLUDE` regex je tražio trailing separator (`features/blog/`), a testirana je putanja
   direktorija **bez** njega → `features/blog` se nije preskočio (2 lažno pozitivna).
   Rješenje: fragmenti putanje nad normalizovanim stringom.

### Test

**`test:text-contrast-allowlist`** (3 testa): sweep 178 fajlova (bez `features/blog` i
`features/shell/public`), allowlist od 27 obrazloženih nalaza, i asertije za 4 ispravke.
Donje granice `scanned >= 800` i `skippedDark >= 100` sprječavaju tiho prolazenje.

**6/6 smislenih mutacija pada**: `dark:` detekcija isključena (**negativna kontrola**),
obrisan unos allowliste, vraćen `emerald-600`, novi niskokontrastni nalaz (`amber-500`
2.15:1), zastarjeli unos allowliste, prekratak razlog.

**Tri mutacije koje test namjerno NE ruši** (nisu rupe): olabavljene donje granice i
dodata neiskorištena paleta — to slabi čuvar, ne krši invariant. Isprva sam jednu mutaciju
(`pink-600`) proglasio rupom, a ona je **4.60:1 → prolazi**, dakle loše izabrana mutacija.

| Provjera | Rezultat |
|---|---|
| `test:*` | **169/169** |
| `npm run build` | 274.1 KiB gzip |
| `npx tsc --noEmit` | čist |
| `check_i18n --strict` / `check_ui_contrast --strict` | PASS / 80 |
| hygiene / `diff --check` | 1683 / čist |
| diff | hirurški: 1/1 · 1/1 · 2/2 linija |

---

## 2026-11-09 — Faza 13 (commit 3): D2 dead-code sweep

### `ui/tooltip.tsx` + `@radix-ui/react-tooltip`

Plan tvrdi „0 upotreba, potvrđeno grep-om" — i **tačan je**, ali moj prvi grep je dao
**1** pogodak (`Analytics.tsx:337 <Tooltip formatter=…/>`). To je **recharts** `<Tooltip>`,
ne shadcn. Prava provjera je broj **importova** `ui/tooltip` = **0** → fajl obrisan.
`@radix-ui/react-tooltip` je koristio samo taj fajl, pa je uklonjena i zavisnost
(`npm uninstall`; `package.json` i `package-lock.json` = 0 pogodaka).

Bundle: **274.1 → 273.8 KiB** gzip.

### Nekorišteni i18n ključevi — dvije greške u mom detektoru prije brisanja

Naivni detektor je dao **42** „nekorištena" ključa. Nakon provjere:

| Korak | Rezultat |
|---|---|
| Naivno (leaf se ne pojavljuje u izvoru) | 42 |
| − plurale (`_one`/`_few`/`_other`) čija baza postoji | −18 |
| − ključevi u dinamičkim namespace-ovima | −4 (`jobStatuses.PARTIAL`, `recipientStatuses.SKIPPED`, `public.reserve.loginRequired`, `changeService`) |
| − **dinamički sastavljeni** ključevi | −4 (`addTitle`/`addText`/`addButton`/`addSpacer`) |
| **Sigurno mrtvo** | **16** |

**🔴 Zamka koja bi slomila email editor:** `emailSettings.campaigns.addTitle` itd. izgledaju
mrtvo jer se string `addTitle` nigdje ne pojavljuje — ali `email-visual-editor.tsx:122` gradi
ključ dinamički: `t(\`emailSettings.campaigns.add${type[0].toUpperCase()}${type.slice(1)}\`)`,
a `EmailContentBlockType = 'title' | 'text' | 'button' | 'spacer' | 'highlight' | 'divider'`
(:12). Brisanje bi uklonilo **žive** ključeve. Moj prvi filter je provjeravao samo **pretke**
namespace-a, ne prefiks leafa.

Obrisan 16 ključeva × 2 jezika (`nav.sectionSettings`, 5× `table.*`,
`shell.sectionNavigation`, 2× `emailSettings.campaigns.*`, `services.confirmDeleteService`,
`stylists.newStylist`/`editStylist`, `dailyLog.fromReservation`, `finance.closeBook`/
`openCurrentMonth`, `public.gallery.closeImage`).

Uklanjanje je **hirurško** (po linijama, uz praćenje ugnježdenja + popravak visećih zareza),
ne `json.dumps` round-trip: `git diff --numstat` = **1/17** po fajlu, a ne hiljade linija.

### Provjere

| Provjera | Rezultat |
|---|---|
| `test:*` | **169/169** |
| `npx tsc --noEmit` / `npm run build` | čist / **273.8 KiB** (bilo 274.1) |
| `check_i18n --strict` | PASS (bs/en paritet očuvan) |
| `check_repo_hygiene` | PASS, 1683 trackovane putanje (HEAD 1684 → −1) |
| `git diff` HEAD↔index | **jedina** razlika = `frontend/src/components/ui/tooltip.tsx` |

---

## 2026-11-09 — Faza 13 (commit 4): Q4 axe/Playwright + D7/D8/D9 dokumentacija

### Q4 — axe + Playwright: instalirano, ali **neizvršeno**

Q4 je odobrio `@axe-core/playwright` + `@playwright/test`.

> **Ispravka moje tvrdnje:** u prvoj verziji ovog unosa napisao sam da su zavisnosti
> **instalirane u fazi 13**. To je netačno — `git log` pokazuje da su u `frontend/package.json`
> **još od commita `7eb3d61` (faza 3)**, dakle instalacija iz Q4 je odavno urađena. Moj
> `npm install --save-dev @axe-core/playwright@^4.10.0 @playwright/test@^1.49.0` bio je
> praktično **no-op** (već prisutne iste verzije `4.14.0` / `1.65.0`, pa `package.json` i
> `package-lock.json` nisu promijenjeni). Ono što je **novo** u fazi 13 su `playwright.config.ts`,
> `e2e/a11y-routes.spec.ts`, omotač `scripts/run-a11y-routes.mjs` — i saznanje da se browser
> binarni fajl ovdje ne može preuzeti.

Stanje:

| Korak | Rezultat |
|---|---|
| Zavisnosti u `package.json` | prisutne od `7eb3d61` (faza 3): `@axe-core/playwright@^4.14.0`, `@playwright/test@^1.65.0` |
| `npm ls` | čist |
| `npx playwright install chromium` | **❌ PADA** — `Failed to download Chrome for Testing 158.0.8127.18 (playwright chromium v1254) … Download failure, code=1` (sandbox dozvoljava github/npm/pypi, ne Playwright CDN) |
| `npx tsc --noEmit --strict` nad specom | **prolazi** |
| `npx playwright test --list` | **nabraja 11 testova** → config i spec se učitavaju |

Zato `test:a11y-routes` **nije** dodat u CI kao blokirajući korak: ne bi bilo pošteno
tvrditi da prolazi nešto što nikad nije pokrenuto. U `playwright.config.ts` i specu je
🔴 napomena s tačnom greškom i komandom za pokretanje.

**Omotač `scripts/run-a11y-routes.mjs`** preskače test kad browser ne postoji (glasno
`⚠️ SKIPPED` + uputstvo, exit 0) kako ne bi rušio `test:*` petlju niti davao lažno crveno u
CI. Prva verzija omotača **nije radila**: `chromium.executablePath()` vraća *očekivanu*
putanju i kad browser nije instaliran (ne baca), pa je omotač pokrenuo testove koji su pali s
`Executable doesn't exist at …/chrome-headless_shell`. Ispravljeno provjerom
`existsSync(candidate)`. `frontend/test-results/` i `frontend/playwright-report/` dodati u
`.gitignore` (postojeći `/test-results/` je usidren na koren repa pa nije hvatao poddirektorij).

**Putanje u specu su verificirane iz izvora**, i to je uhvatilo grešku: prva verzija je
imala `/rezervacije`, a ruta je **`rezervacija`** (jednina, `public.routes.tsx:34`) — dalo bi
404. Sada svih 9 putanji (`/`, `/usluge`, `/galerija`, `/kontakt`, `/rezervacija`,
`/zadovoljni-klijenti`, `/blog`, `/login`, `/register`) postoji u `router.tsx` /
`public.routes.tsx` (skripta: 9/9, 0 nepostojećih).

### D8 — konačna WCAG matrica

Dodan odjeljak **„KONAČNI STATUSI — ETAPA B"** u
[`MATRIX.md`](../../docs/matrices/dashboard-a11y/MATRIX.md); ETAPA A tabele su zadržane
kao baseline. **51 red**: 26 ✅ · 1 ✅/❌ · 12 🟡 · 4 ❌ · 7 ➖ · 1 ➖/⚠️.

> Brojeve je **izbrojala skripta**, ne ja. Prva verzija rezimea je tvrdila 28/14/3/11 —
> **pogrešno**; stvarno je 26/12/4/7. Ispravljeno prije commita.

Mjerenja iz izvora (ETAPA A → sada): `aria-current` 0 → **6** · `th scope="col"` 17/129 →
**115/152** · `<caption>` 3 → **21** · `focus-visible` 40 → **162** · `scroll-padding` 0 →
**2** · `prefers-reduced-motion` 1 (samo logo) → **3** (globalno na `*`) ·
`role="status"` **84** / `role="alert"` **63** · `check_ui_contrast.py --strict` 9/23 padalo
→ **80/80**.

### D7 — FINDINGS i HANDOFF

- **`docs/audit/FINDINGS.md`**: dopuna uz A11Y-01 koja **izričito ne zatvara** finding —
  dashboard rad je source-contract, rendered dokaza nema.
- **`docs/audit/HANDOFF.md`** (D10, bez tihog popravljanja): **15 mjesta** zaobilazi
  `formatLocalizedAmount` i koristi `toFixed(2) + ' KM'` → u BS lokalizaciji isti ekran može
  prikazati i `1250.00 KM` i `1.250,00 KM`, a `undefined` daje `"NaN KM"` umjesto `'—'`.
  Nije WCAG prekršaj; traži zaseban namjeran commit.

### 2.5.7 — provjera umjesto pretpostavke

Plan traži „ima li tastaturnu alternativu; ako nema, zabilježiti". Iz izvora:
- `before-after-spotlight.tsx` — **0** `onPointerDown`/`onMouseDown`/`draggable` → **➖**,
  izbor ide preko `<button>` (`:104`, `:247`); nije drag slider.
- `ReservationScheduler.tsx` — `onEventDrop`/`onEventResize` (`:673`/`:682`) **ostaju**, ali
  postoji **agenda** prikaz (`:409`, `:565`) i `type="time"` polja u detaljima (`:807`/`:817`,
  `:1197`/`:1206`) kao put bez povlačenja. **Nije provjereno** da li je `onSelectEvent`
  dostupan tastaturom → **🟡**, ne ✅.

### 1.2.x — nije primjenjivo

0 pogodaka za `<video>`/`<audio>` u `pages/`, `features/`, `components/`, `layouts/` → **➖**.

### Dvije stavke iz plana §7 koje **nisu** urađene

1. `test:no-window-confirm` — svih 14 poziva koristi `t(...)`, native `confirm` je fokusiran
   i tastaturno dostupan, a kao potvrda **doprinosi** 3.3.4. Blokirajući test = čist churn.
2. Razbijanje `EmailSettings.tsx` (1377 ln) — testovi ga čitaju po putanji; dijeljenje bi ih
   slomilo uz nula a11y vrijednosti.

---

## 2026-11-09 — 🔴 POPRAVKA: `test:a11y-routes` pao s „Timed out waiting 180000ms from config.webServer"

Vlasnik je pokrenuo `npx playwright install --with-deps chromium && npm run test:a11y-routes`
na svojoj mašini; browser se instalirao, ali test pade:

```
[WebServer] npm notice run vite preview --port 10000 --config vite.config.ts
Error: Timed out waiting 180000ms from config.webServer.
```

### Uzrok (izmjereno, ne nagađano)

`vite preview` se bez `--host` veže na **IPv6 `::1`**, a Playwright/Node `localhost` često
razriješe na **IPv4 127.0.0.1** → konekcija odbijena → Playwright poll-uje punih 180 s.
Server je **radio**, samo nije bio dostižan na adresi koju Playwright provjerava.

| Komanda | `curl 127.0.0.1:10000` | `curl localhost:10000` | `curl [::1]:10000` |
|---|---|---|---|
| `vite preview` (bez `--host`) | **000** ❌ | 200 | 200 |
| `vite preview --host 127.0.0.1` | **200** ✅ | 200 | 000 |

### Ispravka

`playwright.config.ts`:
```diff
- command: 'npm run preview',
- url: 'http://localhost:10000',
+ command: 'npm run preview -- --host 127.0.0.1',
+ url: 'http://127.0.0.1:10000',
```
`use.baseURL` isto prebačen na `http://127.0.0.1:10000` (bez dvosmislenosti).

### Dokaz da je riješeno

`npx playwright test` u sandboxu (browser i dalje nedostupan, pa testovi padaju na launchu —
što je očekivano i **nije** ova greška):

| Prije | Poslije |
|---|---|
| `Error: Timed out waiting 180000ms from config.webServer` | **0 pojavljivanja** „Timed out waiting" |
| čekanje 180 s | run završi za **~8 s** |
| — | jedina greška: `browserType.launch: Executable doesn't exist` (sandbox nema browser) |

Playwright **ne bi došao do pokretanja 11 testova** da webServer URL nije odgovorio.
Dodatno direktno: `npm run preview -- --host 127.0.0.1` → vite ispiše
`Local: http://127.0.0.1:10000/`, a `curl` na tu adresu vraća **200**.

### Drugi mogući uzrok istog simptoma — sada daje jasnu poruku

`vite preview` servira **izgrađen** output; bez `dist/` server ne odgovara i Playwright
također čeka 180 s. `scripts/run-a11y-routes.mjs` sada to provjeri **odmah** i staje s:

```
✖ dist/ ne postoji — `vite preview` nema šta servirati.
  Pokrenite prvo build, pa onda test:
    cd frontend && npm run build && npm run test:a11y-routes
```

Provjereno: omotač traži `frontend/dist/index.html` (rezolucija putanje tačna, `existsSync` =
true na izgrađenom projektu). Redoslijed provjera je namjeran — bez browsera se preskače
prije provjere `dist/`, jer je tada `dist/` nebitan.

---

## 2026-11-09 — Faza 13, commit 5: **prvi stvarni axe run** → trijaža i ispravke

### Šta se desilo

Vlasnik je na svojoj mašini (`/home/administrator/Documents/GitHub/beauty-salon-v2`)
instalirao browser i pokrenuo `npm run test:a11y-routes`. **Rezultat: 11 testova,
3 prošla / 8 palo, 24.6 s.** Ovo su prvi rendered dokazi u cijelom projektu — do sada su
sve ✅ bile source-contract.

**Kontekst koji mijenja tumačenje:** backend nije bio podignut (log pun
`http proxy error … connect ECONNREFUSED 127.0.0.1:10001` za `/api/settings/public`,
`/api/services`, `/api/salon`), pa su stranice renderovane u **praznom/fallback stanju**.
Nalazi važe za to stanje; `/admin/**` i dalje nije pokriven.

| Test | Rezultat |
|---|---|
| axe `/rezervacija`, axe `/login`, `2.4.2` `<title>` (sve rute) | ✅ |
| `label-content-name-mismatch` (serious, 2.5.3) | ❌ na **6 ruta** |
| `color-contrast` (serious, 1.4.3) | ❌ ×2 na `/kontakt` |
| `image-alt` (**critical**, 1.1.1) | ❌ ×1 na `/register` |
| `2.4.1` skip-link | ❌ prvi Tab pada na logo, 14× |

### Ispravka 1 — 2.5.3 Label in Name (6 ruta)

`components/i18n/language-switcher.tsx`: `aria-label={actionLabel}` davao je
„Prebaci jezik na Engleski", a vidljivi sadržaj dugmeta je
`{currentLanguage.toUpperCase()}` = „BS". Vidljivi tekst **nije** bio dio pristupačnog
imena → čitač ekrana najavi drugo ime nego što korisnik vidi.

Sada `aria-label={`${visibleCode} — ${actionLabel}`}`. **`title` je namjerno ostao
`actionLabel`** — `aria-label` ionako preglasava `title` u računanju imena (accname), pa je
tooltip na javnom sajtu **piksel-identičan** (Q8/Q9 logika: bez nepotrebnih vizuelnih
izmjena).

### Ispravka 2 — 1.1.1 image-alt (critical, `/register`)

`components/ui/avatar.tsx` — `AvatarImage` nije postavljao `alt` kada ga pozivalac ne
prosljedi. Sada default `alt=""` (dekorativno).

**Dokaz po `00_overview.md:107` (dijeljena komponenta — grep upotreba):**
skript je prebrojao svih **11** `<AvatarImage>` u `pages/`, `features/`, `components/`,
`layouts/` i parsirao svaki JSX element zasebno:

- **10** već prosljeđuje `alt=` → `admin-chrome.tsx:88,109,126`, `admin-layout.tsx:95`,
  `public-layout.tsx:215`, `StylistLayout.tsx:118`, `Profile.tsx:465`, `Users.tsx:762,863`,
  `PublicHome.tsx:346`
- **1** nije prosljeđivao → **`pages/Register.tsx:231`** — tačno onaj koji je axe našao.

Dakle nalaz nije bio sistemski, nego jedna rupa. Za 10 postojećih pozivaoca **ponašanje je
nepromijenjeno** (njihov `alt` pobjeđuje default), uključujući dva na javnom sajtu
(`public-layout.tsx:215`, `PublicHome.tsx:346`).

### Ispravka 3 — 1.4.3 color-contrast na `/kontakt` (odluka **Q8**)

`PublicContact.tsx:280-282`, placeholder Google mape: `text-slate-500` `#64748b` na
`bg-slate-200` `#e2e8f0` = **3.86:1** (axe izmjerio; moj proračun se poklapa). Treba 4.5:1.
→ `text-slate-600` `#475569` = **6.15:1** na toj pozadini.

**Ovo je jedina vidljiva izmjena boje na javnom sajtu** i bila je u sukobu s DoD t. 64
(„javni sajt bez diff-a") → **odluka vlasnika Q8: zadržati**, DoD t. 64 se tumači kao „bez
nenamjernih vizuelnih regresija". Zabilježeno u `00_overview.md` §7b.

### Ispravka 4 — 2.4.1 skip-link na javnom sajtu (odluka **Q9**)

`grep -rn "skip-link"` je pokazao da `SkipLink` postoji **samo** u
`admin-layout.tsx:81` i `StylistLayout.tsx:80` — javni layout ga nije imao, pa je prvi Tab
išao na logo. Dodato `<SkipLink />` kao prvi element glavnog `return`-a +
`<main id="main" tabIndex={-1}>` (bez `tabIndex` fokus ne bi skočio → 2.4.3).

**0 vidljivih izmjena**: `.skip-link` je vizuelno skriven dok ne dobije fokus
(`styles/globals.css`). Odluka vlasnika **Q9** (`features/shell/public/` je na ⚠️ listi).

### 🔴 Rupa u mom D3 sweepu koju je tek axe otkrio

`test:text-contrast-allowlist` računao je kontrast svake tekstualne paleta-klase prema
**bijeloj** pozadini. Zato `text-slate-500` (4.76:1 na bijeloj → PASS u mom sweepu) **nije
mogao** uhvatiti slučaj gdje isti tekst stoji na `bg-slate-200` (3.86:1).
**Source-level sweep kontrasta nije zamjena za rendered provjeru.**

Sweep je proširen posebnim testom koji traži `bg-*` **i** `text-*` **na istom elementu**
(49 takvih parova, donja granica 40 da test ne može tiho proći na praznom skupu).
Dvije stvari koje je morao poštovati:
1. `dark:` tokeni se preskaču (mrtav kod, Q1);
2. boje s **prozirnošću** se ne tretiraju kao pune — inače `bg-white/12 text-white` daje
   lažnih 1.00:1. Dva takva mjesta postoje (`components/ui/button.tsx:23`,
   `PublicServices.tsx:252`); prvi naivni Python sweep javio je oba kao prekršaj, a nisu.

### Nalaz koji axe NIJE vidio (bonus proširenog sweepa)

`features/media-consent/media-consent-panel.tsx:195,265` — `text-slate-400` `#94a3b8` na
`bg-slate-100` `#f1f5f9` = **2.34:1** na `<ImageOff aria-label={t('mediaConsent.previewUnavailable')}>`.
Ikona nosi značenje (ima `aria-label`), pa pada pod **1.4.11 Non-text Contrast** (3:1),
ne samo 1.4.3. → `text-slate-600` = **6.92:1**. Ujedno obrisan zastarjeli unos u allowlisti
(`media-consent-panel.tsx::slate-400`) — čuvar zastarjelih unosa ga je tačno uhvatio.

### Mutacijske provjere

`public-a11y-axe-findings` (4 testa): **9/9** mutacija pada — uključujući vraćanje
`aria-label={actionLabel}`, uklanjanje `alt` default-a, vraćanje `slate-500`, brisanje
`SkipLink`-a, uklanjanje `id="main"`/`tabIndex`, i **premještanje `SkipLink`-a iza
`</header>`** (mutacija redoslijeda, ne samo brisanja).

Prošireni sweep: vraćanje `slate-500` i `slate-400` → test pada. **Dvije mutacije su
namjerno zabilježene kao nenosive**, ne kao rupe: uklanjanje eksplicitnog
`raw.includes('/')` guard-a **ne mijenja ishod** (jer `solid()` za `white/12` ionako vrati
`null`, pošto je `Number('900/5')` = NaN), a olabavljena donja granica (40→1) ne krši
invariant. Guard je tu da dokumentuje namjeru — to je sada upisano u komentar, umjesto da
stoji kao lažna garancija.

### Provjereno

`tsc --noEmit` PASS · `npm run build` PASS (**273.8 KiB** gzip, budžet 300; calendar 95.5)
· `npm run lint` 0 errors / 16 warnings · **171/171** `test:*` skripti (bez padova)
· `check_i18n.py --strict` PASS · `check_ui_contrast.py --strict` 80/80
· `check_repo_hygiene.py` PASS (1686 putanja) · `git diff --check` čisto
· `mobile/` = **0 diff**.

---

## 2026-11-09 — `/admin/**` axe harness (napisano, **nije izvršeno**)

### Zašto

Prvi axe run prošao je **samo javne rute**. Admin/stylist dashboard je najveći dio
redizajna i nije imao nijedan rendered dokaz.

### Šta je dodato

| Fajl | Uloga |
|---|---|
| `frontend/e2e/auth-paths.ts` | zajedničke putanje (`.auth/admin.json`, `admin-status.json`) |
| `frontend/e2e/auth.setup.ts` | projekt `setup`: login + snimanje `storageState` |
| `frontend/e2e/a11y-admin.spec.ts` | projekt `admin`: axe nad **14** admin ruta + `2.4.1` |
| `frontend/tsconfig.e2e.json` | provjera tipova za `e2e/` (vidi ispod) |

`npx playwright test --list`: **27 testova u 3 fajla** → po projektima `chromium` **11**,
`setup` **1**, `admin` **16** (15 admin + setup kao dependency).
*(Ispravljeno: prva verzija ove bilješke tvrdila je 42, što je bio rezultat PRIJE
`testIgnore` fixa — tada je `chromium` duplo brojao admin testove.)*

### 🔴 Nađena greška u mojoj prvoj verziji konfiguracije

`chromium` projekt **nije imao `testIgnore`**, pa je globovao sve spec fajlove i pokretao
admin testove **bez** `storageState`. Izmjereno: `npx playwright test --list --project=chromium`
davao je **26 testova** (11 javnih + 15 admin) umjesto 11. Svi admin testovi bi tada pali na
redirekciji na `/login`. Dodato `testIgnore: [/a11y-admin\.spec\.ts/, /auth\.setup\.ts/]`
→ `chromium` sada **11**.

### 🔴 `e2e/` uopšte nije bio pokriven provjerom tipova

`frontend/tsconfig.json` ima `include: ['src']`. Mjerenje: `npx tsc --noEmit --listFiles |
grep -c "e2e/"` → **0**. Dakle moji raniji „tsc exit: 0" za e2e fajlove **nisu provjerili
ništa**. Dodato `tsconfig.e2e.json` + skripta `typecheck:e2e` + CI korak.

**Dokaz da provjera nije prazna** (negativna kontrola): mutacija
`const ADMIN_ROUTES: number = [...]` → `tsc -p tsconfig.e2e.json` daje **2 greške**
(TS2322, TS2488), exit **2**; restaurirano → exit **0**.

### Dvije namjerne zaštite od lažnog prolaza

1. **Redirekcija na `/login` nije prolaz.** Bez važeće sesije `ProtectedRoute` preusmjeri na
   `/login`, a axe bi izmjerio **pogrešnu stranicu** i javio zeleno. Svaki admin test zato
   prvo asertira da URL ne sadrži `/login`.
2. **Glasno preskakanje, ne tiho.** Bez backend-a ili kredencijala setup upiše
   `ok:false` + razlog u `.auth/admin-status.json`, spec se preskoči s tim razlogom, a poruka
   se ispiše u konzolu uz tačnu komandu za pokretanje.

### Sigurnost

- Kredencijali **samo** iz `E2E_ADMIN_USER` / `E2E_ADMIN_PASS` — nigdje hardkodovani.
- `e2e/.auth/` je u `.gitignore` (sadrži stvaran JWT). Provjereno:
  `git check-ignore -v frontend/e2e/.auth/admin.json` → `.gitignore:36`.

### Šta ovo NIJE

**Nije izvršeno.** U sandboxu nema ni browser binarnog fajla ni backend-a, pa ovo nije dokaz
da admin stranice prolaze axe — samo da postoji alat koji to može izmjeriti. Dok se ne pokrene
na mašini s backend-om, admin a11y statusi ostaju 🟡.

### Provjereno

`tsc --noEmit` (src) PASS · `npm run typecheck:e2e` PASS (uz negativnu kontrolu) ·
`npm run build` PASS 273.8 KiB · **171/171** `test:*` · `check_doc_links` 670/202 ·
`mobile/` i `features/blog/` = 0 diff.

---

## 2026-11-09 — dopuna: `/stylist/**` + propuštena admin ruta (napisano, **nije izvršeno**)

### 🔴 Dvije rupe u harnessu koji sam upravo pushao (`e745593`)

Provjera nakon commita, ne prije — i obje su stvarne:

1. **`/stylist/**` (8 ruta) uopšte nije bio pokriven.** Matrica cijelo vrijeme govori o
   „admin/stylist" dashboardu, a spec je pokrivao samo `/admin/**`.
2. **`/admin/reservations/calendar` je propušten.** Ruta NIJE u `admin.routes.tsx` nego
   zasebno u `app/router.tsx:133`, pa je grep po `admin.routes.tsx` nije uhvatio.

### Zašto `/stylist/**` treba ZASEBAN spec i storageState

Guard-ovi su različiti:

| Rute | Guard | Bez sesije/uloge redirektuje na |
|---|---|---|
| `/admin/**` | `ProtectedRoute` (samo token) | `/login` |
| `/stylist/**` | `StylistRoute` (token **+ uloga STYLIST**, `StylistRoute.tsx:24-27`) | **`/`** |

Dvije posljedice:
1. **Admin token nije dovoljan** za stilističke rute → zaseban `storageState`
   (`e2e/.auth/stylist.json`) i zasebni kredencijali (`E2E_STYLIST_USER` / `E2E_STYLIST_PASS`).
2. **Asertija „nismo redirektovani" mora biti drugačija.** U admin specu provjeravam da URL
   ne sadrži `/login`; u stylist specu to **ne bi uhvatilo neuspjeh** (redirekt ide na `/`).
   Zato stylist asertira `url.pathname.startsWith('/stylist')`. Da sam kopirao admin
   asertiju, axe bi izmjerio **naslovnu** stranicu i javio lažni prolaz.

Rute s parametrom (`workbook/:entryId`, `workbook/reschedule-preview/:reservationId`,
`schedule/:reservationId`) namjerno nisu pokrivene — traže stvaran ID iz baze, pa bi bez
seedovanog podatka testirale prazan/error ekran.

### Novo stanje

`npx playwright test --list`: **38 testova u 4 fajla**

| Projekt | Testova | Sadržaj |
|---|---:|---|
| `chromium` | 11 | javne rute (izvršeno, 11/11) |
| `setup` | 2 | login za admin i stilistu |
| `admin` | 18 | 15 ruta + `2.4.1` + 2 setup |
| `stylist` | 11 | 8 ruta + `2.4.1` + 2 setup |

`chromium` `testIgnore` proširen na `a11y-stylist.spec.ts` — bez toga bi se stylist testovi
dvostruko izvršili bez `storageState`.

### Provjereno

`typecheck:e2e` PASS · `tsc --noEmit` (src) PASS · `171/171` `test:*` ·
`git check-ignore` potvrđuje da `.auth/stylist*.json` nisu trackabilni ·
`mobile/` i `features/blog/` = 0 diff.

### Izvršeno u sandboxu (korekcija ranije tvrdnje „nije izvršeno")

Ranije sam za cijeli harness napisao „nije izvršeno". To je bilo **neprecizno**: setup i
skip putanja su se stvarno pokrenuli. Izmjereno 2026-11-09:

| Komanda | Rezultat |
|---|---|
| `npx playwright test --project=admin` | **16 skipped, 2 passed**, exit 0 |
| `npx playwright test --project=stylist` | **9 skipped, 2 passed**, exit 0 |

Setup je zapisao `.auth/admin-status.json` =
`{"ok":false,"reason":"nedostaju E2E_ADMIN_USER / E2E_ADMIN_PASS u okruženju"}` i
`.auth/admin.json` = `{"cookies":[],"origins":[]}`; `git status --porcelain e2e/.auth/`
je prazan.

**Sam axe nad admin/stylist DOM-om i dalje NIJE izvršen** (treba browser + backend +
kredencijali). Zato admin/stylist WCAG statusi ostaju 🟡.

---

## 2026-11-09 — 2.1.1 u admin galeriji + trijaža `jsx-a11y` upozorenja

### 🔴 Lint je označio pogrešna mjesta, a stvarni prekršaj propustio

Trijžirao sam svih 16 lint upozorenja. Rezultat je obrnut od očekivanog:

**Svih 9 `jsx-a11y` upozorenja je lažno pozitivno:**

| Mjesto | Zašto NIJE prekršaj |
|---|---|
| `entry-form-fields.tsx:197,272` | `<li role="option" onClick>` unutar combobox-a; tastatura ide preko inputa koji ima `role="combobox"` (`:147`,`:224`), `aria-activedescendant` (`:152`,`:229`) i `onKeyDown` (`:165`,`:241`) |
| `ReservationScheduler.tsx:1137` | isti ARIA combobox uzorak (`:1089`,`:1094`,`:1107`) |
| `Services.tsx:515` | `<div onClick={e.stopPropagation()}>` — samo zaustavlja propagaciju; roditelj je Radix `AccordionTrigger`, koji je pravo `<button>` |
| `Gallery.tsx:438`, `PublicReserve.tsx:1032` | `label-has-associated-control` pada zbog **heuristike dubine**: `<label>` obavija `<input>` i tekst u **dva** nivoa `<span>`. Dokazano eksperimentom — ista datoteka, default `depth` → 1 upozorenje, `depth: 4` → **0**. Labela je validna (implicitna asocijacija) |

**A stvarni prekršaj lint NIJE vidio:** `<Card onClick>` u `Gallery.tsx`.
`Card` renderuje običan `<div>` (`components/ui/card.tsx:7`) bez `role`/`tabIndex`/
`onKeyDown`. `jsx-a11y` ne može znati šta custom komponenta renderuje — zato ga nije bilo
među upozorenjima.

### Zašto je to tvrd 2.1.1, a ne nelagodnost

`loadImages` je **jedini** poziv koji postavlja `selectedCatId` (`Gallery.tsx:98`), a
`selectedCatId` počinje kao `null` (`:58`) i bez njega desni panel ostaje prazan (`:338`).
Dakle tastaturni korisnik **nije mogao otvoriti galeriju nijedne kategorije**.

### Popravka

`onClick` je skinut s `Card`-a; tekst kategorije je sada pravo `<button type="button">` s
`aria-pressed={selectedCatId === c.id}` (stanje se vidjelo samo borderom/bojom).

**Zašto `<button>`, a ne `role="button"` na `Card`-u:** kartica sadrži dva `<Button>`
(edit/delete). `role="button"` na roditelju bi napravio **ugniježđene interaktivne kontrole**
(4.1.2). Zato je dugme oko teksta, a ne oko cijele kartice.

Fokus ne treba dodavati — pokriva ga globalno pravilo `globals.css:208`
(`:where(a, button, input, …):focus-visible`). `<p>` je zamijenjen `<span>`: `<p>` nije
dozvoljen sadržaj unutar `<button>`.

Rezultat: lint **16 → 14** upozorenja (nestala dva s tog `stopPropagation` div-a), 0 errors.

### Novi test + mutacije

`test:admin-gallery-keyboard` (5 testova), registrovan u `package.json` i `ci.yml`.
Mutacije **5/5** pada: vraćen `onClick` na `Card` · uklonjen `aria-pressed` · uklonjen
`type="button"` · uklonjen `onClick` s dugmeta · uklonjeno skidanje komentara iz testa.

**🔴 Dva buga u mom prvom testu** (oba uhvaćena jer je test pao, ne jer je prošao):
1. `indexOf('>')` za kraj otvarajućeg taga puca na `=>` iz `onClick={() => …}` i odsiječe
   tag — ista zamka koju sam već ranije zabilježio za `<li\b[^>]*>`.
2. Moj **komentar** u izvoru sadrži doslovno `<button>` i `<p>`, pa je `indexOf('<button')`
   pogodio komentar (pozicija 455) ispred pravog elementa (935). Test sada prvo skida
   `{/* … */}` — i to skidanje je pokriveno mutacijom.

### Šta ovo znači za odgođenu stavku „`jsx-a11y` na error"

Ostaje **odgođeno**, ali sada s razlogom: pravila se ne mogu prebaciti na `error` dok daju
lažno pozitivne na combobox i na ugniježđene `<span>`-ove. Prvo treba ili konfigurisati
opcije pravila (`depth`, `controlComponents`) ili riješiti preostalih 7 — a nijedan od njih
nije prekršaj.

### Provjereno

`tsc --noEmit` PASS · `typecheck:e2e` PASS · `npm run build` PASS 273.8 KiB ·
**172/172** `test:*` · lint 0 errors / 14 warnings · `check_ui_contrast --strict` PASS ·
`check_i18n --strict` PASS · `check_doc_links` 670/202 · `git diff --check` čisto ·
`mobile/` i `features/blog/` = **0 diff**.

---

## 2026-11-09 — `jsx-a11y` prebačen s `warn` na `error` (odgođena stavka zatvorena)

### Precizno stanje prije izmjene (izmjereno, ne pretpostavljeno)

Iz instaliranog `eslint-plugin-jsx-a11y` v6.10.2: `plugin:jsx-a11y/recommended` drži
**31 od 34** pravila na `error` i **3** na `off` (`anchor-ambiguous-text`,
`control-has-associated-label`, `label-has-for` — upstream odluka, ne naša).
`.eslintrc.cjs` je **13** od tih 31 lokalno snizio na `warn`.

Dakle **21 pravilo je već bilo blokirajuće** i davalo 0 nalaza. „Prebacivanje na error"
nije uključivanje plugina — to je uklanjanje 13 sniženja. To je korekcija moje ranije
formulacije iz prethodnog zapisa, gdje sam napisao da cijeli `jsx-a11y` stoji na `warn`.

Rezultat: `npm run lint` = **0 errors / 7 warnings**, svih 7 `react-hooks/exhaustive-deps`
(namjerno warn — mijenjanje bi diralo cache ponašanje).

### Kako su lažno pozitivni riješeni bez gašenja ijednog pravila

| Obrazac | Rješenje | Zašto ne opcija pravila |
|---|---|---|
| `<label>` omata `<input>` + tekst u 2 nivoa `<span>` (`Gallery.tsx:438`, `PublicReserve.tsx:1032`) | `depth: 4` (default **2**) | `depth` **jeste** opcija; default samo ne doseže tekst |
| `<li role="option">` u ARIA combobox-u (`entry-form-fields.tsx:197,272`, `ReservationScheduler.tsx:1137`) | scoped `eslint-disable-next-line` + dokaz | schema `click-events-have-key-events` je `{"type":"object","properties":{}}` — **nema nijedne opcije**, pa se `role="option"` ne može allowlist-ati |
| `<div onClick={e.stopPropagation()}>` (`Services.tsx:515`) | scoped disable za oba pravila + dokaz | `no-static-element-interactions` ima samo `handlers` |

`no-noninteractive-element-interactions` je vraćen na `error` jer je razlog za sniženje
nestao: `ReservationScheduler.tsx:1086` dropdown **jeste** popravljen combobox obrascem u
C1 (`role="listbox"` `:1131`, `role="option"` + `aria-selected` `:1140`–`:1141`, `onKeyDown`
na inputu `:1107`). Komentar u `.eslintrc.cjs` koji je tvrdio suprotno bio je **zastario**,
kao i onaj o `Gallery.tsx:322` (to mjesto je popravljeno prethodnim commitom).

### Novi guard: `test:eslint-a11y-severity` (7 testova)

Ne čita `.eslintrc.cjs` kao tekst nego **rezolvanu** konfiguraciju preko ESLint API-ja
(`calculateConfigForFile`), pa pada i ako neki `override` tiho poništi `rules`.
Provjerava: nijedno `jsx-a11y` pravilo na `warn` · 13 prethodno sniženih na `error` ·
`depth >= 4` · `off` samo za dokumentovane izuzetke po direktoriju · svaki disable na popisu
s obrazloženjem i tačnim pravilima · disable samo za dva dokazano lažno pozitivna obrasca.

Registriran u `package.json` (`test:*` sada **173**) i `ci.yml`. **Mutacije 7/7 pada.**

### 🔴 Tri greške uhvaćene u vlastitom radu — sve tri su mogle ući u commit

**1. `//` u JSX children je vidljivi tekst, ne komentar.**
Obrazloženje sam ubacio kao `//` ispred `<div>` u `Services.tsx:515`. To je JSX children
kontekst, pa bi se 4 linije **iscrtavale** na stranici, a ESLint direktiva nije ni važila
(errori su ostali na istom mjestu — što je i bio dokaz). Zamijenjeno s `{/* … */}`.
Dokazano esbuild transformacijom: `//` linija ostaje string u izlazu, `{/* … */}` se uklanja.
Zatim AST provjerom kroz **10.228** `JsxText` čvorova u cijelom `src/` potvrđeno da nijedan
ne sadrži `//` — dakle nema drugog curenja.

**2. Guard test je vakuumski prolazio.**
`calculateConfigForFile` vraća nivoe kao **string** `'error'`, ne broj `2`. Zato je
`nivo !== OFF` bilo istinito za svaki string i `continue` **tiho preskakao asertaciju** —
dvije od šest asertacija nisu provjeravale ništa, i test bi prošao i da vratim sva pravila
na `warn`. Normalizator sada **baca** na nepoznatom nivou umjesto da proguta vrijednost.

**3. Nepostojeće ime pravila.**
U listu sam upisao `img-redundant-roles`, što je spoj `img-redundant-alt` i
`no-redundant-roles` i **ne postoji** u pluginu (`img-redundant-alt: true |
img-redundant-roles: false`). Otkrilo ga je upravo bacanje iz (2) — bez njega bi pravilo
tiho bilo „neprovjereno". Test sada asertira i da svako ime postoji u registry-ju plugina.

**Lekcija:** zelen lint izlaz ne znači da provjera radi. Guard test bez mutacijske kontrole
može biti prazan, a čitanje tuđeg API-ja ne smije pretpostavljati tip povratne vrijednosti.

### Šta ovo NE dokazuje

`jsx-a11y` vidi samo JSX. Custom komponenta koja renderuje interaktivni DOM (`<Card>` =
običan `<div>`, `components/ui/card.tsx:7`) i dalje prolazi neoznačeno — tako je stvarni
2.1.1 u `Gallery.tsx` prošao lint dok su sva upozorenja bila lažno pozitivna. Lint nije
zamjena za source-contract testove, niti su oni zamjena za lint.

### Provjereno

`173/173` `test:*` · `tsc --noEmit` PASS · `typecheck:e2e` PASS · `npm run build` PASS
273.8 KiB (budžet 300) · lint **0 errors / 7 warnings** · `check_ui_contrast --strict` PASS
(80/80) · `check_i18n --strict` PASS · `check_doc_links` 670/202 · `git diff --check` čist ·
`mobile/`, `features/blog/`, `features/shell/public/` = **0 diff**.

---

## 2026-11-09 — Testni nalozi za axe, jer se ne smije ići preko produkcijske baze

Vlasnik je otvorio pitanje koje harness nije rješavao: admin/stylist axe testovi traže
prijavljene naloge, a **jedini nalozi koji postoje su na produkciji**.

### Procjena stvarnog rizika (izmjereno, ne pretpostavljeno)

- Specovi **ne mijenjaju ništa**: jedine interakcije u sva tri fajla su
  `keyboard.press('Tab')` ×3 i `'Enter'` ×1, sve za 2.4.1 skip-link. Nema `.click()`,
  `.fill()` ni submit-a.
- Ali `auth.setup.ts` radi `POST /auth/login`, a login **upisuje** `lastLoginAt`
  (`auth.service.ts:133-136`).
- 🔴 Najveći rizik nije pisanje nego **PII**: `trace: 'retain-on-failure'` snima DOM i
  screenshotove admin stranica u `frontend/test-results/`. Nad pravom bazom to su podaci
  stvarnih klijenata na disku.

### Zašto rješenje nije postojalo

`prisma/seed.ts` kreira **samo 4 uloge, nijednog korisnika**; nijedan `docker-compose` nema
DB servis; `backend/scripts/` je prazan.

### Dodano: `backend/prisma/scripts/create-e2e-users.ts` (`npm run e2e:users`)

Idempotentan upsert admin (`SYSTEM_ADMIN` + `OWNER`) i stylist (`STYLIST` +
`StylistProfile(status: ACTIVE)`) naloga, s lozinkama iz istih env varova koje čita
`auth.setup.ts`. `OWNER` je dodat jer `pages/Dashboard.tsx:19-20` gate-uje outbox
dijagnostiku po toj ulozi, a `ACTIVE` jer je default status profila `PENDING`.

**Sigurnosna kočnica:** skript odbija raditi ako host iz `DATABASE_URL` nije
`localhost`/`127.0.0.1`/`::1`, osim uz `E2E_ALLOW_REMOTE_DB=1`. Namjerno po **hostu**, ne po
imenu baze — „dev"/„test" u imenu je nepouzdana heuristika.

### Verificirano stvarnim izvršavanjem (5 scenarija, pravi fajl)

| Scenarij | Ishod |
|---|---|
| produkcijski host, bez zastavice | **odbija**, exit 1 |
| localhost, bez kredencijala | odbija i nabraja koji varovi fale |
| udaljeni host + `E2E_ALLOW_REMOTE_DB=1` | upozorava i nastavlja |
| localhost + svi kredencijali | prolazi obje kočnice |
| `DATABASE_PROVIDER=mysql` | odbija (Postgres-only, kao `seed.ts`) |

Imena polja verificirana mehanički protiv `schema.prisma`: sva postoje, obavezna skalarna
polja bez defaulta su pokrivena, `UserRole @@unique([userId, roleId])` odgovara
`where: { userId_roleId }`, `ACTIVE` je stvarna enum vrijednost.

### Šta NIJE verificirano (i zašto)

Prisma `upsert` pozivi i render `/stylist/**` s praznim profilom. `npx prisma generate`
treba `binaries.prisma.sh`, koji nije dostupan, pa `@prisma/client` nije generisan — zbog
toga cijeli backend `tsc --noEmit` ovdje daje **1508** grešaka, uključujući u postojećem
`seed.ts`. Moj fajl ima tačno **1** grešku, identičnu `seed.ts`-ovoj.

### Ispravka dvije moje ranije pretpostavke

1. Tvrdio sam da `npm run lint` u `frontend/` pokreće `prettier --check`. **Nije** — skripta
   je `eslint . --ext ts,tsx`. Zbog toga sam `prettier --write` nad `playwright.config.ts`
   (koji nema konfiguraciju) reformatovao cijeli fajl na duple navodnike; vraćeno, a
   komentar ponovo ubačen bez formatera. `backend/` **ima** `.prettierrc`, pa je tamo
   formatiranje ispravno.
2. Rekao sam da `frontend/test-results/` i `frontend/playwright-report/` „nisu ignorisani".
   Jesu (`.gitignore:33-34`), ali s trailing slash-om, pa `git check-ignore` na
   **nepostojećem** direktoriju ne prepoznaje podudaranje.

---

## 2026-11-09 — CI posao `a11y-e2e`: axe nad izolovanom bazom

Vlasnikova napomena da se testovi mogu vrtjeti na izolovanom sistemu GitHub Actions
pokazala se kao pravo rješenje problema iz prethodnog zapisa. Provjera je potvrdila da CI
**već ima** `postgres:16` service kontejner s jednokratnom bazom `beauty_salon_ci`
(`.github/workflows/ci.yml:40-51`), pa tamo problem „nema testnih naloga, a produkcija se ne
smije dirati" **ne postoji** — baza je jednokratna po definiciji.

### Novi posao `a11y-e2e` (16 koraka)

`postgres:16` service → backend `npm ci` → `db:generate` → `db:migrate:deploy` → `db:seed` →
**`e2e:users`** → `build` → backend na `PORT=10001` → čekanje `GET /health` → frontend
`npm ci` + `build` → `playwright install --with-deps chromium` → `test:a11y-routes` →
upload `playwright-report` + `test-results` (7 dana) → anotacija ishoda u step summary.

Detalji izvedeni iz izvora, ne pretpostavljeni:

- `NODE_ENV=test` — `CORS_ALLOWED_ORIGINS` je obavezan tek izvan development/test
  (`cors-runtime-config.ts:22-23`), pa CI ne treba CORS.
- `JWT_SECRET` + `APP_SETTINGS_ENCRYPTION_KEY` su obavezni **uvijek**: `validateRuntimeSecrets`
  je wired kao `ConfigModule.validate` (`config.module.ts:10`). Vrijednosti preuzete iz
  postojećeg `backend` posla; provjereno da zadovoljavaju oba uslova (≥32 bajta, kanonski
  base64 za tačno 32 bajta).
- `PORT=10001` jer vite proxy cilja `http://localhost:10001` (`vite.config.ts:19`).
- Health čekanje ide na `GET /health` (`app.controller.ts:27`).
- `node dist/src/main.js` je tačno sadržaj `start:prod`.
- `e2e:users` kočnica prolazi jer je host `127.0.0.1`.

### Šta je verificirano ovdje (a šta mora u stvarnom runu)

**Verificirano u sandboxu:**

- YAML parsira (`js-yaml`, instaliran s `--no-save`): poslovi `repo-checks, backend,
  frontend, a11y-e2e, mobile`; `a11y-e2e` = 16 koraka, 10 env varova, service `postgres`.
- **Svih 370 `npm run X` referenci u svim poslovima postoji** u odgovarajućem
  `package.json` (uklj. 7 novih) — provjereno skriptom, ne ručno.
  *(Korekcija 2026-11-09: prvobitno napisano „170+"; prvo mjerenje je za posao `mobile`
  gledalo `frontend/package.json`, a `mobile/` ima vlastiti. Zaključak „0 nepostojećih"
  je stajao, broj nije.)*
- **`bash -n` nad svih 389 `run` blokova: 0 grešaka** (GitHub izrazi zamijenjeni literalom).

**NIJE verificirano i ne može biti ovdje:** stvarno izvršenje posla. U sandboxu nema
Dockera, browser CDN-a ni Prisma engine-a. Zato je axe korak **`continue-on-error`** — isti
princip koji već stoji u `playwright.config.ts` („ne bi bilo pošteno tvrditi da nešto
prolazi što nikad nije pokrenuto"). **Nakon prvog zelenog runa treba ukloniti
`continue-on-error`**, inače test koji nikad ne može pasti s vremenom istrune.

Ispravljena zastarjela napomena u `playwright.config.ts:13-14` koja je tvrdila da
`test:a11y-routes` nije u CI.


---

## 2026-11-09 — WCAG 3.3.3 Error Suggestion (daily-log forma)

Korisnik je odobrio: „Možeš da kreneš na 3.3.3."

### Prvo: koji je stvarni normativni kriterij

WCAG 2.1/2.2 SC 3.3.3 (AA) glasi: **„If an input error is automatically detected and
suggestions for correction are known, then the suggestions are provided to the user, unless
it would jeopardize the security or purpose of the content."**

Matrica je kao razlog ❌ imala „nema sažetka grešaka s linkovima na polja". **To nije
normativni kriterij.** Sažetak s linkovima je *tehnika* (G84/G85), ne zahtjev — kriterij
traži samo da se **poznat prijedlog ispravke dostavi u tekstu**. Da sam radio po matricinom
razlogu, napravio bih sažetak i proglasio pobjedu, a pravi prekršaj ostavio na mjestu.

### Stvarni prekršaj (dokazan iz izvora, ne pretpostavljen)

`use-daily-log-form.ts`, `catch` grana:

```ts
} catch {
  error(t('dailyLog.form.feedback.saveFailed'))
}
```

Backend **vraća** konkretne prijedloge:

- `backend/src/main.ts:75-78` — globalni `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`
- `create-daily-log-entry.dto.ts` — `@IsUUID()` (ln 20), `@IsOptional @IsUUID` (23-24, 28-29),
  `@IsOptional @IsArray @IsUUID({ each: true })` (33-35, 39-40)
- → 400 nosi `message: string[]` s porukom **po polju**

Dakle prijedlozi **jesu poznati**, a klijent ih je bacao i vraćao generički „nije uspjelo".
To je prekršaj 3.3.3. Četiri klijentska guard-a (ln 197-212) su imala konkretne poruke, ali
su išle **samo kroz `toast`** — prolazan kanal, bez veze s poljem.

### Šta je urađeno

**Novi moduli:**

- `frontend/src/features/forms/field-error.tsx` — `fieldErrorId(id)` → `${id}-error`;
  `fieldErrorProps(id, msg)` → `{ 'aria-invalid': true, 'aria-describedby': ... }` ili `{}`;
  `<FieldError>` (tekst uz polje, `role="alert"`); `<FormErrorSummary>` (`role="alert"`,
  `tabIndex={-1}`, pomjera fokus, linkovi na polja).
- `frontend/src/features/forms/server-error-messages.ts` — `serverValidationMessages(err)`
  čita `err.response.data.message` (string **ili** string[]), trimuje, baca prazno.
- `frontend/src/features/daily-log/field-ids.ts` — `DAILY_LOG_FIELD`
  (`stylist` / `client` / `services` / `paid`).

**Izmijenjeno:** `use-daily-log-form.ts` (state `fieldErrors`/`formMessages`, `fieldErrorList`,
`clearFieldErrors`, guard-ovi preko `setFieldErrors`, `catch` preko `serverValidationMessages`),
`entry-form-dialog.tsx` (sažetak unutar varijable `fields`, pa ga dijele **i mobilni Drawer i
desktop Dialog**), `entry-form-fields.tsx` (3 polja), `pricing-panel.tsx` (`paidError`),
`pages/DailyLog.tsx` (propovi + čišćenje grešaka pri zatvaranju).

**i18n:** `dailyLog.form.errorSummaryTitle` u **oba** locale-a (`check_i18n --strict` prolazi).

### Nove boje nisu uvodene — namjerno

`field-error.tsx` koristi samo klase koje već postoje u repozitoriju: `text-rose-700` (11
pojava), `bg-rose-50` (17), `border-rose-200` (14). Nijedna nova boja → `check_ui_contrast
--strict` ne dobija novi par koji bi trebao provjeru. Uzorak je kopiran iz
`setting-editor-form.tsx:32,232` — jedinog mjesta koje je ovo već radilo ispravno.

### Test: `test:form-error-suggestion` (15 testova, 22/22 mutacije)

Registrovan u `frontend/package.json` **i** u `.github/workflows/ci.yml` (posao `frontend`,
uz ostalih 173 `test:*` koraka).

- **`serverValidationMessages` se testira funkcionalno, ne regexom** — esbuild transformiše
  TS u memoriji i modul se stvarno importuje i izvrši (9 ulaznih slučajeva, uklj. `undefined`,
  `null`, `42`, `{ response: { data: { message: 7 } } }`).
- Ostatak je source-contract, kao i u ostatku repozitorija (Node ne može importovati `.tsx`,
  a `tsx`/`ts-node` **nisu** frontend dependencije — provjereno).
- **Mutacijska provjera 22/22**: svaka od 22 namjerne kvarove test hvata (izbacen
  `role="alert"`, `tabIndex`, `aria-invalid`, `aria-describedby`, `id`, fokus, link, čišćenje
  grešaka, povratak na toast u `catch`-u i u guard-u, `trim`, mrtva string grana, …).

### Greške napravljene usput — i kako su nađene

1. **Pokrenuo sam `prettier --write` nad `entry-form-dialog.tsx`.** `frontend/` **nema**
   prettier konfiguraciju (`lint` = `eslint . --ext ts,tsx`), pa je cijeli fajl preformatovan
   na duple navodnike. To je slomilo **dva** postojeća ugovora: `daily-log-form-i18n` (regex
   `editId \? t\('dailyLog\.editEntry'\)…`) i `daily-log-dialog-accessibility`. Vraćeno
   `git checkout --` i izmjene ponovo primijenjene na originalno formatiranje. **Pouka:
   nikad `prettier --write` u `frontend/`.**
2. **Dva source-anchor edita su pala** (`pricing-panel.tsx`, `DailyLog.tsx`) jer sam uvlačenje
   pogodio „odokativno" — stvarno je 6/8 razmaka, ne 8/10. `repr()` nad linijama je jedini
   pouzdan izvor.
3. **Test je prvo lažno prolazio za `FieldError`**: `slice(indexOf('export function FormErrorSummary'))`
   zahvatao je i susjednu funkciju, pa je `role="alert"` bio „nađen" i kad ga `FieldError`
   izgubi — mutacija je to otkrila. Dodan helper `tijelo(ime)` koji siječe do sljedeće funkcije.
4. **`write_file` mi je udvostručio backslash-eve** u regexovima (4 umjesto 2), pa je test
   tražio doslovni backslash. Prešao sam na `String.includes` gdje god je to jasnije.
5. **Zamalo sam korak ubacio u pogrešan CI posao** — izvještaj „a11y-e2e ima 16 koraka" me
   naveo da mislim da `test:*` živi tamo. `a11y-e2e` ima **1** `test:*` korak; svih 173 živi
   u poslu **`frontend`** (sada 180 koraka). Korak je na ispravnom mjestu (indeks 119).

### Šta NIJE verificirano

- **Nema render provjere ni provjere čitačem ekrana.** Ne znam da li NVDA/VoiceOver stvarno
  najavi sažetak prije čitanja polja. Zato je matricin status **🟡**, ne ✅ — i zato u
  `CHECKLIST.md` pod „Ručna provjera" ide nova stavka.
- Automatski alati (axe) **ne mogu** procijeniti 3.3.3: ne znaju da li tekst predlaže ispravku.
- Obim je **samo daily-log forma**. `Register.tsx` ima isti toast-only obrazac (ln 60, 93),
  ali je Q2 izričito stavio Login/Register/ResetPassword/Profile **van** redizajna.
- **Nije pokrenuto nad stvarnim backendom** — po uputi vlasnika testovi idu na izolovanu
  GitHub Actions infrastrukturu.

### Provjere (sve pokrenute, ne pretpostavljene)

`test:*` **174/174** (bilo 173) · `tsc --noEmit` **exit 0** · `typecheck:e2e` **exit 0** ·
build **273.9 KiB gzip** (budžet 300; bilo 273.8) · lint **0 errors / 7 warnings** ·
`check_i18n --strict` **PASS** (0/0) · `check_ui_contrast --strict` **PASS** (80 parova) ·
`check_repo_hygiene` **PASS** (1695) · `check_doc_links` **PASS** (670/202) ·
`git diff --check` **čist** · CI: **370** `npm run` referenci → **0** nepostojećih,
**389** `run` blokova → **0** `bash -n` grešaka.

### Zabilješka: brojači u `MATRIX.md` su međusobno nekonzistentni — i to NIJE novo

Nisam ih tiho „popravio". Izmjereno sada:

| Tabela | Redova | ✅ | 🟡 | ❌ | ➖ |
|---|---:|---:|---:|---:|---:|
| glavna (ln 31-110) | 58 | 2 | 21 | 27 | 8 |
| „Statusi po kriteriju" (ln 190+) | 38 | 24 | 6 | 4 | 3 (+1 ➖/⚠️) |
| brojač „Rezime (ETAPA B)" | — | 27 | 12 | 3 | 7 (+1, +1 ✅/❌) |

Tri tabele se ne slažu, i to je bilo tako i prije ove izmjene. Za 3.3.3 sam pomjerio
brojač ETAPA B onoliko koliko je tačno (🟡 11→12, ❌ 4→3 i iz liste izbačen `3.3.3`), a
usklađivanje sve tri tabele je **zaseban posao** koji traži odluku koja je od njih mjerodavna.


---

## 2026-11-09 — WCAG 3.3.7 Redundant Entry: sistematska provjera (nema prekršaja)

Vlasnik je odabrao 3.3.7 kao sljedeću stavku. Matrica je tvrdila „redundant entry nije
sistematski provjeren" i navodila kandidate: `workbook-new-entry`, `category-wizard-dialog`,
forme.

### Rezultat: prekršaja nema, a oba navedena kandidata su opovrgnuta

**Kandidati iz matrice nisu višekoračni tokovi.** `category-wizard-dialog.tsx` (223 ln) je
**jedan dijalog** — ime fajla zavodi, ali u njemu nema brojača koraka. U
`workbook-new-entry-page.tsx` (662 ln) `useState(0)` postoji, ali je to `partialDiff` i
`desiredLoyaltyPercent`, ne koraci. Da sam radio po matrici, „popravljao" bih nepostojeći
problem u dvije jednostranačne forme.

**Reschedule tok radi ispravno.** `workbook-detail-page.tsx:451-503` prikazuje dijalog o
**kašnjenju** s tri dugmeta („ne sada" / „bez pauza" / „uključi pauze") i navigira na
`/stylist/workbook/reschedule-preview/{id}?includeBreaks=0|1`. Preview stranica čita taj
parametar (`searchParams.get('includeBreaks')`, ln 37) i **pred-popunjava** svoj toggle
(`useState(initialIncludeBreaks)`, ln 55). Isto vrijedi za `mode` i `manualShiftMinutes`.
Pred-popunjavanje je upravo ono što 3.3.7 traži — korisnik može potvrditi ili promijeniti,
ali ne unosi ništa ispočetka.

**Javna rezervacija ne traži kontakt koji već ima.** `PublicReserve.tsx:547`:

```ts
if (!user?.email || !user?.phone || !user?.isEmailVerified) {
  navigate('/profil', { replace: true })
  return
}
```

Ako bilo šta od toga nedostaje, korisnik ide na `/profil` — forma **uopće nema** polja za
email/telefon (provjereno: nema `type="email"`, `type="tel"`, `name="phone"`,
`name="email"`). Traži samo usluge, datum, termin i bilješke. Uz to pred-popunjava uslugu iz
`?serviceId=`.

**Onboarding pita tri različite stvari**, svaku vezanu za svoju zastavicu
(`mustChangePassword` → `/force-change-password`, `genderOnboardingCompleted` →
`/onboarding/gender`, `isEmailVerified` → `/onboarding/email`). Nema preklapanja.

### Greška koju je otkrila mutacijska provjera

Prva verzija testa tvrdila je da `PublicReserve` **nema** brojača koraka. **To nije tačno** —
`PublicReserve.tsx:509` ima `const [step, setStep] = useState(1)` i koristi ga u
`role="progressbar"` (`aria-valuenow`, `aria-valuetext` „korak X od 4"). Moja prva provjera
je gledala `activeStep|currentStep|StepIndicator|onNext` i **propustila `setStep`**.

Ispravna tvrdnja je preciznija: brojač koraka **postoji**, ali **ne uslovljava sadržaj** —
nigdje u fajlu nema `step ===`, a sekcije se otkrivaju po **odabiru**
(`selectedServices.length > 0 ?`, `selectedDate ?`, `selectedSlot ?`). To je progresivno
otkrivanje, ne prolazak kroz iste korake dvaput, pa 3.3.7 i dalje nije prekršen.

### Usputni nalaz (NIJE 3.3.7, nije popravljen)

`PublicReserve.tsx:804-826`: `role="progressbar"` s `aria-valuemin={1} aria-valuemax={4}`
`aria-valuenow={step}` najavljuje „korak X od 4", dok je forma u stvarnosti **jedna
skrolajuća stranica** s progresivnim otkrivanjem. Za čitača ekrana to je stanje koje se ne
poklapa sa stvarnim sadržajem — kandidat za **4.1.2 Name, Role, Value**, ne za 3.3.7.
**Nije dirano**: nalazi se u `src/pages/public/`, a javni sajt se ne mijenja bez posebnog
odobrenja. Zabilježeno ovdje i u `HANDOFF.md`-u.

### Test: `test:redundant-entry-a11y` (9 testova, 13/13 mutacija)

Registrovan u `frontend/package.json` **i** u `.github/workflows/ci.yml` (posao `frontend`,
indeks 120 — ne `a11y-e2e`, koji ima samo 1 `test:*` korak).

Pokriva: odsustvo brojača koraka kod dva kandidata; `step` postoji ali ne gate-uje sadržaj;
**jedinstvenost `id`-ova** po formi (dupli `id` bi značio duplo pitanje); URL prenos
`includeBreaks`/`mode`/`manualShiftMinutes` s obje strane; kontakt guard u `PublicReserve`;
pred-popunjavanje usluge; tri različite onboarding rute, svaka uslovljena svojom zastavicom.

**Mutacijska provjera 13/13.** Dvije mutacije su **prvo promašene**, i to je bilo korisno:
(1) prozor od 200 znakova hvatao je `navigate('/profil')` iz *sljedećeg* guard-a (gender), pa
je uklanjanje onog iz kontakt guard-a prolazilo — sada se asertira da je navigacija **prije**
sljedećeg `if (`; (2) `includes('isEmailVerified')` je prolazio i kad se `emailOk` stavi na
`true`, jer se ime pojavljuje i u deklaraciji tipa — sada se asertira da zastavica stoji
**prije** rute i da između nema `return null`.

### Ograničenje (upisano i u sam test)

Ovo je provjera **izvora**. Ne može dokazati da korisnik u stvarnom toku ne vidi isto polje
dvaput kroz putanju koju grep ne vidi (npr. navigacija naprijed-nazad, keš, back dugme).

### Provjere (sve pokrenute)

`test:*` **175/175** (bilo 174) · `tsc --noEmit` **exit 0** · lint **0 errors / 7 warnings** ·
`check_i18n --strict` **PASS** · `check_repo_hygiene` **PASS** (1699) · `check_doc_links`
**PASS** (670/202) · `git diff --check` **čist** · CI: **371** `npm run` referenci → **0**
nepostojećih, **390** `run` blokova → **0** `bash -n` grešaka.

### Matrica

3.3.7 → **✅**, s obrazloženjem da je ovdje dokazano **odsustvo** prekršaja (za razliku od
ostalih ✅, ne postoji implementacija koju bi trebalo verificirati u renderu — pa nema ništa
što bi ostalo 🟡). Brojač ETAPA B: ✅ 27→28, ❌ 3→2.


---

## 2026-11-09 — 1.3.1: grupisanje polja u `workbook-new-entry-page` (odgođena stavka)

Stavka je bila odgođena uz obrazloženje: „`FormSection`/`<fieldset>` (mijenja vizuelni
izgled, treba nove i18n ključeve za `<legend>`)". **Obje zamjerke su zaobiđene, ne ignorisane.**

### Problem (dokazan iz izvora)

`workbook-new-entry-page.tsx:439-467` — kartica `<Card className="p-4 space-y-3">` sadrži
**tri** polja: datum (`dateId`), naplaćeni iznos (`paidAmountId`) i napomenu (`notesId`).
`Card` je običan `<div>` (`components/ui/card.tsx:5-18`), pa je vizuelna kutija bila **jedina**
naznaka da polja pripadaju zajedno. Čitač ekrana je čitao tri zasebna polja bez veze među
njima — informacija koja je postojala vizuelno nije bila programski odrediva → **1.3.1**.

Isti obrazac, manjeg obima, na kartici `469` (loyalty + `discountPercentId`).

### Zašto NIJE `FormSection`

`features/shell/admin/ui/form-section.tsx` renderuje:

```tsx
<fieldset className={cn('rounded-lg border border-line bg-surface p-4', className)}>
  <legend className="px-1 text-sm font-semibold text-content">{title}</legend>
```

To je **vidljiv okvir i vidljiv naslov**. Na stranici koja već ima `Card` kutije
(`rounded-lg border border-slate-200 bg-white shadow-sm`) to bi bio dvostruki okvir — upravo
vizuelna regresija zbog koje je stavka odgođena. **`fieldset` je jedna od tehnika za 1.3.1,
ne sam zahtjev**; kriterij traži da odnos bude programski odrediv.

### Rješenje — nula vidljivih promjena

- `role="group"` + `aria-labelledby` na postojećem `Card`-u. `Card` prosljeđuje props kroz
  `{...props}`, pa atributi stižu na DOM (provjereno testom, i to **samo nad `Card`** —
  `{...props}` postoji u svih šest komponenti u `card.tsx`, pa provjera nad cijelim fajlom
  ne dokazuje ništa; mutacija koja skine props samo s `Card` je to otkrila).
- **Plaćanje:** naziv grupe u `<span className="sr-only">`, id iz `useId()`.
- **Loyalty:** `aria-labelledby` pokazuje na **postojeći vidljivi naslov**
  (`stylistWorkbook.newEntry.loyalty`) — nije dodan nijedan novi element.
- Jedan novi i18n ključ: `stylistWorkbook.newEntry.paymentSection` (bs „Podaci o naplati",
  en „Payment details").

`sr-only` je potvrđen u **buildovanom** CSS-u (`dist/assets/index-cGvbcmeU.css`), ne samo u
izvoru — bez toga naziv grupe bi bio vidljiv.

### Test: `test:workbook-form-groups-a11y` (8 testova, 10/10 mutacija)

Registrovan u `frontend/package.json` **i** u `.github/workflows/ci.yml` (posao `frontend`,
indeks 121). Pokriva: `Card` prosljeđuje props; obje kartice su `group`; naziv je `sr-only` i
ima prevod u oba jezika (i da se prevodi **razlikuju**); sva tri polja su stvarno **unutar**
grupe za plaćanje; `discountPercent` je unutar loyalty grupe; id-ovi su iz `useId()` (bez
sudara); `aria-labelledby` ne pokazuje ni na šta nepostojeće; te **da nije uveden
`fieldset`/`legend`/`FormSection`** (guard protiv vidljive regresije).

**Mutacijska provjera 10/10**, uključujući „`sr-only` zamijenjen vidljivom klasom" i „uveden
`fieldset`".

### Greška u testu koju je otkrila mutacija

Prva verzija je tvrdila `card.includes('{...props}')`. **Promašeno** — `{...props}` postoji i
u `CardHeader`/`CardContent`/`CardFooter`/`CardTitle`/`CardDescription`, pa je mutacija koja
ga skine samo s `Card` prolazila. Sada se siječe blok od `const Card = React.forwardRef` do
`Card.displayName = 'Card'`.

### Ograničenje

Source-contract: ne dokazuje da čitač ekrana stvarno najavi naziv grupe uz svako polje.

### Provjere (sve pokrenute)

`test:*` **176/176** (bilo 175) · `tsc --noEmit` **exit 0** · build **273.9 KiB/300** ·
lint **0 errors / 7 warnings** · `check_i18n --strict` **PASS** · `check_ui_contrast --strict`
**PASS** (80 parova) · `check_repo_hygiene` **PASS** (1700) · `check_doc_links` **PASS**
(670/202) · `git diff --check` **čist** · CI: **372** `npm run` → **0** nepostojećih,
**391** `run` blokova → **0** `bash -n` grešaka.

### Matrica

1.3.1 ostaje **✅** (bio je ✅ i prije); upisana je dopuna s dokazom. Brojači se ne mijenjaju.


---

## 2026-11-09 — `DataTable` migracija: izmjereno pa odlučeno + 1.3.1 u `StylistAnalytics`

Vlasnik je odabrao migraciju tabela na `DataTable` kao sljedeću stavku. Prije nego sam išta
mijenjao, izmjerio sam šta bi se time stvarno dobilo.

### Mjerenje: cilj uglavnom ne vrijedi

17 fajlova u `src/` ima `<table>`. Stanje po fajlu (`<table>` / `<th>` / `scope="col"` / `<caption>`):

| Fajl | table | scope | caption |
|---|---:|---:|---:|
| `features/blog/blog-posts-table.tsx` | 1 | 6 | 1 |
| `features/daily-log/entry-table.tsx` | 1 | 12 | 1 |
| `features/finance/expense/expense-invoice-preview.tsx` | 1 | 2 | 1 |
| `features/finance/expense/expense-table.tsx` | 1 | 4 | 1 |
| `features/finance/income/income-entries-table.tsx` | 1 | 5 | 1 |
| `pages/Analytics.tsx` | 3 | 5 | 1 |
| `pages/ClientAnalytics.tsx` | 3 | 17 | 3 |
| `pages/Loyalty.tsx` | 1 | 7 | 1 |
| `pages/Notifications.tsx` | 1 | 3 | 1 |
| `pages/Reservations.tsx` | 1 | 8 | 1 |
| `pages/Reviews.tsx` | 1 | 9 | 1 |
| `pages/Salon.tsx` | 2 | 9 | 2 |
| `pages/Services.tsx` | 1 | 8 | 1 |
| **`pages/StylistAnalytics.tsx`** | **2** | **0** | **0** |
| `pages/Stylists.tsx` | 2 | 10 | 2 |
| `pages/Users.tsx` | 1 | 8 | 1 |

**14 od 17 već ima `<caption>` i `scope="col"`.** Tri već koriste `DataTable`
(`outbox-events-table.tsx`, `recent-reservations.tsx`, `Analytics.tsx`).

Masovna migracija bi dakle bila **vidljiva** promjena (`DataTable` renderuje
`table.data-table` s `<caption className="sr-only">` i vlastitim razredima, umjesto
`app-table` + `border-collapse`) uz **zanemariv** a11y dobitak. Zato je nisam radio.

### Jedina stvarna rupa: `pages/StylistAnalytics.tsx` — popravljeno

Bio je to **jedini** fajl s `<table>` u cijelom `src/` bez ijednog `scope="col"` i bez
ijednog `<caption>`, iako je **vidljivi `<h2>`** stajao odmah iznad svake tabele
(`stylistAnalytics.topServices`, `stylistAnalytics.recentEntries`). Dakle: informacija je
postojala vizuelno, ali nije bila programski odrediva → **1.3.1**.

Popravka, **nula vidljivih promjena**:

- `scope="col"` na svih 7 `<th>`
- `aria-labelledby` na obje tabele, usmjeren na **postojeće vidljive `<h2>`** (id iz `useId()`)

`DataTable` namjerno **nije** upotrijebljen — ove tabele već imaju vidljive naslove koje je
dovoljno povezati, a migracija bi promijenila izgled.

### Dvije greške u mom mjerenju, obje ispravljene

1. **`grep -c '<th'` je vratio 9, stvarno je 7.** Razlog: obrazac pogađa i `<thead>`.
   Ispravno brojanje je `grep -o '<th[^>]*>' | sort | uniq -c` → 4 + 1 + 2 = **7**.
   Zbog pogrešnog broja prvi pokušaj edita nije prošao asertaciju — i to je dobro: skripta
   je pala **prije** `write_text`, pa je fajl ostao netaknut (provjereno: `scope="col"` = 0).
2. **`npx tsc --noEmit 2>&1 | head -5; echo "tsc exit=$?"` ispisao je `exit=0` iako je `tsc`
   imao 5 grešaka** — izlazni kod je došao od `head`. Greške (`TS2304: Cannot find name
   'topServicesLabelId'` — zaboravio sam deklarisati id varijable) vidljive su bile u tekstu,
   ali broj nije. Ovo je ista zamka kao ranije; pravilo ostaje: bez cevovoda, ili
   `set -o pipefail`.

### Odluka vlasnika: `EmailSettings.tsx` ostaje 1381 ln

Cilj „< 120 ln" se **preskače**. Razlozi su dokazani, ne procijenjeni:

- `settings-hub-redirect.test.mjs` sadrži test koji se zove **„moduli ostaju u svojim
  fajlovima jer ih testovi čita po putanji"** — politika je namjerna i automatizovana.
- `admin-settings-controls-a11y.test.mjs:28` asertuje **tačno 29 `<Label>`** u tom fajlu.
- `email-visual-editor.test.mjs` asertuje **tačno 2 `<EmailVisualEditor`** + 3 regex-a
  (`blocks={existingTemplate.blocks ?? []}` itd.).
- 3 i18n testa skeniraju `t('…')` u tom fajlu (`literalTranslationKeys` nad
  `EmailSettings.tsx` + `email-visual-editor.tsx`).

Bez ažuriranja 5-6 testova nije izvodljivo, a to bi bilo suprotno standing instrukciji
„ne razbijati fajlove koje testovi čitaju po putanji". Performansijski razlog za veličinu je
već riješen: `SettingsHub.tsx:26` ga učitava preko `lazy()`.

### Test: `test:stylist-analytics-tables-a11y` (5 testova, 8/8 mutacija)

Registrovan u `frontend/package.json` **i** u `.github/workflows/ci.yml` (posao `frontend`,
koraka sada 183). Pokriva: svih 7 `<th>` ima `scope`; obje tabele imaju ime preko postojećeg
`<h2>`; id-ovi su iz `useId()`; nijedan `aria-labelledby` ne pokazuje na nepostojeći id; te
**guard da `DataTable`/`<caption>` nisu uvedeni** (jer bi to bila vidljiva promjena).

Mutacije 8/8, uključujući „svi `<th>` bez scope" i „uveden DataTable".

### Provjere (sve pokrenute)

`test:*` **177/177** (bilo 176) · `tsc --noEmit` **exit 0** (bez cevovoda) · build
**273.9 KiB/300** · lint **0 errors / 7 warnings** · `check_i18n --strict` **PASS** ·
`check_ui_contrast --strict` **PASS** (80 parova) · `check_repo_hygiene` **PASS** (1701) ·
`check_doc_links` **PASS** (670/202) · `git diff --check` **čist** · CI: **373** `npm run` →
**0** nepostojećih, **392** `run` blokova → **0** `bash -n` grešaka.

### Ograničenje

Source-contract: ne dokazuje da čitač ekrana stvarno najavi naziv tabele.


---

## 2026-11-09 — `DataTable` migracija: proširenje komponente + pilot (`Loyalty`)

Vlasnik je odobrio masovnu migraciju **nakon** što je vidio mjerenje (14 od 17 tabela već
zadovoljava a11y). Zato je ovo **refaktor održavanja, ne a11y popravka** — i upravo zato
svaki korak mora dokazati da **nije** unio vizuelnu regresiju.

### Prijem: šta `DataTable` nije mogao, a morao je

Prije migracije ijedne tabele, komponenta je proširena s 4 opciona propa. Svaki postoji jer
bi bez njega migracija **promijenila izgled**:

| Prop | Zašto je neophodan |
|---|---|
| `rowClassName?: (row) => string` | Postojeće tabele imaju klase **po redu** (`border-b border-slate-100`, `opacity-60` za neradne dane). Bez ovoga redovi gube border. |
| `headRowClassName?: string` | `<tr>` u `<thead>` nije imao **nijednu** klasu. Postojeća zaglavlja imaju `border-b border-slate-200 text-left text-xs uppercase text-slate-500`. Bez ovoga zaglavlje gubi border i ostaje ne-uppercase — **stvarna vizuelna regresija**, otkrivena tek u pilotu. |
| `tableClassName?: string` | `Loyalty` je imao `border-collapse` uz `app-table data-table w-full`. |
| `unsortedIndicator?: boolean` | Postojeće tabele crtaju strelicu **samo** na sortiranoj koloni; `DataTable` je crtao `ArrowUpDown` na svima. |

`templates-a11y.test.mjs` je ažuriran na jednom mjestu: regex `/<SortIndicator direction=\{direction\} \/>/`
više ne odgovara jer komponenta sada prima i `unsorted`. Novi obrazac
`/<SortIndicator direction=\{direction\}[^/]*\/>/` je **provjeren** pozitivnom kontrolom (True)
i dvije mutacije (uklonjen `SortIndicator` → False; uklonjen `direction` prop → False).

### Pilot: `pages/Loyalty.tsx`

7 kolona, bez sortiranja — najjednostavniji slučaj. Ručno napisanih 43 linija `<table>`
markup-a zamijenjeno s `<DataTable>` + deklaracijom kolona.

**Testovi koji su pali i zašto (oba su ispravno ažurirana, ne oslabljena):**

1. `loyalty-a11y.test.mjs` — 4 testa su čitala **doslovan markup** iz `Loyalty.tsx`
   (`<th scope="col">` ×7, `<caption className="sr-only">`, `<td data-label=…>` ×7,
   `<table className="app-table data-table w-full border-collapse">`). Nakon migracije tog
   markup-a u tom fajlu **nema** — on živi u `data-table.tsx`, gdje ga već zaključava
   `templates-a11y.test.mjs`. Testovi su preuređeni da dokazuju (a) da `DataTable` nosi
   garancije i (b) da `Loyalty` stvarno koristi `DataTable` s ispravnim propovima, **uključujući
   redoslijed kolona** (jer `data-label` u card-mode-u zavisi od njega).
2. `admin-loyalty-i18n.test.mjs` — test „configured tier, service, and account names remain
   dynamic content" asertovao je `/\{a\.tier \?\? '-'\}/` i `/\{userName\(a\.user\)\}/`,
   tj. **JSX oblik**. U `render: (a) => a.tier ?? '-'` ti obrasci ne prolaze. Namjera
   (vrijednost iz podatka, ne hardkodirana) je očuvana, pa obrasci sada primaju oba oblika.
   **Provjereno** da i dalje hvataju hardkodiranje: `'Gold'` → False, `'Neko'` → False.

Korekcija mog ranijeg broja: `loyalty-a11y.test.mjs` je u HEAD-u imao **5** testova, ne 7.
Sada ima 4 (4 zamijenjena s 3, peti netaknut).

### Provjere

`test:*` **177/177** · `tsc --noEmit` **exit 0** · build **273.9 KiB/300** · lint
**0 errors / 7 warnings** · `check_i18n --strict` **PASS** · `check_ui_contrast --strict`
**PASS** (80 parova) · `check_repo_hygiene` **PASS** (1702) · `check_doc_links` **PASS**
(670/202) · `git diff --check` **čist**.

### Preostalo (nije urađeno u ovom commitu)

6 čistih kandidata: `expense-table`, `income-entries-table`, `Notifications`, `Salon` (×2),
`Services`, `Users`. Plus **8 fajlova koji se NE mogu migrirati** bez proširenja `DataTable`-a
podrškom za `colSpan`/`<tfoot>`: `blog-posts-table`, `entry-table`, `Reservations`, `Reviews`,
`Stylists`, `ClientAnalytics`, `Analytics`, `expense-invoice-preview`.

**Otvoreni rizik po preostalih 6:** svaki ima vlastite klase po ćeliji i po redu, i svaki će
tražiti sličnu prilagodbu testova. `finance-table-a11y.test.mjs` ima `TABLES` spisak s
**tačnim brojevima** (`sourceTh`, `scope`, `td`, `captionKey`) koji će pasti na 0.


---

## 2026-11-09 — `DataTable` migracija (nastavak): defaulti umjesto shim-ova + finance tabele

Vlasnik je dao smjernicu: **„konzistentnost na dashboardima uvijek se mora ispoštovati.
Jedini izuzetak su javne klijentske stranice."** To je promijenilo pristup — u pilotu sam
čuvao *svaki* lokalni stil propom; sada se lokalne razlike koje su **nekonzistentnost**
uklanjaju, a propovi ostaju samo za funkcionalne potrebe.

### Izmjereno šta je funkcionalno, a šta nekonzistentnost

| Obrazac | Pojava | Odluka |
|---|---|---|
| `border-b border-slate-200 text-left dark:border-slate-800` (zaglavlje) | 8/8 | **default** |
| `text-xs uppercase text-slate-500` (zaglavlje) | 3/8 | nije default — Salon/Services/Users ga dobiju propom |
| `border-b border-slate-100 dark:border-slate-800/80` (red) | 3/8 | **default** |
| `last:border-0` (red) | 1/8 | `rowClassName` (funkcionalno) |
| `opacity-60` za neradne dane (Salon) | 1 | `rowClassName` (**funkcionalno**) |
| strelica samo na sortiranoj koloni | finance | `unsortedIndicator={false}` |

`DataTable` sada ima border na zaglavlju i redovima **po defaultu** — što je i popravka za
dva postojeća potrošača (`outbox-events-table`, `recent-reservations`), koji su do sada
imali zaglavlje bez bordera. Provjereno: `templates-a11y` + `render-smoke` + `shell-a11y`
**58/58** i dalje prolaze.

`Loyalty` je očišćen: `tableClassName`, `headRowClassName` i `rowClassName` su **uklonjeni**
jer su njegove klase postale defaulti. Test je preokrenut u **guard za konzistentnost** —
sada asertuje da potrošač NE prolazi stil-propove bez funkcionalnog razloga.

### Migrirano: `expense-table` (6 kolona) i `income-entries-table` (8 kolona)

Oba su imala sortiranje, pa koriste `sort` + `onSortChange` + `sortKey` po koloni.
U `income-entries-table` je `title={row.serviceName}` stajao na `<td>` — `DataTable` ne prima
atribute po ćeliji, pa je tooltip očuvan **omotačem** unutar `render`, bez novog propa.

### Testovi koji su pali (5) i kako su riješeni

| Test | Uzrok | Rješenje |
|---|---|---|
| `finance-table-a11y` (3) | `TABLES` spec s tačnim brojevima `<th>`/`<td>`/`scope` | uvedena `DATA_TABLE_CONSUMERS` lista koja provjerava **korištenje** komponente + redoslijed kolona; `TABLES` ostaje za ručno pisane tabele |
| `table-sort-accessibility` (2) | asertovao doslovan `aria-sort`/`onClick`/`aria-hidden` | podijeljen po odgovornosti: `DataTable` **jednom** dokazuje garancije, potrošač dokazuje da prosljeđuje `sort`/`onSortChange` i `sortKey` po koloni |
| `expense-list-i18n` (1) | `field: 'createdAt'` → `sortKey: 'createdAt'`; `onClick={() => onSort(column.field)}` → `onSortChange` | identifikatori sortiranja su **nepromijenjeni** (backend ih prima), promijenio se samo naziv propa |
| `income-list-i18n` (2) | isto + `t(column.labelKey)` → `headerKey` + `{row.stylistName}` → `row.stylistName` | obrasci primaju oba oblika; **provjereno** da i dalje hvataju hardkodiranje (`'Ana'` → False) |

### Greške napravljene usput

1. **Zamjena je počinjala na `<div className="app-table-wrap">` ali nije uključivala
   zatvarajući `</div>`** → neuravnotežen JSX (`TS1005: ')' expected`). U `expense-table` je
   slučajno prošlo jer sam tamo uključio `</div>`.
2. **Obrisao sam liniju PRIJE ubacivanja bloka**, pa se indeks pomjerio i `columns` je
   završio usred JSX-a. Pravilo: zamjene odozdo prema gore, ili traženje sidra **nakon**
   svake izmjene.
3. **Referencirao sam `/tmp/kolone_income.txt` koji nisam napravio** → skripta pala prije
   `write_text`. Provjereno da je fajl ostao netaknut.
4. **Pokrenuo sam `npm run -s test:templates-a11y` i `test:render-smoke` koji NE POSTOJE** —
   `npm run -s` tiho padne na nepostojećoj skripti, pa sam prvo pogrešno zaključio da su
   testovi pali. Stvarna imena su `test:admin-templates-a11y` i `test:admin-render-smoke`.
5. Tip reda je `IncomeEntryRow`, ne `IncomeRow` — `tsc` je uhvatio.

### Provjere

`test:*` **177/177** · `tsc --noEmit` **exit 0** · build **273.9 KiB/300** · lint
**0 errors / 7 warnings** · `check_i18n --strict` **PASS** · `check_doc_links` **PASS**
(670/202) · `git diff --check` **čist**.

### Preostalo

`Notifications`, `Salon` (2 tabele), `Services`, `Users`. Salon je jedini s funkcionalnim
`rowClassName` (`opacity-60`) i s `text-xs uppercase` zaglavljem.


---

## 2026-11-09 — `DataTable` migracija: `Notifications` + `Salon` (2 tabele)

### `Notifications.tsx` — nula propova

3 kolone, bez sortiranja. Klase zaglavlja (`border-b border-slate-200 text-left
dark:border-slate-800`) i redova (`border-b border-slate-100 dark:border-slate-800/80`) su
**tačno** defaulti koje je `DataTable` dobio u prethodnom koraku, pa migracija nije trebala
**nijedan** stil-prop. `admin-notifications-i18n` i `notifications-campaign-consent` prolaze
bez izmjena.

### `Salon.tsx` — usput nađen stvaran 1.3.1 defekt

`Salon.tsx:450-452` (prije izmjene) imao je **dva `<caption>` u istom `<table>`**:

```
<table className="app-table data-table w-full border-collapse">
  <caption className="sr-only">{t('salon.workingHoursCaption')}</caption>
  <caption className="sr-only">{t('salon.holidaysCaption')}</caption>
```

Po HTML specifikaciji `<table>` smije imati **najviše jedan** `<caption>`, pa je pristupačno
ime te tabele bilo nedefinisano. Druga tabela (praznici, `ln 521`) **nije imala svoj
caption** — njen naziv je bio zalutao u prvoj.

Migracija to ispravlja: radno vrijeme dobija `salon.workingHoursCaption`, praznici
`salon.holidaysCaption`. Salon je jedini s **funkcionalnim** `rowClassName`
(`opacity-60` za neradne dane) i s `headRowClassName="text-xs uppercase text-slate-500"`.

### Testovi

- `admin-settings-controls-a11y` (1 test): čitao je doslovan markup (`<th>` ×3, `<caption>`,
  `<table className="app-table data-table w-full border-collapse">`, `<td>` ×3 s
  `data-label`). Preuređen po istom principu — garancije na `DataTable`, kod potrošača
  provjera korištenja + redoslijed kolona + **guard da ne prolazi stil-propove**.
- `salon-services-stylists-a11y` (1 test): asertovao **27 `<th>` i 5 `<caption>`** kroz
  Salon+Services+Stylists. Izmjereno stvarno stanje: Salon 0 `<th>` / 2 `DataTable` /
  2 caption-propa, Services 8 `<th>`, Stylists 10 `<th>`. Test sada razlikuje ručno pisane
  tabele od `DataTable` potrošača i asertuje `thTotal=18`, `tableTotal=5`, `capTotal=5`
  (2 preko propa + 3 ručno) — ukupan broj tabela je i dalje 5.

### Greške u ovom koraku

1. **Ponovo hook poslije early return-a** (React #310) — `useMemo` za `sortedHolidays` sam
   stavio na ln 345, a `if (loading) return` je na ln 294. Ovo je **ista greška koju sam već
   jednom napravio i zabilježio**; uhvatili su je `test:hooks-order` i `react-hooks/rules-of-hooks`
   (lint 1 error). Premješteno odmah iza `useState` deklaracije.
2. **Pogodio sam imena handlera** (`handleSendHolidayPush(h)`, `handleDeleteHoliday(h)`) —
   stvarno je `handleSendNotification(h.id)` i `handleDeleteHoliday(h.id)`. Provjereno iz
   `git show HEAD`.
3. **Em-dash sam upisao kao `\\u2014`** (doslovna 2 backslasha + tekst), pa je `tsc` to
   prihvatio kao string a ne kao znak. Ispravljeno prepisivanjem cijele linije.
4. **`rowKey` mora vratiti `string`**, a `wh.dayOfWeek` je `number` → `String(wh.dayOfWeek)`.
5. **Pokrenuo sam nepostojeće skripte** `test:salon-i18n` i `test:admin-salon-i18n` —
   `npm run -s` tiho padne, pa to izgleda kao neuspjeh testa. Jedina stvarna je
   `test:salon-services-stylists-a11y`.

### Provjere

`test:*` **177/177** · `tsc --noEmit` **exit 0** · `test:hooks-order` **2/2** · lint
**0 errors / 7 warnings** · build **273.9 KiB/300** · `check_i18n --strict` **PASS** ·
`check_doc_links` **PASS** (670/202) · `git diff --check` **čist**.

### Preostalo

`Services.tsx` (1537 ln) i `Users.tsx` (1536 ln).

---

## 2026-11-09 — `DataTable` migracija: `Services` + zajedničke klase uzglavlja u default

### Urađeno

- **`pages/Services.tsx` migriran** (1538 → 1507 ln): ručna tabela od 8 `<th>` zamijenjena
  `<DataTable>`-om; kolone izvučene u `serviceColumns(sub)` (funkcija, jer `render` zatvara
  `sub.id` za `openServiceForm`). `tsc --noEmit` **exit 0**.
- **`text-xs uppercase text-slate-500` premješten u default** `data-table.tsx` i uklonjen
  `headRowClassName` prop iz komponente i iz svih potrošača (Salon ×2, Services ×1).
- **`font-medium` premješten u default `<th>`** (`cn('font-medium', alignClass[...], column.className)`),
  ispred `column.className` da potrošač može premostiti preko `twMerge`. `<td>` ga **ne** dobija.
- Novi test **`test:data-table-consistency`**
  (`src/features/shell/admin/ui/data-table-consistency.test.mjs`, 5 testova) registrovan u
  `frontend/package.json` i u `.github/workflows/ci.yml` (posao `frontend`: 183 → **184** koraka,
  176 → **177** `test:*`).

### Izmjereno prije izmjena (izvorni markup, `git show <commit>:<fajl>`)

Klase `<thead><tr>` svih 8 dashboard tabela **prije** migracije:

| klasa | tabele | broj |
|---|---|---|
| `text-xs uppercase text-slate-500` | Loyalty · Salon (radno vrijeme) · Salon (praznici) · Services · Users | **5** |
| bez nje | expense · income · Notifications | 3 |

`font-medium` na `<th>`: **36 od 36** (Loyalty 7, expense 4, income 5, Notifications 3,
Salon 9, Services 8) — dakle univerzalno.

Zaključak: obje klase su dominantni/univerzalni obrazac, pa po direktivi o konzistentnosti
idaju u default komponente, a ne u prop po potrošaču.

### 🔴 Dvije vlastite regresije pronađene mjerenjem i ispravljene

1. **`Loyalty.tsx` je pri pilot migraciji (`00fa566`) tiho izgubio `text-xs uppercase text-slate-500`**
   na uzglavlju. Izvorno ga je imao (`6b733c0:frontend/src/pages/Loyalty.tsx:168`), a ja sam ga
   skinuo kad sam „čistio" stil-propove i zatim testom **zabranio** da se vrati. Sada je default,
   pa se ne može izgubiti po fajlu.
2. **`Services` bi izgubio `font-medium` na 3 kolone** (duration, price, actions) jer sam za njih
   koristio `align: 'right'` umjesto ručne klase. Uhvaćeno prije commit-a mjerenjem 36/36.

Uzrok oba: uspoređivao sam klase na `<tr>`/`<table>`, ali ne i na `<th>`. Pravilo je dopunjeno:
**usporediti klase na svakom elementu uključujući `<th>`.**

### Napomena o namjernoj vizuelnoj promjeni

`expense-table`, `income-entries-table` i `Notifications` dobijaju `text-xs uppercase text-slate-500`
na uzglavlju (ranije ga nisu imali). To je namjerno uklanjanje nekonzistentnosti po direktivi
vlasnika („konzistentnost na dashboardima uvijek se mora ispoštovati"), ne regresija.
`Services`, `Salon` i `Loyalty` su vizuelno nepromijenjeni.

### Mutacijska provjera (6/6)

| # | mutacija | test pada? |
|---|---|---|
| M1 | `text-xs uppercase text-slate-500` izbačen iz defaulta | ✅ |
| M2 | `headRowClassName` vraćen u `Loyalty` | ✅ |
| M3 | `tableClassName` dodat u `Loyalty` | ✅ |
| M4 | `caption` prop uklonjen iz `Loyalty` | ✅ |
| M5 | `font-medium` izbačen iz `<th>` defaulta | ✅ |
| M6 | `font-medium` pogrešno dodat i na `<td>` | ✅ |

Sve mutacije vraćene; kontrolni prolaz 5/5.

### Zamke uhvaćene u ovom koraku

- `s.replace(old, '')` gdje je `old` (18 razmaka + `headRowClassName`) **podstring** duže linije
  (32 razmaka + isto) → ostalo je 14 razmaka zalijepljenih na sljedeću liniju (`/>` na 44. koloni).
  `tsc` to ne hvata. Provjereno `sed -n '/<DataTable/,/\/>/p'` + regex za linije samo-razmaci.
- `new URL('../../../', import.meta.url)` računa od **fajla**, ne direktorija → `SRC` je pokazivao
  na `src/features/` i test je nalazio 4 umjesto 8 potrošača. Ispravljeno na `join(HERE,'..','..','..','..')`.
- Regex `<th[^>]*>` **hvata i `<thead>`** → prvi brojevi (Loyalty 8/7) bili su lažno uvećani.
  Ispravan obrazac: `<th(?=[\s>])[^>]*>`.
- `print(f'{n0} -> {len(s)}')` nakon `p.write_text(s.replace(...))` bez `s = ` → ispisao staru
  veličinu. Provjera stvarnog stanja: `wc -c` + `git diff --stat`.

### Kapije

`test:*` **178/178** · `tsc --noEmit` **exit 0** · `test:hooks-order` **2/2** · lint
**0 errors / 7 warnings** · build **273.9 KiB / 300** · `check_i18n --strict` **PASS**
(2652/2652) · `check_doc_links` **PASS** (670/202) · `git diff --check` **čist**.

### Preostalo

`Users.tsx` (1536 ln, 8 `<th>`) — posljednji čisti kandidat. Zatim 8 nemigriranih
(`colSpan`/`<tfoot>`).

---

## 2026-11-09 — `Users` na `DataTable` + **ISPRAVKA**: tvrdnja o `font-medium` bila je netačna

### 🔴 Ispravka prethodnog unosa (commit `c9d052b`)

Prethodni unos je tvrdio: *„`Services` bi izgubio `font-medium` na 3 kolone (duration, price,
actions)"* i na osnovu toga dodao `font-medium` kao `cn()` default na `<th>`.

**Ta tvrdnja je NETAČNA.** `src/index.css:16-18` već sadrži:

```css
table.app-table th {
  @apply font-medium text-slate-500;
}
```

Specifičnost tog selektora je **(0,1,2)** (1 klasa + 2 elementa), dok je bilo koja utility
klasa poput `.font-medium` **(0,1,0)** — dakle CSS pravilo **uvijek pobjeđuje**, bez obzira
na redoslijed Tailwind slojeva. `DataTable` uvijek renderuje `app-table`, pa je `font-medium`
na `<th>` neizbježan. `Services` ništa nije gubio.

Mjerenje „36/36 `<th>` ima `font-medium`" bilo je **tačno**, ali je iz njega izveden **pogrešan
zaključak**: prisustvo klase u markupu nije dokaz da je ona *potrebna* — bila je redundantna
i u izvornom kodu.

**Urađeno:** suvišni `font-medium` default **uklonjen** iz `data-table.tsx` (ostavljen komentar
koji objašnjava zašto ga nema). Test sada asertuje **stvarnu** garanciju — CSS pravilo — plus
da `DataTable` zaista renderuje `app-table`, plus da se `font-medium` ne duplicira kao utility.

### ✅ Tvrdnja koja JESTE tačna (i ostaje)

Regresija u `Loyalty.tsx` bila je **stvarna**: `text-xs uppercase text-slate-500` stajao je na
`<thead><tr>`, nasljeđivao se na `<th>`, i **nema ga nigdje u CSS-u** za `app-table`
(provjereno: `grep -n "uppercase\|text-xs" src/index.css src/styles/globals.css` → nema
rezultata). Kad je migracija skinula klasu s `<tr>`, uzglavlje je stvarno izgubilo uppercase.
Default iz `c9d052b` ostaje.

### Urađeno (nastavak migracije)

- **`pages/Users.tsx` migriran** (1537 → 1568 ln): `renderUserRow` (koji je vraćao cijeli `<tr>`
  s 8 `<td>`) zamijenjen s `userColumns: DataTableColumn<UserRow>[]`; `UsersList` sada prima
  `columns` umjesto `renderRow`; ručni `<table>` zamijenjen `<DataTable>`-om. `tsc` **exit 0**.
- Kolona `username` je imala `font-medium text-slate-900 dark:text-slate-50` **na `<td>`**.
  Kako `DataTable` dijeli `column.className` između `<th>` i `<td>`, te klase su prebačene na
  `<span>` unutar `render` — inače bi `<th>` dobio `text-slate-900` i pregazio `text-slate-500`
  iz defaulta.
- `test:users-a11y` prepisan (5 → **6** testova): garancije se asertuju nad komponentom, nad
  potrošačem korištenje + `caption` prop + **redoslijed 8 kolona** + zabrana stil-propova.

### Stanje migracije: **7/7 čistih kandidata završeno**

`Loyalty` · `expense-table` · `income-entries-table` · `Notifications` · `Salon` (×2) ·
`Services` · `Users`. Preostaje **8 nemigriranih** (`colSpan`/`rowSpan`/`<tfoot>` — `DataTable`
ih ne podržava): `blog-posts-table`, `daily-log/entry-table`, `Reservations`, `Reviews`,
`Stylists`, `ClientAnalytics`, `Analytics`, `expense-invoice-preview`.

### Mutacijska provjera (7/7 u ovom koraku)

| # | mutacija | test pada? |
|---|---|---|
| M1 | zamijenjen redoslijed kolona u `Users` | ✅ (`users-a11y` #3) |
| M2 | `tableClassName` dodat u `Users` | ✅ (`users-a11y` #4) |
| M3 | `caption` prop uklonjen iz `Users` | ✅ (`users-a11y` #2) |
| M4 | vraćen ručni `<table>` u `Users` | ✅ (`users-a11y` #2) |
| M5' | `font-medium` obrisan iz CSS pravila | ✅ (`data-table-consistency` #2) |
| M6' | `font-medium` dupliciran kao utility na `<th>` | ✅ (`data-table-consistency` #2) |
| M7' | `app-table` klasa uklonjena iz `DataTable` | ✅ (`data-table-consistency` #2) |

Sve mutacije vraćene; kontrolni prolazi 6/6 i 5/5.

### Usput: reset okruženja

Na početku koraka `git rev-parse HEAD` vratio je bazni `9df498a`, a sav rad je stajao kao
nekommitan diff; `frontend/node_modules` je nestao. Oporavak bez gubitka:
`git fetch origin <grana>` → `git reset --mixed FETCH_HEAD` (ne dira radno stablo) →
`git status --short` = **0 izmjena** → `npm ci`.

### Kapije

`test:*` **178/178** · `tsc --noEmit` **exit 0** · `test:hooks-order` **2/2** · lint
**0 errors / 7 warnings** · build **273.9 KiB / 300** · `check_i18n --strict` **PASS** ·
`check_doc_links` **PASS** (670/202) · `git diff --check` **čist**.

---

## 2026-11-09 — CI indeks pod guardom + **ISPRAVKA**: `3.2.6` je zadovoljen, matrica je bila pogrešna

### 1. `scripts/check_ci_index.py` (novi trajni guard)

Do sada je svaka faza ručno dodavala `test:*` skriptu u `package.json` **i** korak u
`ci.yml`. To je dvije godine poziv za tiho propadanje: nova skripta prolazi lokalno, a u CI
nikad ne trči.

Guard provjerava **oba smjera**:

1. svaki `npm run test:<ime>` korak u `ci.yml` postoji u `package.json` direktorija u kojem
   korak radi (`working-directory`, ili ime posla ako je to paket);
2. svaka `test:*` skripta iz `frontend/`, `backend/`, `mobile/` `package.json` ima CI korak.

Bez `pyyaml` (nema ga ni u sandboxu ni u `repo-checks` poslu) — workflow se parsira po
uvlačenju, uključujući višelinijske `run: |` blokove (4 u fajlu, nijedan ne sadrži
`npm run test:`).

**Izmjereno stanje prije guard-a:**

| | |
|---|---|
| CI `test:*` koraka | `frontend` 177 · `mobile` 176 · `backend` 4 · `a11y-e2e` 1 |
| Deklarisano | `frontend` 178 · `mobile` 176 · `backend` 7 |
| Skripti bez CI koraka | 3 — sve **interaktivne** (`test:watch`, `test:cov`, `test:debug`) |
| CI koraka s nepostojećom skriptom | **0** |

`frontend` ima 178 skripti a `frontend` posao 177 koraka jer `test:a11y-routes` namjerno trči
u `a11y-e2e`. Četiri „duplikata" (`test:socket-recovery`, `test:stylist-debts-i18n`,
`test:stylist-stats-i18n`, `test:onboarding-email-accessibility`) nisu greška — istoimene
skripte postoje i u `frontend/` i u `mobile/`, svaka trči u svom poslu.

**Rezultat: `PASS: 358 od 361 test:* skripti ... (3 interaktivnih je izuzeto)`.** Registrovan
kao korak u `repo-checks` (6 → **7** koraka).

Izuzeci su navedeni **tačnim nazivom**, ne obrascem — `/cov/` bi pogodio i 17 frontend
`*-recovery` testova (provjereno, lažni pozitivni).

### 2. 🔴 `3.2.6 Consistent Help` — matrica je bila pogrešna, kriterij JE zadovoljen

Matrica je držala `3.2.6` kao ❌ uz razlog *„**nema** help/kontakt elementa u shellu"*.

**Izmjereno 2026-11-09: help element POSTOJI u oba shell-a**, i to već s eksplicitnim
`WCAG 3.2.6` komentarima u kodu:

| shell | `<header>` | `/kontakt` link | korisnički meni |
|---|---|---|---|
| `features/shell/admin/admin-layout.tsx` | 82–170 | **154** | `<AdminUserMenu` 160 |
| `layouts/StylistLayout.tsx` | 81–163 | **101** | `<DropdownMenu>` 108 |

Oba: link je **unutar dijeljenog `<header>`** i **prije korisničkog menija**; ikona
`HelpCircle` je `aria-hidden`, tekstualno ime dolazi iz `shell.help` (bs „Pomoć" / en „Help").

Dva razloga zašto je ❌ bio pogrešan:
- **činjenično** — element postoji, grep ga nalazi;
- **normativno** — 3.2.6 traži *konzistentnost* help mehanizma, ne njegovo postojanje. Da ga
  nema nigdje, kriterij bi bio trivijalno zadovoljen, ne prekršen.

Garancija je sada **pojačana u testu** (`test:shell-a11y`, test #5): prije je asertovao samo
prisustvo (`to="/kontakt"` + `t('shell.help')`) iako mu je ime bilo „consistent place". Sada
asertuje i (a) da je link unutar `<header>`, (b) da je prije korisničkog menija, (c) `aria-hidden`
na ikoni, (d) `sr-only` ime, (e) `min-h-target min-w-target`, (f) ključ u oba jezika.

**Matrica ažurirana:** `3.2.6` ❌ → ✅; ETAPA B: ✅ 28 → **29**, ❌ 2 → **1** (ostaje `3.1.2`).

### Mutacijska provjera (7/7)

| # | mutacija | pada? |
|---|---|---|
| M1 | CI korak pokreće nepostojeću skriptu | ✅ `check_ci_index` |
| M2 | nova `test:*` skripta bez CI koraka | ✅ `check_ci_index` |
| M3 | zastario `DEV_ONLY` unos | ✅ `check_ci_index` |
| M1a | help premješten **iza** `</DropdownMenu>` (stylist) | ✅ `shell-a11y` #5 |
| M1b | help izbačen iz `<header>` (admin) | ✅ `shell-a11y` #5 |
| M2' | `sr-only` ime uklonjeno (admin) | ✅ `shell-a11y` #5 |
| M3' | `aria-hidden` skinut s `HelpCircle` (stylist) | ✅ `shell-a11y` #5 |

Prva verzija mutacije M1a **nije** uhvaćena jer je anchor bio `t('shell.userMenu')` — taj tekst
je *unutar* `DropdownMenu`, pa je help pomjeren ispred `<DropdownMenu>` i dalje bio „prije".
Anchor je promijenjen na `<DropdownMenu>`, a dodata je i asertacija o `<header>`. Sve mutacije
vraćene (`git checkout -- <fajl>`); kontrole 7/7 i `PASS`.

### Kapije

`test:*` **178/178** · `tsc --noEmit` **exit 0** · lint **0 errors / 7 warnings** ·
`check_ci_index` **PASS** · `check_repo_hygiene` **PASS** · `check_doc_links` **PASS**
(670/202) · `check_i18n --strict` **PASS** · `check_ui_contrast --strict` **PASS** (80 parova) ·
`git diff --check` **čist**.
