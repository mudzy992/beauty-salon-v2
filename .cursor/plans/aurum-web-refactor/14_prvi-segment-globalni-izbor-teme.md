# Prvi segment revidiranog plana — globalni izbor identiteta i režima

**Status: PRIJEDLOG, čeka eksplicitno odobrenje implementacije.** Vizuelni koncept `docs/design/aurum-novi-identitet-koncept.html` je odobren kao smjer, uz premium/unikatne detalje, diskretne animacije, modernije ikone i komponentni standard. Ovaj segment je funkcionalni temelj; **ne završava novi vizuelni identitet** ni revidirane S2–S4.

## Utvrđeno iz postojećeg koda

- `ThemeSwitcher` trenutno korisniku nudi `classic`, `aurum-light`, `aurum-dark` i koristi `nejra.theme` u localStorage-u; to se mora zamijeniti odobrenim modelom bez korisničkog izbora identiteta.
- `SettingsController` ima `JwtAuthGuard`, `RolesGuard`, `@Roles('SYSTEM_ADMIN', 'OWNER')`; `GET /api/settings/public` je javni endpoint, a `PUT /api/settings/:key` koristi postojeću zaštićenu putanju. `SettingsService.findAllPublic` vraća samo registrovane PUBLIC ključeve s default vrijednostima; `set` odbija neregistrovane ključeve, čuva kroz repository i za javne postavke emituje `settings:updated`. Registry podržava string/boolean/number/json, ali **nema opću enum validaciju**: dva nova izbora moraju se izričito validirati na backendu, ne samo u formi.
- `SettingsProvider` danas dohvaća javne postavke i osluškuje promjene; nalazi se ispod `ThemeProvider`, a sam `SettingsProvider` koristi `useTheme()` za prioritet boja. Novi dizajn toka mora ukloniti kružnu ovisnost bez dvostrukog izvora istine i bez narušavanja socket sinhronizacije ili brend override-a.
- Postavke izgleda već imaju uređivače i `select` tip; potrebno je provjeriti kako se prikazuju podrazumijevane neupisane postavke, spremanje i greške, te implementirati BS/EN pristupačne oznake i kontrolisane vrijednosti.

## Predloženi ugovor

1. Dvije registrovane, javno čitljive postavke: aktivni identitet `classic | aurum` i podrazumijevani Aurum režim `light | dark`. Tačna imena ključeva definisati jednom u planu implementacije; na backendu odbiti sve druge vrijednosti. Spremanje ostaje samo za sistemskog administratora/vlasnika preko postojeće zaštite. Bez migracije i bez izmjene drugih postavki.
2. Aktivni identitet je uvijek administratorski; vrijednost u browseru ne može ga nadjačati. Kada je `classic`, korisnički prekidač identiteta ne postoji i klasična tema ostaje dostupna do posebne odluke o uklanjanju. Kada je `aurum`, prekidač nudi samo svijetlo/tamno.
3. Izbor režima posjetioca, ako postoji i valjan je, traje na njegovom uređaju i ima prednost nad administratorskim podrazumijevanim režimom. U nedostatku izbora primijeniti administratorov default. Administratorova promjena **identiteta** vrijedi i za posjetioce s prethodnom preferencijom. Izbor režima ne smije biti pohranjen kao izbor identiteta.
4. Prvi render, učitavanje, nedostupnost postavki, spor odgovor, retry, socket osvježavanje, private browsing i odbijen ili pokvaren storage moraju biti eksplicitno obrađeni i testirani. Ne smije doći do trajnog pogrešnog prikaza zbog zakašnjelog odgovora. Izbor fallbacka pri nedostupnom backendu dokumentovati, s naglaskom na sprječavanje neželjenog aktiviranja nedovršene teme.
5. Migrirati pohranjene vrijednosti prethodnog `nejra.theme`: `aurum-light` i `aurum-dark` mogu zadržati samo preferenciju režima, nikada aktivirati identitet; `classic`, nepoznato i oštećeno tretirati kao odsutnost preferencije. Ne odabrati režim samo zato što je korisnik nekad bio u klasičnom prikazu.
6. Očuvati postojeći identitet i paletu, `theme_primary`/`theme_accent` ponašanje za classic, a u Aurumu prethodno odobrenu fiksnu paletu. Ovaj segment ne proglašava stari Aurum prikaz dovršenim novim dizajnom.

## Opseg i ograničenja

Backend: minimalno registry, validacija i relevantni testovi; nema migracija, novih zavisnosti ni promjene auth/guard pravila. Frontend: vlasništvo stanja, čitanje postavki, admin forma, korisnički birač, i18n BS/EN, migracija pohrane i testovi. Testovi koji su garantovali tri korisničke opcije moraju se ažurirati jer suprotstavljaju novoj odluci; zadržati i proširiti sigurnosne, pristupačne, fallback i round-trip garancije, uz tačno obrazloženje u `CHANGELOG.md`.

Postojeći S6 lokalni WIP treba sačuvati i ne smije slučajno ući u commit ovog segmenta. Pošto WIP dotiče i potrošače izbornika teme, izolovati i provjeriti tačan staging/snapshot prije commita; ne brisati ga niti predstavljati kao završeni S6. Revidirane S2–S4 i S6 ostaju zasebni segmenti nakon ovog temelja.

## Obavezna verifikacija prije završetka

- Backend testovi za dozvoljene/nedozvoljene vrijednosti, odbijanje neovlaštenog upisa, PUBLIC scope/default, persistence i javni odgovor bez privatnih podataka; frontend testovi za sve kombinacije identiteta, defaulta, spremljenog režima, starog/oštećenog storage-a, promjene postavki i kvara učitavanja.
- Provjera da na javnim, auth/onboarding i admin/stylist ekranima posjetilac ne može izabrati `classic`/`aurum`; semantika kontrola, fokus, jezik, 44 px i preference reduced motion.
- Pet Python gateova, puna relevantna test petlja, frontend build ≤300 KiB, e2e typecheck, lint, `git diff --check`; backend build i testovi. Nijedan postojeći test ne brisati ili slabiti.
- Prije tvrdnje o stvarnom WCAG-u: proširiti ili koristiti `a11y-e2e` tako da eksplicitno mjeri oba Aurum režima i classic; evidentirati tačan obuhvat, nepotpune rezultate i artefakte. Source-only testovi nisu rendered dokaz. Ako stvarni kontrast ne prođe s postojećom paletom, **STOP**, bez samostalne promjene palete.
- Commit/push samo nakon provjere izolovanog diff-a, zatim 5/5 CI, tačan SHA/run/artifact u evidenciji i STOP za zasebno odobrenje sljedećeg segmenta. Nema PR/merge/deploy.

## Otvorene odluke prije implementacije

Riješeno: `aurum_initial`, `light_initial`, `hide_when_classic`; detalji slijede.

## Odobrenje i naknadne odluke

Vlasnik je odobrio `approve_foundation`: početni identitet je **Aurum** (`aurum_initial`) čak i prije završetka revidiranog dizajna; početni režim je **svijetli** (`light_initial`). Ako administrator odabere `classic`, prekidač za posjetioca se skriva (`hide_when_classic`). Aktivni identitet i režim bira administrator, a korisnik pamti samo režim. Revidirani koncept odobren kao smjer; S6 WIP ostaje sačuvan.

## Lokalni rad u toku — nije završeno

Dodani su backend registry ključevi `theme_active_skin` (`aurum`) i `theme_default_mode` (`light`), te provjera dozvoljenih vrijednosti i servisni testovi. Dodana je izolovana čista frontend politika `theme-policy.mjs` i njeni testovi, ali **još nije povezana** sa `ThemeProvider`, postavkama ni switcherom. Lokalno `node --test .../theme-policy.test.mjs` prolazi 3/3. Backend Jest još nije izvršio testove: Prisma client nije generisan, jer `prisma generate` nakon postavljanja privremenog testnog `DATABASE_URL` ne može preuzeti schema engine s `binaries.prisma.sh` (host izvan dostupnog mrežnog opsega). Potrebno riješiti generisanje/testirati u CI, završiti integraciju, dodatne testove, sve gateove i 5/5 CI prije bilo kakve tvrdnje o završetku. Nije urađen commit/push; S6 WIP je sačuvan.

## Nastavak — lokalna integracija, nije završeno

`ThemeProvider` sada koristi globalne postavke poslane iz `SettingsProvider` i lokalnu preferenciju režima; zahtjevi za postavke imaju zaštitu od zastarjelih odgovora. `ThemeSwitcher` skriva se za `classic` i nudi dvije Aurum opcije; `SettingsAppearance` dodaje dvije lokalizovane select postavke. Ovo je i dalje WIP: potreban je stvarni integracijski test spremanja i prikaza postavki, e2e oba režima i backend testovi/CI. Fallback do uspješnog učitavanja postavki je odobreni početni `aurum-light` (uz važeću lokalnu preferenciju režima); ako server nije dostupan, stvarna administratorska postavka nije poznata. Posljednja puna frontend `test:*` petlja **204/204**, 5 gateova prolazi, e2e typecheck prolazi, lint 0 grešaka/7 upozorenja; build prije posljednjih test/doc izmjena **281,9/300 KiB**, na radnom stablu koje sadrži i S6 WIP. Backend Jest i dalje nije izvršen zbog nedostupnog Prisma enginea. Nema commita, pusha ni 5/5 CI dok segment nije spreman i staging izolovan.

## Nastavak implementacije i provjera

Dodan je runtime test `ThemeProvider` (React + JSDOM) kroz postojeći `test:theme-state` CI ulaz; provjerava promjenu administratorskog skina, promjenu DOM atributa i očuvanje lokalnog režima. Servisni i controllerski backend testovi lokalno prolaze **19/19 uz privremeni Prisma module stub** i mock repository, pa ne dokazuju stvarnu bazu, Prisma build ili HTTP e2e autorizaciju. Dodan je `frontend/e2e/theme-policy.spec.ts`: tri scenarija izbora i axe za `/` i `/login` u oba Aurum režima; typecheck i enumeracija testova prolaze, ali **Chromium testovi nisu izvršeni**. Potrebna je CI provjera sa stvarnim generisanim Prisma clientom i browserom, plus ostatak opsega pristupačnosti. Posljednji puni frontend `test:*`: **204/204**, build **282,0/300 KiB**, lint 0/7, e2e typecheck i pet Python gateova PASS; build uključuje i sačuvani S6 WIP i zato nije dokaz izolovanog commita. Bez commit/push dok izolacija, integracijska verifikacija i spremnost za pregled nisu dovršeni.
