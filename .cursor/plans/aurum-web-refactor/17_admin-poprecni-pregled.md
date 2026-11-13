# Poprečni pregled admin faza — komponente i tokeni

**Početni inventar iz koda, nije završen vizuelni audit · 2026-11-11**

Vlasnik traži da se admin faze pregledaju zajedno i očite nedosljednosti ispravljaju odmah. Ovo dopunjuje plan 16: S6–S9 se otvaraju za poprečni pregled sada, uz očuvanje redoslijeda dovršavanja; S10 je stylist, a S11 završna provjera. Ispravka zajedničke komponente ne znači da su svi njeni potrošači pojedinačno pregledani. Trenutni rad na javnim stranicama se ne ponavlja.

## Zatečeni nalazi i prioritet

1. **Zajedničke komponente nisu jedinstvene.** `features/shell/admin/ui` i `features/shell/aurum/ui` imaju zasebne `data-table`, `data-state`, `page-header`, `stat-card`, `status-badge` itd. Ne pretpostaviti da su zamjenjive: admin tabela ima fokusiranje scroll regije i druge ugovore, Aurum stanja koriste i javne stranice. Finansije već re-exportuju admin data-state. Prije konsolidacije uporediti props, semantiku, Classic i sve potrošače; uklanjati tek uz dokazan paritet.
2. **Zajednička admin stanja** u `features/shell/admin/ui/data-state.tsx` bila su hardkodirana u slate/rose, za razliku od tokenizovanih Aurum stanja. Prvi zahvat dodaje Aurum-scope na postojeći admin data-state za prazno, grešku i skeleton koristeći postojeće uparene tokene; Classic i javni data-state nisu zamijenjeni. Skeleton poštuje reduced motion. Potrebno provjeriti i ostale stvarne potrošače te sva stanja.
3. **Zaglavlja i tabele nisu dosljedno korišteni:** S6 rezervacije imaju vlastitu tabelu, S8 `Stylists.tsx` dvije, S9 `Reviews.tsx` jednu; stranice `Users`, `Salon`, `Services`, `Stylists`, `Gallery`, `Reviews` i `Notifications` imaju vlastite h1 umjesto zajedničkog PageHeadera. Sam broj u izvornom kodu nije dokaz prikazanih istovremenih headinga (npr. Salon ima uslovne grane). Migrirati tek uz dokaz pariteta akcija, sort-a, fokusa, mobilnog prikaza i stanja.
4. **Direktne slate klase ostaju raširene.** Primjeri po fajlu: `Users.tsx` 74, `Services.tsx` 37, `Stylists.tsx` 34, `Reviews.tsx` 43, `EmailSettings.tsx` 41, `Gallery.tsx` 22, `Notifications.tsx` 23, `ReservationsCalendar.tsx` 10 pojavljivanja `slate-` u snapshotu prije ispravke. To su tekstualna brojanja, ne broj grešaka ili prikazanih elemenata; pojedini elementi već imaju Aurum CSS override. Semantičke boje statusa i destruktivne akcije ne mijenjati mehanički.
5. **Zaglavlja tabela:** `globals.css` za Aurum admin `table.app-table th` koristi `--text-muted`; raniji CI AAA izvještaj je pokazao 6.38:1 za određeni sekundarni tekst na bijeloj pozadini i aktivnu navigaciju 5.13:1 na aktivnoj pozadini. Ovo su konkretni signali za pregled izračunatih stilova na stvarnim površinama, ne zaključak o svim tabelama; prije izmjena utvrditi kombinacije, interakcije i raspoložive postojeće tokene.
6. **Postojeći WIP** `frontend/src/features/dashboard/aurum-stat-grid.tsx` nije obuhvaćen niti uklonjen.

## Otvorene cjeline

| Faza | Pregledati | Stanje |
|---|---|---|
| S6 | Admin shell, dashboard, rezervacije, fullscreen kalendar, navigacija i portali; provjeriti popunjeno/prazno, greške, mobilni prikaz, prava. | Otvoreno; dashboard ima početni inkrement 5/5 CI, ne završnu vizuelnu potvrdu. |
| S7 | `DailyLog`, `Finance` i podsistemi income/expense, `Loyalty`; zajednički states/tabele, forme, finansijski sažeci i potvrde. | Otvoreno; prvi shared state zahvat utiče i na neke finansijske potrošače. |
| S8 | Analitika i grafovi, `Users`, `Salon`, `Services`, `Stylists`, galerija radova; uskladiti zaglavlja i tabele uz očuvanje njihovih tokova. | Otvoreno; inventar iz koda, bez tvrdnje o renderiranoj pokrivenosti. |
| S9 | `Blog`, `Gallery`, `Reviews`, hub i svi tabovi postavki uključujući email i notifikacije; editori, statusi, portali. | Otvoreno; inventar iz koda, bez tvrdnje o renderiranoj pokrivenosti. |
| S11 | Završni poprečni pregled i konsolidacija dokazano zamjenjivih komponenti. | Otvoreno. |

## Postupak po nalazu

- Utvrditi konkretan ekran, stanje, izvor komponente i izračunatu boju u Aurum light/dark; provjeriti Classic odvojeno. Zajedničku ispravku ograničiti na stvarni semantički kontekst, ne širokim selektorom mijenjati sve slate klase. Ako ni postojeća kombinacija palete ne zadovoljava potrebni kontrast, stati i pitati prije promjene palete.
- Dodati reprezentativne renderirane fixturee i testove koji provjeravaju izračunatu pozadinu/tekst, kontrast i funkcionalnost, uključujući hover/fokus, grešku/prazno/popunjeno, 320 px i desktop gdje je relevantno. AAA ispitivati zasebno jer uobičajeni filter može isključivati AAA; evidentirati `incomplete`.
- Uključiti role, sigurnosne potvrde, API/paritet i Classic u regresije. Nakon izmjena pokrenuti relevantne lokalne gateove i CI, upisati tačan commit/run/rezultat. Ručna provjera, čitač ekrana i stvarni podaci nisu zamijenjeni automatizacijom.
- S6 ostaje prvi cilj za dovršetak; sistemski nalazi drugih admin faza mogu se odmah sigurno ispraviti bez prividnog označavanja cijele faze završenom. Nastaviti prema planu 16.
