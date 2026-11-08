# Faza 2 — Rezervacije (lista + fullscreen kalendar)

**Najveći a11y izazov:** drag&drop kalendar (2.5.7), socket refresh (4.1.3), `react-big-calendar` (4.1.2).

---

## 1. Inventar funkcionalnosti

### 1.1 `pages/Reservations.tsx` (660 ln)

| # | Kontrola | API / efekat |
|---|---|---|
| F1 | Filteri (`ReservationFilters`) — datum raspon, status, pretraga | `GET /api/reservations` sa parametrima; `resetReservationFilters` |
| F2 | Tabela rezervacija + paginacija (`PaginatedResponse<T>`: `items/total/page/pageSize`) | — |
| F3 | Badge statusa | `getStatusBadgeVariant(status)` → `success/brand/secondary/warning/danger` |
| F4 | Detalj (Dialog) | `GET /api/reservations/${id}` |
| F5 | Potvrda dolaska | `POST /api/reservations/${id}/staff-confirm-attendance`, uslov `canAdminConfirmAttendance` |
| F6 | Admin otkaz (+ razlog, `Textarea`) | `POST /api/reservations/${id}/admin-cancel`, uslov `canAdminCancelReservation` |
| F7 | Link na kalendar | `/admin/reservations/calendar` |
| F8 | Socket refresh | `useReservationSocketRefresh` |
| F9 | Toast | `useAppToast().success/error` |

**Status logika (NE DIRATI):** `features/reservations/status.ts` — `RESERVATION_STATUS_OPTIONS`,
`getReservationStatusLabel`, `canAdminCancelReservation`, `canAdminConfirmAttendance`.
**Poseban slučaj:** `CANCELLED_BY_CLIENT` + `cancelReason === 'Nije potvrđen dolazak u roku'` → ključ
`reservations.statuses.CANCELLED_UNCONFIRMED_ATTENDANCE`. Ovaj uslov je **dio paritetnog ugovora**.

### 1.2 `pages/ReservationsCalendar.tsx` + `features/reservations/components/ReservationScheduler.tsx` (1196 ln)

| # | Kontrola | Detalj |
|---|---|---|
| F1 | `DragAndDropCalendar` | `localizer`, `culture={localeKey}`, `toolbar={false}` (custom kontrole), `step={15}`, `timeslots={4}`, `dayLayoutAlgorithm="no-overlap"` |
| F2 | View-ovi | `month/week/day/agenda` → mapirani na `dayGridMonth/timeGridWeek/timeGridDay/agenda` |
| F3 | Navigacija po datumu | `onNavigate` → `props.onDateChange(d)` |
| F4 | Klik na slot | `onSelectSlot` → `openCreate(slot)` (drawer) |
| F5 | Klik na event | `onSelectEvent` → `openDetails(e.reservation)` |
| F6 | **Drag & drop** | `onEventDrop` → `props.onMoveRequest({ reservationId, reservationDate, startTime, endTime })` |
| F7 | **Resize** | `onEventResize` → `props.onResizeRequest(…)` |
| F8 | Drawer (create/details) | `DrawerContent side="right"`, `DialogTitle`, `DialogDescription` |
| F9 | Visina | `style={{ height: 'calc(100dvh - 260px)' }}` |

## 2. Inventar podataka

| Vrijednost | Izvor | Formatiranje |
|---|---|---|
| `reservationDate`, `startTime`, `endTime` | `/api/reservations` | `formatLocalizedDateTime` |
| Klijent | `getClientName(c)` = `firstName + lastName` ‖ `username` ‖ `'-'` | — |
| Usluga | `service.name` (+ `items[]` sa `sortOrder`, `serviceId`) | — |
| Frizer | `getListStylistName(stylist)` = ime ‖ `username` ‖ `t('…stylistFallback')`; bez stiliste → `t('…unconfirmedStylist')` | — |
| Iznos | `service.price`, `loyaltyDiscountPercent`, `loyaltyDiscountAmount`, `loyaltyPointsUsed` | `formatLocalizedAmount` |
| Status | `status` (+ `cancelReason`) | `getLocalizedReservationStatusLabel` |
| Prisustvo | `attendancePolicy` = `CLIENT_REQUIRED` \| `STAFF_WAIVED` | — |
| Stilističke reakcije | `stylistResponses[].status`, `rejectionReason` | — |
| `total`, `page`, `pageSize` | paginirani odgovor | — |

## 3. Dizajn izmjene

| # | Izmjena | WCAG |
|---|---|---|
| D1 | `PageHeader` + `FilterBar` + `DataTable` + `TablePagination` | 1.3.1, 2.4.6, 4.1.2 |
| D2 | `StatusBadge` (tekst + ikona + boja) umjesto samo boje | 1.4.1 |
| D3 | `aria-sort` na sortiranim kolonama (trenutno **nema** sortiranja u listi — provjeriti; ako ga nema, ➖) | 4.1.2 |
| D4 | Otkaz → `ConfirmDialog` sa razlogom (postojeći `ConfirmDialog` već podržava `reasonLabel`) umjesto ručnog `Dialog`+`Textarea` | 3.3.4 |
| D5 | Card prikaz tabele ispod 640px | 1.4.10 |
| D6 | **Kalendar:** custom toolbar sa `role="group"`, dugmad ≥44px; **agenda/lista kao ravnopravan prikaz**; `eventPropGetter` statusi dobijaju tekst+ikonu | 1.1.1, 2.5.8, 4.1.2 |
| D7 | **2.5.7:** pored drag&drop-a dodati dugme **„Promijeni termin“** u detaljima koje otvara postojeći create/reschedule drawer sa istim `onMoveRequest` payload-om. Drag&drop **ostaje** (ne uklanja se funkcionalnost). | 2.5.7 |
| D8 | Kalendar: `scroll-padding` i provjera da sticky header ne prekriva fokusirani event (2.4.11) | 2.4.11 |
| D9 | Socket refresh → najava kroz `role="status"` (npr. „Podaci osvježeni“) bez otimanja fokusa | 4.1.3 |
| D10 | Tokeni umjesto `slate-*`; `Search` ikona `text-slate-400` → `--text-muted` | 1.4.3 |

## 4. Razbijanje fajlova

```
features/reservations/
  ReservationScheduler.tsx (1196) →
    scheduler/scheduler-calendar.tsx      (< 150)
    scheduler/scheduler-toolbar.tsx
    scheduler/scheduler-event-content.tsx
    scheduler/scheduler-drawer-create.tsx
    scheduler/scheduler-drawer-details.tsx
    scheduler/use-scheduler-events.ts
    scheduler/scheduler-move-request.ts   ← zajednički payload za drag&drop I dugme
  reservation-list.tsx / reservation-table.tsx / use-reservation-list.ts
  status.ts, types.ts, reservation-list.api.ts  ← NETAKNUTO
```

## 5. WCAG stavke specifične za modul

1.1.1 · 1.3.1 · 1.4.1 · 1.4.3 · 1.4.10 · 2.1.1 · 2.1.2 (drawer) · **2.5.7** · 2.5.8 · **2.4.11** ·
3.3.4 (otkaz) · 4.1.2 (kalendar widget) · 4.1.3 (socket)

## 6. Rizici

| Rizik | Mitigacija |
|---|---|
| **Regresija FSM-a** preko `onMoveRequest`/`onResizeRequest` | isti payload, isti redoslijed polja; `reservation-list-api-contract` zelen; ne dirati `status.ts` |
| `react-big-calendar` nema a11y pristup | ne forsiramo tastaturu u RBC; alternativa = agenda/lista |
| 8 testova u modulu asertuje markup | `admin-calendar-drawer-accessibility`, `reservation-list-accessibility` — ažurirati uz obrazloženje |
| Bundle: `ReservationsCalendar` 95.1/125 KiB | bez novih zavisnosti; `react-big-calendar` ostaje lazy |
| Socket + live region = preglasno | jedan live region, debounce |

## 7. Testovi

**Postojeći:** `test:reservation-list-api-contract`, `test:reservation-list-accessibility`,
`test:admin-reservations-calendar-i18n`, `test:admin-calendar-drawer-accessibility`,
`test:admin-reservations-list-filters-i18n`, `test:admin-reservations-list-page-i18n`,
`test:admin-reservation-details-i18n`, `test:socket-recovery`.

**Novi:** `test:reservations-table-a11y` (caption/scope/data-label/jedinstvena imena),
`test:reservations-calendar-keyboard-alternative` (postoji list/agenda prikaz + dugme za premještanje),
`test:reservations-status-parity` (mapa status → label/badge ostaje ista).

## 8. Definition of Done

Standardni DoD + specifično:
- [ ] `reservation-list-api-contract` zelen bez izmjene
- [ ] Drag&drop i resize rade **i** postoji tastaturska alternativa (2.5.7)
- [ ] Sve statusne labele i badge mapiranje identični
- [ ] `ReservationsCalendar` chunk ≤ 125 KiB gzip

## 9. Obim

~16 fajlova (8 novih), 3–4 commita: lista → kalendar toolbar/event → drawer-i → 2.5.7 alternativa.
