# Plan: attendance-policy — A3

**Datum:** 2026-08-13  
**ID:** `attendance-policy` (POLICY_BACKLOG #4)  
**Odluka (Ask):** A3 — klijentski rok `T − N`; staff do starta; CRON na startu.

## Pravilo

- **N** = `system_reservation_attendance_hours`. Registry default `'12'` (min 1, max 72). Fallback `ATTENDANCE_CONFIRM_DEADLINE_HOURS` = 12. Postojeći red u bazi ostaje 24 dok ga owner ne promijeni u Settings.
- Klijent: `POST /:id/confirm-attendance` — vlasnik, `canConfirmAttendance`, `now < start − N h`. `attendanceConfirmedBy=CLIENT`.
- Staff: `POST /:id/staff-confirm-attendance` — `STYLIST` (samo `confirmedStylistId`) ili `SYSTEM_ADMIN`/`OWNER`. Status `CONFIRMED` + `CLIENT_REQUIRED`, `now < start`. `attendanceConfirmedBy=STAFF`.
- CRON: `now >= start`, još `CONFIRMED` + `CLIENT_REQUIRED` + `attendanceConfirmedAt` null → cancel + penalty (push `attendance_timeout_cancelled`). Query: `reservationDate` jučer–danas.
- Direct `STAFF_WAIVED`: bez CTA, bez CRON, start iz `CONFIRMED`.
- Nema Prisma migracije. Nema novog pusha klijentu na staff confirm.

## Out of scope

- Slot-hold, multi-booking, disposition.
- Promjena auto-start pravila.
- Client reminder push na `T − N`.
- Automatski UPDATE postojećeg settings reda u DB.
