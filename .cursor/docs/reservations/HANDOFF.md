# HANDOFF — Direct booking auto DK + disposition

**Datum:** 2026-08-12  
**Status:** Implementirano  
**Living docs:** opis toka je u [RESERVATION_MODULE.md](./RESERVATION_MODULE.md) §6.5 / §3.2 (docs-sync 2026-08-13). Ovaj fajl ostaje implementacioni snapshot.

## Urađeno

1. **Rename UI** → „Direktna rezervacija“ (web admin, stylist web/mobile)
2. **Mobile client card** → naslov = `publicReferenceCode`, lista servisa ispod
3. **Status `AWAITING_DAILY_LOG`** — FSM, van rasporeda stiliste, nije u slot blocking
4. **CRON** — nakon isteka `endTime` za direct waived rezervacije seed PENDING DK + transition
5. **Disposition API** — `POST /api/daily-log/:id/dispose` (5 akcija)
6. **Stylist DK UI** — disposition panel web (workbook detail) + mobile (DailyLogDetailScreen)
7. **Docs** — MATRIX + CHANGELOG ažurirani

## Ključni fajlovi

- `backend/src/daily-log/daily-log-seed-from-direct.service.ts`
- `backend/src/reservations/reservation-direct-daily-log-cron.service.ts`
- `backend/src/daily-log/daily-log-disposition.service.ts`
- `frontend/src/features/stylist-workbook/components/daily-log-disposition-panel.tsx`
- `mobile/src/screens/stylist/DailyLogDispositionPanel.tsx`

## Test

```bash
cd backend && npm run build && npm test -- reservation-policy.spec.ts
cd frontend && npm run build
```

## Napomena

Prisma migracija `staff_direct_booking_policy` već primijenjena u prethodnoj sesiji. Novi status je string u postojećoj `status` koloni — dodatna migracija nije potrebna.
