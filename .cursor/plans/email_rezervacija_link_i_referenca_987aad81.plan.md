---
name: Email rezervacija link i referenca
overview: Zamijeniti prikaz UUID-a čitljivijom referencom, uvesti nepredvidljiv token za javni pregled jedne rezervacije (bez prijave), uskladiti CTA u mailovima i proširiti podatke koje šalje `ReservationsService` u notifikacije.
todos:
  - id: schema-migration
    content: Dodati publicReferenceCode i clientViewToken na Reservation + migracija s backfillom
    status: completed
  - id: generate-on-create
    content: Generisati kod i token u reservations.service create(); proširiti data u notifications.send pozivima
    status: completed
  - id: public-api-dto
    content: GET @Public() by token + ReservationsService.findPublicByViewToken sa ograničenim DTO
    status: completed
  - id: email-cta-vars
    content: "buildNotificationEmailContent: referenca, CTA URL, zamjena {{appUrl}}/{{reservationReference}}/{{reservationViewUrl}}"
    status: completed
  - id: frontend-public-page
    content: Nova public ruta i stranica koja učitava i prikazuje detalje
    status: completed
  - id: email-settings-defaults
    content: Ažurirati default šablone u EmailSettings.tsx za rezervacijske tipove
    status: completed
isProject: false
---

# Plan: referenca, siguran link i pregled rezervacije iz emaila

## Uzrok trenutnog ponašanja

- U [`backend/src/notifications/notifications.service.ts`](../../backend/src/notifications/notifications.service.ts), metoda `buildNotificationEmailContent` uvijek dodaje red `Referenca rezervacije: ${reservationId}` kada u `data` postoji `reservationId` — to je sirovi UUID (linije ~497–542).
- Za klijentske tipove (`reservation_confirmed`, `reservation_cancelled`, `reservation_reminder`, `reservation_reschedule`) podrazumijevani CTA je `publicReservationsUrl = ${appUrl}/rezervacija`, što na frontu vodi na [`PublicReserve`](../../frontend/src/pages/public/PublicReserve.tsx) ([`public.routes.tsx`](../../frontend/src/app/routes/public.routes.tsx) — ruta `rezervacija`), tj. na **novu** rezervaciju, ne na detalj postojeće.
- Pristup detalju danas zahtijeva JWT i prolazi kroz [`ReservationsService.findOne`](../../backend/src/reservations/reservations.service.ts) (provjera `clientId`, stilista ili admin).

## Predloženo rješenje

### 1. Čitljiva referenca (umjesto UUID u tekstu)

- U Prisma modelu [`Reservation`](../../backend/prisma/schema.prisma) dodati npr. **`publicReferenceCode`** (`String`, `@unique`): kratki, čitljiv kod za korisnika i podršku (npr. format `RZ-20260410-XXXX` ili alfanumerički kod fiksne duljine generisan pri kreiranju rezervacije).
- Pri kreiranju rezervacije u [`reservations.service.ts`](../../backend/src/reservations/reservations.service.ts) (`create`) postaviti vrijednost uz provjeru jedinstvenosti (retry ako kolizija).
- Migracija: **backfill** postojećih redova istom logikom da stari termini imaju kod.
- U emailu: prikazivati **`publicReferenceCode`** (npr. „Broj termina: …”) umjesto UUID-a; UUID uopće ne prikazivati klijentu u mailu.

### 2. Siguran link na puni pregled (bez prijave)

- Na istom modelu dodati **`clientViewToken`** (`String`, `@unique`): dugi slučajni token (npr. 32+ bajta hex / `nanoid`), generisan pri kreiranju rezervacije.
- Novi **javni** endpoint (npr. `GET /api/public/reservations/by-token/:token` ili `GET /api/public/reservations/view?token=`) označen sa `@Public()` (isti obrazac kao u [`services.controller.ts`](../../backend/src/services/services.controller.ts)), implementacija u novom malom kontroleru ili postojećem modulu rezervacija.
- Servis vraća **ograničen DTO** (read-only): datum, vrijeme, naziv usluge, status, ime stilista (bez osjetljivih internih ID-eva gdje nije potrebno), predloženi termin ako postoji `rescheduleStatus`, razlog otkazivanja ako je otkazano — sve što smatrate „punim detaljem” za klijenta, ali ne admin/stilist panel.
- Zaštita: token je tajna kao magic link; bez validnog tokena 404; po želji **Throttler** / rate limit na rutu da se smanji brute-force; u produkciji osloniti se na HTTPS.

### 3. Email: CTA i ostale rezervacijske notifikacije

- U `buildNotificationEmailContent` za tipove koji nose `reservationId` u `data`:
  - ako postoji `clientViewToken` u `data` (ili se dohvati pri slanju), postaviti CTA na npr. **`${appUrl}/moj-termin/${clientViewToken}`** (ili `/rezervacija/pregled?token=…` — jedna konvencija kroz cijeli projekat).
- Zamijeniti `reservationLine` logiku: koristiti **`publicReferenceCode`** iz `data` umjesto UUID-a; ako kod nedostaje (stari mailovi prije migracije), fallback: samo tekst bez UUID-a ili kratak generisani prikaz.
- **Zamjena placeholdera u admin šablonima**: danas se `{{appUrl}}` u notification emailima možda ne zamjenjuje (za razliku od kampanja u `applyCampaignVariables`). U istoj gradi emaila dodati zamjenu za `{{appUrl}}`, **`{{reservationReference}}`**, **`{{reservationViewUrl}}`** kako bi Email postavke u [`frontend/src/pages/EmailSettings.tsx`](../../frontend/src/pages/EmailSettings.tsx) radile predvidljivo.
- Ažurirati **default vrijednosti** u `EmailSettings.tsx` za `reservation_confirmed`, `reservation_cancelled`, `reservation_reminder`, `reservation_reschedule` (`ctaUrl` i `body`) da koriste nove varijable.

### 4. Frontend: javna stranica detalja

- Nova ruta u [`public.routes.tsx`](../../frontend/src/app/routes/public.routes.tsx), npr. `moj-termin/:token`, komponenta koja poziva javni API i prikazuje karticu u stilu postojećeg javnog sajta (Tailwind, isti layout kao ostale public stranice).
- Stanja: učitavanje, greška (nevažeći token), prikaz svih polja iz DTO-a.

### 5. Povezivanje pri slanju notifikacija

- U [`reservations.service.ts`](../../backend/src/reservations/reservations.service.ts) na mjestima gdje se šalje email klijentu s `data: { reservationId }` (npr. potvrda stilista ~816–822, otkaz jer su svi odbili ~909–915), proširiti `data` sa **`publicReferenceCode`** i **`clientViewToken`** (učitati iz baze prije `send` ili vratiti iz transakcije nakon kreiranja).
- **Pregled ostalih `notifications.send` poziva**: većina reschedule/reminder/no-show koristi `channel: 'PUSH'` — email se ne šalje; ako korisnik u budućnosti uključi email i za te tipove, ista CTA/referenca logika već će raditi ako `data` bude obogaćen. `reservation_new` za stiliste i dalje ide na `/admin/reservations` — može ostati; po želji kasnije `?id=` za highlight.

## Sažetak datoteka

| Područje | Datoteke |
|---------|-----------|
| Šema + migracija | [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma), nova migracija |
| API | novi public controller + metoda u `ReservationsService` za DTO po tokenu |
| Kreiranje rezervacije | [`backend/src/reservations/reservations.service.ts`](../../backend/src/reservations/reservations.service.ts) |
| Email | [`backend/src/notifications/notifications.service.ts`](../../backend/src/notifications/notifications.service.ts) |
| Default šabloni | [`frontend/src/pages/EmailSettings.tsx`](../../frontend/src/pages/EmailSettings.tsx) |
| UI | [`frontend/src/app/routes/public.routes.tsx`](../../frontend/src/app/routes/public.routes.tsx), nova stranica npr. `PublicReservationView.tsx` |

## Napomena o sigurnosti

Link sa tokenom omogućava svakome s linkom da vidi detalje termina (isto kao većina „view booking” linkova u salonima). To je prihvatljivo uz dug token i HTTPS; ne uključivati u javni DTO podatke koje klijent ne bi trebao vidjeti (npr. interne napomene stilista ako postoje).
