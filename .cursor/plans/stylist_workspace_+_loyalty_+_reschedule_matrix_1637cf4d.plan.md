---
name: Stylist workspace + loyalty + reschedule matrix
overview: Dorada Stylist workspace (mobile + web) sa loyalty u ručnom dnevniku, boljim rasporedom/detaljima/akcijama, startovanjem rezervacije i logikom probijanja termina sa push + obaveznom potvrdom klijenta, plus disable prošlih slotova pri rezervaciji.
todos:
  - id: schema-migrations
    content: Poravnati Prisma šemu i generisati migracije (loyalty kolone + daily-log loyalty + reservation start/reschedule tracking).
    status: completed
  - id: dailylog-loyalty
    content: Dodati redeem loyalty u `DailyLogEntry` create/update (backend) + UI u mobile `DailyLogNewEntryScreen` i web `DailyLog.tsx`.
    status: completed
  - id: dailylog-listing
    content: "Mobile dnevnik: inicijelno grupisati kao Danas/Ova sedmica/Prošla sedmica/Ostalo + sortiranje po statusu i datumu."
    status: completed
  - id: schedule-detail-and-status-ui
    content: "Mobile raspored: status isticanje + sortiranje + novi detalj ekran sa akcijama."
    status: completed
  - id: start-reservation
    content: Backend endpoint za start + mobile prikaz aktivne rezervacije i akcije.
    status: completed
  - id: delay-matrix-reschedule
    content: Implementirati delay matricu (cron + endpoints) + push notifikacije sa data payloadom + deep-link flow accept/decline.
    status: in_progress
  - id: disable-past-slots
    content: Backend filtriranje prošlih slotova za danas + defanzivni UI disable (web+mobile).
    status: completed
isProject: false
---

## Ciljevi (po tačkama)

- **Loyalty u ručnom unosu dnevne knjige (mobile+web)**: ako je servis loyalty-enabled i klijent ima aktivan loyalty račun, omogućiti izbor popusta/iskorištavanja bodova i evidentirati ga u dnevniku.
- **Dnevna knjiga (mobile)**: prikaz „trenutne knjige“ grupisano kao **danas**, **ova sedmica**, **prošla sedmica**, **ostalo**; sortiranje **po statusu**, a unutar statusa **po datumu**.
- **Raspored (mobile)**: vizuelno jače istaknuti statuse (koristiti postojeće „default“ varijante), uvesti **detalje rezervacije** ekran i prebaciti akcije u detalje.
- **Start rezervacije + aktivna rezervacija (mobile+backend)**: stilist može startovati termin (status `IN_PROGRESS`, `startedAt`), a app prikazuje „pokrenutu rezervaciju“ sa svim akcijama (naplata, završetak, before/after).
- **Matrica probijanja termina (backend+mobile+push)**: kada rezervacija probije termin, koristiti `pauseBetweenServices` (global) da se:
  - ponudi stilisti opcija “iskoristi pauzu” (ako delay <= pauza)
  - ako delay prelazi prag, automatski obavijestiti sve buduće klijente tog dana
  - nakon završetka, izvršiti rekalkulaciju budućih termina (sa opcijom uključivanja pauza), prikazati novi raspored stilisti i tek nakon potvrde omogućiti “Obavijesti klijente” (push + deep-link), gdje klijent mora **potvrditi ili odbiti** novi termin.
- **Rezervacija (mobile+web)**: pri izboru termina disable/isključiti slotove koji su već prošli u odnosu na “sad”.

## Šta već postoji (oslanjamo se na to)

- **Pauza**: `salon_settings.pauseBetweenServices` se već koristi u slot kalkulaciji u `backend/src/reservations/availability.service.ts` (poziv `generateSlots(..., salon.pauseBetweenServices)`).
- **Push**: postoji `backend/src/notifications/notifications.service.ts` (podržava `data` payload) i mobile registracija tokena u `mobile/src/hooks/usePushNotifications.real.ts` (listener još nema routing).
- **Loyalty za rezervacije**: `desiredLoyaltyPercent` → `LoyaltyService.redeemForReservation(...)` (backend) + UI već postoji u mobilnom i web public rezervisanju.

## Dizajn odluka / pretpostavke (da krenemo bez blokade)

- **"Trenutna knjiga" (dnevnik)**: inicijelno prikazujemo grupisano kao **danas**, **ova sedmica**, **prošla sedmica**, **ostalo**. U svakoj grupi sortiramo zapise tako da su prvo `PENDING` pa `COMPLETED`, a unutar toga po datumu (novije prvo).
- **Loyalty u dnevniku**: dodajemo loyalty atribute na `DailyLogEntry` (analogno `Reservation`) i uvodimo redeem tok `redeemForDailyLog` (REDEEM transakcija sa source `daily_log:<id>`). Earn na kompletiranju ostaje kao danas.
- **Reschedule potvrda je obavezna**: uvodimo „pending reschedule“ stanje na rezervaciji (novi status ili flag) dok klijent ne potvrdi/odbije.

## Backend promjene (NestJS + Prisma)

- **Prisma (migracije)**:
  - Poravnati šemu i bazu za loyalty kolone koje postoje u `schema.prisma` ali nisu u inicijalnoj migraciji (Servis+Reservation loyalty polja).
  - Dodati loyalty polja na `DailyLogEntry`:
    - `loyaltyDiscountPercent Int @default(0)`
    - `loyaltyDiscountAmount Decimal @default(0)`
    - `loyaltyPointsUsed Int @default(0)`
  - Dodati polja za start/finish i reschedule tracking na `Reservation`:
    - `startedAt DateTime?`, `completedAt DateTime?` (ako nema)
    - `rescheduleProposedStartTime String?`, `rescheduleProposedEndTime String?`, `rescheduleStatus String?` (npr. `PENDING|ACCEPTED|DECLINED`) ili novi status.
- **LoyaltyService** (`backend/src/loyalty/loyalty.service.ts`):
  - Implementirati `redeemForDailyLog({ clientId, dailyLogEntryId, serviceId, desiredPercent, basePrice })` analogno `redeemForReservation`.
- **Daily log API** (`backend/src/daily-log/`*):
  - Proširiti `CreateDailyLogEntryDto` i `UpdateDailyLogEntryDto` sa `desiredLoyaltyPercent?: number` (ili direktno `loyaltyDiscountPercent`), validacija kao u `CreateReservationDto`.
  - U `DailyLogService.create/update`:
    - ako je `clientId` prisutan i `desiredLoyaltyPercent>0`, pozvati `redeemForDailyLog` i upisati izračunate `loyalty`* vrijednosti na entry.
- **Start/finish + reschedule** (`backend/src/reservations/`*):
  - Novi endpointi (stylist-only):
    - `POST /api/reservations/:id/stylist-start`
    - postojeći `stylist-mark-complete` ostaje, ali će postaviti `completedAt` i pokrenuti reschedule recalculation.
  - Slotovi u prošlosti: u `AvailabilityService.getAvailableSlots` filtrirati slotove kada je `dateStr` == danas tako da `slot.startTime` < “now” → ne vraćati (backend-level, koristiće ga i web i mobile).
- **Matrična logika probijanja termina (cron + servis)**:
  - Uvesti servis npr. `backend/src/reservations/reservation-delay.service.ts` + `@Cron` job:
    - prati `IN_PROGRESS` rezervacije
    - računa `delayMinutes = now - plannedEndTime`
    - prag za auto-notify:
      - ako `delayMinutes >= pauseBetweenServices/2` i stilist nije izabrao “koristi cijelu pauzu” → obavijesti buduće klijente tog dana
  - Uvesti API da stilist označi odluku:
    - `POST /api/reservations/:id/use-break` (npr. `{ useBreak: true }`)
  - Rekalkulacija budućih termina + opcija “include breaks”:
    - endpoint koji vraća predloženi novi raspored (dry-run)
    - endpoint koji “commit-a” promjene i kreira notifikacije sa `data` payloadom za deep-link.
  - Klijent potvrđuje/odbija deep-linkom:
    - `POST /api/reservations/:id/reschedule/accept`
    - `POST /api/reservations/:id/reschedule/decline` (što vodi u cancel ili alternativni tok)

## Mobile promjene (Expo)

- **DailyLogNewEntryScreen** (`mobile/src/screens/stylist/DailyLogNewEntryScreen.tsx`):
  - Nakon odabira servisa + klijenta: povući `GET /api/loyalty/client/me?serviceId=...`.
  - Ako `enabled && hasAccount && redeemEnabled`: UI kontrola za `desiredLoyaltyPercent` + prikaz max/iznosa → `POST /api/daily-log` šalje `desiredLoyaltyPercent`.
- **DailyLogListScreen** (`mobile/src/screens/stylist/DailyLogListScreen.tsx`):
  - Inicijelno grupisati zapise kao: **Danas**, **Ova sedmica**, **Prošla sedmica**, **Ostalo** (na osnovu `entry.date`).
  - Unutar svake grupe: sortirati po **statusu** (`PENDING` prije `COMPLETED`), pa po `date` (desc).
  - UX detalj: “Ova sedmica” i “Prošla sedmica” koristiti ISO sedmice (pon-ned) da grupisanje bude očekivano.
- **StylistScheduleScreen** (`mobile/src/screens/stylist/StylistScheduleScreen.tsx`):
  - Tap na termin uvijek vodi na novi `StylistReservationDetailScreen`.
  - List prikaz sortira po **statusu** (npr. `IN_PROGRESS` prvo, zatim `ATTENDANCE_CONFIRMED`, `CONFIRMED`, ...) pa po vremenu.
  - Badge styling uskladiti sa “default” varijantama (postoje `Badge/getStatusVariant`).
- **Novi ekran detalja + aktivna rezervacija**:
  - `mobile/src/screens/stylist/StylistReservationDetailScreen.tsx`:
    - prikaz kompletnog detalja
    - akcije: Start, Cancel, Naplata→daily-log (postojeći flow), Finish, before/after (rezervacijske slike ili preusmjeravanje na daily-log)
  - „Active reservation“ prikaz: ili banner na vrhu rasporeda ili dedicated screen koji se otvara automatski kad postoji `IN_PROGRESS`.
- **Push routing** (`mobile/src/hooks/usePushNotifications.real.ts`):
  - Implementirati `addNotificationResponseReceivedListener` da čita `response.notification.request.content.data` i navigira na odgovarajući ekran (npr. `MyReservations` ili novi `ReservationReschedulePromptScreen`).
- **Disable prošlih slotova u rezervaciji (client)** (`mobile/src/screens/client/ReservationScreen.tsx`):
  - Dodatno (defanzivno) onemogućiti prikaz/klik slotova čiji `startTime` je prošao kada je odabrani datum danas (iako backend već filtrira).

## Web promjene (frontend)

- **Admin DailyLog** (`frontend/src/pages/DailyLog.tsx`):
  - U formi za kreiranje/uređivanje ručnog zapisa: dodati loyalty izbor (povući `GET /api/loyalty/client/me?serviceId=...` za odabranog klijenta) i poslati `desiredLoyaltyPercent`.
- **PublicReserve** (`frontend/src/pages/public/PublicReserve.tsx`):
  - Backend će već filtrirati prošle slotove za danas; dodatno možemo u UI-u označiti/disable slotove ako se “sad” promijeni bez refresh-a.

## Test plan (minimalno, ali dovoljno)

- Ručni dnevnik: kreiraj entry sa i bez loyalty; provjeri da se bodovi skidaju i da se loyalty polja čuvaju na entry.
- Dnevnik listanje: provjeri grupisanje (danas/ova sedmica/prošla sedmica/ostalo) i redoslijed (status pa datum).
- Raspored: startuj rezervaciju → status `IN_PROGRESS`, vidi aktivni prikaz; završi → daily-log upisan; provjeri da akcije rade iz detalja.
- Delay matrica: simuliraj probijanje (ručno pomjeri vrijeme u DB ili koristi short duration) → push budućim klijentima; commit reschedule → klijent dobije push sa deep-linkom i mora accept/decline.
- Slotovi: danas u 10:00 → slotovi prije 10:00 se ne vraćaju (web+mobile).

## Rizici / napomene

- Treba napraviti novu migraciju jer inicijalna migracija ne sadrži neke loyalty kolone koje postoje u `schema.prisma`.
- Timezone: filtriranje „prošlih slotova“ mora koristiti isto tumačenje vremena kao i klijentski prikaz (server lokalno vs salon timezone).
