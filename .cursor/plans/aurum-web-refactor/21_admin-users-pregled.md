# Pregled `/admin/users`

> **ARHIVA:** Ovo je historijski plan, zapis ili dokaz. Ne opisuje aktuelnu temu ni trenutne verifikacijske rezultate. Podržani su samo Aurum light i Aurum dark.

- Status: u toku; korisnik je izričito zadao ovu stranicu prije analitike. Koristi protokol i šablon iz `19_checklist-template-pregled-stranice.md`.
- Svrha: pregled klijenata, stilista i administratora, upravljanje ulogama, statusom, podacima, dugovanjima i početnim pristupom. Stvarne izmjene i pristup moraju ostati autorizovani na backendu.
- Plan: (1) čitanje cijelog page fajla i popis zavisnosti; (2) ugovori, hardkod, tokeni, i18n, interakcije i a11y; (3) ispravke i izolirani testovi sa reprezentativnim podacima za sve pogođene tokove; (4) CI i dokumentovanje ograničenja, pa korisnikov vizuelni pregled.

## Inventar

| Fajl / kontekst | Opseg | Status |
|---|---|---|
| `frontend/src/pages/Users.tsx` | linije 1–1588 prije izmjena | pročitan u cijelosti |
| shared DataTable/DataState, Badge, Card, Button, Dialog, Alert, Dropdown, Switch, Tabs, Input, Label, Avatar, ConfirmDialog | relevantna implementacija i portal stilovi | u toku |
| API katalog, greške, upload, toast, i18n, backend role i ugovori | relevantni dijelovi | u toku |
| `frontend/src/features/users/*.test.mjs`, E2E i translations | relevantni slučajevi | u toku |

## Početni nalazi

| ID | Nalaz | Prioritet | Status |
|---|---|---|---|
| U-01 | Create dijalog primary button u svijetlom režimu 6.01:1, ispod ciljanog AAA, 2 prethodna CI pada. | srednji | popraviti postojećim tokenima, bez izmjene palete i uz CI test |
| U-02 | Select za prijenos stilističke uloge koristi isti ID za više kategorija, pa label može označavati pogrešan element. | visok | napraviti jedinstven ID i provjeru više kategorija |
| U-03 | Switch aktivnog statusa nema programski naziv. | visok | povezati s vidljivom oznakom i testirati |
| U-04 | Async provjere dostupnosti username-a mogu ažurirati status nakon novijeg unosa ili zatvaranja. | srednji | zaštititi od zastarjelih odgovora i testirati |
| U-05 | Obojene stavke, dugovi, statusi, akcije i dijalozi trebaju sveobuhvatnu provjeru stvarnih površina, kontrasta i interakcija. | visok | u toku |

Vizuelni pregled radi korisnik; automatski testovi ne zamjenjuju čitač ekrana niti dokazuju sve WCAG kriterije. Ne dirati nepovezani nepraćeni dashboard WIP.

## Prvi inkrement

- U-01: primarno dugme samo u Users portalu prešlo na postojeće površinske/tekstualne tokene, s hover stanjem; Classic nije promijenjen. CI treba dokazati kontrast.
- U-02/03: jedinstveni ID po kategoriji prijenosa, switch povezan s vidljivom oznakom, potrebni podaci programački označeni. U-04: otkazivanje zastarjelih rezultata provjere username-a pri izmjeni/zatvaranju. Dodan browser scenarij edit i dvije kategorije prijenosa, oba moda/viewporta; čeka CI.
- Dodatno: unikatna imena role akcija s username, vidljiv fokus i minimalni 24px gumb, brisanje privremene lozinke iz stanja na potvrdi, reduced-motion spinner, usklađene odabrane površine/tekst/ikone u korisničkom prikazu i dijalozima.
- `Users.tsx` pročitan u cijelosti. Relevantni DataTable, DataState, Badge, Button, Card, Dialog, Alert, ConfirmDialog i API catalog pregledani; dodatne zavisnosti, backend ugovori, ostala stanja i svi testovi još nisu dovršeni.
- Lokalno users-a11y 7/7, lint, build i E2E typecheck prošli; rezultat browser/CI još nije poznat.

### CI i dodatni nalaz

- CI `43585781634` za `d5fe688`: **5/5 poslova prošlo**. Ranija dva Users create AAA pada su otklonjena; četiri nova edit/role-transfer scenarija također su prošla. Ovo nije dokaz svih stanja niti automatska potvrda potpune pristupačnosti.
- U-06: zajednički `ConfirmDialog` ostajao je zaključan nakon neuspješne mutacije dok se dijalog ne zatvori. Implementirana zaštita od duplog klika i reset zaključavanja poslije pending ciklusa; izmjena je zajednička za postojeće finance potrošače. Source test ažuriran, lokalni build/lint prošli. Dodan stvarni browser test neuspjeha i ponavljanja otpisa s mockom, čeka CI. Nije izvršena mutacija stvarnih podataka.
- I dalje otvoreni detalji: izvršni test zastarjelih username odgovora, ostali dijalozi i stanja, sadržajne fixturee u oba moda, Classic, dostupnost čitačem ekrana i korisnikov vizuelni pregled. `/admin/users` nije još označen završenim.
- CI `43586377293`: 4/5 poslova; novi test je dokazao drugi poziv nakon greške, ali pao na testnoj lokaciji `getByRole('dialog').last()` koja nakon zatvaranja pronalazi ponovo otvoreni edit dijalog. Koristimo tačan pristupačni naziv potvrde, bez mijenjanja aplikacijskog ponašanja; ponovna provjera potrebna.
- CI `43587004231` za `0db652f`: 5/5 poslova. Retry testa otpisa je sada prošao, kao i ostali testovi; CI ne garantuje svaku kombinaciju svih potrošača zajedničkog dijaloga.
- Dodat izvršni browser test za namjerno odgođen stariji odgovor provjere korisničkog imena; čeka CI.
- CI `43587542493` za `cee6449`: 5/5; browser test odgođenog zastarjelog username odgovora prošao.
- U-07 (visok): uklanjanje uloge stiliste bez povezanih zapisa prethodno se slalo automatski nakon preview odgovora, čak i bez potvrde; zatvaranje dok preview traje nije prekidalo tok. Uklonjena automatska mutacija i dodana zaštita od zastarjelih preview odgovora. Sada je potrebna eksplicitna potvrda i kad nema povezanih zapisa; dodan izolovan browser test otkazivanja i potvrde. Test čeka CI; nijedan stvarni korisnik nije mijenjan.
- CI `43588111224` za `d25d56b`: 5/5. Browser test potvrđuje da nema automatskog uklanjanja pri nula povezanih zapisa, otkazivanje ne šalje mutaciju, a izričita potvrda šalje jednu izolovanu mock mutaciju.
- Dodani test kompletnog popunjenog prikaza (AA plus izvještaj AAA/incomplete) u oba moda/viewporta i simulirana kreacija s jednokratnim pristupnim podacima; čeka CI.
- CI `43588639783` za `082e4a5`: 5/5, simulirana kreacija i brisanje prikazanih jednokratnih pristupnih podataka prošli. Popunjeni Users axe u light režimu prijavio AAA 6.38–6.39:1 na zaglavljima i značkama (AA prošao), dark bez nalaza. Usklađen tekst s postojećim jačim tokenima, zadržani statusni obrubi/pozadine, bez izmjene palete; test sada zahtijeva i AAA bez violations. Čeka ponovni CI.
- CI `43589288269` za `e76a950`: svih 5 poslova prošlo; strogi axe za popunjeni Users u svijetlom/tamnom desktop/mobilnom prikazu nije prijavio violations. Ovo vrijedi samo za testirane fixture i stanja, ne za cijelu stranicu ili WCAG usklađenost.
- Otvoreno: dovršiti pregled preostalih backend ugovora i zavisnosti, Classic i preostalih dijaloga/stanja, dokumentovati kompletnu matricu te ručno provjeriti tastaturu, čitač ekrana i uvećanje. Vizuelna provjera korisnika tek nakon dovršetka. Stranica nije zatvorena; ne prelaziti na analytics.

### Nastavak: ugovori i podaci
- Pregledani UsersController, create/update/removal DTO, relevantne metode UsersService i ClientDebtsController: liste/kreiranje/uloge/preview štite JWT i SYSTEM_ADMIN/OWNER; PATCH users dodatno provjerava identitet ili admin/owner u servisu; otpis štiti RolesGuard. Testovi s mockom nisu dokaz produkcijskih ovlasti.
- U-08: neispravan uspješan odgovor liste dugova tretiran je kao prazna lista, što je moglo prikazati da klijent nema dug. Sada je to greška s postojećim retry stanjem; dodan browser test oporavka nakon neispravnog odgovora (uključuje automatski React Query retry). Ne mijenja stvarne dugove.
- U-09: kreiranje korisnika prihvatalo je ime/prezime sastavljeno samo od razmaka; sada se validira i šalje trimovana vrijednost.
- Lokalni lint, build, E2E typecheck i users source test 7/7 prošli. Novi browser test čeka CI.
- CI `43592404559` za `e55359c`: 4/5, 380 browser testova prošlo, uključujući malformed debt/retry; dva nova Classic testa pala. Desktop je otkrio da se fokus nakon zatvaranja edit dijaloga ne vraća na okidač; mobilni test tražio je jedinstveni naziv koji mobilno edit dugme nije imalo. U-10: popravljen povrat fokusa na stvarni okidač i dodano jedinstveno pristupačno ime mobilnom edit dugmetu (oba skina). Ponovni CI potreban; ručna AT provjera ostaje otvorena.
- CI `43593178958`: Classic desktop/mobile i novi fokus prošli; 4/5 poslova zbog dva ranija Aurum mobilna testa koja su još tražila staro generičko ime „Uredi“. Testne lokacije usklađene s novim jedinstvenim nazivom; ponovni CI potreban.
- CI `43593825960` za `429c455`: 5/5 poslova, uključujući Classic desktop/mobile edit, povrat fokusa, Aurum edit/prijenos i oporavak nakon neispravnih dugova. Test Classic pokriva jednu fixture i jedan dijalog, ne kompletnu Classic matricu.
- Preostaje: ostali dijalozi/interakcije, auth negativni scenariji i backend granice, matrica svih stanja te ručna provjera čitačem ekrana i 400% zoom; vizuelni pregled korisnika tek nakon završenog tehničkog pregleda. Stranica ostaje otvorena.

### Dodatni pregled dijaloga i backend granica
- U-11: prethodna izmjena za fokus greškom je vezala i dijalog uklanjanja stiliste za edit okidač. Ispravljeno: svaki se vraća na svoj stvarni okidač; kategorije prijenosa/brisanja su sada fieldset/legend grupe i učitavanje previewa ima status. Browser test provjerava grupe i fokus u oba Aurum moda/viewporta (čeka CI).
- U-12: backend preview je izostavljao soft-deleted unose dnevnika, ali ih mutacija brisanja/prijenosa obuhvata. Preview sad broji isti skup; dodan backend unit test. Lokalno 35/35 backend testova uz mock Prisma klijenta, frontend lint/build i E2E typecheck prošli; čeka pravi CI.
- U-13 **otvoreno, visoki prioritet**: preview i potvrda stilista nisu atomski vezani. Ako se povezani zapis pojavi/promijeni nakon previewa, naročito kategorija s prikazanom nulom, zahtjev može obuhvatiti podatke koje administrator nije vidio. Potrebna backend zaštita od zastarjelog previewa i test konkurentnosti/rollbacka prije zatvaranja stranice. Ne tvrditi da je ovaj rizik riješen samim ažuriranjem preview broja.
- Dodani testovi controller role metadata za relevantne rute i negativni service testovi za klijenta/stilistu bez ovlasti; to su izolovani testovi, ne kompletan HTTP/produkcijski dokaz.
- CI `43611161901` za `6e80e8b`: 5/5 poslova, uključujući backend build/testove i 4 Aurum browser scenarija za grupe i povrat fokusa. U-13 ostaje otvoren; prolaz CI ga ne pokriva niti otklanja.

### Završni prolaz — zaštita podataka
- U-13 implementacija: preview uključuje SHA-256 reviziju sortirane liste identiteta povezanih zapisa; API zahtijeva reviziju i unutar PostgreSQL Serializable transakcije ponovo provjerava isti skup prije mutacija. Promijenjen skup ili serialization konflikt vraća lokalizirani 409; frontend zatvara zastarjeli dijalog i traži novi preview i novu potvrdu. Ovo nije revizija sadržaja svih povezanih zapisa i ne dokazuje nepokrivene domenske zavisnosti.
- Backend provjerava da je cilj prijenosa ACTIVE u istoj transakciji; revizija i oblik previewa se validiraju. Stari klijenti bez revizije dobijaju validacijsku grešku; frontend i backend moraju biti objavljeni zajedno.
- Dodani izolovani service testovi i PostgreSQL E2E sa zapisom dodanim između previewa i potvrde (provjerava očuvanje podataka i uspjeh poslije ponovnog pregleda), te browser test ponašanja pri 409. Ovo nije test istovremenih transakcija; potreban CI i dodatna provjera konkurentnosti.
- CI `43613386868` za `b0ab56e`: 5/5, uključujući PostgreSQL test zastarjelog previewa i browser 409 test. Paralelni transakcijski konflikt nije zasebno simuliran; identiteti povezani u reviziji nisu revizija sadržaja zapisa.
- U-14: pregled Prisma relacija pokazao je da brisanje dnevnih zapisa može kaskadno obrisati stavke knjige prihoda, a brisanje profila može odvojiti ručne prihode; dugovi imaju Restrict. Dodana konzervativna backend zabrana uklanjanja uz povezane dugove/ručne prihode, te zabrana DELETE dnevnih zapisa s knjiženim prihodima (prijenos ostaje moguć gdje nema drugih blokada). Poruka objašnjava blokadu; dodan PostgreSQL test očuvanja duga i recenzije, čeka CI. Ovo namjerno ograničava uklanjanje i ne predstavlja kompletan postupak razrješenja finansijske historije.
- CI `43614185610` za `61543fc`: 5/5; PostgreSQL fixture potvrdio je odbijanje uklanjanja kod povezanog duga bez gubitka duga/recenzije. Blokada je konzervativna i može spriječiti uklanjanje i za zatvoreni dug; ne postoji kompletan UX za premještanje finansijske historije.
- U-15: klijentska lista s neispravnim 200 odgovorom više ne izgleda kao prazna/0. Dodan retry browser scenarij. U-16: vraćanje fokusa iz kreiranja i jednokratnih pristupnih podataka na stvarni okidač, bez krađe fokusa tokom prijelaza između dijaloga; proširen browser test. Lokalno lint/build/typecheck/source test prošli; CI na čekanju.
- CI `43615050307` za `d6b585d`: 5/5; test neispravne klijentske liste i create → credentials → fokus te otkazivanje kreiranja prošli. Dodane axe AA i evidencija AAA/incomplete za dijalog uklanjanja i pristupne podatke; čeka CI.

## Matrica dokaza — stvarni obuhvat
| Stanje | Light desktop | Dark desktop | Light 320 | Dark 320 | Tastatura / ograničenja |
|---|---|---|---|---|---|
| Popunjena lista s klijentom | axe AA+AAA, CI 43589288269 | isto | isto | isto | tabovi strelice; ne sve radnje |
| Greška liste/retry, create | CI 43585781634 | isto | isto | isto | samo testirana greška i forma |
| Edit, prijenos 2 kategorije | CI 43611161901 | isto | isto | isto | Escape i povrat fokusa; ne svi odabiri |
| Classic popunjeno + edit | CI 43593825960 | N/P (Classic, ne Aurum mod) | CI 43593825960 | N/P | Escape i povrat fokusa; nije puna Classic matrica |
| Dug: greška/retry, otpis retry | CI 43593825960, pojedinačni scenariji | nije sve testirano | nije sve testirano | nije sve testirano | mock mutacije, ne stvarni podaci |
| Kreiranje i jednokratna lozinka | CI 43615050307, pojedinačni scenarij | nije testirano | nije testirano | nije testirano | fokus pri otkazivanju i poslije potvrde |
| Sukob previewa stiliste | CI 43613386868, pojedinačni browser + PostgreSQL | nije testirano | nije testirano | nije testirano | nije zasebno simuliran paralelni konflikt |
| 400% zoom, pravi čitač ekrana, kompletna tastatura, hover/disabled, sve kombinacije role | otvoreno | otvoreno | otvoreno | otvoreno | bez dokaza, ne tvrditi WCAG konformnost |

### Još otvoreno
- U-14: odluka o prijenosu donesena i implementirana; detalji i ograničenja su navedeni u nastavku.
- U-13: identiteti su zaštićeni revizijom i Serializable transakcijom; paralelni test umetanja recenzije prolazi, ali promjene sadržaja istih identiteta nisu obuhvaćene revizijom.
- Pregled svih preostalih statusa i varijanti, ručni AT/uvećanje te korisnikov vizuelni pregled ostaju otvoreni; stranica nije zatvorena.
- CI `43615711629` za `e59b3bc`: 5/5, ali log proširenog axe je otkrio `heading-order` (h5) u uklanjanju stiliste u sva četiri Aurum prikaza; raniji filter taj nalaz nije blokirao. U-17: lokalni Alert naslovi u Users prikazu zamijenjeni semantičkim nen-heading tekstom, bez promjene zajedničke komponente; removal axe sada zahtijeva nula svih violations, uključujući AAA. Potrebna ponovna CI provjera. Credentials fixture: nula violations i incomplete u jednom testiranom prikazu.
- CI `43616524501` za `759a74d`: 5/5; strogi removal axe (AA i AAA tagovi) sada prolazi u četiri testirana Aurum prikaza. Nije dokaz za sva stanja ili punu WCAG usklađenost.

### Nastavak cjelovitog pregleda
- Finansijska blokada se sada prikazuje već u previewu s brojem dugovanja i ručnih prihoda; knjiženi dnevnici jasno upućuju na prijenos umjesto brisanja. Potvrda je onemogućena kada bi backend odbio radnju. Provjera na serveru ostaje mjerodavna i transakcijska. Browser scenarij čeka CI. Ovo čuva historiju, ali slučaj u kojem se ta historija treba premjestiti/anonimizirati zahtijeva poslovno pravilo i nije automatski izmišljen.
- CI `43646442347` za `19c91fc`: 5/5, uključujući PostgreSQL konkurentni test umetanja recenzije tokom transakcije uklanjanja; mutacija se odbija i podaci ostaju. Browser test finansijske blokade također prolazi.
- U-18: edit je slao nepromijenjen spol, a backend ga smatra završetkom gender onboardinga. Frontend sada šalje spol samo ako je promijenjen; dodan browser test. U-19: provjera dostupnosti normalizovala je username, dok ga je PATCH spremao bez normalizacije. Backend za promjene sada provjerava/sprema istu normalizovanu vrijednost, a nepromijenjeni legacy username ostaje netaknut; odbija se nevalidno prazna normalizacija. Dodan service test. Čeka CI; promjena PATCH ugovora utiče i na druge njegove potrošače, dok stari username nije masovno migriran.
- CI `43647168456` za `5c0ed3a`: 5/5, uključujući browser test da izmjena telefona ne mijenja onboarding i backend test normalizacije usernamea.
- U-20: server može smanjiti traženu stranicu nakon promjene broja korisnika, ali UI je zadržavao staru i prikazivao pogrešnu paginaciju. UI sada prihvata validiran server page, označava trenutnu stranicu s `aria-current` i skriva klijentsku paginaciju na drugim tabovima; browser test čeka CI.
- CI `43647976687` za `15ee71e`: 5/5, uključujući novi scenarij usklađene paginacije i skrivanje paginacije na administratorskom tabu.
- U-21: dijalozi create/edit/remove mogli su se zatvoriti tokom već poslane mutacije, što stvara lažan dojam otkazivanja i može sakriti jednokratne pristupne podatke. Zatvaranje je blokirano dok zahtjev traje, otkazivanje disabled, uspjeh i greška i dalje normalno razrješavaju stanje. Dodan browser test odgođenog create zahtjeva; CI na čekanju.
- CI `43648639911` za `a452d28`: 4/5; 387 browser testova prošlo. Novi test je potvrdio da Escape ne zatvara dijalog dok traje zahtjev, ali lokator otkazivanja tražio je „Otkaži“ umjesto stvarnog prijevoda „Odustani“. Ispravljen lokator, potrebno ponoviti CI.
- CI `43649195513` za `f6a1367`: 5/5 poslova; test pending kreiranja prolazi nakon ispravke lokatora. Testovi finansijske blokade, konkurentne transakcije, paginacije i onboardinga su obuhvaćeni ranijim i ovim CI runom.
- Otvorena poslovna odluka U-14: postojeći zahtjev traži fizičko brisanje profila stiliste, dok zatvoreni i otvoreni dugovi imaju obavezan `stylistProfileId` s RESTRICT, a ručni prihodi čuvaju historijsku atribuciju. Automatski prenos na drugu osobu mijenja historiju; brisanje/odvajanje podataka je opasno. Sigurna implementirana blokada s objašnjenjem ostaje dok se ne izabere poslovno pravilo. Nije ispravno označiti stranicu potpuno završenom.

### Odluka korisnika: finansijska historija
- Korisnik je izričito odabrao **prijenos historije** pri uklanjanju uloge stiliste, uz upozorenje o promjeni atribucije. Prethodna apsolutna blokada dugova/ručnog prihoda je zamijenjena odabirom drugog aktivnog stiliste i obaveznom zasebnom potvrdom; bez cilja/potvrde server odbija. Knjiženi dnevnici i dalje se ne mogu obrisati — moraju se prenijeti.
- Revizija previewa sada uključuje identitete dugova, ručnih prihoda i knjiženih dnevnika; promjene između previewa i transakcije vraćaju konflikt. Promjena cilja poništava checkbox potvrde. Prijenos se obavlja atomarno s uklanjanjem i zadržava same zapise, ali promjena atribucije je stvarna; ne tvrditi da je zadržan zaseban audit stare atribucije.
- Dodani browser test obaveznog cilja/potvrde i PostgreSQL test prijenosa otvorenog i zatvorenog duga te ručnog prihoda, plus odbijanja bez potvrde; čekaju CI. Frontend i backend moraju biti objavljeni zajedno.
- CI `43658640464` za `dffff58`: 5/5 poslova za implementirani prijenos. Naknadno dodana transakcijska audit tabela s izvornim i ciljnim korisnikom/profilom, izvršiocem i ID-ovima prenesenih dugova i prihoda, kako bi se prije promijenjena atribucija mogla rekonstruisati. Dodana migracija i PostgreSQL provjera audita; čeka CI. Evidencija ne izlaže finansijske sadržaje u browseru.
- CI `43659247131` za `b999c33`: 5/5, migracija i PostgreSQL test potvrđuju da se audit sa starom/novom atribucijom kreira u istoj transakciji. CI `43659818388` za `e566103`: 5/5; provjereno odbijanje bez potvrde, bez cilja ili sa istim stilistom, te ponovno traženje potvrde pri promjeni cilja. Nema pregleda audita u UI; zapis je u bazi.
- Dodata četiri stroga AA/AAA axe scenarija finansijskog dijaloga i provjere 320px; rezultat čeka CI.
- CI `43660393178` za `2e50f12`: 5/5; finansijski dijalog, strogi axe AA+AAA u light/dark na desktop/320px, nula violations i nula incomplete u testiranim fixtureima. Ovo ne zamjenjuje vizuelni ili stvarni screen-reader pregled.
- Audit U-14 je server-side zapis u istoj transakciji s ID-ovima izvornog/ciljnog korisnika i profila, izvršioca, dugova i ručnih prihoda; nema korisničkog UI za pregled i njegova nepromjenjivost nije nametnuta privilegijama baze. Poslovna odluka o prijenosu je primijenjena, nema automatskog prijenosa.
- Preostali dokaz: ručni pregled čitačem ekrana i 400% uvećanje, sve kombinacije Classic i vizuelni pregled korisnika nisu provedeni u ovom okruženju; stranica se zato ne označava potpuno završenom.

### Dodatna provjera finansijskih relacija
- CI `43705770802` za `82afa5b`: 4/5; test knjiženog dnevnika je prošao, ali drugi novi test koristio je nepostojeći enum `INACTIVE` umjesto `PENDING`. CI `43706297503` za `4e935a8`: 5/5 nakon ispravke fixturea. PostgreSQL provjerava promjenu revizije nakon knjiženja, zabranu brisanja knjiženog dnevnika, očuvanje stavke prihoda pri eksplicitnom prijenosu i odbijanje PENDING cilja.
- Ograničenje: postojeća audit tabela bilježi prijenos dugova i ručnih prihoda, ali zasebno ne zapisuje stare atribucije prenesenih knjiženih dnevnika. Upozorenje za njih navodi da se ne mogu obrisati i da se prenose; za rekonstrukciju prethodne atribucije potrebna je dodatna audit evidencija. Ovo ostaje otvoren nalaz, ne predstavljati kao potpun audit cjelokupne finansijske historije.
- Prethodni audit nedostatak za knjižene dnevnike ispravljen u `29c2ddc`: upozorenje izričito navodi promjenu atribucije prihoda, a transakcija zapisuje identitete knjiženih dnevnika, izvor, cilj i izvršioca, odvojeno od mogućeg prijenosa dugova na drugi cilj. Migracija dodaje polje u audit tabelu. CI `43707006336`: 5/5, uključujući PostgreSQL očuvanje stavke i provjeru zapisa. Ne postoji audit pregled u UI niti DB zabrana direktne izmjene audit redova.

### Classic finansijski dijalog
- U-22: u prvom strogom AA/AAA skenu Classic desktop/320px pronađen kontrast aktivnog destruktivnog dugmeta 6,28:1 (AA prolaz, AAA pad). CI `43714390762` zbog toga 4/5. Lokalno upotrijebljena već postojeća `rose-900` nijansa iz Users; globalna paleta nije mijenjana, a Aurum override ograničen na konkretno dugme.
- CI `43715105784` 5/5: Classic finansijski dijalog, desktop i 320px, nula axe violations i incomplete u testiranim podacima; Tab od izbora cilja do potvrde te Space za checkbox prolaze. Nakon dodatnog sužavanja Aurum overridea, CI `43715696986` za `a6f3598` također 5/5. Nije dokaz za sve Classic forme, stvarni čitač ekrana ili 400% browser zoom; 320px viewport nije sam po sebi puna provjera zooma.

### U-23 i U-24 — priprema i aktivnost cilja
- U-23: preview se prethodno prikazivao prije završetka učitavanja ciljnih stilista. To je privremeno prikazivalo lažnu poruku da nema cilja i moglo dozvoliti potvrdu DELETE opcija dok je lookup još trajao. Dijalog sada ostaje u loading stanju do kraja potrebnog lookupa; neispravni brojevi knjiženih dnevnika veći od ukupnog broja dnevnika se odbijaju. Browser test kontrolira odgođeni odgovor i disabled potvrdu.
- U-24: `status === ACTIVE` nije isto što i aktivan stilista: profil ima zaseban `isActive`, a korisnički račun također. Transakcija sada provjerava sva tri uslova za sve kategorije prijenosa; admin katalog izlaže aktivnost korisničkog računa samo u admin prikazu, a UI onemogućava neaktivne ciljeve i ne nudi nepoznat status. Postojeći API klijenti sada dobijaju strožu validaciju; frontend/backend objaviti zajedno. Dodani PostgreSQL testovi PENDING profila, deaktiviranog profila i deaktiviranog korisnika i browser testovi odsustva aktivnog cilja.
- CI `43724406774` za `9bc164c`: 5/5. CI `43725004362` za `61dffeb`: 5/5; dodatno browser test potvrđuje da se knjiženi dnevnik ne može odabrati za brisanje i da prijenos traži cilj. Ovo ne zamjenjuje ručni AT/zoom ili korisnikov vizuelni pregled.

### U-25 — korisnikov nalaz: analitika konkretnog klijenta
- Prijavljen klik na oko iz Users otvara pregled analitike umjesto odabranog klijenta. Uzrok: ClientAnalytics je tokom inicijalnog učitavanja zamjenjivao query parametre samo s `userId`, uklanjajući `tab=clients`; hub se time vraćao na overview. Statički test URL-a nije provjeravao stvarni prijelaz.
- Plan: očuvati postojeći detaljni prikaz i API, koristiti URL kao izvor odabira, zadržati tab pri filterima, spriječiti zastarjele odgovore i beskonačni retry, jasno razdvojiti greške analitike i dugova. Dodati stvarni browser test klika iz Users, filtera i greške/retry; provjeriti CI prije zatvaranja nalaza. Ovo je samo povezana putanja, nije kompletan audit `/admin/analytics`.
- Korisnik traži testiranje svih funkcionalnosti i čitač ekrana + 400% zoom; Classic ostaje funkcionalan ali nije prioritet za daljnju opsežnu matricu. U ovom sandboxu nema instaliranog čitača ekrana ni lokalnog browsera; ne predstavljati axe ili 320px viewport kao stvarni AT/zoom pregled. Potrebno zasebno omogućeno okruženje za taj dokaz.
- U-25 implementiran: uklonjeno prepisivanje `tab=clients` pri učitavanju, filteri čuvaju tab i ID; ponovni pokušaj ne ulazi u petlju, zastarjeli odgovori se ignorišu, pogrešan ID/neispravan oblik se odbija, greška dugova ne prikazuje lažnu nulu niti skriva učitanu analitiku. Browser test klikom iz Users pokriva detalj, filtriranje/poništavanje, nazad, API grešku/retry, pogrešan ID i mobilnu putanju. CI `43744820132` i `43745675214`: 5/5. Testovi API-ja u browseru koriste fixture, ne produkcijske podatke; ovo nije cjelokupni pregled analitike.
- U-26: desktop deaktivacija korisnika nije bila dostupna u mobilnoj kartici. Dodata ista radnja s istom potvrdom i identifikovanim pristupačnim nazivom, kao i jedinstveni nazivi mobilne analitike/reset linka. Browser provjerava odbijanje/potvrdu deaktivacije na desktop/320px. CI `43746458159`: 5/5.
- CI `43747139637` za `2a9a5d8`: 5/5; novi browser testovi provjeravaju dodjelu stiliste, zabranu uklanjanja klijentske uloge, potvrdu uklanjanja administratorske uloge i uslove/reset linka. Zahtjevi se mockiraju; nisu stvarni integracijski testovi slanja pošte niti puni dokaz svih korisničkih stanja.
- Okruženje nema `orca`, `firefox`, `chromium`, `google-chrome`, `espeak` niti pristup grafičkoj sesiji; stvarni test s čitačem ekrana i stvarni browser 400% zoom nije ovdje izveden. CI 320px reflow, axe i tastaturni scenariji su korisni ali nisu zamjena. Nastaviti provjeru preostalih funkcija; puna pokrivenost svih mogućih stanja nije dokazana.

### Testno okruženje: korisnički životni ciklus
- Dodan HTTP test sa stvarnim Nest endpointima i izolovanom PostgreSQL CI bazom: kreiranje klijenta i jednokratne lozinke, zabrana neovlaštenog kreiranja/izmjene/dodjele uloge, validacija i duplikat usernamea, izmjena podataka, dodjela/uklanjanje administratora, zaštita CLIENT role, dodjela i uklanjanje STYLIST role preko previewa, prijava početnom lozinkom, promjena, odbijanje stare lozinke, deaktivacija i reaktivacija. Odvojeni test provjerava zahtjev potvrđenog emaila, izdavanje tokena, opoziv početne lozinke, jednokratnu upotrebu tokena i prijavu novom lozinkom. Email transport je **mockiran**; stvarna dostava nije testirana.
- Prvi CI `43753174778` 4/5 zbog nepotpunog testnog mocka socket gatewaya (`disconnectUserSockets`); nakon dopune CI `43753823532` 5/5.
- U-27: dodjela STYLIST role i kreiranje profila prethodno su bili odvojeni zapisi, pa greška profila može ostaviti korisnika s rolom bez profila. Sada se zapisuju u istoj transakciji, a ponovna dodjela popravlja takvu staru djelimičnu dodjelu; nakon commita se odspajaju socketi. PostgreSQL HTTP test s namjerno izazvanom greškom potvrđuje rollback i naknadni retry/popravku. CI `43754521600` 5/5; nakon dodatnog usklađenja role unutar transakcije CI `43755120486` 5/5.
- Ovi testovi pokrivaju navedene scenarije u disposable bazi i ne dokazuju svaku kombinaciju svih podataka, stvarni SMTP, screen reader ili fizički browser zoom.

### Zatvaranje po odluci korisnika
- Korisnik je izričito odobrio zatvaranje `/admin/users` i prelazak na analitiku. Stranica zatvorena uz dokumentovane izuzetke: stvarni screen-reader i browser 400% zoom nisu izvedeni, SMTP je mockiran, a iscrpnost svih kombinacija nije dokazana. Ovo nije tvrdnja o punoj WCAG konformnosti. Ne vraćati se stranici bez novog zahtjeva ili nužne povezane regresije.
