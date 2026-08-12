# Mobile Socket.IO — follow-up (kad uvesti)

**Status:** implementirano (2026-08-12)  
**Datum:** 2026-08-11  
**Related:** [FINDINGS.md](./FINDINGS.md) H4, global `GlobalRealtimePolicy` (Socket.IO opt-in za reservations/notifications/settings)

## Zašto još ne sada

- ~~Mobile stylist **inbox + schedule** već koriste `useAutoRefresh` (30s, focus + AppState) — dovoljno za operativni UX.~~
- ~~Nema postojeće Socket.IO infrastrukture u `mobile/` (web ima `SocketContext`).~~
- ~~Uvođenje sada = novi dependency + root provider + auth handshake + wiring više ekrana, bez dobiti na FSM/ispravnosti.~~

**Napomena:** Polling ostaje kao fallback; interval se produži na 120s kad je socket spojen.

## Pravi trenutak za uvođenje

Uvesti Socket.IO na mobile kad je **barem jedno** od ovoga istinito:

1. **P2/M2 zatvoren** (admin calendar sockets) i želimo isti realtime ugovor na sve klijente, **ili**
2. Operativa traži **sub-sekundni** refresh inboxa/schedulea (polling 30s više nije OK), **ili**
3. Radimo **in-app notifications** realtime refresh na mobile (isti event bus kao web `notification:new`), **ili**
4. Nakon **T1 split** `reservations.service` — manji rizik paralelnih izmjena na rezervacijskom jezgru.

**Ne uvoditi** usred FSM/refaktor sprinta (M1 / T1) — prvo stabilna matrica statusa.

## Predloženi scope (kad dođe red)

### Dependency / setup

- `socket.io-client` u `mobile/package.json`
- `EXPO_PUBLIC_API_URL` kao socket base URL (isti kao axios)
- Auth: `handshake.auth.token` = JWT iz SecureStore (kompatibilno s `EventsGateway`)

### Fajlovi (cilj)

| Fajl | Uloga |
|------|--------|
| `mobile/src/realtime/socket-events.ts` | Mirror `SOCKET_EVENTS` (shared names) |
| `mobile/src/realtime/socket-client.ts` | connect/disconnect, token refresh |
| `mobile/src/hooks/useSocketEvent.ts` | subscribe/unsubscribe po eventima |
| Wiring u `app/_layout.tsx` | connect kad je user ulogovan |

### Eventi (minimum za rezervacije)

| Event | Ekrani |
|-------|--------|
| `reservation:created` | Stylist inbox |
| `reservation:updated` | Inbox + schedule + detail |
| `reservation:cancelled` | Inbox + schedule + client My Reservations |
| `reservation:confirmed` | Inbox + client My Reservations |
| `reservation:stylist_response` | Inbox |
| `availability:changed` | Client booking (opcionalno) |
| `notification:new` | Notifications tab + global badge |

Polling (`useAutoRefresh`) **zadržati** kao fallback kad socket nije connected.

### Pokrivenost (2026-08-12 review)

**Mobile:** inbox, schedule, detail, My Reservations, Services, Stats, Daily log list/detail, Reservation booking (`availability:changed`), Home/Contact/Blog (`settings`/`salon`), global `SocketRealtimeSync` (notification badge).

**Web:** admin reservations lista/kalendar, dashboard, daily log, stylist portal layout (inbox/schedule/workbook/stats/debts), client My Reservations, PublicReserve availability, SettingsProvider (`settings:updated`), Salon, Notifications page.

### Definition of Done

- [x] Provider + JWT reconnect
- [x] Inbox + schedule + client My Reservations slušaju relevantne evente
- [x] Fallback polling ostaje (interval produžen na 120s kad je socket connected)
- [ ] Kratki smoke: create reservation na webu → pojavi se u mobile inboxu bez čekanja 30s
- [x] Update FINDINGS + RESERVATION_MODULE § Realtime

## Referenca (web AS-IS)

- `frontend/src/context/SocketContext.tsx`
- Backend: `backend/src/events/events.gateway.ts`, `socket-events.ts`
