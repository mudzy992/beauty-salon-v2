# Faza 6 — Analitika (Analytics + ClientAnalytics + StylistAnalytics)

**Ovdje se odlučuje o objedinjavanju M1 (Q3).** Bez odobrenja — tri ekrana ostaju odvojene rute, radi se samo redizajn.

---

## 1. Inventar funkcionalnosti

| Ekran | Ruta | Fajl | Linija | U navu |
|---|---|---|---:|---|
| Analytics | `/admin/analytics` | `pages/Analytics.tsx` | 397 | ✅ |
| ClientAnalytics | `/admin/client-analytics?userId=` | `pages/ClientAnalytics.tsx` | 753 | ❌ |
| StylistAnalytics | `/admin/stylist-analytics?stylistId=` | `pages/StylistAnalytics.tsx` | ~130 | ❌ |

| # | Kontrola | API |
|---|---|---|
| F1 | Dashboard analitika + grafik (recharts) | `GET /api/analytics/dashboard` |
| F2 | Analitika po klijentu (ručni unosi, dugovi, historija) | `GET /api/users/${userId}/analytics`, `/api/client-debts` |
| F3 | Analitika po frizeru | `GET /api/stylists/${stylistId}/analytics` |
| F4 | Filteri (datum raspon) | query parametri |
| F5 | Dijalog detalja (`ClientAnalytics`) | `Dialog` + `Tabs` |
| F6 | Navigacija nazad (`ArrowLeft`) | `useNavigate` |

**Grafikoni:** `recharts` se koristi **samo** u `pages/Analytics.tsx` — `ResponsiveContainer`, `LineChart`, `Tooltip`, `Legend`.
**Nema** `aria-label`, `role="img"`, tekstualnog sažetka ni tabele podataka → **1.1.1 ❌**.

## 2. Inventar podataka

Iznosi: `formatLocalizedAmount`. Brojevi: `formatLocalizedNumber(x, lang, { maximumFractionDigits })`.
Datumi: `getIntlLocale`, `formatDateOnlyLocale` (`shared/business-date.mjs`).
`ClientAnalytics` prikazuje: `user` (username, email, ime, telefon, `isActive`, `createdAt`), `ManualEntry[]`
(`actualPrice`, `tipAmount`, `isManual`, `notes`, `status`, `service`, `stylistProfile`), `ClientDebtRow[]`
(`amount`, `createdAt`, `status` OPEN/SETTLED, `service`, `reservation`, `dailyLogEntry`, `manualEntry`, `stylistProfile`).

## 3. Dizajn izmjene

| # | Izmjena | WCAG |
|---|---|---|
| D1 | **`ChartFigure`**: `<figure>` + `aria-label` sa ključnim brojevima + **tabela podataka** ispod (otvorena po defaultu ili `<details>`) | 1.1.1 |
| D2 | Pristupačna legenda (tekst, ne samo boja); tooltip dostupan tastaturom | 1.4.1, 2.1.1 |
| D3 | **`ClientAnalytics` nema `<h1>`** → `PageHeader` | 1.3.1, 2.4.6 |
| D4 | `text-slate-400` na `ClientAnalytics.tsx:316,575` (**2.56:1 FAIL**) → `--text-muted` | 1.4.3 |
| D5 | `DataTable` + `caption` + `th scope` (20 `<th>` u `ClientAnalytics`) | 1.3.1 |
| D6 | Filteri → `FilterBar`; rezultat se najavljuje (`role="status"`) | 4.1.3 |
| D7 | **M1 (ako je odobren):** `/admin/analytics` sa `?tab=overview\|client\|stylist`; stare rute → `<Navigate replace>`; `?userId=`/`?stylistId=` parametri se čuvaju | 2.4.5, 3.2.3 |
| D8 | Tokeni umjesto `slate-*`/`emerald`/`rose` | 1.4.3 |

## 4. Razbijanje fajlova

```
features/analytics/
  analytics-page.tsx (< 100)
  charts/revenue-chart.tsx        ← ChartFigure omotač
  charts/chart-data-table.tsx
  use-analytics-dashboard.ts
features/client-analytics/
  client-analytics-page.tsx (< 120)
  client-analytics-manual-entries-table.tsx
  client-analytics-debts-table.tsx
  client-analytics-detail-dialog.tsx
  use-client-analytics.ts
features/stylist-analytics/  (analogno)
```

## 5. WCAG stavke

**1.1.1 (kritično)** · 1.3.1 · 1.4.1 · 1.4.3 · 1.4.10 · 2.1.1 · 2.4.6 · 3.3.2 · 4.1.2 · 4.1.3

## 6. Rizici

| Rizik | Mitigacija |
|---|---|
| **Bundle:** `Analytics` ruta = **114.3 / 140 KiB gzip** — dodavanje tabele podataka povećava chunk | tabela je običan HTML (bez nove zavisnosti); `check-bundle-budget.mjs` poslije faze; ako probije — pitati |
| `recharts` nema a11y API | ne pokušavamo „popraviti“ recharts; dodajemo **alternativu** (tabelu) |
| M1 spajanje mijenja `useSearchParams` u 3 ekrana | bez odobrenja se ne radi; sa odobrenjem — poseban commit + redirect test |
| `ClientAnalytics` 753 ln sa složenim tipovima | tipovi idu u `types.ts` bez izmjene |

## 7. Testovi

**Postojeći:** `test:admin-analytics-i18n`, `test:client-analytics-i18n`, `test:stylist-analytics-i18n`.
**Novi:** `test:analytics-chart-alternative` (postoji tabela podataka + `aria-label`/`figure`),
`test:analytics-page-a11y` (h1 na sva tri ekrana), `test:analytics-routes-redirect` (samo ako M1 odobren).

## 8. Definition of Done

Standardni DoD + svaki grafik ima tekstualnu alternativu; `Analytics` chunk ≤ 140 KiB gzip;
ako je M1 odobren — stare rute redirectuju i `?userId=`/`?stylistId=` rade.

## 9. Obim

~14 fajlova (10 novih), 3 commita (Analytics → Client → Stylist; M1 kao zaseban commit).
