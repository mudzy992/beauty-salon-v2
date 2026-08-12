# Modul rezervacija — kompletna dokumentacija (policy-aware)

**Datum:** 2026-08-11  
**Scope:** Backend NestJS + Web (Vite/React) + Mobile (Expo) + utjecaj na dnevnu knjigu i finansije (KIF/dugovi/loyalty).  
**Source of truth (kod):** `backend/src/reservations/*`, Prisma `Reservation*`, matrice u `.cursor/docs/matrices/` i `.cursor/docs/stylist-reservation-matrix.md`.

Povezani dokumenti:

| Dokument | Sadržaj |
|----------|---------|
| [HANDOFF.md](./HANDOFF.md) | Nastavak rada (sljedeća sesija) |
| [FINDINGS.md](./FINDINGS.md) | Bugovi, nedostaci, prijedlozi |
| [MOBILE_SOCKETIO.md](./MOBILE_SOCKETIO.md) | Plan uvođenja Socket.IO na mobile |
| [../matrices/reservations/MATRIX.md](../matrices/reservations/MATRIX.md) | Sažeta status/akcija matrica |
| [../stylist-reservation-matrix.md](../stylist-reservation-matrix.md) | Overrun / reorder / auto-start |
| [../matrices/daily-log/MATRIX.md](../matrices/daily-log/MATRIX.md) | Dnevna knjiga |
| [../matrices/finance/MATRIX.md](../matrices/finance/MATRIX.md) | KIF/KUF |
| [../matrices/client-debts/MATRIX.md](../matrices/client-debts/MATRIX.md) | Dugovi + `payDebtsIntent` |

---

## 1. Svrha modula

Rezervacije su **glavni poslovni tok** aplikacije: klijent bira usluge i termin → stilisti odgovaraju (lock/accept/reject) → klijent potvrđuje dolazak → stilist vodi termin (start / overrun / reorder) → naplata kroz dnevnu knjigu → knjiženje u KIF + loyalty + eventualni dugovi.

---

## 2. Podaci (Prisma)

### 2.1 `Reservation`

Ključna polja:

| Polje | Značenje |
|-------|----------|
| `clientId`, `serviceId` | Klijent; primarni/legacy servis |
| `items[]` (`ReservationServiceItem`) | Multi-service lista (snapshot redoslijeda) |
| `reservationDate`, `startTime`, `endTime` | Datum + `HH:mm` stringovi |
| `status` | FSM status (string, ne Prisma enum) |
| `bookingOrigin` / `acceptanceMode` / `attendancePolicy` | Policy sloj koji razlikuje standardni tok od direct staff bookinga |
| `createdByUserId` | Audit ko je kreirao staff booking |
| `confirmedStylistId` | Stilist koji je ACCEPTED ili direktno dodijeljen |
| `attendanceConfirmedAt` | Vrijeme potvrde dolaska |
| `attendanceConfirmedBy` / `attendanceWaivedAt` / `attendanceWaivedByUserId` | Trag attendance odluke |
| `startedAt` / `completedAt` / `cancelledAt` / `cancelReason` | Lifecycle trag |
| `rescheduleProposedStartTime/EndTime`, `rescheduleStatus` | PENDING \| ACCEPTED \| DECLINED |
| `delayNotifiedAt` | Jednokratno delay upozorenje |
| `useBreakAfterOverrun` | Stilist bira apsorpciju pauze |
| `loyaltyDiscountPercent/Amount`, `loyaltyPointsUsed` | Informativni redeem snapshot |
| `payDebtsIntent` | Klijent želi platiti i OPEN dugove pri dolasku |
| `publicReferenceCode` | Javni kod (email/UI) |
| `clientViewToken` | Token za javni web pregled `/termin/:token` |

### 2.2 `ReservationStylistResponse`

Po rezervaciji × stilistu koji nudi **sve** tražene usluge:

| `status` | Značenje |
|----------|----------|
| `PENDING` | Još nije odgovorio |
| `LOCKED` | Trenutno drži lock (TTL) |
| `ACCEPTED` | Prihvatio (postaje `confirmedStylistId`) |
| `REJECTED` | Odbio (razlog po želji) |

Samo **jedan** stilist može biti `LOCKED` u isto vrijeme.

---

## 3. FSM statusi

Definirano u `backend/src/reservations/constants.ts` (`RESERVATION_STATUS`, `RESERVATION_TRANSITIONS`).  
Enforcement: `assertReservationTransition` (`transitionTo` u `reservations.service`, te DK complete/revert).

```
PENDING
  → STYLIST_REVIEW | CANCELLED_BY_CLIENT | CANCELLED_BY_STYLISTS(admin)

STYLIST_REVIEW
  → CONFIRMED | CANCELLED_BY_STYLISTS | CANCELLED_BY_CLIENT

CONFIRMED
  → ATTENDANCE_CONFIRMED | CANCELLED_* | NO_SHOW | IN_PROGRESS(auto-start)

ATTENDANCE_CONFIRMED
  → IN_PROGRESS | NO_SHOW | CANCELLED_BY_CLIENT | CANCELLED_BY_STYLISTS(admin) | COMPLETED(DK)

IN_PROGRESS
  → COMPLETED(DK) | CANCELLED_BY_STYLISTS

COMPLETED
  → IN_PROGRESS (DK revert)

CANCELLED_* / NO_SHOW → (terminalno)
```

---

## 4. Konfiguracija salona (`SalonSettings`)

| Polje | Default (seed/create) | Uloga |
|-------|----------------------|--------|
| `pauseBetweenServices` | 10 min | Grid slotova + overrun apsorpcija |
| `cancellationDeadlineHours` | 24 | Rok klijentskog otkazivanja prije starta |
| `maxCancellationsBeforePenalty` | (salon) | Prag za penalizaciju |
| `penaltyDurationDays` | 30 | Trajanje zabrane bookinga |
| `reservationLockMinutes` | 15 | TTL lock-a stilista |

Attendance prozor / timeout je trenutno **hardkodiran na 24h** (nije salon setting).

---

## 5. Dostupnost (Availability Engine)

**Fajlovi:** `availability.service.ts`, `utils/time-slot.utils.ts`

### 5.1 Dostupni datumi — `GET /api/reservations/availability/dates`

Ulaz: `serviceId` **ili** `serviceIds` (CSV), `fromDate`, opcionalno `toDate` (default +30 dana).

Dan je `available: true` ako:

1. Nije praznik (`Holiday`)
2. Salon radi taj `dayOfWeek` (`salonWorkingHours`)
3. Postoji bar jedan aktivan stilist koji nudi **sve** tražene servise i radi taj dan (regular hours **ili** date override)

**Ne** provjerava da li su svi slotovi tog dana popunjeni — datum može biti “dostupan” a slots API vratiti praznu listu.

### 5.2 Slobodni termini — `GET /api/reservations/availability/slots`

1. Holiday / salon closed → `[]`
2. Generiše grid: `open → close` korakom `duration + pauseBetweenServices` (fiksni korak, ne rolling)
3. Filtrira prošle slotove ako je danas
4. Po stilistu: slot mora stati u stilistov radni prozor
5. Slot je zauzet ako postoji rezervacija koja se **preklapa** i (`confirmedStylistId` je null **ili** = taj stilist)

**Statusi koji blokiraju slot (`SLOT_OCCUPYING_STATUSES`):**

`CONFIRMED`, `ATTENDANCE_CONFIRMED`, `IN_PROGRESS`

`PENDING` i `STYLIST_REVIEW` **ne** zauzimaju slot (C2-B). Pri `stylistAccept` se provjerava overlap s već potvrđenim terminima istog stilista.

Realtime: `availability:changed` socket event nakon create/cancel itd.

---

## 6. Kreiranje rezervacije

### 6.1 Klijent — `POST /api/reservations`

Guards (client):

- Mora biti CLIENT, email verificiran, telefon, gender
- `mustChangePassword` blokira (osim admin create)
- Aktivna penalizacija (`penaltyUntil`) blokira
- Gender servisa mora odgovarati klijentu
- Slot mora biti u `getAvailableSlots` rezultatu
- Max **jedna aktivna** rezervacija po klijentu **po danu**

Tok:

1. Kreira `Reservation` status `PENDING` + `publicReferenceCode` + `clientViewToken`
2. Upisuje `ReservationServiceItem` za sve servise
3. Kreira `ReservationStylistResponse` (PENDING) za sve eligible stiliste
4. Push stilistima: `reservation_new`
5. Opcionalno loyalty redeem (`desiredLoyaltyPercent`)
6. Socket: `reservation:created`, `availability:changed`

Polja UI: `clientNotes`, `desiredLoyaltyPercent`, `payDebtsIntent`.

### 6.2 Admin — `POST /api/reservations/admin`

Admin sada eksplicitno bira `bookingMode`:

- `STANDARD` → isti tok kao klijentski booking (`PENDING`, inbox stilista, attendance obavezna)
- `STAFF_ADMIN_DIRECT` → odmah kreira `CONFIRMED + DIRECT_ASSIGN + STAFF_WAIVED` i traži `stylistProfileId`

Oba moda i dalje prolaze slot i working-hours validaciju. Admin create i dalje zanemaruje `mustChangePassword`.

### 6.3 Stylist direct — `POST /api/reservations/stylist/direct`

Stilist kreira dogovoreni termin samo za sebe:

- `bookingOrigin=STAFF_STYLIST`
- `acceptanceMode=DIRECT_ASSIGN`
- `attendancePolicy=STAFF_WAIVED`
- nema inbox redova ni fake `ATTENDANCE_CONFIRMED`

### 6.4 Admin update — `PATCH /api/reservations/:id`

Pomjera date/time; conflict check samo vs `CONFIRMED | ATTENDANCE_CONFIRMED | IN_PROGRESS`. **Ne** revalidira salon/stylist working hours.

---

## 7. Stilist odgovor (inbox)

Endpointi:

| Akcija | Endpoint |
|--------|----------|
| Lock | `POST /:id/stylist/:stylistProfileId/lock` |
| Accept | `POST /:id/stylist/:stylistProfileId/accept` |
| Reject | `POST /:id/stylist/:stylistProfileId/reject` |

### Lock

- Dozvoljeno iz `PENDING` / `STYLIST_REVIEW`
- Postavlja status rezervacije na `STYLIST_REVIEW`
- Atomarno: ostali lockovi se čiste; TTL = `reservationLockMinutes`
- Samo vlasnik `stylistProfile` (ili admin/owner role na ruti)

### Accept

- Zahtijeva vlastiti response u `LOCKED` i neistekao lock
- `CONFIRMED` + `confirmedStylistId`
- Notifikacija klijentu + socket `reservation:confirmed`

### Reject

- Iz `LOCKED` ili `PENDING`
- Ako nema više stilista koji mogu prihvatiti → `CANCELLED_BY_STYLISTS` + notifikacija klijentu

---

## 8. Potvrda dolaska (attendance)

`POST /:id/confirm-attendance` — samo vlasnik rezervacije, status mora biti `CONFIRMED` i `attendancePolicy=CLIENT_REQUIRED`.

### Pravilo (usklađeno kod ↔ dokumentacija)

Klijent potvrđuje dolazak **najkasnije 24h prije** starta (`ATTENDANCE_CONFIRM_DEADLINE_HOURS`).

| Trenutak | `confirmAttendance` | `processAttendanceDeadlines` |
|----------|---------------------|------------------------------|
| `now < start − 24h` | Dozvoljeno → `ATTENDANCE_CONFIRMED` | Ne dira |
| `now ≥ start − 24h` | Odbijeno (rok istekao) | Auto-cancel → `CANCELLED_BY_CLIENT` + penalty |

Prozor za potvrdu je otvoren od trenutka `CONFIRMED` do roka `T−24h`. Nakon uspješne potvrde: socket `reservation:updated`.

> **Napomena (fix 2026-08-11):** Ranije je guard bio invertovan (“najranije 24h”) i sudarao se s CRON-om — ispravljeno.

---

## 9. Tok termina (stylist runtime)

| Akcija | Endpoint | Ulazni status | Izlaz |
|--------|----------|---------------|-------|
| Start | `POST /:id/stylist-start` | `ATTENDANCE_CONFIRMED` ili `CONFIRMED + STAFF_WAIVED` | `IN_PROGRESS` |
| Complete (legacy, blokiran) | `POST /:id/stylist-mark-complete` | — | 400 — koristi DK |
| Complete (produkcijski) | `POST /api/daily-log/from-reservation/:id` pa complete dnevnog unosa | vidi §12 | rezervacija → `COMPLETED` pri complete DK |
| Cancel stilist | `POST /:id/stylist-cancel` | `CONFIRMED` \| `IN_PROGRESS` | `CANCELLED_BY_STYLISTS` |
| No-show | `POST /:id/stylist-no-show` | `CONFIRMED` \| `ATTENDANCE_CONFIRMED` | `NO_SHOW` (+ opcionalna kazna) |
| Use break | `POST /:id/use-break` | `IN_PROGRESS` | flag `useBreakAfterOverrun` |

### Start guards

- Mora biti ≥ planirani start
- Ne smije biti kasnije od planiranog end + 60 min
- Nema starije neobrađene rezervacije istog stilista istog dana
- Nema `rescheduleStatus = PENDING`

### Auto-start (CRON svake minute)

`autoStartUpcomingReservations`: za danas, prošao start, status `CONFIRMED` ili `ATTENDANCE_CONFIRMED`, max 24h staro, stilist nema drugi `IN_PROGRESS` → postavi `IN_PROGRESS`.

---

## 10. Overrun, reschedule, reorder

Detaljna matrica: `.cursor/docs/stylist-reservation-matrix.md`.

### Overrun modes (`propose` / `commit`)

1. `actual_overrun` — pomjeri buduće za stvarno kašnjenje  
2. `manual_minutes` — pomjeri za unesene minute  
3. `use_break_only` — ne pomjera buduće; koristi pauzu

**Napomena (L5):** Primarni UX put za `use_break_only` je `reschedule/commit` s `mode=use_break_only` (overrun modal → ReschedulePreview). Standalone `POST /:id/use-break` ostaje za eksplicitnu mid-session odluku; nije obavezan u overrun flow-u.
Opcionalno `includeBreaks` apsorbira kašnjenje u pauze.

`commit` → upis `rescheduleStatus=PENDING` + push `reservation_reschedule` s dinamičkim deadlineom:

`deadlineMinutes = min(30, floor(0.5 * minutesUntilTerm))` (≥ 1).

### Klijent odluka

| | Reschedule (overrun cascade) | Reorder |
|--|------------------------------|---------|
| Accept | Primijeni proposed times | Primijeni |
| Decline | `CANCELLED_BY_CLIENT` + penalty | Ostaje originalni slot, `DECLINED`, bez kazne |
| Timeout | Isto kao decline | Isto kao decline reorder |

### Reorder

`POST /:id/reorder/request` — stilist predlaže isti duration, drugi slot; klijent accept/decline preko istih `/reschedule/*` endpointa.

### Delay warning CRON

Za `IN_PROGRESS` gdje je `now − end ≥ pause/2` i `delayNotifiedAt` null:

- Ako `useBreakAfterOverrun` → samo označi notified
- Inače push `delay_warning` budućim klijentima **osim prvog sljedećeg** (`future.slice(1)`)

---

## 11. Otkazivanje i kazne

| Ko | Endpoint | Status rezultat | Penalty? |
|----|----------|-----------------|----------|
| Klijent | `POST /:id/cancel` | `CANCELLED_BY_CLIENT` | Da (`incrementCancellationCount`) |
| Admin | `POST /:id/admin-cancel` | `CANCELLED_BY_STYLISTS` | Ne |
| Stilist | `POST /:id/stylist-cancel` | `CANCELLED_BY_STYLISTS` | Ne |
| CRON attendance | interno | `CANCELLED_BY_CLIENT` | Da |
| Decline reschedule | interno | `CANCELLED_BY_CLIENT` | Da |
| No-show | `stylist-no-show` | `NO_SHOW` | Opcionalno (`applyPenalty`, default true) |

Klijentski cancel dozvoljen za: `PENDING`, `STYLIST_REVIEW`, `CONFIRMED`, `ATTENDANCE_CONFIRMED`, uz `cancellationDeadlineHours` prije starta.

Nakon dovoljno otkazivanja → `penaltyUntil` blokira nove rezervacije.

---

## 12. Dnevna knjiga ↔ rezervacija ↔ finansije

### 12.1 Kreiranje unosa iz rezervacije

`POST /api/daily-log/from-reservation/:reservationId`

Dozvoljeni statusi rezervacije: `COMPLETED` \| `ATTENDANCE_CONFIRMED` \| `IN_PROGRESS`  
Samo potvrđeni stilist. Jedan unos po rezervaciji.

Tok naplate (usklađeno s client-debts matricom):

1. Bazna cijena = suma `Service.price` iz items (minus `loyaltyDiscountAmount` sa rezervacije → `minCharge`)
2. Opcionalno `settledDebtIds` (OPEN dugovi klijenta) — `paidAmount` mora pokriti sumu dugova
3. `paidForServices = paidAmount − settledDebtsSum`
4. Tip / shortfall vs `minCharge`
5. `CREATE_DEBT` ako shortfall i `debtHandling=CREATE_DEBT`
6. Unos DK status **`PENDING`** (još nije KIF)
7. Settlement dugova → interne `DEBT_PAYMENT` stavke + KIF manual audit

`payDebtsIntent` sa bookinga: UI stilista defaultno predselektuje OPEN dugove; backend flag sam po sebi ne forsira settlement (**by design** — nema backend enforcement-a; stilist mora eksplicitno potvrditi dugove ili “namjerno ne naplaćujem” u complete dialogu).

### 12.2 Complete dnevnog unosa → KIF + COMPLETED rezervacija

Pri `DailyLogService.complete`:

1. DK `PENDING → COMPLETED`
2. Ako postoji `reservationId`: rezervacija → `COMPLETED` (ulaz: `IN_PROGRESS` ili `ATTENDANCE_CONFIRMED`)
3. `IncomeSyncService.addEntryFromDailyLog` → `IncomeBookEntry` (KIF)
4. Loyalty `earnFromDailyLog`

Formule (finance matrix):

- `IncomeBookEntry.amount = actualPrice − tipAmount`
- `IncomeBookEntry.tipAmount = tipAmount`
- Knjiga: `totalRevenue + totalTips` = stvarno naplaćeno

Zaključana KIF knjiga **blokira** complete / revert / soft-delete COMPLETED.

### 12.3 Revert / soft-delete

Ako se COMPLETED DK revertuje/briše:

- Briše KIF stavku + rekalkuliše totale
- Reverzija loyalty EARN/REDEEM (clamp ≥ 0)
- Dugovi: reopen SETTLED via `sourceEntryId` / briše OPEN kreiran iz unosa
- Rezervacija: `COMPLETED → IN_PROGRESS` (`revertReservationIfCompleted`)

### 12.4 Šta rezervacija **ne** radi direktno

- Ne piše KUF (rashodi)
- Ne otvara/zatvara IncomeBook mjesec
- Loyalty redeem na bookingu je **informativan** za KIF dok stilist ne unese `actualPrice` u DK

---

## 13. CRON poslovi (`reservation-delay.cron.ts`)

`@Cron('*/1 * * * *')` svake minute:

1. `processPendingRescheduleTimeouts`
2. `processAttendanceDeadlines`
3. Ako je bilo attendance cancel → `processAutoReordersAfterAttendanceCancellations`
4. Delay warning za overrun
5. (modul također pokreće) `autoStartUpcomingReservations` — vidi service

---

## 14. Realtime (Socket.IO)

| Event | Kada |
|-------|------|
| `reservation:created` | Nova rezervacija |
| `reservation:updated` | Opšte izmjene (npr. attendance) |
| `reservation:cancelled` | Otkaz |
| `reservation:confirmed` | Stilist accept |
| `reservation:stylist_response` | Lock/reject tok |
| `availability:changed` | Promjena dostupnosti |
| `notification:new` | Nova in-app notifikacija |

Admin lista i kalendar na webu slušaju reservation evente.  
**Mobile (2026-08-12):** `SocketProvider` u root layoutu; inbox, schedule, detail, My Reservations + Notifications tab; polling fallback (30s / 120s kad je spojen). Vidi [MOBILE_SOCKETIO.md](./MOBILE_SOCKETIO.md).

---

## 15. Notifikacije (push kinds)

| Kind | Primatelj | Svrha |
|------|-----------|-------|
| `reservation_new` | Stilisti | Nova rezervacija |
| `reservation_confirmed` | Klijent | Stilist prihvatio |
| `reservation_cancelled` | Klijent | Otkaz / timeout |
| `attendance_timeout_cancelled` | Klijent (u data) | Attendance CRON |
| `reservation_reschedule` | Klijent | Overrun cascade |
| `reservation_reorder` | Klijent | Reorder prijedlog |
| `delay_warning` | Budući klijenti | Kašnjenje |
| `stylist_reschedule_decision` | Stilist | Klijent odlučio |

Mobile deep-link obrađuje: `reservation_new` (inbox), `stylist_reschedule_decision` (detail), te klijentske: `reservation_confirmed`, `reservation_cancelled`, `attendance_timeout_cancelled`, `reservation_reschedule`, `reservation_reorder`, `delay_warning` → lista rezervacija s focusom. Push payload uvijek uključuje `kind` (+ `type`).

---

## 16. Web aplikacija

| Ruta | Uloga | Šta radi |
|------|-------|----------|
| `/rezervacija` | Klijent | 4-step booking (servisi → datum → slot → notes/loyalty/dugovi) |
| `/moje-rezervacije` | Klijent (auth) | Lista, cancel, confirm attendance, accept/decline reschedule |
| `/termin/:token` / `/moj-termin/:token` | Public | Read-only status (email link); link na Moje rezervacije kad je prijavljen |
| `/admin/reservations` | Admin | Lista, filteri, admin-cancel, socket refresh |
| `/admin/reservations/calendar` | Admin | Kalendar create/move/resize/cancel |
| `/stylist/inbox` | Stilist | Lock / accept / reject |
| `/stylist/schedule` (+ detail) | Stilist | Start, complete→DK, cancel, no-show, reorder, overrun |

**Nedostaje na webu za klijenta:** (H1 riješeno) ranije My Reservations / cancel / attendance / reschedule.

---

## 17. Mobilna aplikacija

### Klijent

| Screen | Akcije |
|--------|--------|
| Booking wizard | Multi-service, dates/slots, loyalty, payDebtsIntent |
| My Reservations | Cancel (`PENDING`/`STYLIST_REVIEW`/`CONFIRMED` — **bez** `ATTENDANCE_CONFIRMED`), confirm attendance, accept/decline reschedule, review nakon COMPLETED |

### Stilist

| Screen | Akcije |
|--------|--------|
| Inbox | Lock / accept / reject (+ debt warning) |
| Schedule | Lista dana, countdown aktivne |
| Detail | Start / complete→DK / cancel / no-show / reorder / overrun |
| Reschedule preview | propose + commit (3 moda) |

Inbox **nema** auto-refresh (schedule ima 30s polling).

---

## 18. API mapa (zaštićeno JWT osim public)

| Method | Path | Ko |
|--------|------|-----|
| POST | `/api/reservations` | Client |
| POST | `/api/reservations/admin` | Admin/Owner |
| GET | `/api/reservations` | Po roli |
| GET | `/api/reservations/:id` | Po roli |
| PATCH | `/api/reservations/:id` | Admin/Owner |
| GET | `/api/reservations/availability/dates` | Auth |
| GET | `/api/reservations/availability/slots` | Auth |
| GET | `/api/reservations/availability/debug` | Admin/Owner |
| POST | `/api/reservations/:id/cancel` | Client |
| POST | `/api/reservations/:id/admin-cancel` | Admin/Owner |
| POST | `/api/reservations/:id/confirm-attendance` | Client |
| POST | `.../stylist/:pid/lock\|accept\|reject` | Stylist+ |
| POST | `.../stylist-start\|stylist-cancel\|stylist-no-show\|stylist-mark-complete` | Stylist+ |
| POST | `.../reschedule/propose\|commit\|accept\|decline` | Stylist+ / Client |
| POST | `.../reorder/request` | Stylist+ |
| POST | `.../use-break` | Stylist+ |
| GET | `/api/public/reservations/by-token/:token` | Public |
| POST | `/api/daily-log/from-reservation/:id` | Stylist+ |

---

## 19. Testovi (postojeći)

`reservations.service.spec.ts` pokriva: create guards, cancel deadline, decline/timeout reschedule vs reorder, propose modes, accept conflict, reorder duration, auto-start, confirmAttendance 24h guard, attendance deadlines, auto-reorder.

`availability.service.spec.ts` pokriva uglavnom prazne/closed/holiday slučajeve.

Nedostajući testovi: vidi FINDINGS § Test gaps.

---

## 20. Scenariji end-to-end (happy + grane)

### S1 — Happy path (multi-service)

1. Klijent bookuje 2 servisa na slobodan slot  
2. Stilisti dobiju push; jedan lock → accept → `CONFIRMED`  
3. Klijent potvrdi dolazak → `ATTENDANCE_CONFIRMED`  
4. Stilist start → `IN_PROGRESS`  
5. Complete → DK PENDING → complete DK → rezervacija `COMPLETED` + KIF + loyalty earn  

### S2 — Svi stilisti odbiju

Reject zadnjeg → `CANCELLED_BY_STYLISTS` + notifikacija klijentu; slot se oslobađa.

### S3 — Attendance timeout

`CONFIRMED` bez potvrde nakon roka → CRON `CANCELLED_BY_CLIENT` + penalty + eventualni auto-reorder prijedlozi za kasnije `ATTENDANCE_CONFIRMED` termine istog stilista.

### S4 — Overrun cascade

IN_PROGRESS kasni → stilist commit reschedule → klijenti PENDING → accept pomjera / decline otkazuje s kaznom / timeout isto.

### S5 — Reorder

Stilist predloži raniji slot → klijent decline → original ostaje; timeout → DECLINED bez kazne.

### S6 — No-show

Stilist označi no-show (+/− kazna) → `NO_SHOW`; nema DK/KIF.

### S7 — Dugovi + loyalty

Klijent bookuje s `payDebtsIntent` + redeem bodova → stilist pri complete selektuje dugove → split SERVICE + DEBT_PAYMENT → KIF.

### S8 — Admin pomjeranje

Admin drag na kalendaru → PATCH; može postaviti van radnog vremena (nema revalidacije hours).

### S9 — Penalizacija

Dovoljno otkazivanja → `penaltyUntil` → create odbija novi booking.

### S10 — Public token

Email link `/termin/:token` → read-only status + prikaz pending reschedule (akcija samo na mobilnoj).

---

## 21. Fajlovi (mapa)

```
backend/src/reservations/
  reservations.service.ts      # ~2300 linija — jezgro FSM
  availability.service.ts
  reservation-delay.cron.ts
  reservation-date.service.ts
  reservations.controller.ts
  public-reservations.controller.ts
  constants.ts
  dto/*, utils/*

frontend/src/
  pages/Reservations.tsx, ReservationsCalendar.tsx
  pages/public/PublicReserve.tsx, PublicReservationView.tsx
  features/reservations/*, features/stylist-portal/*

mobile/src/screens/
  client/ReservationScreen.tsx, MyReservationsScreen.tsx
  stylist/StylistInboxScreen.tsx, StylistScheduleScreen.tsx
  stylist/StylistReservationDetailScreen.tsx, ReschedulePreviewScreen.tsx
```

---

*Kraj AS-IS dokumentacije. Za bugove i roadmap vidi FINDINGS.md.*
