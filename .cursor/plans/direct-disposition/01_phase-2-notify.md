# Phase 2 — Client notify

`ReservationNotifyService.notifyClientTimeChanged`:

- `type: reservation_reminder`
- `data.kind: reservation_time_changed`
- Copy: termin pomjeren, nije potrebna potvrda

Pozivi: `applyDirectReorder` (via disposition service) i `updateByAdmin` samo ako se datum/vrijeme stvarno promijene.

`updateByAdmin`: `emitToUser(clientId, reservation:updated)`.

Mobile: `reservation_time_changed` u `CLIENT_RESERVATION_KINDS`.
