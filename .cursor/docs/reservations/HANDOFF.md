# HANDOFF — Reservation module (dual-flow)

**Datum:** 2026-08-12  
**Status:** P0–P3 + R3–R6 + mobile split + staff direct booking **sve završeno**  
**Commit:** nije rađen (namjerno — čeka eksplicitni zahtjev)

---

## 1. Executive summary

Reservation hardening je kompletiran. Dodan je i cijeli **Staff Direct Booking** plan koji uvodi policy-based dual-flow model bez fake statusa.

**Jedino što preostaje:**

1. **Prisma migracija** — kreirati i primijeniti SQL za nove policy kolone (DB konekcija bila nedostupna tokom sesije)
2. **Mobile Socket.IO** — odgođeno do prvog zahtjeva; plan u [MOBILE_SOCKETIO.md](./MOBILE_SOCKETIO.md)
3. **Tech debt T2–T4** — repository layer, Prisma enum — opcionalno

---

## 2. Urađeno u ovoj sesiji (Staff Direct Booking)

### Phase 1 — Schema + policy foundation

| Fajl | Šta |
|------|-----|
| `backend/prisma/schema.prisma` | Dodana polja: `bookingOrigin`, `acceptanceMode`, `attendancePolicy`, `createdByUserId`, `attendanceConfirmedBy`, `attendanceWaivedAt`, `attendanceWaivedByUserId` + relacije |
| `backend/src/reservations/constants.ts` | Novi konstanti: `RESERVATION_BOOKING_ORIGIN`, `RESERVATION_ACCEPTANCE_MODE`, `RESERVATION_ATTENDANCE_POLICY`, `ATTENDANCE_CONFIRMED_BY` |
| `backend/src/reservations/reservation-policy.ts` | **Nova datoteka** — centralni policy helper: `canConfirmAttendance`, `canStartReservation`, `shouldRunAttendanceCron`, `isDirectAssignedReservation`, `getAutoStartEligibleStatuses` |

### Phase 2 — Create path split

| Fajl | Šta |
|------|-----|
| `backend/src/reservations/dto/admin-create-reservation.dto.ts` | Dodano `bookingMode` + `stylistProfileId` |
| `backend/src/reservations/dto/stylist-direct-create-reservation.dto.ts` | **Nova datoteka** — DTO za stylist direct |
| `backend/src/reservations/reservation-direct-create.service.ts` | **Nova datoteka** — `createByAdmin` + `createByStylist`, bez inbox, direktno `CONFIRMED + STAFF_WAIVED` |
| `backend/src/reservations/reservations.service.ts` | Routing: `bookingMode` → standard ili direct |
| `backend/src/reservations/reservations.controller.ts` | Novi endpoint `POST /api/reservations/stylist/direct` |
| `backend/src/reservations/reservations.module.ts` | Registriran `ReservationDirectCreateService` |

### Phase 3 — Runtime + CRON policy guards

| Fajl | Šta |
|------|-----|
| `backend/src/reservations/reservation-runtime.service.ts` | `stylistStart` koristi `canStartReservation()` umjesto hardkodiranog status provjere |
| `backend/src/reservations/reservation-client-actions.service.ts` | `confirmAttendance` koristi `canConfirmAttendance()` + bilježi `attendanceConfirmedBy=CLIENT` |
| `backend/src/reservations/reservation-attendance-cron.service.ts` | Selektuje `attendancePolicy`; `shouldRunAttendanceCron()` filter za direct booking |
| `backend/src/reservations/reservation-cron.service.ts` | `autoStartUpcomingReservations` koristi `getAutoStartEligibleStatuses()` per policy |

### Phase 4 — API surface + web/mobile UX

| Fajl | Šta |
|------|-----|
| `frontend/src/features/reservations/types.ts` | Dodani policy tipovi na `Reservation` interface |
| `frontend/src/features/stylist-portal/types.ts` | Isto |
| `mobile/src/types/index.ts` | Isto |
| `frontend/src/features/client-reservations/client-reservation-actions.ts` | `canClientConfirmAttendance` prima `attendancePolicy` param; returns false za STAFF_WAIVED |
| `frontend/src/features/client-reservations/my-reservation-card.tsx` | Prosljeđuje `attendancePolicy` |
| `mobile/src/screens/client/MyReservationsScreen.tsx` | `canConfirmAttendance` helper koji štiti STAFF_WAIVED |
| `frontend/src/features/reservations/components/ReservationScheduler.tsx` | Mode picker (Standard vs Direct) + stilist selector za admin calendar |
| `frontend/src/pages/ReservationsCalendar.tsx` | Prosljeđuje `bookingMode` + `stylistProfileId` |
| `frontend/src/features/stylist-portal/pages/stylist-direct-booking-page.tsx` | **Nova stranica** — stylist web form za dogovoreni termin |
| `frontend/src/features/stylist-portal/pages/stylist-schedule-page.tsx` | Dugme "Dogovoreni termin" |
| `frontend/src/app/router.tsx` | Nova ruta `/stylist/schedule/new` |
| `mobile/src/screens/stylist/StylistDirectBookingScreen.tsx` | **Novi screen** — stylist mobile form |
| `mobile/src/navigation/StylistScheduleNavigator.tsx` | Registriran `StylistDirectBooking` screen |
| `mobile/src/navigation/types.ts` | Dodan `StylistDirectBooking` u `StylistScheduleStackParamList` |
| `mobile/src/screens/stylist/StylistScheduleScreen.tsx` | Dugme "Dogovoreni termin" u header |
| `backend/src/users/users.controller.ts` + `users.service.ts` | `GET /api/users/clients` dostupno i za STYLIST rolu |

### Phase 5 — Tests + docs

| Fajl | Šta |
|------|-----|
| `backend/src/reservations/reservation-policy.spec.ts` | **Nova datoteka** — 5/5 testova proše |
| `.cursor/docs/matrices/reservations/MATRIX.md` | Dodan policy sloj, dual-flow tabela, ažurirana attendance/start pravila |
| `.cursor/docs/matrices/reservations/CHANGELOG.md` | Entry za 2026-08-12 |
| `.cursor/docs/reservations/RESERVATION_MODULE.md` | §2, §6 i §9 ažurirani (nova polja, admin/stylist direct create, start uvjeti) |

---

## 3. Build/test status

| Target | Rezultat |
|--------|----------|
| `backend npm run build` | **PASS** ✅ |
| `backend npm test -- reservation-policy.spec.ts` | **5/5 PASS** ✅ |
| `frontend npm run build` | **PASS** ✅ |
| `mobile npx tsc --noEmit` | Pre-existing greške u starим datotekama (nisu iz ove sesije) |

---

## 4. Kritično otvoreno — Prisma migracija

Schema je ažurirana, ali **migracija nije kreirana** (DB konekcija visila). Sljedeća sesija mora prvo:

```bash
cd backend
npx prisma migrate dev --name staff_direct_booking_policy --create-only
# pregledaj generisani SQL, pa:
npx prisma migrate dev --name staff_direct_booking_policy
npx prisma generate
```

Nove kolone s DEFAULT vrijednostima — **nema risk data loss**:
- `booking_origin VARCHAR DEFAULT 'CLIENT_SELF_SERVICE'`
- `acceptance_mode VARCHAR DEFAULT 'INBOX'`
- `attendance_policy VARCHAR DEFAULT 'CLIENT_REQUIRED'`
- ostale nullable kolone

Backfill nije potreban jer su defaulti sigurni za sve postojeće rezervacije.

---

## 5. Locked decisions (staff direct booking)

- Admin **mora** eksplicitno birati `bookingMode` svaki put — nema defaulta
- Direct booking ne koristi lažni `ATTENDANCE_CONFIRMED` — koristi `CONFIRMED + STAFF_WAIVED`
- Stylist direct booking: dodjeljuje se samo sebi (ne može za drugog stilista)
- Admin direct booking: mora odabrati `stylistProfileId`; ide direktno u raspored bez inboxa
- Standardni admin create i dalje prolazi punu matricu (`PENDING` → inbox)
- `attendancePolicy = STAFF_WAIVED` → attendance CTA skriva se na svim klijentima (web + mobile)

---

## 6. Ključni fajlovi — reference

```
backend/src/reservations/
  reservation-policy.ts               # centralni policy helper (NOVI)
  reservation-direct-create.service.ts # direct create logic (NOVI)
  constants.ts                        # + booking origin/acceptance/attendance policy
  reservations.service.ts             # facade, routing
  reservations.controller.ts          # + POST /stylist/direct
  reservation-runtime.service.ts      # canStartReservation()
  reservation-client-actions.service.ts # canConfirmAttendance()
  reservation-attendance-cron.service.ts # shouldRunAttendanceCron()
  reservation-cron.service.ts         # getAutoStartEligibleStatuses()
  dto/admin-create-reservation.dto.ts
  dto/stylist-direct-create-reservation.dto.ts  # NOVI
  
frontend/src/features/reservations/
  components/ReservationScheduler.tsx  # mode picker + stylist selector
frontend/src/features/stylist-portal/pages/
  stylist-direct-booking-page.tsx      # NOVI
  stylist-schedule-page.tsx            # + button

mobile/src/screens/stylist/
  StylistDirectBookingScreen.tsx       # NOVI
  StylistScheduleScreen.tsx            # + button
mobile/src/navigation/
  StylistScheduleNavigator.tsx         # + screen
  types.ts                             # + param type
```

---

## 7. Preostalo po prioritetu

| # | Zadatak | Napomena |
|---|---------|----------|
| 1 | **Prisma migracija** | `prisma migrate dev --name staff_direct_booking_policy` kada DB dostupan |
| 2 | **Mobile Socket.IO** | [MOBILE_SOCKETIO.md](./MOBILE_SOCKETIO.md) |
| 3 | **Tech debt T2–T4** | Repository layer, Prisma enum — opcionalno |

---

## 8. Copy-paste prompt za sljedeću sesiju

```
Nastavi na Staff Direct Booking HANDOFF:
`.cursor/docs/reservations/HANDOFF.md`

Kontekst: svi planovi completed; jedino otvoreno je Prisma migracija za policy kolone.

Sljedeće:
1. Kreiraj i primijeni Prisma migraciju (staff_direct_booking_policy) ako DB dostupan
2. Mobile Socket.IO po MOBILE_SOCKETIO.md (opcionalno)

Ne commitati bez eksplicitnog zahtjeva.
Referenca plana: .cursor/plans/staff-direct-booking_ff95262f.plan.md
```

---

*Handoff generisan 2026-08-12. Sve faze staff direct booking plana završene. Preostaje samo Prisma migracija.*
