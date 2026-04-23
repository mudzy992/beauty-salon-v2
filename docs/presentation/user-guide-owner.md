# Korisničko uputstvo — OWNER (vlasnik salona)

Ovaj vodič prati **jedan kompletan workflow rezervacije** i objašnjava šta OWNER radi prije, tokom i nakon termina: konfiguracija salona, operativni nadzor, dnevna knjiga, finansije i loyalty.

## 1) Šta OWNER radi u sistemu

- Postavlja “realni život” parametre: **radno vrijeme**, **praznici**, **pauza između usluga**, **servisi**, **stilisti**.
- Operativno nadgleda i interveniše (rezervacije, otkazivanja, reorganizacija).
- Pregledava i vodi finansije: **KIF/KUF** i evidencije.
- Upravlja loyalty programom (uključivanje, limiti i kontrola računa).

## 2) Priprema sistema (da rezervacije rade kako treba)

### 2.1 Salon setup (radno vrijeme/praznici/pauza)

Prije puštanja u rad provjeriti:
- da salon ima definisano radno vrijeme za dane u sedmici
- da su praznici uneseni (disabled datumi)
- da je postavljena pauza između servisa (`pauseBetweenServices`) ako se koristi

Ovo direktno utiče na:
- dostupne datume u public/mobile rezervaciji
- broj slotova po danu
- prag za “moguće kašnjenje” notifikacije (cron koristi `pauseBetweenServices/2`)

### 2.2 Servisi i stilisti

Za svaki servis:
- trajanje (minutes)
- cijena
- (ako se koristi) loyalty enable + max discount %

Za stiliste:
- profil i radno vrijeme
- mapiranje stilista na servise koje radi

## 3) Workflow rezervacije — OWNER pogled

### 3.1 Kreiranje rezervacije (ulazni kanali)

Rezervacije nastaju iz:
- web public rezervacije (`/rezervacija`)
- mobile client wizard
- admin kreiranje (ako se koristi)

Owner u web adminu vidi rezervacije u `/admin/reservations` i može:
- pregledati detalje
- pratiti ko je “confirmed stylist”
- vidjeti reschedule/reorder prijedloge (`rescheduleStatus`)
- vidjeti loyalty polja na rezervaciji

### 3.2 Stilist workflow (što OWNER treba očekivati)

Stilist u mobile stylist app radi:
- lock → accept/reject (Inbox)
- nakon `ATTENDANCE_CONFIRMED`: ručni start
- complete: unos naplate i završetak (dnevna knjiga / finansije)

Owner ne radi te akcije umjesto stiliste osim u izuzetnim slučajevima (ili ako sistem dozvoljava override).

## 4) Finansije: dnevna knjiga → KIF/KUF (što znači u praksi)

### 4.1 Dnevna knjiga (daily log)

Daily log je evidencija izvršenih usluga:
- može biti vezan za rezervaciju ili manual entry
- ima `actualPrice` i `tipAmount`
- završeni zapis se ne mijenja (COMPLETED)

### 4.2 KIF (knjiga prihoda)

KIF je mjesečna knjiga:
- automatski se otvara i zatvara (cron)
- sadrži entries iz daily log-a (iznos = `actualPrice`)
- moguće je dodati ručne prihode (npr. korekcije) uz audit trail

### 4.3 KUF (knjiga rashoda)

KUF je mjesečna knjiga rashoda:
- može se zaključati ručno (otključavanje je ograničeno)
- rashodi mogu imati template-driven polja i priložene dokumente (uploads)

## 5) Loyalty program (owner operativno tumačenje)

### 5.1 Popust (redeem) na rezervaciji

Klijent pri rezervaciji može zatražiti loyalty popust (ako je uključeno):
- backend validira da li je popust dozvoljen (tier limit, service limit, global limit, bodovi)
- na rezervaciji se upišu informativna polja (percent/amount/points used)

### 5.2 Kako se reflektuje na prihod (važna odluka)

Prihod u KIF-u dolazi iz `DailyLogEntry.actualPrice` (stvarno naplaćeno).

Praktično:
- ako želite da loyalty popust **umanji prihod**, stilist treba da upiše “naplaćeno” umanjeno za popust
- ako loyalty tretirate kao marketing, “naplaćeno” može ostati puni iznos, a popust je informativan

## 6) Scenariji i upute (“šta ako…”)

### 6.1 Nema dostupnih slotova

Provjeriti redom:
- da li je dan praznik
- da li salon radi taj dan
- da li postoji stilist koji radi taj dan i nudi izabrani servis
- da li postoje postojeće rezervacije koje blokiraju slot (statusi koji zauzimaju termin: potvrđeni i u toku)

### 6.2 Auto-otkaz zbog nepotvrđenog dolaska

Ako klijent ne potvrdi dolazak u 24h window, sistem auto-otkazuje rezervaciju:
- status: `CANCELLED_BY_CLIENT`
- razlog: “Nije potvrđen dolazak u roku”

Owner može odlučiti:
- da li treba dodatno podsjetiti klijente (push/in-app) ili promijeniti komunikaciju

### 6.3 Auto reorder (popunjavanje rupa)

Nakon auto-otkaza nepotvrđenih, sistem može predložiti raniji termin potvrđenim klijentima:
- stanje: `rescheduleStatus='PENDING'`
- klijent može accept/decline (reorder decline zadržava originalni termin)

### 6.4 Kašnjenje (delay warning)

Ako termin probije prag, sistem može poslati upozorenje budućim klijentima.
Owner treba znati:
- prag zavisi od `pauseBetweenServices`
- stilist može označiti da koristi pauzu (ne šalju se auto upozorenja)

