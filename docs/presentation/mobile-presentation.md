# Mobile prezentacija (Expo SDK 57) — workflow rezervacije

Ovaj dokument je walkthrough za prezentaciju, ne runtime test ni formalni API ugovor. Kod i audit dokumenti imaju prednost; device/push ponašanje nije ovdje runtime-verified.

- Referenca (mapa koda): [docs/codebase-map/MOBILE.md](../codebase-map/MOBILE.md)
- Aktuelni sažetak: [SOURCE_OF_TRUTH.md](../../SOURCE_OF_TRUTH.md)
- Arhitektura, findings i test scope: [docs/audit/ARCHITECTURE.md](../audit/ARCHITECTURE.md), [docs/audit/FINDINGS.md](../audit/FINDINGS.md), [docs/audit/TEST_WORKFLOW.md](../audit/TEST_WORKFLOW.md)

## 1) Dvije aplikacije u jednoj: Client vs Stylist mode

Gate/redirect logika: `mobile/app/index.tsx`
- ako korisnik **nije prijavljen** → `/login`
- ako `mustChangePassword` → `/onboarding/change-password`
- client onboarding enforcement (gender/email/phone) prije pristupa tabovima
- ako korisnik ima STYLIST rolu, može prebaciti mode (client ↔ stylist) i ulazi u `/stylist/inbox` ili `/home`

```mermaid
flowchart TD
  login[Login/Register] --> gate[IndexGate]
  gate -->|ClientMode| clientTabs[ClientTabs(Home/Services/Reservations/Profile)]
  gate -->|StylistMode| stylistTabs[StylistTabs(Inbox/DailyLog/Schedule/Stats/Profile)]
```

## 2) Client workflow (rezervacija → praćenje → attendance/cancel)

### 2.1 Kreiranje rezervacije (wizard, 4 koraka)

Implementacija: `mobile/src/screens/client/ReservationScreen.tsx`

**Koraci**:
- **Step 1 — izbor servisa**: učitava `/api/services?activeOnly=true`; filtrira po `user.gender`.
- **Step 2 — izbor datuma**: učitava dostupne datume preko  
  `GET /api/reservations/availability/dates?serviceIds=...&fromDate&toDate`
- **Step 3 — izbor termina**: učitava slotove preko  
  `GET /api/reservations/availability/slots?serviceIds=...&date=YYYY-MM-DD`
- **Step 4 — potvrda i submit**: kreira rezervaciju preko `POST /api/reservations`

**Loyalty (ako uključeno)**:
- nakon izbora slota, ekran pokušava učitati `GET /api/loyalty/client/me?serviceIds=...`
- user bira `desiredLoyaltyPercent` (0..allowed), ali backend je autoritativan za validaciju bodova i limita

### 2.2 “Moje rezervacije” (lista + akcije)

Implementacija: `mobile/src/screens/client/MyReservationsScreen.tsx`

**Šta radi ekran**:
- učitava rezervacije sa `GET /api/reservations?asClient=true`
- auto refresh (npr. svakih 30s) da korisnik vidi promjene i reorder/reschedule prijedloge

**Akcije klijenta**:
- **Otkazivanje**: `POST /api/reservations/:id/cancel` (uzima opcioni `cancelReason`)
- **Potvrda dolaska (24h pravilo)**: `POST /api/reservations/:id/confirm-attendance`
- **Reschedule/Reorder prijedlog** (`rescheduleStatus='PENDING'`):
  - accept: `POST /api/reservations/:id/reschedule/accept`
  - decline: `POST /api/reservations/:id/reschedule/decline`  
    UI jasno objašnjava razliku: “rekalkulacija” može otkazati rezervaciju, a “reorder prijedlog” zadržava originalni termin.

**Konzistentan label za attendance auto-otkaz**:
- `CANCELLED_BY_CLIENT` + `cancelReason === 'Nije potvrđen dolazak u roku'` prikazati kao **“Otkazano (nepotvrđen dolazak)”** (već implementirano u listi).

## 3) Stylist workflow (inbox → start → complete/no-show → daily log)

### 3.1 Inbox (odgovor na nove zahtjeve)

Implementacija: `mobile/src/screens/stylist/StylistInboxScreen.tsx`

**Osnovni tok**:
- lista se puni iz `GET /api/reservations?asStylist=true`
- stilist vidi `PENDING` i `STYLIST_REVIEW`
- akcije:
  - **Lock**: `POST /api/reservations/:id/stylist/:stylistProfileId/lock`
  - **Accept**: `POST /api/reservations/:id/stylist/:stylistProfileId/accept`
  - **Reject**: `POST /api/reservations/:id/stylist/:stylistProfileId/reject` (opcioni `rejectionReason`)

Ekran može informativno prikazati dugovanja klijenta (`/api/client-debts`) prije accept-a.

### 3.2 Detalj termina (start gate, no-show, complete, reorder)

Implementacija: `mobile/src/screens/stylist/StylistReservationDetailScreen.tsx`

**Start (ručni gate)**:
- dugme start se pojavljuje samo za `ATTENDANCE_CONFIRMED` i samo ako je stilist “confirmed”
- ekran provjerava blokadu:
  - “još nije počeo” (prije plannedStart)
  - postoji raniji termin tog dana koji čeka obradu (fetch `/api/reservations?asStylist=true&fromDate=day&toDate=day`)

**Complete**:
- dostupno samo kad je `IN_PROGRESS`
- kompletiranje obično vodi na upis “stvarno naplaćeno” (`actualPrice`) i bilješke, što se dalje reflektuje u KIF-u

**No-show**:
- dostupno kad je `CONFIRMED` ili `ATTENDANCE_CONFIRMED` (uz confirmed stylist)
- opcija penalizacije (prema domenskim pravilima)

**Reschedule/Reorder**:
- ekran ima modal/unos za `reorder` (target start/end time) i preview tokove za reschedule zbog overruna ili manual shift-a (povezano sa backend reschedule API-jima).

## 4) Push notifikacije (Expo SDK 57) — kod-level behavior

Implementacija: `mobile/src/hooks/usePushNotifications.real.ts` + wrapper `usePushNotifications.ts`

- **Uslovno uključivanje**: ako `EXPO_PUBLIC_PUSH_ENABLED !== 'true'`, koristi se “no-op” hook (da Expo Go ne baca greške).
- **Token registracija**:
  - generiše Expo token (`getExpoPushTokenAsync`) uz `EXPO_PUBLIC_EAS_PROJECT_ID`
  - registruje token na backend: `POST /api/notifications/push-token`
- **Tap routing** (minimalno):
  - `reservation_reschedule|reservation_reorder|delay_warning` vodi korisnika na `/reservations` i fokusira odgovarajuću rezervaciju ako `reservationId` postoji

**Ograničenje (bitno za prezentaciju)**:
- Push zavisi od Expo projekta, build profila, uređaja i runtime permissions. Test delivery samo u konfigurisanom development/production build-u i sa sintetičkim nalogom; ova isporuka nije provjerena u auditu.

