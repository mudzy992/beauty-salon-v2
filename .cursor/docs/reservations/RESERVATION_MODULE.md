# Modul rezervacija — kompletna dokumentacija (policy-aware)

**Datum:** 2026-08-13 (sync s kodom)  
**Scope:** Backend NestJS + Web (Vite/React) + Mobile (Expo) + utjecaj na dnevnu knjigu i finansije (KIF/dugovi/loyalty).  
**Source of truth (kod):** `backend/src/reservations/*`, Prisma `Reservation*`, matrice u `.cursor/docs/matrices/` i `.cursor/docs/stylist-reservation-matrix.md`.  
**Napomena:** Ovaj dokument je **living AS-IS**. Review snapshot od 2026-08-11 + FINDINGS FIXED + direct booking (`AWAITING_DAILY_LOG`) su ovdje usklađeni. Arhiva nalaza: [FINDINGS.md](./FINDINGS.md). Aktivni product backlog: [POLICY_BACKLOG.md](./POLICY_BACKLOG.md).

Povezani dokumenti:

| Dokument | Sadržaj |
|----------|---------|
| [POLICY_BACKLOG.md](./POLICY_BACKLOG.md) | Policy tačke: Ask → Plan mode → odobrenje → Agent (jedna po sesiji) |
| [HANDOFF_SESSION.md](./HANDOFF_SESSION.md) | Session handoff 2026-08-13 (backlog zatvoren; attendance-policy A3 done) |
| [HANDOFF.md](./HANDOFF.md) | Snapshot: direct booking auto DK + disposition (2026-08-12) |
| [FINDINGS.md](./FINDINGS.md) | Arhiva review nalaza (FIXED / BY DESIGN) |
| [MOBILE_SOCKETIO.md](./MOBILE_SOCKETIO.md) | Mobile Socket.IO AS-IS |
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
Enforcement: `assertReservationTransition` (svi status update putovi + DK complete/revert).  
Sažeta matrica: [MATRIX.md](../matrices/reservations/MATRIX.md).

### 3.1 Standardni tok (klijent / inbox)

```
PENDING
  → STYLIST_REVIEW | CANCELLED_BY_CLIENT | CANCELLED_BY_STYLISTS(admin)

STYLIST_REVIEW
  → CONFIRMED | CANCELLED_BY_STYLISTS | CANCELLED_BY_CLIENT

CONFIRMED
  → ATTENDANCE_CONFIRMED | CANCELLED_* | NO_SHOW

ATTENDANCE_CONFIRMED
  → IN_PROGRESS | NO_SHOW | CANCELLED_BY_CLIENT | CANCELLED_BY_STYLISTS(admin) | COMPLETED(DK)

IN_PROGRESS
  → COMPLETED(DK) | CANCELLED_BY_STYLISTS

COMPLETED
  → IN_PROGRESS (DK revert)

CANCELLED_* / NO_SHOW → (terminalno)
```

### 3.2 Direktni staff tok (`DIRECT_ASSIGN` + `STAFF_WAIVED`)

```
CONFIRMED (create)
  → IN_PROGRESS (stylist-start / auto-start)
  → AWAITING_DAILY_LOG (CRON poslije endTime + seed PENDING DK)
  → NO_SHOW | CANCELLED_BY_STYLISTS

AWAITING_DAILY_LOG
  → COMPLETED (DK complete)
  → CONFIRMED (disposition reorder — novi datum/vrijeme, bez klijentskog propose)
  → CANCELLED_BY_CLIENT | CANCELLED_BY_STYLISTS | NO_SHOW (disposition)
```

`AWAITING_DAILY_LOG` **ne** zauzima slot i nije na stilistovom rasporedu (termin je već “prošao” u DK).

---

## 4. Konfiguracija salona (`SalonSettings` + settings registry)

| Polje / setting | Default | Uloga |
|-----------------|---------|--------|
| `pauseBetweenServices` | 10 min | Grid slotova + overrun apsorpcija |
| `cancellationDeadlineHours` | 24 | Rok klijentskog otkazivanja prije starta |
| `maxCancellationsBeforePenalty` | (salon) | Prag za penalizaciju |
| `penaltyDurationDays` | 30 | Trajanje zabrane bookinga |
| `reservationLockMinutes` | 15 | TTL lock-a stilista |
| `salon.timezone` | `Europe/Sarajevo` | Wall-time → UTC za start/end / CRON |
| `system_reservation_attendance_hours` | 12 | Klijentski rok potvrde dolaska (`ReservationDateService.getAttendanceConfirmDeadlineHours`) |
| `system_reservation_inbox_timeout_hours` | 24 | Inbox PENDING/REVIEW auto-cancel (bez klijentske kazne) |
| `system_reservation_daily_log_reminder_hours` | 12 | Push stilistu ako PENDING DK (direct / `AWAITING_DAILY_LOG`) stoji duže; **ne** zatvara zapis |

Attendance prozor **nije** hardkodiran u runtime-u — čita se iz settings registryja (fallback 12h). Postojeći DB red ostaje 24 dok owner ne promijeni Settings.

---

## 5. Dostupnost (Availability Engine)

**Fajlovi:** `availability.service.ts` (facade), `availability-dates.service.ts`, `availability-slots.service.ts`, `utils/time-slot.utils.ts`

### 5.1 Dostupni datumi — `GET /api/reservations/availability/dates`

Ulaz: `serviceId` **ili** `serviceIds` (CSV), `fromDate`, opcionalno `toDate` (default +30 dana).

Dan je `available: true` ako:

1. Nije praznik (`Holiday`)
2. Salon radi taj `dayOfWeek` (`salonWorkingHours`)
3. Postoji bar jedan aktivan stilist koji nudi **sve** tražene servise i radi taj dan (regular hours **ili** date override)
4. `getAvailableSlots` za taj dan vrati **≥ 1** slot (honesty check — M6)

Ako coarse check prođe ali nema slobodnih slotova → `available: false`.

### 5.2 Slobodni termini — `GET /api/reservations/availability/slots`

1. Holiday / salon closed → `[]`
2. Generiše grid: `open → close` korakom `duration + pauseBetweenServices` (fiksni korak, ne rolling)
3. Filtrira prošle slotove ako je danas
4. Po stilistu: slot mora stati u stilistov radni prozor
5. Slot je zauzet po **kapacitetu stilista**:
   - `CONFIRMED` / `ATTENDANCE_CONFIRMED` / `IN_PROGRESS` → zauzet `confirmedStylistId`
   - `PENDING` / `STYLIST_REVIEW` → svaki zahtjev troši **1** od eligible stilista na tom intervalu
   - aktivni lock troši **tog** stilista (isti zahtjev se ne broji dvaput)

Kad je `availableStylistCount = 0` zbog inbox holda, API i dalje vraća slot s `holdState: pending_hold` (klijent vidi “može se uskoro osloboditi”, nije bookable).

**Statusi koji blokiraju potvrđeni termin (`SLOT_OCCUPYING_STATUSES`):**

`CONFIRMED`, `ATTENDANCE_CONFIRMED`, `IN_PROGRESS`

Inbox hold: `PENDING`, `STYLIST_REVIEW`. `AWAITING_DAILY_LOG` ne blokira.

Realtime: `availability:changed` socket event nakon create/cancel/lock/unlock/reject/timeout.

---

## 6. Kreiranje rezervacije

### 6.1 Klijent — `POST /api/reservations`

Guards (client):

- Mora biti CLIENT, email verificiran, telefon, gender
- `mustChangePassword` blokira (osim admin create)
- Aktivna penalizacija (`penaltyUntil`) blokira
- Gender servisa mora odgovarati klijentu
- Slot mora biti u `getAvailableSlots` rezultatu
- **Client-day (M2):** više rezervacija isti dan je dozvoljeno ako (1) se vremena ne preklapaju (`PENDING`…`IN_PROGRESS`) i (2) nijedan `serviceId` nije već na drugoj rezervaciji tog dana (živi + `AWAITING_DAILY_LOG` + `COMPLETED`). Cancel / `NO_SHOW` ne broje se. Više servisa u **jednoj** rezervaciji ostaje. Isti guard na staff direct, admin PATCH, reorder, reschedule accept/commit, disposition reorder.

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

Pomjera date/time; conflict check vs `SLOT_OCCUPYING_STATUSES`.  
Revalidira praznik, salon open/close i stilistov radni prozor (ako postoji `confirmedStylistId`) preko `assertAdminSlotWithinWorkingHours` (M5).  
Ako se datum ili vrijeme stvarno promijene: push klijentu `reservation_time_changed` + socket `reservation:updated` na klijenta (isti informational kind kao disposition reorder).

---

### 6.5 Direct booking → dnevna knjiga (auto-seed + disposition)

Nakon što direct (`STAFF_WAIVED`) termin prođe `endTime`:

1. CRON (`reservation-direct-daily-log-cron.service`) + `DailyLogSeedFromDirectService` kreira PENDING DK unos
2. Rezervacija → `AWAITING_DAILY_LOG` (van rasporeda, ne blokira slot)
3. Stilist/admin završava preko DK:
   - **Complete** — naplata → `COMPLETED` + KIF (primarni put)
   - **Disposition** `POST /api/daily-log/:id/dispose` (razlog obavezan; izuzeci — termin se nije desio / treba drugi slot):
     | Akcija | Rezultat rezervacije |
     |--------|----------------------|
     | `discard` (API alias) / `cancel_as_stylist` | `CANCELLED_BY_STYLISTS` (bez kazne) |
     | `cancel_as_client` | `CANCELLED_BY_CLIENT` (+ penalty) |
     | `no_show` | `NO_SHOW` (+ penalty, default) |
     | `reorder` | `CONFIRMED` na novi datum/vrijeme (bez klijentskog propose); klijent dobija informational push `reservation_time_changed` |

UI: web stylist workbook + mobile `DailyLogDispositionPanel` (`discard` nije u UI).

Reminder: CRON šalje jednokratni push stilistu (`daily_log_pending_reminder`) ako PENDING DK stoji duže od `system_reservation_daily_log_reminder_hours` (default 12). Nema auto-timeouta.

---

## 7. Stilist odgovor (inbox)

Endpointi:

| Akcija | Endpoint |
|--------|----------|
| Lock | `POST /:id/stylist/:stylistProfileId/lock` |
| Unlock | `POST /:id/stylist/:stylistProfileId/unlock` |
| Accept | `POST /:id/stylist/:stylistProfileId/accept` |
| Reject | `POST /:id/stylist/:stylistProfileId/reject` |

### Lock

- Dozvoljeno iz `PENDING` / `STYLIST_REVIEW`
- Postavlja status rezervacije na `STYLIST_REVIEW`
- Atomarno: **nema preuzimanja** tuđeg aktivnog locka; TTL = `reservationLockMinutes` (auto-release → `PENDING`)
- Isti stilist ne locka istu rezervaciju 2× (`hasLockedOnce`); nakon unlock može accept
- Unlock: `POST .../unlock` — obavezna akcija uz accept/reject
- Dok traje lock, inbox stilista **ne prikazuje** overlapping zahtjeve na tom terminu
- Samo vlasnik `stylistProfile` (ili admin/owner role na ruti)

### Accept

- Zahtijeva aktivni lock **ili** `hasLockedOnce` (i niko drugi nema lock)
- `CONFIRMED` + `confirmedStylistId`
- Notifikacija klijentu + socket `reservation:confirmed`

### Reject

- Iz `LOCKED` ili `PENDING`
- Ako nema više stilista koji mogu prihvatiti → `CANCELLED_BY_STYLISTS` + notifikacija klijentu

---

## 8. Potvrda dolaska (attendance)

`POST /:id/confirm-attendance` — samo vlasnik rezervacije, status mora biti `CONFIRMED` i `attendancePolicy=CLIENT_REQUIRED`. `attendanceConfirmedBy=CLIENT`.

`POST /:id/staff-confirm-attendance` — `STYLIST` (samo `confirmedStylistId`) ili `SYSTEM_ADMIN`/`OWNER`. Isti status/policy, rok je **početak termina**. `attendanceConfirmedBy=STAFF`. Bez novog pusha klijentu.

### Pravilo (A3)

Klijent potvrđuje dolazak **najkasnije N sati prije** starta, gdje je N = `system_reservation_attendance_hours` (registry default/fallback 12; konstanta `ATTENDANCE_CONFIRM_DEADLINE_HOURS` samo kao fallback).

| Trenutak | Klijent | Staff | `processAttendanceDeadlines` |
|----------|---------|-------|------------------------------|
| `now < start − N h` | Dozvoljeno → `ATTENDANCE_CONFIRMED` | Dozvoljeno | Ne dira |
| `start − N h ≤ now < start` | Odbijeno (rok istekao) | Dozvoljeno | Ne dira |
| `now ≥ start` | Odbijeno | Odbijeno | Auto-cancel → `CANCELLED_BY_CLIENT` + penalty |

Samo za `attendancePolicy=CLIENT_REQUIRED`. `STAFF_WAIVED` (direct) nema attendance CTA ni CRON cancel.

List/detail payload: `attendanceClientDeadlineAt` (ISO) za `CONFIRMED` + `CLIENT_REQUIRED`.

> **Napomena:** CRON gleda `reservationDate` jučer–danas (ne lookahead za `T − N`).

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

`autoStartUpcomingReservations`: za danas, prošao start, max 24h staro, stilist nema drugi `IN_PROGRESS`:

- `ATTENDANCE_CONFIRMED` (standard), **ili**
- `CONFIRMED` + `STAFF_WAIVED` (direct)

→ `IN_PROGRESS`.

### Direct → DK seed (CRON)

Za `STAFF_WAIVED` rezervacije u `CONFIRMED` / `IN_PROGRESS` nakon `endTime` → seed PENDING DK + `AWAITING_DAILY_LOG` (vidi §6.5).

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

Dozvoljeni statusi rezervacije: `COMPLETED` \| `ATTENDANCE_CONFIRMED` \| `IN_PROGRESS` \| `AWAITING_DAILY_LOG`  
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
2. Ako postoji `reservationId`: rezervacija → `COMPLETED` (ulaz: `IN_PROGRESS` \| `ATTENDANCE_CONFIRMED` \| `AWAITING_DAILY_LOG`)
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

## 13. CRON poslovi

Glavni tick (`reservation-delay.cron.ts` / `reservation-cron.service`, `@Cron('*/1 * * * *')`):

1. `processPendingRescheduleTimeouts`
2. `processAttendanceDeadlines`
3. Ako je bilo attendance cancel → `processAutoReordersAfterAttendanceCancellations`
4. Delay warning za overrun
5. `autoStartUpcomingReservations`
6. Direct booking DK seed → `AWAITING_DAILY_LOG` (`reservation-direct-daily-log-cron.service`)
7. Direct PENDING DK reminder → push stilistu (`processPendingDailyLogReminders`; default 12h; bez auto-zatvaranja)
8. `processExpiredLocks` — lock TTL → unlock
9. `processInboxTimeouts` — `PENDING`/`STYLIST_REVIEW` stariji od `system_reservation_inbox_timeout_hours` (default 24) → `CANCELLED_BY_STYLISTS` bez klijentske kazne

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
| `reservation_time_changed` | Klijent | Termin odmah pomjeren (disposition reorder ili admin kalendar PATCH); nema CTA |
| `daily_log_pending_reminder` | Stilist | PENDING DK (direct) čeka complete/dispose |
| `delay_warning` | Budući klijenti | Kašnjenje |
| `stylist_reschedule_decision` | Stilist | Klijent odlučio |

Mobile deep-link obrađuje: `reservation_new` (inbox), `stylist_reschedule_decision` (detail), `daily_log_pending_reminder` (DK detail), te klijentske: `reservation_confirmed`, `reservation_cancelled`, `attendance_timeout_cancelled`, `reservation_reschedule`, `reservation_reorder`, `reservation_time_changed`, `delay_warning` → lista rezervacija s focusom. Push payload uvijek uključuje `kind` (+ `type`).

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
| Stylist workbook / DK detail | Stilist | Disposition panel za `AWAITING_DAILY_LOG` |

Klijent web: `/moje-rezervacije` — lista, cancel, confirm attendance, accept/decline reschedule (H1 FIXED).

---

## 17. Mobilna aplikacija

### Klijent

| Screen | Akcije |
|--------|--------|
| Booking wizard | Multi-service, dates/slots, loyalty, payDebtsIntent |
| My Reservations | Cancel (`PENDING`/`STYLIST_REVIEW`/`CONFIRMED`/`ATTENDANCE_CONFIRMED`), confirm attendance, accept/decline reschedule, review nakon COMPLETED |

### Stilist

| Screen | Akcije |
|--------|--------|
| Inbox | Lock / accept / reject (+ debt warning); socket + polling fallback |
| Schedule | Lista dana, countdown aktivne; socket + polling |
| Detail | Start / complete→DK / cancel / no-show / reorder / overrun |
| Reschedule preview | propose + commit (3 moda) |
| Daily log detail | Disposition panel (`AWAITING_DAILY_LOG`) |

Realtime: `SocketProvider` + `useReservationSocketRefresh`; polling 30s / 120s kad je socket spojen. Vidi [MOBILE_SOCKETIO.md](./MOBILE_SOCKETIO.md).

---

## 18. API mapa (zaštićeno JWT osim public)

| Method | Path | Ko |
|--------|------|-----|
| POST | `/api/reservations` | Client |
| POST | `/api/reservations/admin` | Admin/Owner |
| POST | `/api/reservations/stylist/direct` | Stylist+ |
| GET | `/api/reservations` | Po roli |
| GET | `/api/reservations/:id` | Po roli |
| PATCH | `/api/reservations/:id` | Admin/Owner |
| GET | `/api/reservations/availability/dates` | Auth |
| GET | `/api/reservations/availability/slots` | Auth |
| GET | `/api/reservations/availability/debug` | Admin/Owner |
| POST | `/api/reservations/:id/cancel` | Client |
| POST | `/api/reservations/:id/admin-cancel` | Admin/Owner |
| POST | `/api/reservations/:id/confirm-attendance` | Client |
| POST | `/api/reservations/:id/staff-confirm-attendance` | Stylist (confirmed) / Admin / Owner |
| POST | `.../stylist/:pid/lock\|unlock\|accept\|reject` | Stylist+ |
| POST | `.../stylist-start\|stylist-cancel\|stylist-no-show\|stylist-mark-complete` | Stylist+ |
| POST | `.../reschedule/propose\|commit\|accept\|decline` | Stylist+ / Client |
| POST | `.../reorder/request` | Stylist+ |
| POST | `.../use-break` | Stylist+ |
| GET | `/api/public/reservations/by-token/:token` | Public |
| POST | `/api/daily-log/from-reservation/:id` | Stylist+ |
| POST | `/api/daily-log/:id/dispose` | Stylist+ / Admin (direct `AWAITING_DAILY_LOG`) |

---

## 19. Testovi (postojeći)

Pokrivenost uključuje (između ostalog): create guards, cancel deadline, attendance 12h/settings guard + CRON na startu, staff confirm, accept lock/overlap, reject-all→cancel, no-show±penalty, reschedule propose/commit/decline/timeout vs reorder, auto-start, auto-reorder, admin working-hours assert, availability closed/holiday + CONFIRMED blocks slot, reservation-policy (direct / STAFF_WAIVED).

Facade `reservations.service.ts` je tanak; domain specovi su uz pojedinačne servise.

---

## 20. Scenariji end-to-end (happy + grane)

### S1 — Happy path (multi-service)

1. Klijent bookuje 2 servisa na slobodan slot  
2. Stilisti dobiju push; jedan lock → accept → `CONFIRMED`  
3. Klijent ili staff potvrdi dolazak → `ATTENDANCE_CONFIRMED`  
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

Admin drag na kalendaru → PATCH; validira praznik / salon / stilist radno vrijeme (`assertAdminSlotWithinWorkingHours`). Overlap vs `SLOT_OCCUPYING_STATUSES`.

### S9 — Penalizacija

Dovoljno otkazivanja → `penaltyUntil` → create odbija novi booking.

### S10 — Public token

Email link `/termin/:token` → read-only status + prikaz pending reschedule; link na login / Moje rezervacije. Akcije (cancel, attendance, reschedule accept/decline) na `/moje-rezervacije` (web) i mobile My Reservations.

### S11 — Direktna rezervacija + disposition

1. Admin/stilist kreira direct (`CONFIRMED` + `STAFF_WAIVED`)  
2. Start / auto-start → `IN_PROGRESS` (bez attendance)  
3. Poslije `endTime` CRON → PENDING DK + `AWAITING_DAILY_LOG`  
4a. Complete DK → `COMPLETED` + KIF, **ili**  
4b. Disposition (no_show / cancel / reorder) → odgovarajući status  

---

## 21. Fajlovi (mapa)

```
backend/src/reservations/
  reservations.service.ts          # facade (~170 linija)
  reservation-*.service.ts         # domain: create, direct-create, lock/accept/reject,
                                   # client-actions, runtime, reschedule*, reorder*,
                                   # attendance/direct-daily-log cron, list, update, …
  availability.service.ts          # facade
  availability-dates|slots|debug.service.ts
  reservation-policy.ts / constants.ts / assert-reservation-transition.ts
  reservations.controller.ts / public-reservations.controller.ts
  dto/*, utils/*

backend/src/daily-log/
  daily-log-seed-from-direct.service.ts
  daily-log-disposition.service.ts (+ apply helpers)

frontend/src/
  pages/Reservations.tsx, ReservationsCalendar.tsx
  pages/public/PublicReserve.tsx, PublicReservationView.tsx
  features/reservations/*, features/stylist-portal/*
  features/stylist-workbook/.../daily-log-disposition-panel.tsx

mobile/src/screens/
  client/ReservationScreen.tsx, MyReservationsScreen.tsx
  stylist/StylistInboxScreen.tsx, StylistScheduleScreen.tsx
  stylist/StylistReservationDetailScreen.tsx, ReschedulePreviewScreen.tsx
  stylist/DailyLogDispositionPanel.tsx
```

---

*Living AS-IS dokumentacija (sync 2026-08-13). Product backlog: [POLICY_BACKLOG.md](./POLICY_BACKLOG.md). Arhiva review nalaza: [FINDINGS.md](./FINDINGS.md).*
