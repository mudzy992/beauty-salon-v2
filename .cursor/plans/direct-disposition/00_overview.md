# Plan: direct-disposition — polish + reminder + calendar notify

**Datum:** 2026-08-13  
**ID:** `direct-disposition` (POLICY_BACKLOG #2)  
**Odluka (Ask):** opcija B — UX/copy + reminder, **bez** auto-timeouta. Kalendar `PATCH` notify **ulazi**.

## Cilj

Direct disposition panel jasan za stilistu (complete vs izuzeci), klijent dobija informational push kad se termin odmah pomjeri (DK reorder + admin kalendar), stilist dobija jednokratni reminder za zaglavljeni PENDING DK.

## Scope

Ulazi:

- Copy + hijerarhija; ukloniti `discard` iz UI (API alias ostaje)
- Web reorder + `targetDate`
- Push `reservation_time_changed` na disposition reorder i admin calendar PATCH
- Reminder stilistu (`system_reservation_daily_log_reminder_hours`, default 12)

Ne ulazi:

- Auto-timeout / auto-dispose
- Klijentski prikaz `AWAITING_DAILY_LOG`
- Standardni stylist reorder (već ima propose + push)
- `multi-booking`, `attendance-policy`, slot-hold

## Faze

1. UX/copy — [01_phase-1-ux.md](./01_phase-1-ux.md)
2. Client notify — [01_phase-2-notify.md](./01_phase-2-notify.md)
3. Reminder CRON — [01_phase-3-reminder.md](./01_phase-3-reminder.md)
4. Docs + testovi — [01_phase-4-docs.md](./01_phase-4-docs.md)

Checklist: [CHECKLIST.md](./CHECKLIST.md)
