# Matrice i poslovna pravila

_Dopunjavati kako se dodaju feature-i._

## Role
- **SYSTEM_ADMIN**: Sistemske stvari aplikacije, postavke.
- **OWNER**: Vlasnik salona; sve što moderator ima + knjiga rashoda/prihoda, stilisti, servisi, praznici.
- **STYLIST**: Samo mobilna app; rezervacije (lock/accept/reject), dnevna knjiga, raspored.
- **CLIENT**: Web + mobilna; rezervacije, blog komentari, recenzije, profil.
- **Guest**: Samo public one-page, blog, servisi, galerija; bez rezervacija.

## Rezervacije
- Termin dostupan ako: salon radi, nije praznik, bar jedan stilist nudi servis i radi taj dan, i ima slobodan slot (trajanje servisa + pauza).
- Slot zauzima rezervacija u statusu CONFIRMED, ATTENDANCE_CONFIRMED ili IN_PROGRESS (PENDING/STYLIST_REVIEW ne blokiraju).
- Klijent mora potvrditi dolazak najkasnije 24h prije početka.
- Završetak rezervacije ide preko dnevne knjige (ne legacy stylist-mark-complete).

## Finansije
- Knjiga rashoda: mjesečna, otvara se automatski, zaključava ručno; otključavanje samo kroz bazu.
- Knjiga prihoda: mjesečna, otvara i zatvara automatski; popunjava se iz dnevnih knjiga frizera.

## Loyalty program
- **Osnovni koncept**:
  - Svaki **CLIENT** korisnik može imati jedan `LoyaltyAccount` vezan za `User`.
  - Račun ima ukupne bodove (`points`), trenutni nivo (`tier`) i status (`isActive`).
  - Sve promjene bodova idu kroz `LoyaltyTransaction` (`EARN | REDEEM | ADJUST`) – nikad direktno ne mijenjati broj bodova izvan servisa.

- **Earn (dodjela bodova)**:
  - Bodovi se dodjeljuju prilikom završetka zapisa u dnevnoj knjizi (`DailyLogService.complete`) preko `LoyaltyService.earnFromDailyLog`.
  - Pravila dodjele se konfigurišu kroz `AppSetting` ključeve:
    - `loyalty_points_per_currency` – koliko bodova nosi 1 KM stvarne naplaćene cijene (`actualPrice`) usluge.
    - `loyalty_earn_on_tip` – ako je `true`, u osnovicu za bodove ulazi i napojnica (`tipAmount`).
    - `loyalty_min_amount_for_earn` – minimalni iznos usluge za dodjelu bodova.
    - `loyalty_excluded_services` – JSON lista ID-ova servisa koji nikad ne nose bodove.
  - Bodovi se nikad ne dodjeljuju ako:
    - `loyalty_enabled = false`,
    - `actualPrice <= 0`,
    - servis je u `loyalty_excluded_services`.

- **Tier-ovi (nivo vjernosti)**:
  - Definisani kroz `loyalty_tiers` (JSON u `AppSetting`), npr.:
    ```json
    [
      { "id": "silver",   "name": "Silver",   "minPoints": 100,  "maxDiscountPercent": 10 },
      { "id": "gold",     "name": "Gold",     "minPoints": 500,  "maxDiscountPercent": 20 },
      { "id": "platinum", "name": "Platinum", "minPoints": 1500, "maxDiscountPercent": 30 }
    ]
    ```
  - Nivo se računa na osnovu ukupnih bodova na `LoyaltyAccount` i uvijek je **najviši tier** za koji vrijedi `points >= minPoints`.
  - `maxDiscountPercent` određuje maksimalan procenat popusta koji taj nivo može dobiti na jednoj usluzi (prije primjene per-servis i globalnih limita).

- **Per-servis pravila**:
  - U `Service` modelu postoje polja:
    - `loyaltyEnabled` – da li servis učestvuje u loyalty programu.
    - `loyaltyMaxDiscountPercent` – maksimalan loyalty popust za taj servis (u procentima).
  - U admin panelu (`Services` stranica) vlasnik može:
    - uključiti/isključiti loyalty za pojedinačan servis,
    - postaviti maksimalni dozvoljeni procenat popusta za taj servis.

- **Korištenje bodova (redeem / popust)**:
  - Globalne postavke:
    - `loyalty_enabled` – globalni switch za cijeli program.
    - `loyalty_redeem_enabled` – da li je korištenje bodova uopće dozvoljeno.
    - `loyalty_redeem_rate` – vrijednost 1 boda izražena u KM (npr. `0.1` → 1 bod = 0.10 KM).
    - `loyalty_min_points_to_redeem` – minimalan broj bodova koji se mora potrošiti u jednoj transakciji.
    - `loyalty_max_discount_percent` – globalni strop za loyalty popust (bez obzira na tier i servis).
  - Efektivni maksimalni procenat popusta po rezervaciji računa se kao:
    \[
      allowedPercent = \min(tierMaxPercent,\ serviceMaxPercent,\ globalMaxDiscountPercent)
    \]
    - `tierMaxPercent` dolazi iz tier-a (`maxDiscountPercent`),
    - `serviceMaxPercent` iz servisa (`loyaltyMaxDiscountPercent`),
    - `globalMaxDiscountPercent` iz `loyalty_max_discount_percent`.
  - Klijent prilikom rezervacije (web i mobile) može odabrati željeni procenat popusta (0–`allowedPercent`), ako:
    - ima aktivan `LoyaltyAccount` i dovoljno bodova,
    - servis ima `loyaltyEnabled = true` i `loyaltyMaxDiscountPercent > 0`,
    - program (`loyalty_enabled`) i redeem (`loyalty_redeem_enabled`) su uključeni.
  - Backend preračunava:
    - `desiredDiscountAmount = service.price * desiredPercent / 100`,
    - `neededPoints = floor(desiredDiscountAmount / loyalty_redeem_rate)`,
    - i odbija zahtjev ako:
      - `neededPoints < loyalty_min_points_to_redeem`,
      - `neededPoints <= 0`,
      - korisnik nema dovoljno bodova.
  - Uspješno korištenje bodova:
    - generira `LoyaltyTransaction` tipa `REDEEM`,
    - smanjuje `LoyaltyAccount.points`,
    - osvježava tier (`recalculateTier`),
    - **informativno** upisuje na `Reservation`:
      - `loyaltyDiscountPercent` – odabrani procenat,
      - `loyaltyDiscountAmount` – iznos popusta u KM,
      - `loyaltyPointsUsed` – broj potrošenih bodova.

- **Finansijski efekat**:
  - Loyalty popust je **evidentiran** na samoj rezervaciji (proc., iznos, broj bodova), ali:
    - `DailyLogEntry.actualPrice` se i dalje postavlja iz UI-ja stilista i predstavlja stvarno naplaćenu cijenu.
    - KIF (`IncomeBookEntry.amount`) čita iz `actualPrice`.
  - U praksi:
    - ako vlasnik želi da loyalty popust **realno smanji prihod**:
      - stilist ili admin treba unijeti u dnevnu knjigu cijenu umanjenu za `loyaltyDiscountAmount` (ili UI može automatski sugerisati tu vrijednost).
    - ako se loyalty koristi kao čisto “nagradni” sistem bez promjene fiskalne cijene (npr. dodatne usluge gratis), `actualPrice` može ostati pun iznos, a loyalty popust se tretira kao marketing trošak.

- **Praktični tok – rezervacija i zatvaranje dnevne knjige**:
  - **Rezervacije (admin pogled)**:
    - Za svaku rezervaciju koja koristi loyalty popust treba prikazati:
      - punu cijenu servisa (`Service.price`),
      - `loyaltyDiscountPercent` i `loyaltyDiscountAmount`,
      - “Cijenu za naplatu” = puna cijena − `loyaltyDiscountAmount`.
  - **Stilist pri zatvaranju rezervacije / dnevne knjige**:
    - UI treba prikazati:
      - stvarnu cijenu servisa (puna cijena),
      - loyalty popust (proc. i iznos),
      - preporučenu “cijenu za naplatu”.
    - Ispod toga polje **“Naplaćeno”**:
      - podrazumijevano prazno; ako stilist ne unese ništa, smatra se da je naplaćeno **onoliko koliko je “cijena za naplatu”**.
      - ako klijent plati više (npr. “cijena za naplatu” je 8 KM, a klijent da 10 KM), razlika (`10 − 8 = 2 KM`) ide u `tipAmount`.
    - Pravila za popunu polja:
      - `DailyLogEntry.actualPrice` = vrijednost iz “Naplaćeno” (ili “cijene za naplatu” ako je “Naplaćeno” prazno).
      - `DailyLogEntry.tipAmount` = `max(0, Naplaćeno − cijenaZaNaplatu)`.
    - Time:
      - **KIF** je potpuno ispravan jer `IncomeBookEntry.amount` dolazi iz `actualPrice` (stvarno naplaćeni iznos).
      - loyalty popust je transparentan (vidljiv na rezervaciji) i usklađen s finansijama (umanjeni prihod + poseban bakšiš gdje postoji.
