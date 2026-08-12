# Reservation matrix changelog

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
