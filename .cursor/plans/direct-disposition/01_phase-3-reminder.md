# Phase 3 — Reminder (nema auto-timeout)

Setting `system_reservation_daily_log_reminder_hours` (default 12).

Prisma: `DailyLogEntry.pendingReminderSentAt`.

CRON: PENDING DK + `AWAITING_DAILY_LOG` stariji od N sati → jednokratni push stilistu (`daily_log_pending_reminder`). Ne mijenja status.
