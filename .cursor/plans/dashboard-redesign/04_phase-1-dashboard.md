# Faza 1 — Dashboard (home) · PILOT

**Namjerno prvi poslije Temelja:** mali (7 fajlova / 788 linija), ima `test:dashboard-count-contract`, idealan za provjeru šablona.
**Poslije ove faze — KAPIJA: STOP i pregled.**

---

## 1. Inventar funkcionalnosti (paritetni ugovor)

### 1.1 `pages/Dashboard.tsx` (39 ln)

| # | Kontrola / akcija | Uslov | Efekat | Mijenja se? |
|---|---|---|---|---|
| F1 | Naslov „Dobrodošli, {username}“ | `user?.username` | `h1` | ❌ |
| F2 | Podnaslov `dashboard.stats` | — | `<p>` | ❌ |
| F3 | `DashboardFinanceStats` | `stats` učitan | 5 kartica | samo tokeni |
| F4 | `DashboardOpsStats` | `stats` učitan | 4 kartice | samo tokeni |
| F5 | `DashboardOutboxDiagnostics` | `(user?.roles ?? []).some(r => r === 'SYSTEM_ADMIN' \|\| r === 'OWNER')` | tabela outbox-a | **role gate netaknut** |
| F6 | `DashboardRecentReservations` | `recentReservations` | tabela | šablon |
| F7 | Loading stanje | `loading \|\| !stats` | `<div className="p-6 text-center">` + `t('common.loading')` | ⚠️ **nema `role="status"`** → dodati `TableSkeleton` |

### 1.2 `features/dashboard/use-dashboard-data.ts` — **NE DIRATI (contract test)**

| API poziv | Parametri | Contract test asertuje |
|---|---|---|
| `GET /api/reservations/dashboard-summary` | `params: { fromDate: firstDay, toDate: lastDay }` | ✅ regex |
| `GET /api/users/dashboard-count` | — | ✅ regex |
| `GET /api/services`, `/api/stylists` | — | — |
| `GET /api/income-books/month/${year}/${month}` | — | — |
| `GET /api/expense-books/month/${year}/${month}` | — | — |
| `GET /api/blog/admin`, `/api/reviews/admin` | — | — |

Test **eksplicitno zabranjuje** `api.get('/api/reservations')` i `api.get('/api/users')` (sprječava skidanje cijele liste).
Socket: `reservation:created|updated|confirmed|cancelled|stylist_response` → `loadData()`.

### 1.3 `outbox-diagnostics.tsx` (343 ln)

`GET /api/reservations/ops/outbox`, `GET /api/reservations/ops/outbox/${encodeURIComponent(...)}`.
Vidljiv **samo** za `SYSTEM_ADMIN`/`OWNER`. Ima `aria-live` (potvrđeno grep-om).

## 2. Inventar podataka

| Prikazana vrijednost | Izvor | Formatiranje |
|---|---|---|
| Ukupan prihod | `servicesRevenueThisMonth + tipsThisMonth` | `formatLocalizedAmount(x, i18n.language)` |
| Prihod od usluga | `stats.servicesRevenueThisMonth` | isto |
| Bakšiš | `stats.tipsThisMonth` | isto |
| Rashodi | `stats.expensesThisMonth` | isto |
| **Neto** | `(services + tips) - expenses` | isto; boja ovisi o `net >= 0` |
| Rezervacije ovaj mjesec | `summaryCount(reservationSummary?.reservationsThisMonth)` | `formatLocalizedNumber(x, lang, { maximumFractionDigits: 0 })` |
| hint: završene / na čekanju | `completedReservations`, `pendingReservations` | `t('dashboard.reservationCounts', { completed, pending })` |
| Korisnici | `usersCountRes.data?.total` | `formatLocalizedNumber` |
| hint: frizeri / usluge | `stylistsCount`, `servicesCount` | `t('dashboard.userCounts', {…})` |
| Nedavne rezervacije | `reservationSummary?.recentReservations.slice(0, 8)` | `formatLocalizedDateTime` |

**Proračuni `total` i `net` su izvedeni u komponenti** (`finance-stats.tsx`). Refaktor **ne smije** promijeniti
redoslijed operacija niti `formatLocalizedAmount` poziv — to je srce pariteta podataka.

## 3. Dizajn izmjene

| # | Izmjena | WCAG |
|---|---|---|
| D1 | `PageHeader` (h1 + opis + slot za akcije) | 1.3.1, 2.4.6 |
| D2 | `StatGrid`/`StatCard` umjesto 5 `Card`+`CardContent` i `Mini` | 1.3.1 (`<ul>`/`<li>`) |
| D3 | **`text-orange-600`** (`ops-stats.tsx`, `emphasize`) = **3.56:1** → **FAIL 1.4.3**, i boja je **van brand palete** → zamijeniti `--warn-fg` (#7A3E00, 7.49:1) + **ikonom** | 1.4.1, 1.4.3 |
| D4 | Neto „pozitivan/negativan“ samo bojom (`text-slate-900` vs `text-rose-700`) → dodati **prefiks/ikonu** ili `aria` opis trenda | 1.4.1 |
| D5 | `emerald`/`rose` klase → `--ok-*` / `--bad-*` tokeni | — |
| D6 | Loading → `TableSkeleton` sa `role="status"` + `sr-only` | 4.1.3 |
| D7 | `recent-reservations` → `DataTable` (caption, `th scope`, `<time datetime>`, jedinstvena imena akcija) | 1.3.1, 4.1.2 |
| D8 | `outbox-diagnostics` → `DataTable` + zadržati role gate i `aria-live` | 1.3.1 |
| D9 | Greška pri učitavanju → `ErrorState` sa retry (**trenutno nema error stanja** — provjereno: `use-dashboard-data` nema error grani u page-u) | 3.3.1, 4.1.3 |
| D10 | `text-slate-500` → `text-[--text-muted]` | 1.4.3 |

> **Napomena za D9:** dodavanje error stanja **nije novi feature** nego isto stanje koje danas prikazuje prazan ekran.
> Ako vlasnik smatra da je to promjena ponašanja — označiti i pitati prije implementacije.

## 4. Razbijanje fajlova

`pages/Dashboard.tsx` (39 ln) već je tanka kompozicija — **ostaje**. Cilj:

```
features/dashboard/
  use-dashboard-data.ts        ← NETAKNUTO (contract test)
  types.ts                     ← NETAKNUTO
  finance-stats.tsx   (74 ln)  ← tokeni + StatGrid
  ops-stats.tsx                ← tokeni + StatGrid, bez text-orange-600
  recent-reservations.tsx      ← DataTable
  outbox-diagnostics.tsx (343) ← razbiti na outbox-table.tsx + outbox-panel.tsx + use-outbox.ts
```

## 5. WCAG stavke specifične za modul

1.1.1 (ikone `aria-hidden`) · 1.3.1 (`ul`/`li`, `table`, jedan `h1`) · 1.4.1 (neto trend, `orange`) ·
1.4.3 (`text-orange-600`, `text-slate-500`) · 1.4.11 · 2.4.6 · 4.1.2 (`aria-sort` ako postoji sortiranje) ·
4.1.3 (loading, socket refresh najava) · 3.3.1 (error state)

## 6. Rizici

| Rizik | Mitigacija |
|---|---|
| **`test:dashboard-count-contract`** asertuje regex nad `use-dashboard-data.ts` | **fajl se ne dira** |
| Promjena `total`/`net` proračuna | diff prije/poslije; test koji poredi izračun |
| `outbox-diagnostics` role gate | gate ostaje u `Dashboard.tsx`, ne u novom fajlu |
| Socket refresh + `aria-live` = „pričljiva“ stranica | live region samo za eksplicitne promjene, ne za svaki socket event |

## 7. Testovi

**Postojeći (moraju ostati zeleni):** `test:dashboard-i18n`, `test:dashboard-count-contract`, `test:locale-formatting`.

**Novi:**
- `test:dashboard-stat-parity` — čita `finance-stats.tsx` i asertuje da `total = services + tips` i `net = total - expenses` ostanu isti izrazi, te da se koristi `formatLocalizedAmount`
- `test:dashboard-states` — loading (`role="status"`), error (`role="alert"` + retry), prazno stanje
- `test:dashboard-a11y` — jedan `h1`, `<ul>` za stat grid, `DataTable` caption + `scope`, bez `text-orange-*`/sirovih `slate-*`

## 8. Definition of Done

Standardni DoD + specifično:
- [ ] `test:dashboard-count-contract` zelen bez izmjene
- [ ] Svi iznosi i brojevi identični (uporedni screenshot ili test)
- [ ] `text-orange-600` uklonjen; nema sirovih `slate-*` u `features/dashboard`
- [ ] Outbox dijagnostika i dalje samo za `SYSTEM_ADMIN`/`OWNER`

## 9. Obim

~6 fajlova (2 nova, 4 izmijenjena), 2 commita:
1. `a11y/ui(dashboard): page header + stat grid + semantic tokens`
2. `a11y/ui(dashboard): data table, loading/error states, remove off-palette orange`
