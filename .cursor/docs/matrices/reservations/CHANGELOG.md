# Reservation matrix changelog

## 2026-08-13 (attendance-policy A3)

- Klijent potvrđuje do `T − N` (default/fallback 12h). Staff (stilist + admin) do starta.
- CRON auto-cancel na `now ≥ start` (ne na `T − N`), uz kaznu; query jučer–danas.
- Payload: `attendanceClientDeadlineAt` za klijentski CTA.

## 2026-08-13 (multi-booking)

- Client-day: uklonjen max 1 aktivna / dan.
- M2: overlap vremena na živim statusima; unique `serviceId` po danu uključuje `AWAITING_DAILY_LOG` + `COMPLETED`.
- Guard na create, direct create, PATCH, reorder, reschedule accept/commit, disposition reorder.

## 2026-08-13 (direct-disposition)

- Disposition UI: `discard` sakriven (API alias ostaje); complete = naplata, disposition = izuzeci.
- Disposition `reorder` i admin calendar PATCH šalju klijentu `reservation_time_changed` (nema CTA).
- Reminder stilistu za stuck PENDING DK: `system_reservation_daily_log_reminder_hours` (default 12), bez auto-timeouta.

## 2026-08-13 (slot-hold)

- Inbox hold: `PENDING`/`STYLIST_REVIEW` troše 1 kapacitet po intervalu (max = broj eligible stilista).
- Lock je ekskluzivan (nema steal); unlock + TTL vraća `STYLIST_REVIEW → PENDING`.
- Inbox timeout: `system_reservation_inbox_timeout_hours` (default 24), bez klijentske kazne.
- API slot `holdState=pending_hold` za UI “može se uskoro osloboditi”.

## 2026-08-13 (docs-sync)

- `RESERVATION_MODULE.md` usklađen s kodom (living SoT): FSM + direct/`AWAITING_DAILY_LOG`, settings attendance hours, admin working-hours, mobile socket, dispose API, S11.
- Attendance u MATRIX: `N` iz `system_reservation_attendance_hours` (ne hardcode 24 u prose).
- FINDINGS označen kao arhiva; aktivni backlog = `POLICY_BACKLOG.md`.

## 2026-08-12 (Disposition reorder + date)

- Disposition `reorder` sada direktno postavlja `reservationDate` + vrijeme (bez client propose).
- DTO: opcioni `targetDate` (`YYYY-MM-DD`); konflikt slot-a se validira prije soft-delete DK zapisa.

## 2026-08-12 (Direct booking auto DK + disposition)

- Novi status `AWAITING_DAILY_LOG` za direktne rezervacije nakon auto-seeda u dnevnu knjigu.
- CRON nakon `endTime` kreira PENDING DK zapis s cjenovnikom + loyalty-adjusted min charge.
- Disposition akcije na PENDING DK: discard, reorder, cancel_as_client, cancel_as_stylist, no_show.
- UI rename: „Direktna rezervacija“; mobile client card prikazuje ref + listu servisa.

## 2026-08-12 (Staff direct booking)

- Dodan policy sloj: `bookingOrigin`, `acceptanceMode`, `attendancePolicy`.
- Dokumentovan dual-flow model: standard self-service tok i direct staff tok.
- Attendance CTA/CRON/start pravila sada se čitaju iz `status + policy`, ne samo iz statusa.

## 2026-08-11 (P2 M8 — Salon timezone)

- `ReservationDateService` koristi `salon.timezone` setting (default `Europe/Sarajevo`) umjesto server local TZ.
- `combineDateAndTime` → `zonedWallTimeToUtc` (Intl.DateTimeFormat, zero deps).
- `parseDateOnly(Date)` → kalendarski dan u salon TZ → UTC midnight.
- Attendance rok + auto-start sada koriste UTC instante bazirane na salon TZ.
- Dodana sekcija "Timezone" u MATRIX.md.

## 2026-08-11 (P2 M1)

- `RESERVATION_TRANSITIONS` proširen (admin cancel, auto-start, stylist cancel IN_PROGRESS, DK complete/revert).
- `assertReservationTransition` + wiring u reservations + daily-log complete/revert.

## 2026-08-11 (P0 M11 + C2-B)

- Complete samo preko dnevne knjige; `stylistMarkComplete` → 400.
- Slot occupancy: PENDING/STYLIST_REVIEW ne blokiraju; `SLOT_OCCUPYING_STATUSES` = CONFIRMED | ATTENDANCE_CONFIRMED | IN_PROGRESS.
- `stylistAccept` overlap guard za isti stilist.

## 2026-08-11 (P0 C1)

- Attendance: potvrda dozvoljena do roka `T−24h`; CRON cancel na/poslije roka (usklađeno).
- Konstanta `ATTENDANCE_CONFIRM_DEADLINE_HOURS`.

## 2026-08-11

- Inicijalna AS-IS matrica nakon kompletnog review-a rezervacijskog modula (backend + web + mobile + DK/KIF).
- Dokumentovana odstupanja od starijih pravila (slot blocking od PENDING; attendance 24h konflikt).
- Linkovi: `.cursor/docs/reservations/RESERVATION_MODULE.md`, `FINDINGS.md`.
