---
name: admin-reservations-fullscreen-calendar
overview: Uvesti full-screen interaktivni admin kalendar za rezervacije kao reusable komponentu, te ga izložiti kroz novu rutu `/admin/reservations/calendar` uz punu podršku za month/week/day, kreiranje termina, drag&drop/resize, prikaz po stilistima, status boje i conflict/availability validaciju.
todos:
  - id: research-backend-contracts
    content: Mapirati očekivane payload-e i error modele za create/update (409 conflict) i dogovoriti fallback ako endpoint nedostaje.
    status: completed
  - id: add-admin-calendar-route
    content: Dodati novu admin rutu `/admin/reservations/calendar` i page komponentu `ReservationsCalendar.tsx`.
    status: completed
  - id: build-reusable-scheduler
    content: Implementirati reusable `ReservationScheduler` wrapper oko FullCalendar (views, resources, selection, DnD, resize, status styling, i18n).
    status: completed
  - id: wire-data-fetching
    content: U `ReservationsCalendar` implementirati range-based fetch rezervacija + fetch stilista, mapiranje u event/resource, i mutations za create/move/resize.
    status: completed
  - id: integrate-drawer-details-form
    content: Dodati drawer za details + create/edit form, re-use existing detail UI i cancel akciju.
    status: completed
  - id: manual-qa
    content: "Proći test plan: navigacija, views, create, DnD/resize, conflict rollback, dark mode, i18n."
    status: completed
isProject: false
---

## Cilj
Implementirati **reusable** komponentu full-screen kalendara za admin rezervacije i integrisati je u admin shell kao **posebnu rutu**. Kalendar mora podržati:
- Month/Week/Day prikaze + navigaciju
- Kreiranje rezervacije (klik ili drag-select) → otvara formu
- Drag & drop reschedule + resize trajanja
- Prikaz po stilistima (resources) + filtriranje
- Boje po statusu + legenda
- Conflict/availability validaciju (blokirati overlap i jasno objasniti)

## Predložena tehnologija
- **Primarno**: `@fullcalendar/react` + `@fullcalendar/daygrid` + `@fullcalendar/timegrid` + `@fullcalendar/interaction` + (po potrebi) `@fullcalendar/resource-timegrid`
  - Razlog: pokriva selection, drag/drop, resize, week/day time grid, month view i resource scheduling sa minimalno custom koda.
- **Fallback** (ako FullCalendar ne prođe): custom scheduler je značajno veći zahvat; u tom slučaju plan se mijenja (grid/time ruler + DnD + virtualizacija).

## UX/IA (kako korisnik koristi kalendar)
- Nova ruta: `[frontend/src/app/routes/admin.routes.tsx](frontend/src/app/routes/admin.routes.tsx)` dobija child rutu `reservations/calendar`.
- Na `[frontend/src/pages/Reservations.tsx](frontend/src/pages/Reservations.tsx)` dodati CTA dugme “Kalendar” koje vodi na novu rutu.
- Full-screen page layout:
  - **Top bar**: back link na listu, naslov, picker za stiliste (All + multi-select), status filter, “Today”, prev/next, view switch (Month/Week/Day).
  - **Main**: FullCalendar.
  - **Right drawer / dialog**: detalji rezervacije + akcije (cancel), i forma za create/edit.

## Reusable komponenta (obavezno izdvajanje)
Kreirati novu komponentu, npr.:
- `[frontend/src/features/reservations/components/ReservationScheduler.tsx](frontend/src/features/reservations/components/ReservationScheduler.tsx)`

### Public API (props) – predlog
Komponenta treba biti reusable i ne vezati se direktno za `Reservations.tsx` state.
- **data**
  - `reservations: Reservation[]`
  - `stylists: StylistProfile[]`
  - `loading: boolean`
- **range & view**
  - `initialView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'`
  - `date: Date`
  - `onDateChange(next: Date): void`
- **resources**
  - `selectedStylistIds: string[]`
  - `onSelectedStylistIdsChange(ids: string[]): void`
- **actions (async)**
  - `onCreateRequest(payload: { reservationDate: string; startTime: string; endTime: string; stylistId?: string | null }): Promise<void>`
  - `onMoveRequest(payload: { reservationId: string; reservationDate: string; startTime: string; endTime: string; stylistId?: string | null }): Promise<void>`
  - `onResizeRequest(payload: { reservationId: string; reservationDate: string; startTime: string; endTime: string }): Promise<void>`
  - `onOpenDetails(reservationId: string): void` (ili vraćati klik event)
- **validation**
  - `validateChange(payload): Promise<{ ok: boolean; reason?: string }>` ili sinhrono `canMove` + server potvrda

Napomena: `Reservation` shape već postoji u `Reservations.tsx` (id, reservationDate, startTime, endTime, status, client, service, confirmedStylist). To se re-use-uje u shared types fajlu (da se izbjegne dupliranje).

## Data sloj (fetch + mapiranje)
### Potrebni upiti
- **Rezervacije za range**: već postoji `GET /api/reservations` sa `fromDate`/`toDate` u `Reservations.tsx`.
  - Scheduler mora raditi “range-based”: kad se promijeni view/date, izračunati `fromDate/toDate` i reload.
- **Stilisti**: `GET /api/stylists` (već korišteno u `Stylists.tsx`). Za scheduler je poželjno dobaviti sve aktivne stiliste (možda `pageSize: 300` + filter `isActive`).

### Mapiranje u FullCalendar event/resource
- **Event**:
  - `id`: reservation.id
  - `title`: kombinacija `service.name` + `client` (kratko)
  - `start/end`: `reservationDate + startTime/endTime` (lokalna zona, bez implicitnog UTC pomjeranja)
  - `resourceId`: `confirmedStylist.id` (ako postoji), inače u “Unassigned” kolonu (ako podržimo pseudo-resource)
  - `extendedProps`: status, raw reservation, pricing/loyalty (po potrebi)
- **Resource**:
  - `id`: stylist.id
  - `title`: stylist user name (first/last/username)

## Full-screen + drawer/dialog za forme
- Kalendar je full-page (ruta), ali edit/create panel treba biti “app-like”:
  - Desktop: `Drawer` desno (`[frontend/src/components/ui/drawer.tsx](frontend/src/components/ui/drawer.tsx)`), širina ~360–420px.
  - Mobile: isti `Drawer` kao full-width.
- Panel modes:
  - **Details**: koristi postojeći detail UI iz `Reservations.tsx` (status badge, client/service, cancel).
  - **Create/Edit**: minimalna forma (datum, start/end, stylist, service, client notes; opcionalno client/service lookup ako admin create to podržava).

## Interakcije i pravila
### 1) Klik/drag-select → create
- U week/day view: selection pravi start/end.
- Otvori create drawer sa prefill:
  - date, start/end, stylistId (ako selection u resource koloni)
- Submit poziva `onCreateRequest` (POST) i na success invalidira refetch za trenutni range.

### 2) Drag & drop → reschedule
- On `eventDrop`: optimistički pomjeriti UI, ali odmah pozvati `validateChange` (ili direktno `onMoveRequest`).
- Ako server vrati konflikt: rollback event na staro + toast reason.

### 3) Resize → duration change
- On `eventResize`: isto kao move.

### 4) Conflict/availability validacija
- Minimum:
  - Lokalno blokirati obvious invalid: end <= start, van radnog vremena (ako ga imamo), past (po pravilima).
  - Server je izvor istine: ako update endpoint vrati 409/400 sa porukom, prikazati toast i rollback.
- Ako imate endpoint za provjeru dostupnosti (slično public: `/api/reservations/availability/slots`), možemo ga koristiti za “pre-check” prije submit.

### 5) Status boje + legenda
- Re-use `getStatusBadgeVariant` logiku iz `Reservations.tsx` za consistent mapping.
- FullCalendar event styling:
  - `eventClassNames` po statusu: `bg-... text-... border-...` uz Tailwind
  - Dodati legendu u header (CONFIRMED, PENDING, CANCELLED, ...)

## i18n + lokalizacija
- Kalendar UI na BS/EN:
  - koristiti `useTranslation()` i mapirati FullCalendar buttonText/locale.
  - Ako ne uvedemo fullcalendar locales paket odmah, minimalno: custom `buttonText` i `weekText` i `allDayText`.

## Tačne izmjene po fajlovima
- `[frontend/src/app/routes/admin.routes.tsx](frontend/src/app/routes/admin.routes.tsx)`
  - Dodati `ReservationsCalendarPage` rutu `reservations/calendar`.
- `[frontend/src/pages/Reservations.tsx](frontend/src/pages/Reservations.tsx)`
  - Dodati CTA button/link ka `/admin/reservations/calendar`.
- Novi page:
  - `[frontend/src/pages/ReservationsCalendar.tsx](frontend/src/pages/ReservationsCalendar.tsx)`
    - Drži data fetching (reservations for visible range + stylists) i prosljeđuje u reusable scheduler.
- Novi reusable:
  - `[frontend/src/features/reservations/components/ReservationScheduler.tsx](frontend/src/features/reservations/components/ReservationScheduler.tsx)`
    - FullCalendar config, views, resources, event handlers, drawer open/close.
- Shared types/helpers:
  - `[frontend/src/features/reservations/types.ts](frontend/src/features/reservations/types.ts)` (Reservation, ReservationClient, helper za date-time compose/parse)
  - `[frontend/src/features/reservations/status.ts](frontend/src/features/reservations/status.ts)` (status label + color mapping, re-used u listi i kalendaru)

## Dependency promjene
U `frontend/package.json` dodati FullCalendar pakete:
- `@fullcalendar/react`
- `@fullcalendar/daygrid`
- `@fullcalendar/timegrid`
- `@fullcalendar/interaction`
- (ako resource view treba odmah) `@fullcalendar/resource-timegrid`

## Test plan (manual)
- Navigacija: `/admin/reservations` → klik “Kalendar” → otvori se `/admin/reservations/calendar`.
- Views: month/week/day rade, today/prev/next rade.
- Resources: filtriranje stilista mijenja kolone; eventi se mapiraju na odgovarajućeg stilistu.
- Create: select slot → create → event se pojavi bez refresh-a stranice.
- Drag/drop: valid move radi; invalid/conflict rollback + toast poruka.
- Resize: isto.
- Status boje: sve status varijante prikazane korektno.
- Dark mode: background/grid/text kontrast i hover states.

## Rizici / otvorene tačke (sa default rješenjem)
- **Backend endpointi**: ti kažeš da postoje update + create, ali ako neki fali, frontend će biti spreman za:
  - `POST /api/reservations` (admin create)
  - `PATCH /api/reservations/:id` (update reservationDate/startTime/endTime/confirmedStylistId)
  - Standardizovan error payload za konflikt (npr. 409 + message).
- **Timezone**: koristiti lokalno spajanje `YYYY-MM-DD` + `HH:mm` bez implicitnog UTC; FullCalendar koristiti `timeZone='local'`.
