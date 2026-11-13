# Pregled stranice /admin — Dashboard

- Status: **u toku**, nije završeno. Protokol: `19_checklist-template-pregled-stranice.md`.
- Ruta: `/admin`; glavni prikaz admina. Outbox je samo za OWNER/SYSTEM_ADMIN, server mora provoditi vlastitu autorizaciju.
- Plan: (1) inventar i čitanje namjenskih fajlova, (2) pratiti relevantne zajedničke kontrole, tokene, prijevode i API ugovore, (3) ispraviti nalaze s regresijskim testovima, (4) provjeriti stanja, uloge, light/dark i viewport, (5) dokumentovati dokaze i ograničenja. Ne obrađivati druge stranice.

## Inventar pregleda

| Fajl | Obuhvat | Status |
|---|---|---|
| `frontend/src/pages/Dashboard.tsx` | cijeli (97 linija prije izmjena) | pročitan |
| `frontend/src/features/dashboard/{finance-stats,ops-stats,recent-reservations,outbox-diagnostics,outbox-events-table,outbox-replay-dialog}.tsx` | svi od početka do kraja | pročitani |
| `frontend/src/features/dashboard/{types,use-dashboard-data,use-outbox}.ts` | svi od početka do kraja | pročitani |
| `frontend/src/features/dashboard/aurum-stat-grid.tsx` | nepovezani, nepraćeni WIP; nije importovan | izvan obuhvata, sačuvati |
| zajednički StatGrid/StatCard, DataTable/DataState/StatusBadge, PageHeader, Alert/Button/Dialog, CSS, locale i API | relevantni dijelovi i potrošači | u toku |
| dashboard testovi i relevantni E2E | obuhvat, postojeće i nove regresije | u toku |

## Početni nalazi i implementacijski plan

| ID | Nalaz | Prioritet | Plan / status |
|---|---|---|---|
| D-01 | Paralelna učitavanja dashboarda (uključujući socket događaje) mogu završiti van redoslijeda i stariji odgovor prepisati noviji; nakon unmounta odgovor još može ažurirati stanje. | Visok | Zaštita redoslijeda i unmounta, test. |
| D-02 | Dashboard skeleton pulsira i kad je zatražen reduced motion. | Srednji | Koristiti postojeći motion-reduce mehanizam i test. |
| D-03 | Neispravni/malformirani uspješni API odgovori pojedinih izvora pretvaraju se u nule ili NaN, što može izgledati kao stvarna metrika. | Visok | Provjeriti server ugovore i tretirati nepravilne podatke kao nedostupne bez promjene validnih praznih knjiga; testirati po izvoru. Otvoreno. |
| D-04 | Outbox refresh greška može ostaviti prethodne podatke vidljivim; treba potvrditi da korisnik razumije da su zastarjeli te provjeriti malformed podatke. | Srednji | Pregled ugovora, scenarija i testa. Otvoreno. |

## Matrica, testovi i dokazi

Nije još popunjeno: popunjeni i prazni dashboard, svi izvori pali, parcijalne greške, outbox sa stvarnim reprezentativnim događajima i replay, oba moda, desktop/320px, fokus, reduced motion, prijevodi, AAA/AA i ručni AT pregled. Raniji ciljano testirani parcijalni i prazni scenariji nisu dokaz cijele stranice.

## Ograničenja

Lokalni browser i backend sa stvarnom bazom prethodno nisu bili dostupni; potrebno potvrditi trenutno stanje. Ranije pokrenuti CI `43445380627` pripada prethodnoj stranici Korisnici i nije dokaz ove stranice; završio je neuspjehom rendered-a11y posla. Ne širiti ovaj pregled na drugu stranicu.

## Prvi implementirani inkrement

- D-01: `use-dashboard-data.ts` dodaje sekvencu zahtjeva; samo zadnje pokrenuto učitavanje smije upisati podatke i završiti loading, cleanup poništava ranije zahtjeve. Network pozivi nisu otkazani. Dodat source-regresijski test; **stvarni izvršni test utrke i unmounta još je potreban**, pa nalaz nije zatvoren.
- D-02: skeleton ima `motion-reduce:animate-none`; source test provjerava prisustvo klase. Stvarni computed-style pregled uz emulirani reduced motion još je potreban.
- `StatGrid` i `StatCard` pročitani: list semantika, tokeni i tonovi. Nije dokazano da sve kombinacije u realnom prikazu dostižu AAA; boja trenda na toniranoj podlozi zahtijeva provjeru.
- Lokalno: `node --test src/features/dashboard/*.test.mjs` 31/31 (pretežno source provjere); `npm run lint` prolazi sa 7 postojećih upozorenja izvan Dashboarda; `npm run build` i `npm run typecheck:e2e` prolaze; `git diff --check` prolazi. Nije izvršena nova browser, manual AT ili CI provjera.
- Sljedeće: API ugovori i validacija D-03, outbox D-04, kompletiranje inventara zajedničkih zavisnosti i stvarni testovi/visual matrica. Stranica ostaje u toku.

## Nastavak implementacije

- D-03: Pregledani relevantni server kontroleri: summary/count i finansijski endpointi ograničeni na OWNER/SYSTEM_ADMIN; mjesečne knjige se kreiraju i vraćaju objekt. Dodana validacija uspješnih odgovora po izvoru: neispravni podaci označavaju izvor nedostupnim, dok su stvarne nule i prazne liste valjane. Pokrivena direktnim testovima validacije te dodan browser test oporavka (čeka izvršavanje).
- D-04: prethodna dijagnostika se ne prikazuje nakon neuspjelog osvježavanja, da zastarjeli brojevi ne izgledaju aktuelno. Pregled nepravilnih outbox podataka i regresijski browser test još su otvoreni.
- Dashboard source/validation testovi 32/32, lint, build i E2E typecheck prolaze lokalno. Browser testovi nisu lokalno izvršeni; nedostaju browser i lokalna baza. Ne tvrditi završenost niti deploy.
