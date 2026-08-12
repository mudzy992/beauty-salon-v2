# Reservation Matrix (AS-IS)

Source of truth za statusne prijelaze i ko šta smije. Detaljan opis: `.cursor/docs/reservations/RESERVATION_MODULE.md`.  
Overrun/reorder: `.cursor/docs/stylist-reservation-matrix.md`.

## Statusi

| Status | Tip |
|--------|-----|
| PENDING | Početni |
| STYLIST_REVIEW | Lock aktivan / u pregledu |
| CONFIRMED | Stilist prihvatio |
| ATTENDANCE_CONFIRMED | Klijent potvrdio dolazak |
| IN_PROGRESS | Termin u toku |
| COMPLETED | Završeno (obično uz DK complete) |
| CANCELLED_BY_CLIENT | Otkaz klijent / attendance timeout / decline reschedule |
| CANCELLED_BY_STYLISTS | Otkaz stilisti / admin |
| NO_SHOW | Nepojavljivanje |

## Dozvoljeni prijelazi (FSM + assertReservationTransition)

| Iz | U | Trigger |
|----|---|---------|
| PENDING | STYLIST_REVIEW | stylistLock |
| PENDING | CANCELLED_BY_CLIENT | cancelByClient |
| PENDING | CANCELLED_BY_STYLISTS | cancelByAdmin |
| STYLIST_REVIEW | CONFIRMED | stylistAccept |
| STYLIST_REVIEW | CANCELLED_BY_STYLISTS | svi reject / cancelByAdmin |
| STYLIST_REVIEW | CANCELLED_BY_CLIENT | cancelByClient |
| CONFIRMED | ATTENDANCE_CONFIRMED | confirmAttendance |
| CONFIRMED | CANCELLED_BY_CLIENT | cancelByClient / attendance CRON / decline reschedule |
| CONFIRMED | CANCELLED_BY_STYLISTS | stylistCancel / cancelByAdmin |
| CONFIRMED | NO_SHOW | stylistMarkNoShow |
| CONFIRMED | IN_PROGRESS | autoStart CRON |
| ATTENDANCE_CONFIRMED | IN_PROGRESS | stylistStart / autoStart |
| ATTENDANCE_CONFIRMED | NO_SHOW | stylistMarkNoShow |
| ATTENDANCE_CONFIRMED | CANCELLED_BY_CLIENT | cancelByClient / decline reschedule / timeout |
| ATTENDANCE_CONFIRMED | CANCELLED_BY_STYLISTS | cancelByAdmin |
| ATTENDANCE_CONFIRMED | COMPLETED | dailyLog.complete |
| IN_PROGRESS | COMPLETED | dailyLog.complete |
| IN_PROGRESS | CANCELLED_BY_STYLISTS | stylistCancel / cancelByAdmin |
| COMPLETED | IN_PROGRESS | daily-log revert |

Svi status update-i u `reservations.service` / DK complete+revert prolaze kroz `assertReservationTransition`.

## Slot blocking (availability AS-IS / C2-B)

Blokiraju: `CONFIRMED`, `ATTENDANCE_CONFIRMED`, `IN_PROGRESS`.  
**Ne blokiraju:** `PENDING`, `STYLIST_REVIEW` (više zahtjeva može dijeliti isti slot dok stilist ne prihvati; accept ima overlap guard).

## Complete path

`IN_PROGRESS`/`ATTENDANCE_CONFIRMED` → `COMPLETED` samo preko dnevne knjige (`from-reservation` + `complete`).  
`POST .../stylist-mark-complete` vraća 400 (legacy blokiran).

## Ko šta smije

| Akcija | Client | Stylist | Admin/Owner |
|--------|--------|---------|-------------|
| Create | Da (self) | Ne | Da (za klijenta) |
| Lock/Accept/Reject | Ne | Da (vlastiti profil) | Ruta dozvoljava |
| Confirm attendance | Da (own) | Ne | Ne |
| Cancel | Own + deadline | CONFIRMED/IN_PROGRESS | Skoro sve osim COMPLETED |
| Start / No-show | Ne | Da | Ruta dozvoljava |
| Reschedule propose/commit | Ne | Da | Da |
| Reschedule accept/decline | Da (own) | Ne | Ne |
| Create DK from reservation | Ne | Da (confirmed stylist) | Da (access rules DK) |

## Nuspojave na DK / finansije

| Događaj | DK | KIF | Loyalty | Dugovi |
|---------|----|-----|---------|--------|
| Booking + redeem | — | — | REDEEM na rezervaciji | `payDebtsIntent` flag |
| from-reservation | PENDING unos | — | — | opcionalno CREATE / settle |
| DK complete | COMPLETED | IncomeBookEntry | EARN | — |
| DK revert/delete COMPLETED | PENDING/DELETED | briše stavku | reverse | reopen/brisanje |
| NO_SHOW / cancel | — | — | — | — |

## Poznati konflikti (vidi FINDINGS)

- ~~Attendance confirm prozor vs CRON cancel (CRITICAL)~~ — FIXED 2026-08-11
- ~~Docs vs kod za slot occupancy (C2)~~ — FIXED C2-B 2026-08-11
- ~~`RESERVATION_TRANSITIONS` ne pokriva sve runtime prijelaze~~ — FIXED M1 2026-08-11 (`assertReservationTransition`)

## Attendance rok

- Potvrda dozvoljena dok `now < start − ATTENDANCE_CONFIRM_DEADLINE_HOURS` (24)
- CRON cancel na `now ≥ start − 24h` za `CONFIRMED` bez attendance

## Timezone

- `start` se računa kao `combineDateAndTime(reservationDate, startTime)` u salon TZ-u (`salon.timezone` setting, default `Europe/Sarajevo`).
- `reservationDate` (Prisma `@db.Date`) → UTC midnight; `startTime` (HH:mm) → wall time u salon TZ.
- Svi deadline/auto-start proračuni koriste UTC instante — nema oslanjanja na `process.env.TZ`.
