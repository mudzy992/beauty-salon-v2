# Rezervacije — nalazi, bugovi, nedostaci i prijedlozi

**Datum review-a:** 2026-08-11  
**Uz dokumentaciju:** [RESERVATION_MODULE.md](./RESERVATION_MODULE.md) · [HANDOFF.md](./HANDOFF.md) · [MOBILE_SOCKETIO.md](./MOBILE_SOCKETIO.md)  
**Prioritet:** CRITICAL → HIGH → MEDIUM → LOW / TECH DEBT

---

## 1. CRITICAL

### C1 — Konflikt: potvrda dolaska vs attendance CRON — FIXED (2026-08-11)

**Status:** Riješeno.

`confirmAttendance` sada dozvoljava potvrdu dok je `now < start − 24h`; na/poslije roka odbija.  
`processAttendanceDeadlines` i dalje otkazuje na `now >= start − 24h`.  
Zajednička konstanta: `ATTENDANCE_CONFIRM_DEADLINE_HOURS` u `constants.ts`.

Preostalo (P2): ~~salon setting umjesto hardcode 24h~~ — FIXED 2026-08-12: `system_reservation_attendance_hours` registry + `ReservationDateService.getAttendanceConfirmDeadlineHours()`.

---

### C2 — Dokumentacija vs kod: ko “zauzima” slot — FIXED C2-B (2026-08-11)

**Status:** Riješeno (opcija B).

`SLOT_OCCUPYING_STATUSES` = `CONFIRMED`, `ATTENDANCE_CONFIRMED`, `IN_PROGRESS`.  
`PENDING` / `STYLIST_REVIEW` ne blokiraju availability.  
`stylistAccept` odbija preklapanje s već potvrđenim terminima istog stilista.

---

## 2. HIGH

### H1 — Web klijent nema “Moje rezervacije” ni kritične akcije — FIXED (2026-08-11)

**Status:** Riješeno.

Ruta `/moje-rezervacije`: lista (upcoming/past), cancel, confirm attendance, accept/decline reschedule.  
Nav + user menu + redirect nakon bookinga + linkovi s `/moj-termin/:token`.

---

### H2 — Mobile: klijent ne može otkazati `ATTENDANCE_CONFIRMED` — FIXED (2026-08-11)

**Status:** Riješeno. `CANCELABLE` na mobile uključuje `ATTENDANCE_CONFIRMED` (usklađeno s `cancelByClient`).

---

### H3 — Push deep-link nekompletan (mobile) — FIXED (2026-08-11, prošireno 2026-08-12)

**Status:** Riješeno.

- Backend push payload uvijek šalje `type` + `kind` (kind iz data ili fallback na type).
- Mobile `resolvePushRoute`: reservation eventi (stylist inbox/schedule + client reservations), `client_debt` → profil, `holiday`/`general` → notifikacije tab.
- Novi stylist kind: `stylist_reservation_cancelled` (klijent otkazao).
- Cold start: `getLastNotificationResponseAsync`; foreground refresh store; badge sync; logout `DELETE push-token`.
- Backend push dodan za: stylist cancel → klijent, admin cancel → klijent, client cancel → potvrđeni stilist.

---

### H4 — Stylist inbox (mobile) bez auto-refresh — FIXED (2026-08-11)

**Status:** Riješeno. `StylistInboxScreen` koristi `useAutoRefresh` (30s, focus + AppState), isto kao schedule.  
Socket.IO na mobile uveden 2026-08-12 (`SocketProvider`, `useReservationSocketRefresh`); polling ostaje fallback (120s kad je socket spojen).

---

## 3. MEDIUM

### M1 — FSM konstanta ≠ implementacija — FIXED (2026-08-11)

**Status:** Riješeno. `RESERVATION_TRANSITIONS` usklađen; `assertReservationTransition` na svim status update putanjama (reservations + DK complete/revert). Admin cancel više ne može iz terminalnih statusa (npr. `NO_SHOW`).

---

### M2 — Admin kalendar bez socketa — FIXED (2026-08-11)

**Status:** Riješeno. `ReservationsCalendar` sluša iste evente kao lista (`created|updated|cancelled|confirmed|stylist_response`) i radi silent refetch (bez unmounta schedulera).

---

### M3 — Duplikat status labela na admin listi — FIXED (2026-08-12)

**Status:** Riješeno. Admin lista koristi `features/reservations/status.ts` (`RESERVATION_STATUS_OPTIONS` / `getReservationStatusLabel`).

---

### M4 — Reject na web inboxu bez razloga — FIXED (2026-08-12)

**Status:** Riješeno. `RejectReservationDialog` na stylist inboxu šalje `rejectionReason` (obavezno u UI).

---

### M5 — `updateByAdmin` / drag-resize ne validira radno vrijeme — FIXED (2026-08-12)

**Status:** Riješeno. `assertAdminSlotWithinWorkingHours` na `updateByAdmin`: praznik, salon open/close, stilist working window (ako postoji `confirmedStylistId`). Unit testovi 4/4.

---

### M6 — `getAvailableDates` “optimistic” — FIXED (2026-08-12)

**Status:** Riješeno. Nakon coarse checka, dan ostaje `available` samo ako `getAvailableSlots` vrati ≥1 slot.

---

### M7 — Delay warning preskače prvog sljedećeg klijenta — BY DESIGN (2026-08-12)

**Status:** Namjerno. Prvi sljedeći klijent ide kroz overrun/reschedule tok stilista; `delay_warning` ide ostalima u redu (`future.slice(1)`). Dokumentovano u kodu + RESERVATION_MODULE.

---

### M8 — Timezone oslanjanje na server local time — FIXED (2026-08-11)

**Status:** Riješeno.

`ReservationDateService` sada čita `salon.timezone` iz settings registryja (default `Europe/Sarajevo`).  
`combineDateAndTime` koristi `zonedWallTimeToUtc` (Intl.DateTimeFormat, bez eksternih deps).  
`parseDateOnly(Date)` izvlači kalendarski dan u salon TZ-u.  
Pure util: `backend/src/common/utils/zoned-time.ts` (testiran).

---

### M9 — `CreateReservationDto` ne forsira service — FIXED (2026-08-12)

`@Validate(RequireServiceSelectionConstraint)` na `CreateReservationDto` i `AdminCreateReservationDto`.

---

### M12 — Web admin cancel policy drift — FIXED (2026-08-12)

Zajednički `canAdminCancelReservation` u `features/reservations/status.ts` (uključuje `IN_PROGRESS`, usklađeno s FSM).

---

### M10 — `payDebtsIntent` samo signal — BY DESIGN (2026-08-12)

Čuva se na rezervaciji; stilist UI eksplicitno koristi (auto-select + blokada bez “namjerno ne naplaćujem”). Nema backend enforcement-a — dokumentovano u RESERVATION_MODULE §12.1.

---

### M11 — `stylist-mark-complete` vs daily-log complete — FIXED (2026-08-11)

**Status:** Riješeno. Endpoint ostaje, ali uvijek vraća 400 — završetak isključivo preko DK (`from-reservation` + `complete`).

---

## 4. LOW / UX

| ID | Opis |
|----|------|
| L1 | ~~Reorder UI raw HH:mm~~ — FIXED 2026-08-12: web `type="time"` + preview; mobile HH:mm validacija + auto-end iz trajanja (bez native DateTimePicker dep) |
| L2 | ~~Stylist schedule web: fiksni 30-dnevni prozor~~ — FIXED 2026-08-12: rolling window u queryFn + prikaz raspona |
| L3 | ~~Public view: nema linka na login / my reservations~~ — FIXED 2026-08-12: footer Prijavi se + Moje rezervacije |
| L4 | ~~MyReservations multi-service label~~ — FIXED 2026-08-12: web već OK; mobile + public API multi-service label |
| L5 | ~~use-break endpoint rijetko zvan~~ — BY DESIGN 2026-08-12: primarni put `reschedule/commit` mode=use_break_only |
| L6 | ~~ReschedulePreview bez mode param-a~~ — FIXED 2026-08-12: `lockMode` iz DK complete + eksplicitni `mode` |

---

## 5. TECH DEBT

| ID | Opis |
|----|------|
| T1 | ~~`reservations.service.ts` ~2315 linija~~ — **DONE**. T1b DONE. Availability split DONE 2026-08-12 (facade + dates/slots/debug ≤200). |
| T2 | Repository layer za reservations (pravilo `backend-architecture.mdc`) — Prisma direktno u god-object servisu |
| T3 | Statusi kao string umjesto Prisma enum — lakše drift |
| T4 | Skill kaže “Repository layer obavezan” — trenutno nije |
| T5 | Matrica rezervacija nije bila u `.cursor/docs/matrices/reservations/` do ovog review-a |
| T6 | ~~Test gaps~~ — **DONE** (2026-08-11): accept lock/overlap, reject all→cancel, no-show±penalty, commitReschedule, availability CONFIRMED blocks |

---

## 6. Predloženi update-i (prioritetni backlog)

### P0 (odmah)

1. ~~Popraviti **C1** attendance confirm/cancel logiku + testovi~~ ✅ 2026-08-11
2. ~~Odlučiti **C2** slot occupancy i uskladiti matrice + kod~~ ✅ C2-B 2026-08-11
3. ~~Blokirati / deprecirati `stylistMarkComplete` bez DK (**M11**)~~ ✅ 2026-08-11

### P1

4. ~~Web My Reservations + attendance + reschedule (**H1**)~~ ✅ 2026-08-11
5. ~~Mobile cancel za `ATTENDANCE_CONFIRMED` (**H2**)~~ ✅ 2026-08-11
6. ~~Push routing za sve reservation kinds (**H3**)~~ ✅ 2026-08-11
7. ~~Inbox auto-refresh + sockets (**H4**)~~ ✅ 2026-08-11 (polling). Socket.IO mobile: [MOBILE_SOCKETIO.md](./MOBILE_SOCKETIO.md)

### P2

8. ~~Centralni FSM `assertTransition` (**M1**)~~ ✅ 2026-08-11
9. ~~Admin calendar sockets (**M2**)~~ ✅ 2026-08-11  

10. ~~Salon timezone (**M8**)~~ ✅ 2026-08-11  
11. ~~Split `reservations.service.ts` (**T1**)~~ ✅ 2026-08-11 (facade + 12 domain servisa; 5 fajlova treba dalje razbiti)  
12. ~~Dopuniti availability/reschedule testove (**T6**)~~ ✅ 2026-08-11  

12b. Mobile Socket.IO — vidi [MOBILE_SOCKETIO.md](./MOBILE_SOCKETIO.md) (nakon M1/M2 ili po UX potrebi)

### P3 (UX polish)

13. ~~Reject reason na web inboxu~~ ✅ 2026-08-12  
14. ~~Time picker za reorder~~ ✅ 2026-08-12  
15. ~~`getAvailableDates` honesty check~~ ✅ 2026-08-12  
16. ~~Ujednačiti status labele~~ ✅ 2026-08-12  

---

## 7. Matrica pokrivenosti platformi

| Akcija | Backend | Web client | Web stylist | Web admin | Mobile client | Mobile stylist |
|--------|---------|------------|-------------|-----------|---------------|----------------|
| Book | ✅ | ✅ | — | ✅ calendar | ✅ | — |
| My list | ✅ | ✅ `/moje-rezervacije` | — | ✅ | ✅ | — |
| Cancel own | ✅ | ✅ | — | admin-cancel | ✅ | — |
| Confirm attendance | ✅ | ✅ | — | ❌ | ✅ | — |
| Lock/Accept/Reject | ✅ | — | ✅ (reject + reason) | — | ✅ | ✅ |
| Start / No-show / Cancel | ✅ | — | ✅ | ❌ | — | ✅ |
| Complete → DK → KIF | ✅ | — | ✅ | (admin DK) | — | ✅ |
| Reschedule accept/decline | ✅ | ✅ | propose/commit ✅ | — | ✅ | propose/commit ✅ |
| Reorder | ✅ | — | ✅ | — | — | ✅ |
| Realtime list | ✅ | public slots ✅ | partial | list ✅ / cal ✅ | polling | schedule+inbox polling |

---

## 8. Utjecaj na dnevnu knjigu i finansije — rizici

| Rizik | Opis |
|-------|------|
| R1 | ~~COMPLETED bez DK (legacy mark-complete)~~ — blokiran (M11) |
| R2 | ~~DK PENDING dugo dok je rezervacija još IN_PROGRESS~~ — UX 2026-08-12: admin DK lista prikazuje “Na čekanju (termin u toku)” |
| R3 | ~~Zaključan KIF mjesec~~ — UX: complete dialog upozorenje + jasan toast naslov kad API vrati zaključan KIF (2026-08-12) |
| R4 | ~~Loyalty redeem zaborav~~ — UX hint u complete dialogu kad postoji loyalty popust (2026-08-12) |
| R5 | ~~payDebtsIntent bez enforcement~~ — UX: auto-select + blokada potvrde bez dugova ili eksplicitnog “namjerno ne naplaćujem” (2026-08-12) |
| R6 | ~~Revert DK nejasno~~ — UX copy na brisanju DK + status edit (vraća rezervaciju u IN_PROGRESS) (2026-08-12) |

---

## 9. Checklist za “besprijekoran” modul (Definition of Done)

- [x] C1 popravljen + unit testovi attendance  
- [x] Jedna autoritativna slot-occupancy matrica (kod = docs) — C2-B  
- [x] FSM helper + usklađeni transitions
- [x] Web i mobile klijent: list / cancel / attendance / reschedule
- [x] Svi push kindovi deep-linkaju
- [x] Complete isključivo preko DK (M11)  
- [x] Timezone salona  
- [x] Service split (T1+T1b) — facade + 21 domain servisa, svi ≤200 linija  
- [x] T6 unit test coverage: accept/reject/no-show/reschedule-commit/availability overlap (41/41 pass)  
- [ ] Repository layer (ostaje P3 kandidat)  
- [x] Admin calendar realtime  
- [x] Matrice u `.cursor/docs/matrices/reservations/` ažurirane uz logičke promjene  

---

*Review baziran na kodu (backend/frontend/mobile), postojećim matricama i skill/engine pravilima — AS-IS stanje 2026-08-11.*
