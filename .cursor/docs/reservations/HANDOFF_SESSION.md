# HANDOFF — Policy backlog sesija (docs-sync → slot-hold → direct-disposition → multi-booking)

**Datum:** 2026-08-13
**Status:** docs-sync `done` · slot-hold `done` · direct-disposition `done` · multi-booking `done`
**Sljedeća tačka:** `attendance-policy` (`queued`)

Living SoT: [RESERVATION_MODULE.md](./RESERVATION_MODULE.md)
Backlog: [POLICY_BACKLOG.md](./POLICY_BACKLOG.md)
Direct snapshot: [HANDOFF.md](./HANDOFF.md) (2026-08-12)
Disposition plan: [.cursor/plans/direct-disposition/](../../plans/direct-disposition/00_overview.md)

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

1. Migracije: `has_locked_once` **i** `pending_reminder_sent_at` — `cd backend && npm run db:migrate`.
2. Test: `processAttendanceDeadlines` u `reservations.service.spec.ts` faila (cancelledCount 0) — pre-existing TZ/mock.
3. Slot-hold i disposition nisu ručno smoke-testirani.
4. Auto-start nije u `reservation-delay.cron` ticku (pre-existing; van backlog reda).

---

## Next steps

1. Nova sesija s promptom ispod.
2. Ask: samo `attendance-policy`.
3. Plan mode → odobrenje → Agent implementacija.

---

## Test status

Pokrenuto (multi-booking): Jest `assert-client-day-booking.spec`, `reservation-update.service.spec`, `reservation-reschedule-commit.service.spec`, create/reorder/accept u `reservations.service.spec` — **pass**.

Pre-existing fail: attendance CRON spec (`cancelledCount` 0).

Nije pokrenuto: `db:migrate` (obje starije migracije), frontend/mobile build, E2E.

---

## Prompt za nastavak (copy-paste u novi chat)

```
Nastavi beauty-salon-v2 rezervacije policy backlog.

Pročitaj:
- .cursor/docs/reservations/HANDOFF_SESSION.md
- .cursor/docs/reservations/POLICY_BACKLOG.md
- .cursor/docs/reservations/RESERVATION_MODULE.md
- .cursor/docs/matrices/reservations/MATRIX.md

Proces (obavezno):
1. Ask diskusija — SAMO jedna tačka.
2. Plan mode — snimi plan, link u POLICY_BACKLOG, ČEKAJ odobrenje.
3. Agent implementacija — tek nakon odobrenog plana.
Ne radi kod u istom runu kao plan.

Urađeno: docs-sync done, slot-hold done, direct-disposition done, multi-booking done.
Migracije (ako nisu primijenjene): cd backend && npm run db:migrate
  (has_locked_once + pending_reminder_sent_at).

Sljedeća tačka: attendance-policy (status next).
AS-IS: Rok iz settings (system_reservation_attendance_hours, fallback 24h);
confirmAttendance samo klijent; direct = STAFF_WAIVED.
Otvorena pitanja: Default sati? Staff confirm na CLIENT_REQUIRED — admin only ili admin+stilist? Dozvoljeno i nakon T−Nh?

Počni Ask diskusijom za attendance-policy. Ne diraj slot-hold/direct-disposition/multi-booking dok ova tačka nema odobren plan.
```
