# Korisničko uputstvo — CLIENT (web + mobile)

Ovaj vodič objašnjava **jedan kompletan workflow rezervacije** iz ugla klijenta: kreiranje rezervacije, praćenje, potvrda dolaska, otkazivanje i postupanje po novom (predloženom) terminu.

## 1) Kanali: gdje klijent pravi rezervaciju

- **Web public**: `/rezervacija`
- **Mobile**: “Rezervacija” wizard (Services → Reservation)

Rezervacija se kreira kroz iste korake: servis → datum → termin → potvrda.

## 2) Kreiranje rezervacije (koraci)

### 2.1 Odaberite servis (ili više servisa)

- možete izabrati jedan ili više servisa (ukupno trajanje se sabira)
- ako imate podešen spol u profilu, vidite servise koji odgovaraju (da bi termin bio validan)

### 2.2 Odaberite datum

Kalendar prikazuje dostupne i nedostupne datume.

Ako je datum nedostupan, najčešći razlozi su:
- salon ne radi taj dan
- praznik
- nema slobodnih slotova (svi termini su zauzeti)

### 2.3 Odaberite termin (slot)

Slot predstavlja interval start/end.

Važno:
- slot može postati nedostupan ako ga drugi klijent/administrator rezerviše prije vas (u tom slučaju ponovite izbor).

### 2.4 Potvrdite rezervaciju

Dodajte napomenu (po potrebi) i završite kreiranje.

## 3) “Moje rezervacije” (mobile) — upravljanje terminom

Na mobile aplikaciji imate ekran “Moje rezervacije” gdje možete:
- vidjeti nadolazeće i prošle termine
- otkazati termin (dok je to dozvoljeno)
- potvrditi dolazak
- prihvatiti/odbiti novi predloženi termin (reorder/reschedule)

## 4) Najvažnije pravilo: potvrda dolaska (24h prije termina)

Da bi stilist mogao početi termin, potrebno je da **potvrdite dolazak** najmanje 24h prije termina.

Ako ne potvrdite dolazak u roku:
- sistem automatski otkazuje rezervaciju
- status se može prikazati kao: **“Otkazano (nepotvrđen dolazak)”**

## 5) Otkazivanje termina

Ako trebate otkazati:
- otvorite rezervaciju
- kliknite “Otkaži” i po potrebi unesite razlog

Ovisno o pravilima salona, može postojati rok nakon kojeg otkazivanje nije dozvoljeno ili se bilježi penalizacija.

## 6) Novi predloženi termin (reorder/reschedule) — šta znači i šta raditi

Ponekad sistem može predložiti novi termin:
- **Reorder**: prijedlog ranijeg termina (npr. nakon otkaza drugih klijenata)
- **Reschedule/rekalkulacija**: termin se pomjera jer je raniji termin probio trajanje ili je došlo do promjene rasporeda

Kada dobijete prijedlog:
- u “Moje rezervacije” vidite poruku “Novi termin čeka potvrdu”
- imate opcije:
  - **Potvrdi termin** (accept)
  - **Odbij** (decline)

Bitna razlika:
- ako je **reorder**, odbijanje zadržava vaš originalni termin
- ako je **rekalkulacija termina**, odbijanje može značiti otkazivanje (UI će to jasno najaviti)

## 7) Notifikacije (push / in-app)

Možete dobiti notifikacije za:
- promjene na rezervaciji
- upozorenje o mogućem kašnjenju (u određenim situacijama)
- novi predloženi termin

Ako ste na Androidu i koristite Expo Go:
- remote push ne radi (SDK55 ograničenje); potrebna je development build ili produkcijska aplikacija.

## 8) Najčešći problemi i rješenja

- **Ne vidim slobodne termine**: pokušajte drugi datum; ako je sve nedostupno, salon možda ne radi ili je praznik.
- **Ne mogu potvrditi dolazak**: moguće je da je prerano (pravilo je 24h prije termina) ili je termin već prešao u drugo stanje.
- **Dobio/la sam novi termin i ne znam šta da radim**: otvorite “Moje rezervacije” i potvrdite/odbijte prijedlog.

