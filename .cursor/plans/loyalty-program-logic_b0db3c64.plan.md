---
name: loyalty-program-logic
overview: Provjera trenutne implementacije loyalty programa i dopuna da u potpunosti prati poslovna pravila iz 05_matrice_i_poslovna_pravila.md, uključujući earn/redeem pravila, povezivanje sa rezervacijama i daily logom, te UX na webu i mobilnoj aplikaciji.
todos:
  - id: analyze-loyalty-backend
    content: "Revidirati loyalty backend (service, controller, schema, migracije) i uskladiti male detalje: DTO fieldovi, zaštita od dvostrukog redeem-a, komentari."
    status: completed
  - id: web-reservation-ux
    content: Uvesti loyalty popust UI i slanje `desiredLoyaltyPercent` u web public reservation flow i admin rezervacijama prikazati `loyaltyDiscount*` polja.
    status: completed
  - id: mobile-reservation-ux
    content: Uvesti loyalty popust UI i slanje `desiredLoyaltyPercent` u mobilnom client reservation wizardu i prilagoditi stylist daily-log flow za prikaz cijene za naplatu i pravilno punjenje `actualPrice`/`tipAmount`.
    status: completed
  - id: settings-ui-review
    content: Provjeriti i po potrebi dopuniti admin Settings UI za sve loyalty-related `AppSetting` ključeve.
    status: completed
  - id: loyalty-tests-docs
    content: Dodati/azurirati testove za earn/redeem logiku i dopuniti `.cursor/docs/05_matrice_i_poslovna_pravila.md` + gap/tasks ako postoje razlike.
    status: completed
isProject: false
---

### Ciljevi

- **Provjeriti postojeću implementaciju loyalty programa** (backend + frontend admin) u odnosu na dokument `.cursor/docs/05_matrice_i_poslovna_pravila.md`.
- **Dovršiti i uskladiti earn/redeem logiku** sa poslovnim pravilima, uključujući per-servis i globalne limite, te vezu sa `DailyLogEntry` i `Reservation`.
- **Uvesti UX za odabir loyalty popusta** pri rezervaciji na **web public rezervaciji** i u **mobile client reservation wizardu**, uz jasan prikaz popusta i cijene za naplatu.
- **Uskladiti admin/stylist UI** sa finansijskim efektima (pun iznos, loyalty popust, cijena za naplatu, tip) bez narušavanja KIF/KUF logike.

### 1. Analiza trenutne implementacije i šeme

- **Pregled šeme** u `[backend/prisma/schema.prisma](backend/prisma/schema.prisma)`:
  - `LoyaltyAccount` i `LoyaltyTransaction` modeli već postoje, vezani na `User`.
  - `Service` već sadrži `loyaltyEnabled` i `loyaltyMaxDiscountPercent`.
  - `Reservation` već ima polja `loyaltyDiscountPercent`, `loyaltyDiscountAmount` i `loyaltyPointsUsed`.
  - `DailyLogEntry` i `IncomeBookEntry` rade preko `actualPrice` / `tipAmount`.
- **Provjera migracija**: potvrditi da nova migracija `20260316105258_add_loyalty_fields_to_reservation` odgovara šemi i da ne uvodi dupliranja ili konflikte.
- **Pregled backend logike loyalty programa** u `[backend/src/loyalty/loyalty.service.ts](backend/src/loyalty/loyalty.service.ts)`:
  - `earnFromDailyLog` već implementira dodjelu bodova na osnovu `actualPrice`, opcionalno `tipAmount`, sa poštivanjem `loyalty_points_per_currency`, `loyalty_earn_on_tip`, `loyalty_min_amount_for_earn` i `loyalty_excluded_services`.
  - `getTiers`, `getTierForPoints` i `recalculateTier` već izračunavaju tier na osnovu broja bodova i `loyalty_tiers` JSON postavke.
  - `redeemPoints` i `adjustPoints` već podržavaju ručno korištenje i korekciju bodova (admin feature).
  - `redeemForReservation` već sadrži jezgru poslovnog pravila za korištenje bodova pri rezervaciji:

```259:349:backend/src/loyalty/loyalty.service.ts
async redeemForReservation(args: { clientId: string; reservationId: string; serviceId: string; desiredPercent: number }) {
  const { clientId, reservationId, serviceId, desiredPercent } = args;
  if (desiredPercent <= 0) return null;

  const programEnabled = await this.isProgramEnabled();
  // ... provjere loyalty_enabled, loyalty_redeem_enabled, aktivan account ...
  const service = await this.prisma.service.findUnique({
    where: { id: serviceId },
    select: { price: true, loyaltyEnabled: true, loyaltyMaxDiscountPercent: true },
  });
  // ... provjere loyaltyEnabled i cijene ...
  const tier = await this.getTierForPoints(account.points);
  const tierMaxPercent = tier?.maxDiscountPercent ?? 0;
  const serviceMaxPercent = service.loyaltyMaxDiscountPercent ?? 0;
  const globalMaxPercent = this.parseNumber(await this.settings.getValue('loyalty_max_discount_percent'), 100);
  const allowedPercent = Math.min(tierMaxPercent, serviceMaxPercent, globalMaxPercent);

  // ... provjere allowedPercent i desiredPercent ...
  const redeemRate = this.parseNumber(await this.settings.getValue('loyalty_redeem_rate'), 0.1);
  const desiredDiscountAmount = (price * desiredPercent) / 100;
  const neededPoints = Math.floor(desiredDiscountAmount / redeemRate);
  // ... provjere minPoints, available points ...
  const updatedAccount = await this.redeemPoints(
    account.id,
    neededPoints,
    `Reservation ${reservationId} (${desiredPercent}%)`,
  );
  await this.prisma.reservation.update({
    where: { id: reservationId },
    data: {
      loyaltyDiscountPercent: Math.round(desiredPercent),
      loyaltyDiscountAmount: desiredDiscountAmount,
      loyaltyPointsUsed: neededPoints,
    },
  });
  return updatedAccount;
}
```

- **Veza rezervacija ↔ loyalty** u `[backend/src/reservations/reservations.service.ts](backend/src/reservations/reservations.service.ts)`:
  - `create` već poziva `loyalty.redeemForReservation` ako je klijent poslao `desiredLoyaltyPercent`.
  - `stylistMarkComplete` osigurava da klijent ima `LoyaltyAccount` nakon završene rezervacije (minimalno);
  glavna earn logika ipak živi u daily-log.
- **Veza daily log ↔ loyalty** u `[backend/src/daily-log/daily-log.service.ts](backend/src/daily-log/daily-log.service.ts)`:
  - `complete` nakon popunjavanja zapisa dodaje KIF zapis i poziva `loyalty.earnFromDailyLog`, što je u skladu s dokumentom.
- **Admin loyalty UI** u `[frontend/src/pages/Loyalty.tsx](frontend/src/pages/Loyalty.tsx)`:
  - Već postoji stranica za uključivanje programa (`loyalty_enabled`), pregled računa, ručni `Redeem` i `Adjust`, što je u skladu s fazom 10.

**Zaključak analize**: backend core logika loyalty programa (earn & redeem, per-servis/global limiti, veza s rezervacijama i daily logom) je već implementirana u skladu s dokumentom; preostaje uglavnom:

- dopuna DTO-a i frontenda za **slanje `desiredLoyaltyPercent`** pri kreiranju rezervacije (web + mobile),
- prikaz loyalty informacija u admin i stylist UI prema poglavlju "Praktični tok – rezervacija i zatvaranje dnevne knjige".

### 2. Backend dopune i usklađivanje DTO-a

- **DTO za kreiranje rezervacije** u `[backend/src/reservations/dto/create-reservation.dto.ts](backend/src/reservations/dto/create-reservation.dto.ts)`:
  - Dodati opcionalno polje `desiredLoyaltyPercent?: number` (s odgovarajućim class-validator dekoratorima: `@IsOptional()`, `@IsNumber()`, `@Min(0)`, `@Max(100)`), kako bi se uskladilo sa već postojećom logikom u `ReservationsService.create`.
- **Provjera rezervacijskog kontrolera** u `[backend/src/reservations/reservations.controller.ts](backend/src/reservations/reservations.controller.ts)`:
  - Nema izmjena, samo potvrditi da `CreateReservationDto` uključuje novo polje i da Swagger (ako postoji) prikazuje opcionalni loyalty procenat.
- **Eventualna zaštita od ponovnog redeem-a**:
  - U `redeemForReservation` dodati zaštitu da se bodovi ne mogu ponovo koristiti za istu rezervaciju (npr. provjerom da `reservation.loyaltyPointsUsed === 0` prije upisa), kako bi ponovna izmjena rezervacije ne izazvala dvostruko skidanje bodova.
- **Komentari i tipovi**:
  - U `LoyaltyTransaction.type` komentar proširiti sa `ADJUST` kako bi bio u skladu s kodom (`adjustPoints` koristi `type: 'ADJUST'`).

### 3. Frontend – web public rezervacija

- **Pronalaženje public reservation stranice**:
  - Locirati komponentu za javni reservation flow (npr. `frontend/src/pages/Reservation.tsx` ili `PublicReservation.tsx`) i dio koda koji šalje `POST /api/reservations`.
- **Dodavanje loyalty UI elementa**:
  - U finalnom koraku wizzarda (prije potvrde rezervacije) dodati sekciju koja prikazuje:
    - punu cijenu servisa (`service.price`),
    - trenutno dostupne informacije o loyalty statusu (npr. badge "Nije dostupno" ako nema loyalty account ili program isključen),
    - **slider ili number input** za izbor željenog procenta popusta `0–allowedPercent`, gdje će `allowedPercent` inicijalno biti konzervativno izračunat (npr. 0–100%) ili, po mogućnosti, dohvaćen sa backend-a:
      - minimalna verzija: klijent odabire procenat, a backend baca grešku ako pređe limite ili nema dovoljno bodova.
- **Slanje `desiredLoyaltyPercent`**:
  - U API pozivu za kreiranje rezervacije dodati polje `desiredLoyaltyPercent` u payloadu koji mapira na DTO.
  - U slučaju da backend vrati grešku vezanu za loyalty (npr. nedovoljno bodova), prikazati jasnu poruku i omogućiti korisniku da smanji procenat ili isključi loyalty popust.
- **Prikaz popusta u admin rezervacijama**:
  - U admin rezervacijama (npr. `frontend/src/pages/Reservations.tsx` ili slična komponenta) proširiti tabelu/detalj rezervacije tako da prikazuje:
    - `Service.price` (puna cijena),
    - `loyaltyDiscountPercent` i `loyaltyDiscountAmount`,
    - izračunatu "Cijena za naplatu" = `price - loyaltyDiscountAmount`.

### 4. Mobile – client reservation wizard (Expo app)

- **Locirati create reservation screen** (wizard) u mobilnoj aplikaciji:
  - Npr. `mobile/src/screens/reservations/CreateReservationScreen.tsx` ili odgovarajuća kombinacija stack/tab.
- **Dodavanje loyalty sekcije u zadnjem koraku**:
  - U zadnjem step-u (prije slanja zahtjeva) dodati karticu sa:
    - punom cijenom servisa,
    - prikazom trenutnog loyalty statusa (može koristiti API poziv na backend za kraći summary loyalty account-a ili se osloniti na greške pri submitu),
    - slider/number input za `desiredLoyaltyPercent` 0–100 (ili 0–`allowedPercent` ako kasnije uvedemo poseban endpoint za preview).
- **Šaljanje `desiredLoyaltyPercent` u API pozivu**:
  - Proširiti payload za `POST /api/reservations` tim poljem.
  - Obraditi greške iz backend-a kao i na webu – prikaz poruke i ostanak u istom step-u radi korekcije.

### 5. UI za stilistu – zatvaranje rezervacije / dnevna knjiga

- **Admin/Stylist UI za daily log** (web admin):
  - U ekranu gdje stilist zatvara rezervaciju i/ili unosi zapis u dnevnu knjigu (komponenta koja poziva `POST /api/daily-log/from-reservation/:reservationId` i `POST /api/daily-log/:id/complete`), implementirati pravila iz dokumenta:
    - Prikaz:
      - puna cijena servisa (`Service.price`),
      - loyalty popust (`loyaltyDiscountPercent`, `loyaltyDiscountAmount`) ako postoji,
      - preporučena "Cijena za naplatu" = `price - loyaltyDiscountAmount`.
    - Polje **“Naplaćeno”**:
      - ako polje ostane prazno, UI će pri slanju koristiti "cijenu za naplatu" kao `actualPrice`,
      - ako je uneseno više od cijene za naplatu, razlika ide u `tipAmount` (`Naplaćeno − cijenaZaNaplatu`).
  - Na osnovu unosa formirati parametre za `CreateFromReservationDto` (`actualPrice`, `tipAmount`) u skladu s pravilom:

```126:145:backend/src/daily-log/daily-log.service.ts
async complete(id: string, user: CurrentUserPayload) {
  const entry = await this.findOne(id, user);
  // ...
  const updated = await this.prisma.dailyLogEntry.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date() },
    include: this.entryInclude(),
  });
  await this.incomeBooks.addEntryFromDailyLog(id).catch(() => {});
  if (updated.clientId) {
    await this.loyalty
      .earnFromDailyLog({
        id: updated.id,
        clientId: updated.clientId,
        actualPrice: Number(updated.actualPrice),
        tipAmount: Number(updated.tipAmount),
        serviceId: updated.serviceId,
      })
      .catch(() => {});
  }
  return updated;
}
```

- **Mobile Stylist app**:
  - U ekranu za završavanje rezervacije i upis u dnevnu knjigu (stylist app) primijeniti isti UX kao gore:
    - prikaz punog iznosa, loyalty popusta i preporučene cijene za naplatu,
    - input za "Naplaćeno" i zatim izračunavanje `actualPrice` i `tipAmount` na klijentu prije slanja na backend.

### 6. Postavke i admin konfiguracija loyalty programa

- **Settings UI (admin)**:
  - Potvrditi da stranica Postavke → Sistem već sadrži editore za sljedeće ključeve i da su popratni opisi u skladu s dokumentom:
    - `loyalty_enabled`
    - `loyalty_points_per_currency`
    - `loyalty_earn_on_tip`
    - `loyalty_min_amount_for_earn`
    - `loyalty_excluded_services`
    - `loyalty_redeem_enabled`
    - `loyalty_redeem_rate`
    - `loyalty_min_points_to_redeem`
    - `loyalty_max_discount_percent`
    - `loyalty_tiers`
  - Ako nešto nedostaje, dodati odgovarajuće fieldove i help-texte, ali bez mijenjanja backend API-ja (sve ide preko `AppSetting`).

### 7. Testiranje i validacija

- **Jedinični / integracijski testovi backend-a**:
  - Dodati ili proširiti testove za:
    - `LoyaltyService.earnFromDailyLog` (granice: `actualPrice <= 0`, `minAmount`, excluded services, earn on tip/no tip).
    - `LoyaltyService.redeemForReservation` (različiti tier-ovi, per-servis limit, globalni limit, nedostatak bodova, minimalni broj bodova, disabled flags).
    - `ReservationsService.create` sa i bez `desiredLoyaltyPercent`.
    - `DailyLogService.complete` da osiguramo kreiranje `LoyaltyTransaction(EARN)` i pravilno ažuriranje tiers.
- **E2E scenariji (ručni ili automatizirani)**:
  - Scenario 1: Klijent bez loyalty računa napravi rezervaciju, stilist je završi, unese naplatu → automatski se kreira `LoyaltyAccount` i dodijele bodovi.
  - Scenario 2: Klijent sa dovoljnim bodovima odabere npr. 10% popusta pri rezervaciji na web-u i na mobitelu → backend koristi bodove, upisuje loyalty polja na rezervaciju, a stilist vidi preporučenu "cijenu za naplatu".
  - Scenario 3: Pokušaj korištenja prevelikog procenta ili korištenja bodova kad je program / redeem isključen → jasne greške na UI-ju.

### 8. Dokumentacija i usklađivanje sa SOURCE_OF_TRUTH

- **Ažuriranje dokumentacije**:
  - Ako se tokom implementacije pojave manja odstupanja od sadašnjeg teksta u `.cursor/docs/05_matrice_i_poslovna_pravila.md` (npr. preciziranje ponašanja za greške, rounding, ili UI detalje), dopuniti dokument odgovarajućim podsekcijama.
  - Ako postoje razlike između implementiranog ponašanja i dugoročne vizije, evidentirati ih u `.cursor/docs/03_gap_analysis.md` i eventualno dodati follow-up task u `.cursor/docs/06_tasks.md`.

### 9. Sažetak glavnih promjena po slojevima

- **Backend**:
  - Uskladiti DTO za rezervacije (`desiredLoyaltyPercent`), zaštititi od dvostrukog redeem-a po rezervaciji, dotjerati komentare i eventualne edge-case provjere.
- **Frontend web (public + admin)**:
  - Dodati loyalty sekciju u public reservation wizard (odabir procenta, prikaz procjene),
  - prikaz loyalty popusta i "cijene za naplatu" u admin rezervacijama i u daily log UI-u.
- **Mobile (client + stylist)**:
  - U client reservation wizard dodati podršku za izbor procenta i slanje `desiredLoyaltyPercent`,
  - u stylist flow-u za zatvaranje rezervacije prikazati punu cijenu, popust, preporučenu cijenu za naplatu i iz toga izračunati `actualPrice` + `tipAmount`.
- **Dokumentacija/testovi**:
  - Ojačati testove oko loyalty earn/redeem logike i dopuniti dokumente u `.cursor/docs/` gdje je potrebno.
