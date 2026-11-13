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

### CI inkrementa `b5c7daa`

CI `43484388368`: četiri posla prošla, rendered a11y posao pao na dva prethodna Users create-dialog testa: svijetli gumb 6.01:1 za AAA (AA prag prolazi). To je izvan trenutno zadane stranice; nije maskirano niti proglašeno uspjehom. Novi dashboard test nije među navedenim padovima. Ovaj CI ne zamjenjuje preostali dashboard pregled i korisnikov vizuelni pregled. Lokalno nema PostgreSQL servera/Docker-a ni instaliranog Playwright browsera; radni autentificirani preview sa stvarnim backendom nije pokrenut i deploy nije urađen.

### Drugi nastavak

- D-01: izvršni React/jsdom test montira pravi hook, pokreće preklopljene zahtjeve, završava noviji prije starijeg i provjerava vrijednost, loading i unmount; test prolazi lokalno. Nije mrežni/browser/socket end-to-end.
- D-04: validira se struktura outbox dijagnostike; nedostajući statusni brojači su legitimne nule jer ih backend grupisanje izostavlja. Neispravan odgovor se prikazuje kao greška, bez prethodnih podataka. Dodan ciljani browser scenarij popunjenih podataka, replay potvrde i neuspjelog refresh-a u oba režima/viewporta; čeka CI.
- Dodani izvršni validacijski testovi. Lokalno 34 dashboard testa, lint, build i E2E typecheck prolaze. Relevantni `StatGrid`, `StatCard`, `DataTable`, `DataState`, `StatusBadge`, `PageHeader`, `Button`, `Dialog`, `Alert`, locale formatter i server endpointi/ugovori pregledani u relevantnim dijelovima; globalni CSS, sve kombinacije, role i ručni pregled nisu završeni.

### CI `43501747163` i kontrast

- 4/5 CI poslova; rendered suite: 368 prošlo, 2 prethodna Users AAA testa pala. Novi Dashboard scenariji popunjenog prikaza i replay-a prošli AA dio, ali prošireni AAA izvještaj je našao svijetle sitne tekstove/statusne oznake 6.38–6.61:1 i replay dugme 6.53:1; mobilni axe ima incomplete zbog zaklonjenih dijelova tabele. Zbog filtera prethodni prolaz nije značio AAA prolaz.
- Implementiran usko ograničen Dashboard popravak korištenjem postojećih osnovnih/jačih tekst tokena; replay potvrda ima postojeću površinu i semantički rub. Paleta nije mijenjana. Novi ciljani test sada zahtijeva i AAA violations = 0, ali incomplete i ručna provjera ostaju zasebni. Potrebna nova CI provjera.

### Provjere nakon korekcije kontrasta

- CI `43503154735`, commit `3125240`: četiri Dashboard popunjena i replay scenarija su prošla ciljane AA+AAA axe asercije u oba moda i veličine; malformed/retry također prošao. Mobilne tabele i replay dijalog imaju axe `incomplete` zbog zaklonjenog sadržaja: treba ručni pregled, ne tretirati kao prolaz kontrasta. Ukupni rendered job i dalje pada na dva ranija Users testa (6.01:1 AAA); preostala četiri CI posla prolaze.
- D-05: nulti neto se pogrešno nazivao pozitivnim. Dodan lokalizirani neutralni izraz za nulu (BS/EN), uz provjeru pariteta; ovaj zadnji inkrement treba browser/CI potvrdu.
- Browser test sada čeka završetak animacija prije skeniranja dijaloga; potrebno utvrditi da li to uklanja incomplete.
- Nisu izvršeni ručni čitač ekrana, realni podaci, 400% zoom i korisnikov vizuelni pregled; nema lokalne baze ili instaliranog browsera, niti ovdje potvrđene konfiguracije deploy okruženja. Status ostaje u toku.
- CI `43504596830` za `0e0cf1f`: četiri ciljana popunjena/replay Dashboard testa prošla; desktop popunjeni axe bez violations/incomplete, 320px tabela ima incomplete; replay ima incomplete u oba viewporta čak i nakon čekanja animacija. Ukupni job i dalje pada zbog dva Users AAA testa, ostali poslovi uspješni. Ručna validacija i vizuelni pregled i dalje nisu provedeni.
- Korisnik preuzima vizuelni pregled; tehničke testove izvoditi u CI. Dodan CI korak koji stvarno izvršava nove validacijske i React race testove (ranije su bili samo lokalno), te ciljane computed-color provjere teksta u replay dijalogu za axe incomplete. Potrebno provjeriti rezultat novog CI runa; mjerenje ne zamjenjuje pregled drugih stanja.
- CI `43521743745` za `bdbbdf6`: novi izvršni React race i validacijski testovi uključeni u uspješan frontend posao. Sva četiri Dashboard popunjena/replay scenarija prošla, uključujući tri computed-color mjerenja teksta u dijalogu >= 7:1. Axe i dalje prijavljuje incomplete za dijalog i neke mobilne ćelije: computed test mjeri konkretne CSS parove, ne dokazuje sve njihove položaje ili sve ostale elemente. Korisnik radi vizuelni pregled. Rendered suite ima samo dva ranija pada Users AAA; ostali poslovi uspješni.
- Korisnik je potvrdio da je redeploy izvršen i da je vizuelni pregled `/admin` uredan. CI `43522990007` na `4d5b4dc`: dodani browser test potpunog pada svih izvora, ponovnog pokušaja i stvarnog `animation-name: none` za reduced motion je prošao; svih 369 drugih prolaza uključuje ciljane Dashboard scenarije. Ukupni CI i dalje pada samo na dva ranije poznata Users AAA testa. Axe incomplete ostaju za mobilne tabele i replay; tri teksta dijaloga izmjerena dodatnim computed testom. Ručni čitač ekrana i ostale neobuhvaćene stavke nisu potvrđeni. Stranica zato nije označena potpuno završenom prema protokolu.
