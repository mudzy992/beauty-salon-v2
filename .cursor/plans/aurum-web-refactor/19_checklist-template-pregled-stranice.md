# Protokol i šablon za detaljan pregled jedne admin stranice

## 1. Pravilo rada

Korisnik zadaje **jednu stranicu**. Obrađuje se samo ta stranica i kod koji ona zaista koristi; ne prelazi se na drugu stranicu bez nove upute. Pregled nije samo pretraga boja, niti samo prolazak testova: svaki red datoteka u obuhvatu treba pročitati i razumjeti u kontekstu izvršavanja.

Za svaku datoteku bilježe se putanja, uloga, opseg pročitanih linija, nalazi, izmjene i dokaz provjere. Kontrolna lista ispod je obavezna, ali nije zamjena za čitanje koda. Ako se isti problem nalazi na više mjesta unutar obuhvata, provjeravaju se sva mjesta, a ne samo prvi rezultat pretrage.

### Granice obuhvata

1. Identifikovati rutu, page komponentu, parametre, prava pristupa i relevantne layout/wrapper komponente.
2. Napraviti stablo direktnih i tranzitivnih zavisnosti koje stranica stvarno koristi: TSX komponente, hookovi, kontekst, forme, validatori, tipovi, API klijenti, stilovi, prijevodi i relevantni testovi. Uključiti portale, dijaloge, drawere i dinamičke importe kada se koriste.
3. Za **page i njene namjenske datoteke** pročitati od prve do posljednje linije. Kod dugih datoteka zapisati pregledane raspone tako da nema praznina.
4. Za **zajedničke komponente i funkcije** pratiti i pročitati implementaciju i zavisnosti relevantne za upotrebu na ovoj stranici. Ako je zajednički fajl obuhvaćen punim pregledom, evidentirati čitanje svih linija; inače jasno navesti pregledani dio i zašto ostatak nije obuhvaćen. Ne predstavljati djelimičan pregled kao potpuni pregled fajla.
5. Provjeriti CSS kaskadu, globalne selektore, portale i theme kontekst koji stvarno utiču na prikaz, kao i ključeve prijevoda koji se koriste. Ne tvrditi da je cijeli globalni CSS ili sve locale datoteke pregledano ako su provjereni samo relevantni dijelovi.
6. Zajedničke izmjene smiju se napraviti samo nakon procjene uticaja na druge potrošače i provjere Classic/public/stylist konteksta. Ne širiti reviziju na druge stranice; ako je popravka visokorizična ili mijenja dogovorenu paletu/ponašanje, opisati rizik i tražiti odluku prije promjene.
7. Nerelevantnu stavku označiti **N/P uz razlog**, ne prešutno je preskočiti. Nedostupne podatke, uređaje ili alate označiti **blokirano**. Ne označavati stranicu završenom dok postoje otvoreni nalazi, nepregledani dijelovi ili nedostajući obavezni dokazi.

## 2. Statusi i evidencija

- **Nije početo** — još nije pregledano.
- **U toku** — pregled ili provjera traje.
- **Prošlo** — provjereno, uz konkretan dokaz i opseg.
- **N/P** — nije primjenjivo, uz razlog.
- **Otvoreno** — pronađen problem ili preostaje posao; navesti prioritet i vlasnika/sljedeći korak.
- **Blokirano** — nedostaje pristup, podaci, alat ili odluka; navesti šta je potrebno.

Svaki nalaz mora imati: ID, datoteku i liniju/element, stanje i način reprodukcije, očekivano i stvarno ponašanje, uticaj, prioritet (kritično/visoko/srednje/nisko), uzrok, popravku ili razlog odgode i dokaz ponovne provjere. Ne zaključivati nalaz samo zato što je promijenjen kod.

## 3. Detaljna kontrolna lista

### A. Identifikacija i popis

- [ ] Zabilježiti naziv stranice, URL/rutu, ulogu i dozvole, očekivanu svrhu i glavne korisničke zadatke.
- [ ] Napraviti kompletan inventar page/namjenskih datoteka i relevantnih zajedničkih zavisnosti; pratiti re-export, uslovni i dinamički import gdje postoji.
- [ ] Označiti sve vizuelne cjeline, kontrole, forme, tabele, filtere, paginaciju, akcije, portale i sporedna stanja.
- [ ] Zabilježiti izvore podataka, endpoint-e, mutacije, konfiguraciju, feature flagove i potrebne testne podatke.
- [ ] Zabilježiti prethodne izmjene i lokalni WIP; ne dirati tuđi nepovezani rad.
- [ ] Pročitati kod po propisanom obuhvatu i zabilježiti kontinuitet pregledanih linija.

### B. Standard komponenti i struktura

- [ ] Uporediti naslov, opis, akcije, breadcrumb/navigaciju i raspored sa usvojenim admin standardom, uz opravdane izuzetke.
- [ ] Koristiti postojeće zajedničke komponente kada odgovaraju ugovoru: dugmad, polja, label, select, checkbox, tabs, badge/status, card, tabela, dialog/drawer i data-state.
- [ ] Provjeriti varijante, veličine, razmake, border/radius, ikone, tipografiju, poravnanje i hijerarhiju; ne uvoditi paralelni standard bez razloga.
- [ ] Ne zamijeniti komponentu automatski ako se mijenjaju semantika, ponašanje, prava, focus ili javni/stilistički prikaz.
- [ ] Provjeriti DOM semantiku, ispravnu ugniježđenost, jedinstvenost ID-ova, React key, sastavljanje propsa, controlled/uncontrolled stanje i čišćenje efekata.
- [ ] Provjeriti ponavljanja, mrtvi kod, neiskorištene importe, nejasne odgovornosti i mogućnosti pojednostavljenja bez nepotrebnog refaktora.

### C. Hardkod, boje i tokeni

- [ ] Pretražiti fajlove i relevantne stilove za literalne boje (hex/rgb/hsl), direktne utility boje, inline style, proizvoljne vrijednosti, gradijente, sjene, SVG fill/stroke i dinamički sastavljene klase.
- [ ] Razlikovati stvarni problem od namjerne statusne/semantičke boje; evidentirati svaku procjenu, uključujući izuzetke.
- [ ] Provjeriti pozadinu, tekst, sekundarni tekst, ivice, ikonice, separatore, fokus, overlay i sjene; uključiti površine u portalima i naslijeđene stilove.
- [ ] Provjeriti default, hover, focus-visible, active/pressed, selected, disabled, loading, error, success i warning stanje za svaku relevantnu kontrolu.
- [ ] Mapirati upotrebu na **postojeće odobrene** semantičke tokene i provjeriti stvarne izračunate boje u svijetlom i tamnom režimu; ne pretpostavljati da naziv klase garantuje konačni izgled.
- [ ] Provjeriti eksplicitne izuzetke i CSS specifičnost, theme kontekst portala, Classic i ostale potrošače dijeljenih komponenti.
- [ ] Provjeriti hardkodirane dimenzije, vremenske vrijednosti, URL-ove, API adrese, korisničke tekstove, statuse, podatke i konfiguraciju; razlikovati opravdane konstante od grešaka.
- [ ] Za stvarni neuspjeh kontrasta koji zahtijeva promjenu odobrene palete: **zaustaviti se i pitati korisnika**. Prvo provjeriti može li se problem riješiti postojećim tokenima i odgovarajućom kombinacijom.

### D. i18n i formatiranje

- [ ] Popisati sve vidljive tekstove, naslove, labele, placeholder, tooltip, aria-label, poruke greške/uspjeha, potvrde, prazna stanja i dinamičke poruke.
- [ ] Provjeriti da svaki korišteni ključ postoji u svim podržanim jezicima i da je prijevod smislen, konzistentan i bez prikazanog ključa/fallbacka.
- [ ] Provjeriti interpolaciju, pluralizaciju, rod/padež gdje je bitno, dugačke prijevode i tekstove koji dolaze iz API-ja.
- [ ] Provjeriti lokalizaciju datuma, vremena, valute, brojeva i vremenske zone, te razdvojiti identifikatore od prikazanih vrijednosti.
- [ ] Provjeriti i18n u portalima, validaciji, obavijestima i stanjima koja nisu odmah vidljiva.

### E. Pristupačnost — WCAG 2.2 AA minimum, AAA gdje je izvedivo

- [ ] Provjeriti logičan redoslijed naslova i landmarka, semantičke elemente i nazive kontrola; ne koristiti boju/ikonu kao jedini prenosilac značenja.
- [ ] Svaka kontrola ima dostupno ime, povezanu labelu, opis, obaveznost, stanje i povezanu grešku gdje je potrebno.
- [ ] Proći sve zadatke tastaturom: Tab/Shift+Tab, Enter/Space, strelice gdje je primjenjivo, Escape i prirodan redoslijed fokusa; nema zamki fokusa.
- [ ] Za svaki dialog/drawer provjeriti početni fokus, ograničenje fokusa, zatvaranje, vraćanje fokusa, pristupačan naziv i opis gdje je potreban.
- [ ] Provjeriti vidljivost fokusa, cilj klika, reflow na 320 CSS px, 400% zoom, tekstualni razmak, orijentaciju i sadržaj koji se ne smije odsjeći.
- [ ] Provjeriti kontrast teksta i netekstualnih kontrola za sva relevantna stanja i kombinacije, uključujući realne slike/gradijente. Provjeriti AA, te AAA kada je primjenjivo i izvedivo.
- [ ] Provjeriti live/status/alert najave, greške, loading i dinamičke promjene bez pretjeranih najava; uvažiti reduced motion i ne oslanjati se samo na automatizaciju.
- [ ] Pokrenuti ciljane axe provjere i evidentirati **violations i incomplete**; ručno provjeriti ono što automat ne može, uključujući čitač ekrana kada je dostupan. Automatizirani prolaz nije dokaz ukupne usklađenosti.

### F. Podaci, logika i funkcionalnost

- [ ] Provjeriti ispravnost izvora podataka i računanja, formate, granice, null/undefined, prazne i nepotpune odgovore; ne prikazivati lažnu nulu ili prazno stanje pri grešci.
- [ ] Proći loading, uspjeh s podacima, zaista prazno stanje, parcijalni neuspjeh, grešku, retry i oporavak.
- [ ] Provjeriti validaciju, obavezna polja, rubne vrijednosti, duplikate, unos nepravilnih podataka, server-side greške i jasnoću poruka.
- [ ] Provjeriti create/edit/delete i potvrde, otkazivanje, očuvanje ili reset forme, ponovno slanje, disabled stanje tokom zahtjeva i sprječavanje duplih mutacija.
- [ ] Provjeriti pretragu, filtere, sortiranje, paginaciju i kombinacije; uključiti dugačke podatke, velike liste i navigaciju nazad.
- [ ] Provjeriti stale request/race, promjenu parametara, unmount, cleanup, abort gdje je prikladno i konzistentnost nakon mutacije.
- [ ] Provjeriti ovlaštenja na UI i server granici, osjetljive podatke, sigurne linkove, XSS i ponašanje neovlaštenog korisnika; UI skrivanje nije sigurnosna zaštita.
- [ ] Provjeriti logovanje, neizložene tajne, dostupnost mreže i očekivane timeout/error slučajeve gdje je relevantno.

### G. Responsive, vizuelni pregled i performanse

- [ ] Pregledati light/dark na desktopu i 320 px; dodatne širine, 400% zoom i orijentacije prema sadržaju stranice.
- [ ] Pregledati popunjena, prazna, loading i error stanja, te sve dijaloge i relevantne role; ne zaključivati na osnovu prazne baze.
- [ ] Provjeriti horizontalni overflow, odsijecanje, prelamanje, duge nazive, scroll područja, sticky/z-index i dostupnost akcija na dodir.
- [ ] Provjeriti vizuelnu hijerarhiju, konzistentne razmake i poravnanja, stanja ikona i akcija, bez promjene već odobrenog identiteta.
- [ ] Provjeriti nepotrebne zahtjeve/re-rendere, velike liste/slike, čišćenje pretplata i osjetne regresije; optimizirati samo uz opravdanje.

### H. Testovi i završni kriteriji

- [ ] Dodati ili ažurirati testove za svaku ispravljenu regresiju i značajne interakcije, uključujući reprezentativne podatke i failure slučajeve. Source/regex test nije zamjena za izvršavanje ponašanja.
- [ ] Prema opsegu pokrenuti relevantne unit/integration/E2E testove, lint, typecheck, build i provjeru diff-a; zabilježiti tačne komande i rezultate.
- [ ] Provjeriti browser ponašanje i computed style, po mogućnosti i screenshot/ručni pregled; zabilježiti kada okruženje to ne omogućava.
- [ ] Pokrenuti CI ako je rad pushan, provjeriti tačan commit i sve relevantne poslove; istražiti padove, ne sakrivati niti širiti zaključke iz ograničenog testa.
- [ ] Pregledati diff za neželjene promjene, kompatibilnost dijeljenih komponenti, prijevode i nove regresije.
- [ ] Stranica je **završena** samo kad je inventar zatvoren, sav obavezni kod pročitan u deklarisanom opsegu, nalazi riješeni i ponovo provjereni, te traženi dokazi dostupni. Blokirane ili namjerno odgođene stavke znače **djelimično**, ne završeno.

## 4. Matrica stanja za svaku stranicu

Za svaku relevantnu kombinaciju zabilježiti rezultat i dokaz; N/P uz razlog. Ne izmišljati dokaz za kombinacije koje nisu izvedene.

| Površina/interakcija | Podaci/stanje | Light desktop | Dark desktop | Light 320 px | Dark 320 px | Tastatura/AT | Dokaz / nalaz |
|---|---|---|---|---|---|---|---|
| Osnovni prikaz | popunjeno | | | | | | |
| Lista/sadržaj | prazno, loading, greška, retry | | | | | | |
| Filteri/paginacija | zadano, aktivno, bez rezultata | | | | | | |
| Forma | unos, validacija, slanje, greška, uspjeh | | | | | | |
| Dijalog/drawer | otvoren, zatvoren, potvrda, fokus | | | | | | |
| Akcije/statusi | hover, fokus, odabrano, disabled | | | | | | |
| Ostalo specifično za stranicu | opisati | | | | | | |

## 5. Šablon izvještaja za jednu stranicu

Kopirati ovaj dio u zaseban zapis za svaku stranicu. Ne popunjavati unaprijed dokazima ili tvrdnjama koje nisu provjerene.

```markdown
# Pregled stranice: [naziv]

- Ruta: [URL i parametri]
- Datum / commit prije pregleda: [datum / hash]
- Status: [nije početo / u toku / djelimično / završeno]
- Uloge i prava: [opis]
- Svrha i korisnički zadaci: [opis]
- Granice i izuzeci: [opis, uključujući ograničenja zajedničkog koda]

## Inventar i čitanje koda
| Datoteka | Uloga / veza sa stranicom | Pregledane linije / ukupno | Status | Nalazi / napomene |
|---|---|---|---|---|
| | | | | |

## Elementi i stanja
[Lista sekcija, kontrola, dialoga/portala, izvora podataka, mutacija, prava i kombinacija stanja. Kopirati i popuniti matricu iz odjeljka 4.]

## Kontrolna lista
| Kategorija | Status | Dokaz / razlog N/P ili blokade |
|---|---|---|
| Identifikacija i inventar | | |
| Komponente i struktura | | |
| Hardkod i tokeni | | |
| i18n i formatiranje | | |
| Pristupačnost | | |
| Podaci i funkcionalnost | | |
| Responsive i vizuelni pregled | | |
| Testovi i završna provjera | | |

[Za svaku kategoriju proći pojedinačne stavke odjeljka 3; evidentirati izuzetke i neriješene podstavke, ne samo zbirni status.]

## Nalazi
| ID | Lokacija / stanje | Očekivano vs. stvarno | Prioritet | Uzrok / rješenje | Status / dokaz ponovne provjere |
|---|---|---|---|---|---|
| | | | | | |

## Izmjene
- [Fajl, razlog, posljedice za dijeljene komponente i druga okruženja.]

## Provjere i dokazi
| Provjera | Komanda ili ručni postupak | Rezultat | Opseg / ograničenje |
|---|---|---|---|
| | | | |

- Axe violations: [rezultat i obuhvat]
- Axe incomplete / ručna provjera: [rezultat ili blokada]
- Svijetli/tamni, viewporti i podaci: [tačno šta je provjereno]
- CI: [run, commit, poslovi i rezultat; ili nije pokrenut]

## Otvoreno / blokirano
- [Nalaz, razlog, sljedeći korak; ili „nema“ ako je provjereno.]

## Zaključak
[Šta je pregledano od prve do posljednje linije; šta je samo djelimično; šta je popravljeno; šta nije provjereno. Status završeno samo uz ispunjene kriterije.]
```
