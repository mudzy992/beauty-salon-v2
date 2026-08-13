# Skill: Reservation Flow

Koristi se za implementaciju i debug rezervacijskog toka.
Sve operacije moraju koristiti Repository layer i pratiti backend-architecture.mdc pravila.

## Kad koristiti
- Implementacija availability enginea (slobodni datumi, slotovi, lock/accept/reject).
- Ispravljanje bugova u statusima rezervacija ili notifikacijama.

## Šta raditi
1. Slijedi FSM iz `.cursor/rules/reservation-engine.mdc`: PENDING -> STYLIST_REVIEW -> CONFIRMED -> ATTENDANCE_CONFIRMED -> ...
2. Dostupnost: kombinuj salon_working_hours, holidays, stylist_working_hours, stylist_services, postojeće rezervacije i pauseBetweenServices.
3. Lock: jedan stilist LOCKED (ekskluzivno, bez steal); TTL `reservationLockMinutes` auto-release. Isti stilist ne locka 2×; unlock ili accept/reject.
4. Ako svi stilisti odbiju -> CANCELLED_BY_STYLISTS; obavijesti klijenta (push/email).
5. Klijent mora potvrditi dolazak najkasnije 24h prije starta; CRON otkazuje CONFIRMED bez potvrde na/poslije roka.
6. Slot kapacitet: PENDING/REVIEW troše 1; CONFIRMED+ tog stilista. Complete ide isključivo preko dnevne knjige.

## Reference
- `.cursor/rules/reservation-engine.mdc`
- `backend/prisma/schema.prisma` (Reservation, ReservationStylistResponse)
