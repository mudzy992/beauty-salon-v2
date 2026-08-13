# Mobile Socket.IO — AS-IS

**Status:** implementirano (2026-08-12)  
**Related:** [FINDINGS.md](./FINDINGS.md) H4, [RESERVATION_MODULE.md](./RESERVATION_MODULE.md) §14, `GlobalRealtimePolicy`

## Sažetak

Socket.IO je na mobile-u aktivan: `SocketProvider` u root layoutu, JWT handshake, event wiring na inbox/schedule/detail/My Reservations/notifications (+ ostalo po reviewu). Polling ostaje fallback; interval 120s kad je socket spojen, inače ~30s.

## Pokrivenost

**Mobile:** inbox, schedule, detail, My Reservations, Services, Stats, Daily log list/detail, Reservation booking (`availability:changed`), Home/Contact/Blog (`settings`/`salon`), global `SocketRealtimeSync` (notification badge).

**Web:** admin reservations lista/kalendar, dashboard, daily log, stylist portal layout, client My Reservations, PublicReserve availability, SettingsProvider, Salon, Notifications.

## Definition of Done

- [x] Provider + JWT reconnect
- [x] Inbox + schedule + client My Reservations slušaju relevantne evente
- [x] Fallback polling (120s kad je socket connected)
- [ ] Kratki smoke: create na webu → mobile inbox bez čekanja 30s (ops)
- [x] Update FINDINGS + RESERVATION_MODULE § Realtime

## Referenca

- `mobile/src/realtime/*`, wiring u `app/_layout.tsx`
- Web: `frontend/src/context/SocketContext.tsx`
- Backend: `backend/src/events/events.gateway.ts`, `socket-events.ts`

## Eventi (rezervacije)

| Event | Ekrani |
|-------|--------|
| `reservation:created` | Stylist inbox |
| `reservation:updated` | Inbox + schedule + detail |
| `reservation:cancelled` | Inbox + schedule + client My Reservations |
| `reservation:confirmed` | Inbox + client My Reservations |
| `reservation:stylist_response` | Inbox |
| `availability:changed` | Client booking (opcionalno) |
| `notification:new` | Notifications tab + global badge |
