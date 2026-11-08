# Faza 11 — Stylist portal

**37 produkcijskih fajlova / 5782 linije / 26 testova.** Najbolje testiran dio dashboarda — ali i najviše pristupačnosnih testova koji asertuju markup.

---

## 1. Inventar funkcionalnosti

| Ruta | Page | Linija |
|---|---|---:|
| `/stylist/inbox` | `stylist-inbox-page.tsx` | 325 |
| `/stylist/workbook` | `workbook-list-page.tsx` | — |
| `/stylist/workbook/new` | `workbook-new-entry-page.tsx` | **659** |
| `/stylist/workbook/reschedule-preview/:reservationId` | `workbook-reschedule-preview-page.tsx` | 365 |
| `/stylist/workbook/:entryId` | `workbook-detail-page.tsx` | 508 |
| `/stylist/schedule` | `stylist-schedule-page.tsx` | — |
| `/stylist/schedule/new` | `stylist-direct-booking-page.tsx` | 366 |
| `/stylist/schedule/:reservationId` | `stylist-reservation-detail-page.tsx` | — |
| `/stylist/debts` | `stylist-debts-page.tsx` | — |
| `/stylist/stats` | `stylist-stats-page.tsx` | — |

**Rezervacijske akcije (FSM — NE DIRATI):** `stylist/{profileId}/accept|reject|lock|unlock`,
`stylist-start`, `staff-confirm-attendance`, `stylist-cancel`, `stylist-no-show`,
`reschedule/propose`, `reschedule/commit`, `reorder/request`, `reservations/stylist/direct`.

**Dnevna knjiga:** `/api/daily-log`, `${entryId}`, `${entryId}/complete`, `${entryId}/dispose`, `${entryId}/images`,
`from-reservation/${reservationId}`. **Dugovi:** `/api/client-debts/stylist/me`, `${id}/repay`.
**Loyalty:** `/api/loyalty/stylist/client/${clientId}`. **Profil:** `/api/stylists/me`.

**Socket:** `useStylistPortalSocketRefresh()`, `useStylistReservations`, `useStylistReservationDetail`
(TanStack Query + `queryKeys`).

## 2. Inventar podataka

Termini (status, klijent, usluga, vrijeme, `bookingOrigin`, `acceptanceMode`, `attendancePolicy`),
unosi dnevne knjige (iznosi, dugovi, `PENDING` disposition), dugovi klijenata, statistika, loyalty bodovi.
Sve matrice: [`reservations`](../../docs/matrices/reservations/MATRIX.md), [`daily-log`](../../docs/matrices/daily-log/MATRIX.md),
[`client-debts`](../../docs/matrices/client-debts/MATRIX.md).

## 3. Dizajn izmjene

| # | Izmjena | WCAG |
|---|---|---|
| D1 | Shell iz faze 0: skip link, `aria-current`, jedan `navItems` izvor, `PageHeader`, focus-on-navigate | 2.4.1, 1.3.1, 2.4.3 |
| D2 | `DataTable` / `FilterBar` / `StatGrid` / `FormSection` na svih 10 ekrana | 1.3.1 |
| D3 | Dijalozi (reason, complete, overrun, reorder) → `ConfirmDialog` / `ResponsiveDialog` | 2.1.2, 3.3.4 |
| D4 | **3.3.7:** `workbook-new-entry` — klijent + usluga se ne smiju tražiti dvaput | 3.3.7 |
| D5 | Loader spinners `text-slate-400` (`workbook-detail-page:137`, `workbook-new-entry-page:290,478`, `workbook-reschedule-preview-page:127`) → `--text-muted` + `sr-only` tekst | 1.4.3, 1.4.11 |
| D6 | Search ikone `text-slate-400` (`workbook-new-entry-page:330,376`) → `--text-muted` | 1.4.11 |
| D7 | Schedule: isti `AccessibleCalendar` obrazac kao admin (2.5.7 alternativa) | 2.5.7 |
| D8 | Upload slika (`${entryId}/images`) → native input + `role="progressbar"` | 2.5.7 |
| D9 | `BeforeAfterSlider` u `workbook-detail-page` — **ne dirati** | — |
| D10 | Card prikaz tabela ispod 640px; mete ≥24px | 1.4.10, 2.5.8 |

## 4. Razbijanje fajlova

`workbook-new-entry-page.tsx` (659) → `new-entry-form.tsx`, `new-entry-client-picker.tsx`,
`new-entry-service-picker.tsx`, `new-entry-loyalty-panel.tsx`, `use-new-entry-form.ts`.
`workbook-detail-page.tsx` (508) → `detail-header.tsx`, `detail-amounts.tsx`, `detail-disposition-panel.tsx`,
`detail-before-after.tsx`, `detail-images-upload.tsx`.

## 5. WCAG stavke

1.1.1 · 1.3.1 · 1.4.1 · 1.4.3 · 1.4.10 · 2.1.1 · 2.1.2 · 2.4.1 · 2.4.3 · **2.5.7** · 2.5.8 ·
3.3.1–3.3.4 · **3.3.7** · 4.1.2 · 4.1.3

## 6. Rizici

| Rizik | Mitigacija |
|---|---|
| **FSM rezervacija** — 12 akcija sa strogim prijelazima | ne dirati API sloj ni `status.ts`; matrica `reservations` je izvor istine |
| 26 testova asertuje markup | ažurirati uz obrazloženje; garancije ostaju |
| TanStack Query + socket refresh | `queryKeys` netaknuti |
| Mobilna aplikacija dijeli business logiku | mobilni kod se **ne dira** |

## 7. Testovi

**Postojeći (26):** `test:stylist-workbook-*-i18n` (5), `test:stylist-workbook-*-accessibility` (4),
`test:stylist-inbox-i18n`/`-accessibility`, `test:stylist-schedule-i18n`/`-accessibility`,
`test:stylist-direct-booking-i18n`/`-accessibility`/`-recovery`, `test:stylist-reservation-detail-i18n`/`-recovery`,
`test:stylist-debts-i18n`/`-accessibility`, `test:stylist-stats-i18n`/`-accessibility`,
`test:stylist-overrun-navigation`, `test:stylist-reservation-*-dialog-i18n` (4).

**Novi:** `test:stylist-portal-a11y` (skip link, `aria-current`, jedan `h1` po ekranu),
`test:stylist-workbook-redundant-entry` (3.3.7).

## 8. Definition of Done

Standardni DoD + svih 12 rezervacijskih akcija radi identično; iznosi u dnevnoj knjizi identični;
26 postojećih testova zeleno; mobilna aplikacija bez diff-a.

## 9. Obim

~28 fajlova (12 novih), 4 commita (shell+inbox → workbook → schedule → debts/stats).
