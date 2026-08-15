# HANDOFF — Policy backlog sesija (docs-sync → … → attendance-policy)

**Datum:** 2026-08-13
**Status:** docs-sync `done` · slot-hold `done` · direct-disposition `done` · multi-booking `done` · attendance-policy `done`
**Sljedeća tačka:** — (product backlog zatvoren)

Living SoT: [RESERVATION_MODULE.md](./RESERVATION_MODULE.md)
Backlog: [POLICY_BACKLOG.md](./POLICY_BACKLOG.md)
Attendance plan: [.cursor/plans/attendance-policy/](../../plans/attendance-policy/00_overview.md)

---

## Proces (obavezno)

1. **Ask** — diskusija **samo jedne** tačke (`discussing`).
2. **Plan mode** — plan u `.cursor/plans/<plan-slug>/` + link u POLICY_BACKLOG (`planned`). **Čeka odobrenje.**
3. **Agent** — implementacija tek kad je plan odobren.
4. **Zatvaranje** — `done` + MATRIX/CHANGELOG uz logičke promjene.

Ne miješati više tačaka. Ne ići u kod u istom runu kao plan.

---

## Šta je urađeno

### 0. `docs-sync`

`RESERVATION_MODULE.md` = living AS-IS. FINDINGS = arhiva. Plan: `.cursor/plans/docs-sync/`

### 1. `slot-hold`

Kapacitet = broj eligible stilista. PENDING/REVIEW troše 1. Exclusive lock + unlock. Inbox timeout 24h bez kazne. UI `holdState=pending_hold`.

Plan: `.cursor/plans/slot-hold/`
Migracija: `has_locked_once` — `cd backend && npm run db:migrate` ako nije urađeno.

### 2. `direct-disposition` (B + calendar notify)

**UX:** Complete = naplata. Disposition = izuzeci. `discard` sakriven u UI (API alias ostaje). Web reorder + `targetDate`. Copy sa posljedicama (penalty / push).

**Notify:** `reservation_time_changed` na disposition reorder **i** admin calendar PATCH (kad se datum/vrijeme stvarno promijene). `emitToUser` na PATCH. Mobile deep-link.

**Reminder:** `system_reservation_daily_log_reminder_hours` default 12. Jednokratni push stilistu (`daily_log_pending_reminder`). **Nema** auto-timeouta.

**Ne dirano:** klijentski prikaz `AWAITING_DAILY_LOG` (mobile i dalje sakriva).

Plan: `.cursor/plans/direct-disposition/`
Migracija: `pending_reminder_sent_at` — `cd backend && npm run db:migrate` ako nije urađeno.

Ključni fajlovi:

- `backend/src/reservations/reservation-notify.service.ts`
- `backend/src/reservations/reservation-update.service.ts`
- `backend/src/reservations/reservation-direct-daily-log-cron.service.ts`
- `backend/src/daily-log/daily-log-disposition.service.ts`
- `frontend/.../daily-log-disposition-panel.tsx` + Settings grupa Rezervacije
- `mobile/.../DailyLogDispositionPanel.tsx` + `resolve-push-route.ts`

### 3. `multi-booking`

M2 + unique `serviceId` po danu. Plan: `.cursor/plans/multi-booking/`

### 4. `attendance-policy` (A3)

Klijent do `T − N` (registry default 12). Staff (stilist + admin) do starta. CRON cancel na startu + kazna. Direct `STAFF_WAIVED` bez izmjene. Plan: `.cursor/plans/attendance-policy/`

---

## Odluke + razlozi

| Odluka | Zašto |
|--------|--------|
| Disposition B (reminder, ne timeout) | AWAITING ne drži slot; auto-zatvaranje bi bila kaznena politika |
| Calendar PATCH u istom planu | Isti gap: klijent ne zna da je termin pomjeren |
| `discard` samo API alias | Isti ishod kao `cancel_as_stylist`; UI je bio zbunjujući |
| Klijent ne vidi AWAITING na mobileu | Operativa: raspored → DK; nije klijentov posao |
| Kapacitet = N stilista (slot-hold) | Drugi stilist ne čeka tuđi PENDING nakon accepta |

---

## Otvoreno / rizici

1. Migracije: `has_locked_once`, `pending_reminder_sent_at` **i** `reminder_sent_at` — backend Docker sada radi `prisma migrate deploy` na startu.
2. Attendance CRON spec je prepisan na cancel na startu (A3).
3. Slot-hold i disposition nisu ručno smoke-testirani.
4. Auto-start nije u `reservation-delay.cron` ticku (pre-existing; van backlog reda).

---

## Next steps

Product backlog (docs-sync → slot-hold → disposition → multi-booking → attendance) je zatvoren.

---

## Test status

Attendance A3 specovi: staff confirm, klijent T−N, CRON na startu.

---

## Prompt za nastavak (copy-paste u novi chat)

```
Nastavi beauty-salon-v2.

Pročitaj:
- .cursor/docs/reservations/HANDOFF_SESSION.md
- .cursor/docs/reservations/POLICY_BACKLOG.md
- .cursor/docs/reservations/RESERVATION_MODULE.md

Urađeno: docs-sync, slot-hold, direct-disposition, multi-booking, attendance-policy (A3) — sve done.
Owner treba u Settings postaviti system_reservation_attendance_hours na 12 ako je DB još 24.
```
