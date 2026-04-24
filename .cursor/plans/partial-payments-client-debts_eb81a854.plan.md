---
name: partial-payments-client-debts
overview: Omogućiti djelimičnu naplatu na naplati rezervacije i ručnom daily-log unosu, uz jasnu poruku o razlici i izbor da se razlika evidentira kao dug (ili ne). Dug se veže i na `dailyLogEntryId` radi praćenja.
todos:
  - id: db-clientdebt-dailylog-fk
    content: Dodati `dailyLogEntryId` u `ClientDebt` (Prisma schema + migracija) i expose u API responses.
    status: completed
  - id: backend-partial-payment-dailylog
    content: Ažurirati daily-log create/createFromReservation da prihvate `paidAmount` + `debtHandling`, izračunaju `minCharge`, kreiraju dug po izboru, i upišu realno naplaćeni iznos.
    status: completed
  - id: backend-loyalty-redeem-adjust
    content: Izmijeniti `redeemForDailyLog` validaciju da prihvati naplatu manju od minCharge kada je razlika pokrivena dugom.
    status: completed
  - id: frontend-reservation-partial-payment-ux
    content: "Web: poruka sa razlikom + izbor CREATE_DEBT/IGNORE_DEBT u naplati rezervacije; API payload update."
    status: completed
  - id: frontend-dailylog-manual-partial-payment-ux
    content: "Web: isti UX za ručni daily-log unos (gdje postoji forma)."
    status: completed
  - id: mobile-reservation-partial-payment-ux
    content: "Mobile: Alert sa razlikom + izbor; API payload update u naplati rezervacije."
    status: completed
  - id: mobile-dailylog-manual-partial-payment-ux
    content: "Mobile: isti UX za ručni daily-log new entry."
    status: completed
isProject: false
---

## Cilj
- Dozvoliti unos naplate **manje od minimalne** u tokovima:
  - naplata rezervacije (web + mobile stylist reservation detail)
  - ručni unos u daily-log (web + mobile)
- Ako je naplaćeno manje: prikazati poruku sa **tačnim iznosom razlike** i izbor:
  - **Zavedi dug** (kreiraj `ClientDebt` za razliku)
  - **Ne zavodi dug** (samo evidentiraj koliko je naplaćeno)

## Backend (NestJS + Prisma)
- **Schema/Migracija**
  - U `[backend/prisma/schema.prisma](backend/prisma/schema.prisma)` dodati opcioni FK na izvor duga:
    - `ClientDebt.dailyLogEntryId String? @map("daily_log_entry_id")`
    - relaciju `dailyLogEntry DailyLogEntry? @relation(...)`
    - u `DailyLogEntry` dodati backref npr. `clientDebts ClientDebt[]`
  - Kreirati migraciju (novi nullable column + index) da dug može biti vezan za daily-log.

- **DTO promjene za naplatu (rezervacija -> daily-log)**
  - Proširiti `[backend/src/daily-log/dto/create-from-reservation.dto.ts](backend/src/daily-log/dto/create-from-reservation.dto.ts)`:
    - umjesto implicitnog minimuma u UI, backend treba dobiti:
      - `paidAmount` (naplata za trenutnu uslugu/rezervaciju, bez starih dugova)
      - `tipAmount`
      - `notes?`
      - `debtHandling?: 'CREATE_DEBT' | 'IGNORE_DEBT'`
      - `settledDebtsTotal?: number` (opciono – ako želite da backend validira da `DailyLogEntry.actualPrice = paidAmount + settledDebtsTotal`)

- **DailyLogService: kreiranje duga kad je naplaćeno manje**
  - U `[backend/src/daily-log/daily-log.service.ts](backend/src/daily-log/daily-log.service.ts)`:
    - u `createFromReservation(...)` izračunati `minCharge` isto kao web/mobile:
      - suma cijena servisa (`reservation.items` ako postoje, inače `reservation.service.price`)
      - minus `reservation.loyaltyDiscountAmount`
    - Ako `paidAmount < minCharge`:
      - izračunati `debtAmount = minCharge - paidAmount`
      - ako `debtHandling === 'CREATE_DEBT'` kreirati `ClientDebt`:
        - `clientId`, `stylistProfileId` (confirmed stylist), `reservationId`, `dailyLogEntryId`, `serviceId` (null ili primary), `amount=debtAmount`, `note` (iz notes)
      - ako `IGNORE_DEBT` samo nastaviti bez kreiranja duga
    - `DailyLogEntry.actualPrice` postaviti na **stvarno naplaćeno** (npr. `paidAmount + selectedDebtSum`, gdje selectedDebtSum ostaje u frontend/mobile logici kao i sada).

- **Ručni daily-log unos (manual)**
  - Proširiti `[backend/src/daily-log/dto/create-daily-log-entry.dto.ts](backend/src/daily-log/dto/create-daily-log-entry.dto.ts)` i logiku `DailyLogService.create(...)`:
    - dodati `paidAmount` + `debtHandling` (analogno)
    - `minCharge` računati kao suma cijena odabranih servisa (bez rezervacije), umanjeno za eventualni loyalty popust ako je redeem korišten.

- **Loyalty: dozvoliti redeem kada je razlika pokrivena dugom**
  - U `[backend/src/loyalty/loyalty.service.ts](backend/src/loyalty/loyalty.service.ts)` funkcija `redeemForDailyLog` trenutno striktno traži `actualPrice >= minCharge`.
  - Izmijeniti da prihvati dodatni parametar (npr. `coveredByDebtAmount?: number`) i validira:
    - `actualPrice + coveredByDebtAmount >= minCharge`
  - `DailyLogService.create(...)` i/ili `createFromReservation(...)` prosljeđuju taj iznos kada se kreira dug.

- **API odgovori / tipovi**
  - Uključiti `dailyLogEntry` (ili bar `dailyLogEntryId`) u `ClientDebtsService.listForClient` include, da UI može prikazati izvor duga.

## Frontend (React)
- **Rezervacija – naplata manja od minimalne**
  - U `[frontend/src/features/stylist-portal/pages/stylist-reservation-detail-page.tsx](frontend/src/features/stylist-portal/pages/stylist-reservation-detail-page.tsx)`:
    - ukloniti hard-block `paidRaw < minCharge`.
    - ako je `paidRaw < minCharge`:
      - prikazati poruku: "Naplaćuje se manje nego što sistem zahtijeva" + `diff = (minCharge - paidRaw)`.
      - ponuditi izbor `CREATE_DEBT` / `IGNORE_DEBT` (npr. mini-dialog sa 2 dugmeta).
    - poziv API-ja promijeniti da šalje `paidAmount` i `debtHandling`.

- **API i types**
  - U `[frontend/src/features/stylist-portal/api/stylist-portal.api.ts](frontend/src/features/stylist-portal/api/stylist-portal.api.ts)` ažurirati `createDailyLogFromReservation` parametre.
  - Ažurirati `[frontend/src/features/stylist-portal/types.ts](frontend/src/features/stylist-portal/types.ts)` i eventualne prikaze dugova da mogu prikazati izvor (daily log).

- **Daily-log ručni unos (ako postoji UI forma)**
  - Pronaći ekran/stranicu za ručni `DailyLog` unos (npr. `[frontend/src/pages/DailyLog.tsx](frontend/src/pages/DailyLog.tsx)` ili stylist workbook new entry) i dodati isti UX: poruka + izbor za dug.

## Mobile (Expo / React Native)
- U `[mobile/src/screens/stylist/StylistReservationDetailScreen.tsx](mobile/src/screens/stylist/StylistReservationDetailScreen.tsx)`:
  - ukloniti hard-block `paidRaw < minCharge`.
  - ako je manji, prikazati `Alert`:
    - tekst sa razlikom
    - dugmad: "Zavedi dug" / "Ne zavodi dug" / "Odustani"
  - poziv `/api/daily-log/from-reservation/:id` prebaciti na `paidAmount + debtHandling`.

- Ručni daily-log unos na mobilnom (npr. `[mobile/src/screens/stylist/DailyLogNewEntryScreen.tsx](mobile/src/screens/stylist/DailyLogNewEntryScreen.tsx)` i/ili `[mobile/app/stylist/(tabs)/daily-log/new-entry.tsx](mobile/app/stylist/(tabs)/daily-log/new-entry.tsx)`):
  - dodati istu logiku poruke + izbor.

## Test plan
- Naplata rezervacije sa `paidAmount < minCharge`:
  - `IGNORE_DEBT`: kreira daily-log entry sa `actualPrice = paid + selectedDebtsSum`, bez novog `ClientDebt`.
  - `CREATE_DEBT`: kreira daily-log entry + novi `ClientDebt(amount = minCharge - paid)` vezan na `reservationId` i `dailyLogEntryId`.
- Ručni daily-log unos sa djelimičnom naplatom: isti scenariji.
- Loyalty redeem za daily-log: radi i kada je dio pokriven dugom (validacija koristi `actualPrice + debtAmount`).
