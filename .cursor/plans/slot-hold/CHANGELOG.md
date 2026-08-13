# slot-hold CHANGELOG

## 2026-08-13

- Implementiran kapacitetni hold: PENDING/REVIEW troše 1 slot-kapacitet.
- Exclusive lock, unlock, hasLockedOnce, inbox timeout 24h.
- Booking UI: `pending_hold` disabled + copy.
- Migracija: `has_locked_once` na `reservation_stylist_responses`.
