# HANDOFF — direct-disposition

**Datum:** 2026-08-13  
**Status:** done

## Urađeno

- UX/copy: complete = naplata; disposition = izuzeci; `discard` nije u UI (API alias ostaje).
- Web reorder šalje `targetDate`.
- `notifyClientTimeChanged` (`kind: reservation_time_changed`) na DK reorder i admin PATCH kad se slot promijeni.
- Admin PATCH: `emitToUser(clientId)`.
- Reminder CRON (default 12h) → stilist `daily_log_pending_reminder`; nema auto-zatvaranja.
- Docs: MODULE, MATRIX, POLICY_BACKLOG.

## Odluke

- B: reminder da, auto-timeout ne.
- Calendar notify u istom planu.
- Klijent i dalje ne vidi `AWAITING_DAILY_LOG` na mobileu.

## Otvoreno / rizici

- Migracija `pending_reminder_sent_at`: `cd backend && npm run db:migrate` ako nije primijenjena.
- `processAttendanceDeadlines` spec i dalje faila (pre-existing TZ/mock).
- Auto-start nije u `reservation-delay.cron` ticku (pre-existing; nije dio ove tačke).

## Next

`multi-booking` (`next`).
