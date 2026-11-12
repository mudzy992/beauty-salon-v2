# Revidirani plan — potpuni novi web identitet

**Status: PRIJEDLOG — čeka odobrenje.** S6 je pauziran; ne implementirati ovaj plan prije odobrenja. Historijski S0–S5 CI rezultati ostaju tačni za tadašnji opseg, ali nisu dokaz da je novi zahtjev za potpunim identitetom zadovoljen. Konkretno, S2–S4 treba ponovo dizajnerski i funkcionalno pregledati i realizovati prema ovom planu.

## Odluke vlasnika

- Potpuno novi vizuelni identitet cijelog weba: navigacija, hero, kartice, raspored, stilovi, animacije, widgeti i javne i nejavne stranice. Referenca sadrži primjere, nije granica kreativnog rješenja. Očuvati stvarni sadržaj, funkcije i podatke; ne izmišljati poslovne podatke.
- Dosadašnja Aurum paleta ostaje obavezna (`keep_palette`); iz nje graditi novi dizajnerski jezik. Ako stvarni kontrast ne prolazi, STOP i pitanje, bez samostalne korekcije palete.
- Administrator bira aktivni identitet **klasični ili novi** i početni **svijetli ili tamni** režim novog identiteta (`admin_skin_and_mode`). Izbor identiteta primjenjuje se na cijeli web, uključujući javni dio, auth/onboarding i dashboarde (`whole_web`).
- Posjetilac ne bira klasičnu/novu temu. Kad je aktivna nova, bira samo svijetlu/tamnu; izbor se pamti na uređaju i ima prednost nad administratorskim početnim režimom (`persist_mode`). Klasični identitet ostaje tokom tranzicije; njegovo buduće uklanjanje nije odobrenje za brisanje sada.
- Minimalne backend izmjene za sigurnu, trajnu globalnu postavku su dopuštene (`allow_minimal_backend`), bez migracije. `/mobile` ostaje izvan opsega. Ostatak poslovne logike, API ugovora, guardova, podataka i `PublicFeatureGate` ostaje očuvan; nikakve nove npm zavisnosti bez odluke.
- S6 lokalni WIP ostaje sačuvan, ne commitovati niti brisati kao dio ovog planiranja; kasnije ga pregledati i selektivno uskladiti s novim konceptom (`preserve_reconcile`).
- WCAG 2.2 AA je cilj/minimum; AAA je poželjan gdje izvodljivo. Automatizovani testovi sami ne dokazuju usklađenost. Rendered tvrdnje zasnovati na `a11y-e2e`, a ručne provjere evidentirati zasebno.

Ove odluke mijenjaju ranije Q2/Q7/Q8 i ograničenje backend opsega u mjeri u kojoj su s njima nespojivi. Historijski dokumenti i CI rezultati ostaju arhiva tadašnjeg stanja; ovaj revidirani plan je prijedlog novog smjera, ne retroaktivna potvrda implementacije. Ne mijenjati postojeću NEJRA paletu.

## 1. Vizuelni koncept — prije koda

Inventarisati stvarne javne widgete, prikaze, feature flagove, prazna/greška/loading stanja, administrativne postavke, medije i nejavne ekrane. Izraditi koherentan vizuelni koncept u postojećoj paleti: javni shell i navigacija, naslovna s herojem i stvarnim widgetima, katalog i primjer detalja; pokazati svijetlu i tamnu verziju i reprezentativan admin dashboard. Referenca je inspiracija, ne puko prebojavanje postojećeg UI-ja. Dizajn mora predvidjeti realne dugačke nazive, dostupne podatke, responsive raspored, fokus, reduced motion i prazna stanja. Ne koristiti izmišljene brojeve, recenzije, slike salona ili hardkodirane poslovne tvrdnje u produkciji.

**STOP:** prezentovati koncept i tražiti eksplicitno odobrenje prije implementacije. Ako su ilustrativni podaci potrebni u konceptu, jasno ih označiti kao ilustrativne.

## 2. Temelj: administratorski izbor i preference posjetioca

Prvo razraditi tehnički ugovor i testove; implementacija tek poslije odobrenja segmenta.

- Provjeriti postojeći registry postavki (`backend/src/settings/settings-registry.ts`), javno čitanje i autorizirano spremanje, validaciju i `settings:updated`. Predložiti minimalne registrirane vrijednosti aktivnog identiteta i početnog režima; bez nove migracije, ako postojeći mehanizam to podržava. Potvrditi da zapis ne može mijenjati neovlašten korisnik, a javni endpoint ne otkriva privatne postavke.
- Jasno odrediti ponašanje pri prvom učitavanju, grešci pristupa postavkama, asinhronom odgovoru, osvježavanju postavki i blokiranom localStorage-u. Ne dozvoliti da zastarjela lokalna `classic` vrijednost posjetiocu zaobiđe administratorski izbor. Planirati prijelaz postojećih `nejra.theme` vrijednosti i testirati `classic`, `aurum-light`, `aurum-dark`, nepoznate i oštećene vrijednosti.
- `ThemeProvider` je danas iznad `SettingsProvider`, koji koristi `useTheme()`: promijeniti ovisnosti bez kružne ovisnosti i bez dupliciranog vlasništva stanja. Osigurati da korisnikov light/dark izbor vrijedi samo za novi identitet i da administrator može promijeniti aktivni identitet.
- Kad je aktivan klasični identitet, javnosti ne nuditi izbor klasični/novi; ponašanje prekidača režima u klasičnom identitetu definisati prema stvarnoj podršci. Kad je aktivan novi, dati samo svijetlo/tamno, uz fokus, imenovanje, BS/EN i reduced motion.
- Testirati administratorsku autorizaciju, persistence, javni odgovor, sve kombinacije identiteta/defaulta/preference, staru pohranu, greške i promjenu postavki. Izmjene testova ne smiju slabiti postojeća sigurnosna i funkcionalna jamstva; svaka izmjena testova dokumentuje se.

## 3. Novi javni identitet — revidirani S2

Nakon odobrenog koncepta i temelja, potpuno redizajnirati javni shell, navigaciju, naslovnu, usluge i detalj usluge. Promijeniti kompoziciju i komponente, ne samo boje: hijerarhija, responzivni hero, kartice, realni widgeti, upravljanje slikama, pristupačna animacija i stanja podataka. Sačuvati postojeće izvore, feature flagove, pozive, parametre, rute, i18n i tokove. Provjeriti oba nova režima i odvojeno klasični identitet.

## 4. Javni sadržaj — revidirani S3

Blog, galerija, kontakt i zadovoljni klijenti dobijaju novi identitet prema odobrenom konceptu. Očuvati postojeći sadržaj i upravljanje objavama, prikaz medija i alternacije, validacije, linkove, postavke i pristupačna stanja. Uključiti prazne kolekcije i greške, bez ilustrativnih produkcijskih podataka.

## 5. Javni tokovi — revidirani S4

Rezervacije, detalji, korisničke rezervacije, profil i odjava kampanje: novi raspored i komponente uz strogi paritet tokova, payload-a, statusa, cijena, guardova, grešaka, pristanka i akcija. Posebno testirati klijentove podatke, forme, validaciju, tastaturu, povrat fokusa i sva relevantna stanja. Ne mijenjati `PublicFeatureGate` bez posebne odluke.

## 6. Auth, onboarding i dashboardi

Preispitati i S5 pod novim identitetom; potom revidirati plan S6–S10 za admin/stylist dashboarde. Administratorski izbor mora dosljedno obuhvatiti i te rute. S6 WIP pregledati kao zaseban diff i odlučiti šta koristiti; ne podrazumijevati da je postojeća mapa navigacije ili dashboard vizuelno završena samo zato što su ranije odobreni.

## 7. Verifikacija, evidencija i STOP

Za svaki odobreni implementacijski segment: provjeriti relevantne funkcionalne i source-contract testove bez slabljenja, BS/EN, pet Python gateova, punu frontend test petlju, build i postojeće bundle budžete, lint, e2e typecheck i diff. Pokrenuti CI na aktuelnoj grani i potvrditi svih 5 poslova; evidentirati tačan commit, run, job i artefakt. Proširiti `a11y-e2e` tako da eksplicitno provjerava stvarno renderirane stranice u novom svijetlom i tamnom režimu, kao i klasični režim; ne prikazivati samo source-only kontrast ili default-classic rezultate kao dokaz za novi UI. Evidentirati i ručne provjere 320 px/400% zoom, tastatura, fokus, reduced motion i čitač ekrana; nepotpune i AAA nalaze ne prikazivati kao prolaz. Ažurirati matrice samo za stvarno implementiran i dokazima pokriven opseg.

Radni režim ostaje: **plan → odobrenje → implementacija segmenta → 5/5 CI → evidencija → STOP → eksplicitno odobrenje sljedećeg segmenta**. Nema PR-a, mergea ni deploya bez zasebnog zahtjeva.

## Povratne informacije na koncept

Vlasnik se suštinski slaže sa smjerom, uz naglasak na unaprijeđen, unikatan premium identitet, diskretne animacije, moderne ikone u adminu (npr. postojeći `lucide-react`), postojeću paletu i komponentni standard kroz admin i javni web uz minimalno hardkodiranja. Animacije moraju poštovati `prefers-reduced-motion`. WCAG 2.2 AA je minimum, AAA poželjan; konkretni kontrasti i ponašanja moraju se stvarno provjeriti u oba režima, a postojeći izračuni tokena ili koncept nisu dokaz usklađenosti. Ako stvarna kombinacija iz palete ne prođe, STOP i pitanje prije promjene palete.

Dorađeni HTML koncept je prijedlog, ne produkcijska implementacija. Implementacija ostaje odvojeni segment i traži posebno odobrenje.

## Aktuelni režim rada i inkrementi

Vlasnik je odobrio koncept i kompletnu implementaciju bez odvojenih faznih odobrenja; istorijske STOP napomene za običan prelaz faza iznad su superseded. STOP za stvarni pad Aurum kontrasta i zabrana samostalne promjene palete ostaju. Temelj i prvi admin inkrement imaju odvojene CI dokaze, vidjeti planove 14 i 07. Naslovnica je u revidiranom S2 inkrementu: drugačija hero kompozicija, kartice i raspored postojeće fotografije/widgeta; puni javni, auth, admin i stylist identitet još nije završen. Nastaviti kroz preostale površine bez tvrdnje potpune WCAG usklađenosti.
