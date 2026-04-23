# Beauty Salon Nejra v2 — pregled sistema (prezentacijski dokument)

Ovaj dokument služi kao **sveobuhvatna deskripcija kompletnog sistema** namijenjena prodaji i prezentaciji klijentima. Fokus je na vrijednosti, funkcionalnostima i korisničkim tokovima — **bez otkrivanja osjetljivih tehničkih detalja** (implementacijske “tajne”, interne algoritme, šemu baze i sl.).

## 1) Šta je sistem

Beauty Salon Nejra v2 je kompletno digitalno rješenje za salonsko poslovanje koje objedinjuje:
- **Javnu web stranicu** (prikaz usluga, sadržaja, kontakt, online rezervacije)
- **Web admin panel** (operativa, sadržaj, postavke, finansije, analitika)
- **Mobilnu aplikaciju za klijente** (rezervacije, notifikacije, profil, sadržaj)
- **Mobilnu aplikaciju za stiliste** (inbox rezervacija, raspored, dnevna knjiga, završavanje usluga)
- **Centralni backend** (poslovna pravila, notifikacije, realtime događaji, sigurnost i integracije)

Rezultat: salon dobija **automatizovan tok rezervacija**, jasnu operativu i podatke za donošenje odluka — uz moderan korisnički doživljaj na webu i mobilnim uređajima.

## 2) Za koga je sistem (uloge)

Sistem podržava jasne uloge i odgovornosti:

- **OWNER (vlasnik salona)**: upravlja salonom, uslugama, stilistima, finansijama, analitikom i naprednim postavkama.
- **SYSTEM_ADMIN (administrator sistema)**: upravlja sistemskim postavkama i stabilnošću rada aplikacije.
- **STYLIST (stilist)**: radi kroz mobilnu aplikaciju (preuzimanje termina, start, završetak, dnevna knjiga).
- **CLIENT (klijent)**: rezerviše i upravlja terminima kroz web ili mobilnu aplikaciju.
- **Guest (posjetilac)**: pregled web stranice bez pristupa rezervacijama dok se ne prijavi.

## 3) Ključna vrijednost i diferencijatori

- **Online rezervacije sa realnom dostupnošću**: korisnik vidi dostupne datume i termine na osnovu stvarnog rasporeda salona i stilista.
- **Kontrolisan tok potvrde dolaska**: smanjuje “no-show” i poboljšava planiranje dana.
- **Mobilni alat za stiliste**: stilist preuzima odgovornost nad terminom (inbox → start → završetak) i vodi evidenciju rada.
- **Realtime operativa**: promjene rezervacija i dostupnosti se reflektuju u sistemu bez ručnog osvježavanja.
- **Dnevna knjiga + finansije + dugovanja**: poslovanje dobija strukturiranu evidenciju naplate, napojnica, rashoda i dugovanja.
- **Loyalty program**: bodovi, nivoi i popusti (opcionalno), uz kontrolu i transparentnost.
- **Sadržaj i reputacija**: blog, galerija radova i recenzije (uz moderaciju) jačaju povjerenje i prodaju.

## 4) End-to-end workflow (rezervacije) — “jedna priča” kroz sistem

Ovo je centralni tok sistema, sa realnim scenarijima iz svakodnevnog rada salona.

### 4.1 Kreiranje rezervacije (web ili mobile)

Klijent:
- bira jednu ili više usluga
- odabire datum i termin iz realne dostupnosti
- šalje rezervaciju (uz napomenu po potrebi)

Sistem automatski:
- provjerava dostupnost (radno vrijeme, stilisti, trajanje usluge, pauze)
- sprečava kolizije termina
- priprema rezervaciju za odgovor stilista

### 4.2 Odgovor stiliste (mobilna aplikacija)

Stilist u mobilnoj aplikaciji:
- vidi nove zahtjeve u “Inbox”-u
- može “zaključati” rezervaciju dok je pregleda
- prihvata ili odbija termin

Time se postiže:
- jasno vlasništvo nad terminom
- minimalna konfuzija “ko radi koji termin”

### 4.3 Potvrda dolaska (anti no-show mehanizam)

Da bi termin bio spreman za rad:
- klijent potvrđuje dolazak u definisanom vremenskom okviru prije termina

Ako klijent ne potvrdi:
- sistem primjenjuje pravilo koje štiti salon od izgubljenog vremena i automatski “čisti” raspored (salon dobija ponovno dostupne slotove).

### 4.4 Ručni start i završetak usluge (stylist)

Stilist:
- ručno starta termin (kad su ispunjeni uslovi)
- nakon usluge unosi stvarno naplaćeno i završava termin

To omogućava:
- realnu evidenciju prihoda i napojnica
- kvalitetnu analitiku i izvještaje

### 4.5 Dnevna knjiga i finansijski trag

Nakon završetka usluge:
- dnevna knjiga čuva operativne podatke (naplata, bilješke, opcionalno slike “prije/poslije”)
- finansijski modul vodi mjesečne knjige (prihodi i rashodi)
- po potrebi se prate dugovanja klijenata

### 4.6 Scenariji iz prakse (podržani)

- **Nema dostupnosti**: sistem jasno pokaže nedostupne datume/termine.
- **Otkazivanje**: klijent ili salon može otkazati uz evidenciju razloga.
- **No-show**: salon ima opcije evidentiranja i operativnog postupanja.
- **Reorganizacija termina (po potrebi)**: sistem može predložiti korekcije termina u kontrolisanom procesu gdje klijent potvrđuje promjenu.
- **Notifikacije**: korisnici dobijaju obavještenja o važnim promjenama (push/in-app; u zavisnosti od okruženja i postavki).

## 5) Šta klijent (salon) dobija u praksi

### 5.1 Rast prodaje i smanjenje operativnog opterećenja
- manje poziva i poruka “Imate li termin?”
- više online konverzija (brz izbor termina)
- manje propuštenih termina zahvaljujući potvrdi dolaska i notifikacijama

### 5.2 Kontrola i transparentnost
- vlasnik vidi kompletan operativni status rezervacija
- jasni procesi za stiliste
- uredna evidencija naplate i rashoda

### 5.3 Podaci za odluke (analitika)
- pregled performansi po uslugama i stilistima
- trendovi prihoda/rashoda
- uvid u ponašanje klijenata i efekte programa vjernosti

## 6) Sigurnost i privatnost (na visokom nivou)

Sistem je dizajniran tako da:
- korisnici vide samo ono što im pripada (po ulogama i dozvolama)
- osjetljivi podaci nisu javno izloženi
- promjene i akcije su kontrolisane kroz autentifikaciju
- fajlovi (slike/dokumenti) se čuvaju kao putanje i koriste se kroz kontrolisani upload mehanizam

Napomena: detalji implementacije sigurnosti i interne arhitekture se namjerno ne izlažu u ovom dokumentu.

## 7) Tehnologija (samo okvirno, bez “tajni”)

- Web (frontend): moderna SPA aplikacija za public site i admin panel
- Mobile: moderna mobilna aplikacija (klijent + stilist) sa temama i podrškom za lokalizaciju
- Backend: centralni servis koji implementira poslovna pravila, notifikacije i realtime događaje
- Baza podataka: pouzdana relacijska baza za trajno čuvanje podataka

## 8) Kako se sistem prezentuje na demo-u (predloženi tok)

1) Public web: izbor usluge → datum → termin → kreiranje rezervacije  
2) Stylist mobile: inbox → lock → accept  
3) Client mobile: potvrda dolaska → pregled rezervacije  
4) Stylist mobile: start → complete → evidencija naplate  
5) Admin web: realtime osvježenje + pregled dnevne knjige i finansija  
6) (Opcionalno) Loyalty: prikaz bodova i popusta + kako se reflektuje na naplatu  

## 9) Šta nije dio ove prezentacije (namjerno)

Da bismo zaštitili ideju i implementaciju, ovaj dokument ne sadrži:
- tačne API rute i interne servisne metode
- šemu baze podataka i relacije
- algoritamske detalje (npr. način izračuna slotova i reorganizacije termina)
- interne konfiguracije i deployment detalje

