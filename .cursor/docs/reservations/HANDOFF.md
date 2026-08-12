# HANDOFF — Reservation module hardening

**Datum:** 2026-08-12  
**Status:** P0–P3 + R3–R6 + T1/T6/M8 **završeno** · mobile detail split **DONE** · L2/L5/L6/M10/C1/R2 **DONE** · Mobile Socket.IO **još nije**  
**Commit:** nije rađen (namjerno — čeka eksplicitni zahtjev)

---

## 1. Executive summary

Reservation hardening plan je u praksi **gotov do Mobile Socket.IO faze**. Kritični bugovi (C1/C2), FSM, timezone, service split, test coverage, web/mobile klijent UX, admin calendar realtime, stylist complete flow (R3–R6) — sve riješeno ili dokumentovano BY DESIGN.

**Preostalo po prioritetu:**

1. **Mobile Socket.IO** — **ZADNJE**, vidi [MOBILE_SOCKETIO.md](./MOBILE_SOCKETIO.md)
2. **Tech debt** — T2/T3/T4 (repository layer, Prisma enum)

---

## 2. Urađeno po fazama

### P0 — Critical (DONE)

| ID | Šta |
|----|-----|
| **C1** | Attendance confirm vs CRON — 24h deadline, `ATTENDANCE_CONFIRM_DEADLINE_HOURS` |
| **C2-B** | Slot occupancy: samo CONFIRMED / ATTENDANCE_CONFIRMED / IN_PROGRESS |
| **M11** | `stylist-mark-complete` → 400; završetak isključivo preko DK |

### P1 — High (DONE)

| ID | Šta |
|----|-----|
| **H1** | Web `/moje-rezervacije` — cancel, attendance, reschedule |
| **H2** | Mobile cancel uključuje `ATTENDANCE_CONFIRMED` |
| **H3** | Push deep-link routing (`resolveReservationPushRoute`) |
| **H4** | Inbox auto-refresh (polling 30s) — Socket.IO odgođen |

### P2 — Medium / Tech (DONE)

| ID | Šta |
|----|-----|
| **M1** | FSM `assertReservationTransition` na svim putanjama |
| **M2** | Admin calendar Socket.IO silent refetch |
| **M8** | Salon timezone (`salon.timezone`, `zoned-time.ts`) |
| **T1/T1b** | `reservations.service.ts` 2369 → facade ~183 + **21 domain servisa** (svi ≤200 linija) |
| **T6** | Test gaps: accept/reject/no-show/reschedule-commit/availability |
| **M5** | Admin working hours validacija (`assert-admin-working-hours.ts`) |
| **Availability split** | facade + `availability-dates/slots/debug.service.ts` |

### P3 — UX polish (DONE)

| ID | Šta |
|----|-----|
| **M3** | Admin status labele → `features/reservations/status.ts` |
| **M4** | Web reject dialog s razlogom |
| **M6** | `getAvailableDates` honesty (samo ako ima slotova) |
| **L1** | Reorder HH:mm UX (web `type="time"`, mobile validacija + auto-end) |
| **M7** | `future.slice(1)` BY DESIGN — dokumentovano |
| **Web detail split** | `stylist-reservation-detail-page.tsx` 721 → ~153 linija |

### R3–R6 — Complete / DK UX (DONE)

| ID | Šta |
|----|-----|
| **R3** | KIF-lock copy + toast u complete flow |
| **R4** | Loyalty hint u complete dialogu |
| **R5** | `payDebtsIntent` — odabir dugova ili “namjerno ne naplaćujem” |
| **R6** | DK delete/status edit copy → rezervacija IN_PROGRESS |

### Zadnja sesija (2026-08-12)

| ID | Šta |
|----|-----|
| **M12** | `canAdminCancelReservation` — admin lista + scheduler usklađeni (`IN_PROGRESS`) |
| **M9** | `RequireServiceSelectionConstraint` na Create + AdminCreate DTO |
| **L3** | `PublicReservationView` footer: Prijavi se / Moje rezervacije |
| **L4** | Multi-service label: mobile MyReservations + public API |
| **Mobile split (partial)** | Modali → `mobile/.../reservation-detail/*`; screen **1024 → 766 linija** |
| **Mobile split (DONE)** | Hook + summary + actions; screen **~168 linija** (web pattern) |
| **L2** | Web stylist schedule: rolling 30-day window (fresh on refetch, prikaz raspona) |
| **L5/L6** | use_break_only dokumentovano; ReschedulePreview `lockMode` iz DK complete flow-a |
| **M10** | `payDebtsIntent` by design dokumentovano u RESERVATION_MODULE §12.1 |
| **C1 setting** | `system_reservation_attendance_hours` → `ReservationDateService.getAttendanceConfirmDeadlineHours()` |
| **R2** | Admin DK lista: “Na čekanju (termin u toku)” kad je rezervacija IN_PROGRESS |

---

## 3. Ključni fajlovi (reference)

### Backend

```
backend/src/reservations/
  reservations.service.ts          # facade (~183 linija)
  reservation-*.service.ts         # 21 domain servisa
  assert-reservation-transition.ts
  availability.service.ts          # facade
  availability-dates/slots/debug.service.ts
  dto/require-service-selection.validator.ts
  utils/assert-admin-working-hours.ts
  utils/reservation-services-label.ts
backend/src/common/utils/zoned-time.ts
```

### Frontend (web)

```
frontend/src/features/reservations/
  status.ts                        # canAdminCancelReservation, labele
  use-reservation-socket-refresh.ts
frontend/src/features/stylist-portal/
  pages/stylist-reservation-detail-page.tsx  (~153 linija)
  components/*-reservation-dialog.tsx
  hooks/use-reservation-detail-*.ts
frontend/src/pages/public/
  PublicReservationView.tsx
  MyReservations.tsx
```

### Mobile

```
mobile/src/screens/stylist/
  StylistReservationDetailScreen.tsx   # ~168 linija (split DONE)
  reservation-detail/
    hooks/use-stylist-reservation-detail.ts
    hooks/use-reservation-detail-status.ts
    hooks/use-reservation-detail-actions.ts
    hooks/use-reservation-complete-flow.ts
    reservation-detail-summary.tsx
    reservation-detail-actions.tsx
    utils/reservation-detail.ts
    complete-reservation-modal.tsx
    no-show-reservation-modal.tsx
    overrun-reservation-modal.tsx
    reorder-reservation-modal.tsx
    reservation-detail-modal-shell.tsx
    modal-styles.ts
mobile/src/screens/client/MyReservationsScreen.tsx
mobile/src/utils/reservationServices.ts
```

---

## 4. Test status (zadnji poznati)

| Suite | Rezultat |
|-------|----------|
| Reservations (facade + domain) | **66/66** |
| Availability | **9/9** |
| M8 timezone (`zoned-time`) | **16/16** |
| M5 admin working hours | **4/4** |
| `reservation-services-label` | **3/3** |

Pokreni prije commita:

```bash
cd backend && npm test -- --testPathPatterns=reservations --no-coverage
```

---

## 5. Otvoreno (prioritetni backlog)

### Sljedeća sesija — redoslijed

| # | ID | Opis | Napomena |
|---|-----|------|----------|
| 1 | **12b Mobile Socket.IO** | **ZADNJE** | [MOBILE_SOCKETIO.md](./MOBILE_SOCKETIO.md) |
| 2 | **T2/T3/T4** | Repository layer, Prisma enum | Tech debt |

### Eksplicitno odgođeno

- **Mobile Socket.IO** — tek nakon mobile detail split-a (ili ako owner traži ranije)
- **Git commit** — samo na eksplicitni zahtjev

---

## 6. Source of truth (red čitanja)

1. **[HANDOFF.md](./HANDOFF.md)** — ovaj fajl  
2. **[FINDINGS.md](./FINDINGS.md)** — svi nalazi + FIXED statusi  
3. **[MOBILE_SOCKETIO.md](./MOBILE_SOCKETIO.md)** — Socket plan (zadnje)  
4. **[../matrices/reservations/MATRIX.md](../matrices/reservations/MATRIX.md)** — FSM matrica  
5. **[RESERVATION_MODULE.md](./RESERVATION_MODULE.md)** — modul overview  

---

## 7. Copy-paste prompt za sljedeću sesiju

```
Nastavi reservation hardening po HANDOFF:
`.cursor/docs/reservations/HANDOFF.md`

Kontekst: P0–P3 + R3–R6 + M12/M9/L3/L4 DONE. Mobile detail modals split DONE (766 linija).

Sljedeće po prioritetu:
1. Mobile detail hook/summary split (StylistReservationDetailScreen → ≤200 linija)
2. L2/L5/L6/M10/C1/R2 po FINDINGS backlogu
3. Mobile Socket.IO ZADNJE po MOBILE_SOCKETIO.md

Ne commitati bez eksplicitnog zahtjeva.
Referenca web split: frontend/src/features/stylist-portal/
```

---

## 8. Definition of Done — preostalo

- [x] C1, C2, FSM, timezone, T1 split, T6 tests, admin calendar realtime
- [x] Web + mobile klijent akcije, push routing, complete → DK only
- [x] P3 UX (reject, reorder, dates honesty, status labele)
- [x] M12, M9, L3, L4
- [x] Mobile detail modals extracted
- [x] Mobile detail hook + summary extracted
- [ ] Mobile Socket.IO (12b)
- [ ] Repository layer (T2–T4) — opcionalno kasnije

---

*Handoff generisan 2026-08-12. Nastavak: mobile detail ostatak → Mobile Socket.IO.*
