---
name: Multi-service reservations + UX fixes
overview: Fix web dialog rendering, allow admin to create reservations even if client must change password, make stylist workbook usable on small screens, improve daily-log flow with gender-based service filtering, and implement a phased migration from single-service to multi-service reservations and daily-log entries with correct total duration/price calculations across web+mobile+backend.
todos:
  - id: dialog-scroll-fix
    content: Fix shared dialog rendering (scroll/z-index) and verify create-user modal.
    status: completed
  - id: admin-bypass-must-change
    content: Allow admin reservation creation even if client mustChangePassword, without weakening client flow.
    status: completed
  - id: stylist-workbook-mobile-nav
    content: Make stylist workbook navigation usable on small web screens.
    status: completed
  - id: dailylog-client-first-gender
    content: Daily-log client-first UX + gender-based service filtering + backend validation.
    status: completed
  - id: multi-service-reservations
    content: Implement multi-service reservations end-to-end (schema, API, web+mobile UI, availability).
    status: completed
  - id: multi-service-dailylog-billing
    content: Implement multi-service daily-log and update totals/tip/income calculations accordingly.
    status: completed
  - id: cleanup-dead-code-helpers
    content: Remove dead code encountered and introduce private helpers where complexity grows.
    status: completed
isProject: false
---

## Goals
- Web: dijalozi/modal-i se renderuju ispravno (posebno forma `Novi korisnik`).
- Web: admin može dodati manuelno termine/rezervacije bez blokade `MUST_CHANGE_PASSWORD` za *klijenta*.
- Web: Stylist workbook vidljiv i navigabilan na mobilnim ekranima.
- Mobile (stylist): daily-log prvo bira klijenta, zatim se servisi filtriraju po spolu (i obratno), uz backend validaciju.
- Cijela aplikacija: rezervacija podržava **više servisa**; trajanje i cijena su **suma** svih servisa. Isti princip u daily-logu (više servisa).

## Non-goals / constraints
- Global rule `MUST_CHANGE_PASSWORD` ostaje za self-service rezervacije; bypass je **samo** za admin endpoint.
- Multi-service loyalty: primijeniti na **sumu cijena** uz cap percent (po tvojoj potvrdi).
- Data model: join table za reservation + join table za daily-log (po tvojoj potvrdi).

## Phase 0 — Baseline audit + “dead code” cleanup protocol
- Proći kroz izmijenjene dijelove i:
  - ukloniti jasno neiskorišten / “deadly-code” (nepozvane funkcije, zastarjeli DTO fieldovi, dupli helpers).
  - gdje god logika postaje kompleksnija uvesti privatne helper funkcije (npr. `computeTotalDurationMinutes`, `computeTotalPrice`, `assertClientCanBookServices`).

## Phase 1 — Web dialogs render fix (Create User)
- Update shared dialog styles u `[frontend/src/components/ui/dialog.tsx](frontend/src/components/ui/dialog.tsx)`:
  - dodati scroll-safety: `max-h-[90dvh] overflow-y-auto` na `DialogContent` (ili kao default, ili kroz utility prop).
  - po potrebi povećati z-index (ako postoje kolizije sa popover/dropdown slojevima).
- Provjeriti `Novi korisnik` dialog u `[frontend/src/pages/Users.tsx](frontend/src/pages/Users.tsx)` i po potrebi dodati `max-h`/`overflow` na sam `DialogContent` ako ne želimo globalni change.

## Phase 2 — Admin manual reservation bypass for MUST_CHANGE_PASSWORD
- Backend: refaktor u `[backend/src/reservations/reservations.service.ts](backend/src/reservations/reservations.service.ts)`:
  - izdvojiti internu metodu (npr. `createInternal(dto, clientId, opts)`), gdje je `opts.ignoreMustChangePassword`.
  - `create()` koristi `ignoreMustChangePassword=false` (postojeće ponašanje ostaje).
  - `createByAdmin()` koristi `ignoreMustChangePassword=true`.
- Ostaviti postojeće guard-ove na `POST /api/reservations/admin` u `[backend/src/reservations/reservations.controller.ts](backend/src/reservations/reservations.controller.ts)` kao sigurnosnu granicu.
- Frontend: u `[frontend/src/pages/ReservationsCalendar.tsx](frontend/src/pages/ReservationsCalendar.tsx)` ostaviti poziv, ali poboljšati poruku za admin ako backend vrati i druge validacije.

## Phase 3 — Stylist workbook vidljiv na web “mobile” screenovima
- U `[frontend/src/layouts/StylistLayout.tsx](frontend/src/layouts/StylistLayout.tsx)` zamijeniti `nav className="hidden sm:flex"` mobilnom varijantom:
  - `sm:flex` desktop nav ostaje.
  - na `sm:hidden` dodati ili:
    - Drawer/hamburger koji mapira `navItems`, ili
    - horizontal scroll nav (`overflow-x-auto whitespace-nowrap`).
- Osigurati da rute iz `[frontend/src/app/router.tsx](frontend/src/app/router.tsx)` ostaju iste (`/stylist/workbook...`).

## Phase 4 — Daily-log: client-first + gender-based service mapping (mobile + backend)
- Backend: proširiti `GET /api/users/for-daily-log` da vraća i `gender`:
  - `[backend/src/users/users.service.ts](backend/src/users/users.service.ts)` dodati `gender` u `select`.
  - update mobilni tip `ClientOption` u `[mobile/src/types/index.ts](mobile/src/types/index.ts)` i usage u `[mobile/src/screens/stylist/DailyLogNewEntryScreen.tsx](mobile/src/screens/stylist/DailyLogNewEntryScreen.tsx)`.
- Mobile UI: u `[mobile/src/screens/stylist/DailyLogNewEntryScreen.tsx](mobile/src/screens/stylist/DailyLogNewEntryScreen.tsx)`:
  - promijeniti redoslijed: prvo picker klijenta, zatim servisa.
  - implementirati filtering:
    - nakon izbora klijenta: prikazati samo servise gdje `service.gender === client.gender`.
    - opcionalno: nakon izbora servisa filtrirati klijente po `gender`.
  - blokirati submit ako je `client.gender` null (ili prikazati jasnu grešku).
- Backend hard validation: u `[backend/src/daily-log/daily-log.service.ts](backend/src/daily-log/daily-log.service.ts)`:
  - ako `clientId` postoji: učitati `client.gender` + `service.gender` i baciti `GENDER_REQUIRED`/`SERVICE_GENDER_MISMATCH` analogno rezervacijama.

## Phase 5 — Multi-service reservations (DB → API → UI) with incremental compatibility
### 5.1 Prisma schema + migration
- U `[backend/prisma/schema.prisma](backend/prisma/schema.prisma)`:
  - dodati `ReservationServiceItem` join model (reservationId, serviceId, sortOrder, optional snapshots).
  - dodati `DailyLogEntryServiceItem` join model (dailyLogEntryId, serviceId, sortOrder, optional snapshots).
  - na `Reservation` dodati `items: ReservationServiceItem[]`.
  - na `DailyLogEntry` dodati `items: DailyLogEntryServiceItem[]`.
  - privremeno zadržati `Reservation.serviceId` i `DailyLogEntry.serviceId` za backwards-compat, ali uvoditi helpers da novi kod preferira `items` kad postoje.
- Write data migration:
  - za postojeće rezervacije: kreirati 1 item iz `Reservation.serviceId`.
  - za postojeće daily-log entry-je: kreirati 1 item iz `DailyLogEntry.serviceId`.

### 5.2 Backend DTO + service logic
- DTO promjene:
  - `[backend/src/reservations/dto/create-reservation.dto.ts](backend/src/reservations/dto/create-reservation.dto.ts)`: `serviceIds: string[]` (min 1).
  - `[backend/src/reservations/dto/admin-create-reservation.dto.ts](backend/src/reservations/dto/admin-create-reservation.dto.ts)`: `serviceIds: string[]`.
- Availability:
  - `[backend/src/reservations/availability.service.ts](backend/src/reservations/availability.service.ts)` promijeniti API da prima `serviceIds` i računa `totalDurationMinutes = sum(durationMinutes)`.
  - Filtriranje stilista: samo oni koji imaju sve odabrane servise (intersection na `StylistService`).
- Reservation create:
  - `[backend/src/reservations/reservations.service.ts](backend/src/reservations/reservations.service.ts)`:
    - validirati gender za svaki servis.
    - upisati reservation + items u transakciji.
    - events/notifications uključiti listu servisa.
- Loyalty:
  - prilagoditi redeem/calc da koristi sumu cijena (cap percent = min preko servisa ili globalni cap). (Treba mapirati gdje se loyalty računa prije izmjena.)

### 5.3 Frontend + mobile booking flows
- Web public booking `[frontend/src/pages/public/PublicReserve.tsx](frontend/src/pages/public/PublicReserve.tsx)`:
  - service selector → multi-select.
  - availability calls → `serviceIds`.
  - UI summary: lista servisa + suma trajanja + suma cijena.
- Web admin scheduler `[frontend/src/features/reservations/components/ReservationScheduler.tsx](frontend/src/features/reservations/components/ReservationScheduler.tsx)`:
  - create drawer → multi-select servisa.
  - auto endTime based on total duration (da admin ne pogađa ručno).
- Mobile client reservations `[mobile/src/screens/client/ReservationScreen.tsx](mobile/src/screens/client/ReservationScreen.tsx)`:
  - multi-select servisa + availability request update.
- Types:
  - update reservation shapes u `[frontend/src/features/reservations/types.ts](frontend/src/features/reservations/types.ts)` i `[mobile/src/types/index.ts](mobile/src/types/index.ts)` da izlažu `items[]` + computed totals.

## Phase 6 — Multi-service daily-log + totals for billing/tip
- Mobile stylist daily-log entry:
  - umjesto `serviceId` omogućiti izbor **više servisa** (multi-select) nakon odabira klijenta.
  - ukupno za naplatu = suma cijena svih servisa.
- Backend daily-log create:
  - DTO: `serviceIds: string[]` ili `items`.
  - Validacija: svaki servis mora matchati client.gender.
  - Persist: `DailyLogEntry` + `DailyLogEntryServiceItem[]`.
- Stylist portal (web) min charge/tip:
  - update `computeMinCharge` u `[frontend/src/features/stylist-portal/pages/stylist-reservation-detail-page.tsx](frontend/src/features/stylist-portal/pages/stylist-reservation-detail-page.tsx)` da koristi sumu cijena.
- Income book manual entries:
  - ako se oslanja na “single service price” za split base/tip, refaktor da koristi sumu cijena (ili traži explicit base/tip input) za multi-service kontekst.

## Phase 7 — Analytics + queries that group by `Reservation.serviceId`
- Pretražiti backend servise koji rade agregacije po `Reservation.serviceId` (npr. “most popular service”) i prebaciti na join tabelu.
- Ažurirati sve response mape/serializacije da vraćaju listu servisa.

## Test strategy (targeted)
- Backend unit tests:
  - `reservations.service.spec.ts`: admin create should not throw `MUST_CHANGE_PASSWORD`.
  - new tests for multi-service total duration + stylist eligibility intersection.
  - daily-log gender mismatch rejection.
- Smoke flows:
  - web: create user modal on small viewport.
  - web: admin create reservation for client with mustChangePassword=true.
  - mobile: daily-log client-first and service filtering.
  - booking (web+mobile): create reservation with 2–3 services and verify endTime + displayed totals.

## Risks / rollout
- Prefer incremental compatibility: keep old `serviceId` fields during transition and make API accept both (temporarily) if needed, then remove in cleanup phase.
- Data migrations must be idempotent and safe for existing prod data.
