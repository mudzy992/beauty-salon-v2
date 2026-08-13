# direct-disposition CHANGELOG

## 2026-08-13

- UX: `discard` sakriven; complete vs izuzeci; web reorder + datum; copy sa posljedicama.
- Push klijentu `reservation_time_changed` na disposition reorder i admin calendar PATCH.
- Reminder stilistu: `system_reservation_daily_log_reminder_hours` (default 12), `pendingReminderSentAt`, bez auto-timeouta.
- Migracija: `pending_reminder_sent_at` na `daily_log_entries`.
