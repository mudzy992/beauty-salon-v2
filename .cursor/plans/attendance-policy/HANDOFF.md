# HANDOFF — attendance-policy

Vidi session handoff: `.cursor/docs/reservations/HANDOFF_SESSION.md`.

Plan A3 odobren i implementiran 2026-08-13.
- Klijent: `T − N` (registry default 12; postojeći DB red može ostati 24 dok owner ne promijeni Settings).
- Staff: `POST /:id/staff-confirm-attendance` do starta.
- CRON: cancel na `now >= start`.
