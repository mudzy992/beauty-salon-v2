# Korisničko uputstvo — STYLIST (mobilna aplikacija)

Ovaj vodič objašnjava **jedan kompletan workflow rezervacije** iz ugla stiliste: inbox odgovor, priprema dana, ručni start, reschedule/reorder, no-show, završetak i dnevna knjiga.

## 1) Kako stilist ulazi u “Stylist app”

- Prijavite se u mobile aplikaciju.
- Ako imate STYLIST rolu, u profilu možete prebaciti “mode” na **Stylist** (ili će vas sistem automatski prebaciti ako nemate client dio).
- Prva stanica: **Inbox** (`/stylist/inbox`).

## 2) Inbox: novi zahtjevi (lock → accept/reject)

Ekran: `StylistInboxScreen`.

### 2.1 Šta vidite

- rezervacije u statusu `PENDING` ili `STYLIST_REVIEW`
- servis/e (može biti više servisa)
- termin (datum + vrijeme)
- informacije o klijentu

### 2.2 Lock (zaključavanje)

Koristite lock kada želite “rezervisati pravo” da vi odgovorite:
- Akcija: **Lock**  
- Efekat: rezervacija prelazi u `STYLIST_REVIEW` i vaš response je `LOCKED` (ako je uspješno)

### 2.3 Accept (prihvatanje)

- Akcija: **Prihvati**
- Preporuka: obratite pažnju na upozorenje o dugovanju klijenta (ako se pojavi).
- Efekat: sistem potvrđuje da ste vi stilist za termin (`confirmedStylist`), i rezervacija ide u potvrđeni tok.

### 2.4 Reject (odbijanje)

- Akcija: **Odbij**
- Efekat: klijent dobija informaciju; rezervacija se može otkazati od strane stilista ili preusmjeriti u alternativni tok, zavisno od pravila.

## 3) Detalj rezervacije: start gate, no-show, complete

Ekran: `StylistReservationDetailScreen`.

### 3.1 Ručni start (najvažnije pravilo)

Start je dozvoljen samo ako:
- status je `ATTENDANCE_CONFIRMED`
- vi ste confirmed stylist
- termin je u dozvoljenom vremenskom prozoru
- nema ranijeg termina istog dana koji čeka obradu
- nema “pending” reschedule/reorder prijedloga

Ako je start blokiran, ekran prikazuje razlog (npr. “postoji raniji termin koji prvo treba obraditi”).

### 3.2 No-show

Koristite kada klijent ne dođe:
- dozvoljeno u statusu `CONFIRMED` ili `ATTENDANCE_CONFIRMED` (ako ste vi confirmed stylist)
- opcija primjene penalizacije (ovisno o domenskim pravilima)

### 3.3 Završetak (Complete)

Complete je dozvoljen kada je status `IN_PROGRESS`.

Praktično:
- unesite **stvarno naplaćeno** (`actualPrice`)
- unesite bilješke (po potrebi)
- ovo se koristi za:
  - finansije (KIF iznos)
  - loyalty “earn” (ako je program uključen i pravila dozvoljavaju)

## 4) Reschedule i reorder (kada termin “bježi”)

U praksi postoje dva česta razloga:
- **overrun** (termin kasni)
- **reorder** (pomjeranje klijenata ranije nakon otkaza)

Šta treba znati:
- sistem može predložiti novi termin klijentu (`rescheduleStatus='PENDING'`)
- klijent mora accept/decline
- dok je `PENDING`, start je blokiran (da ne počnete termin koji se čeka da se potvrdi/odbije)

## 5) Kašnjenje i pauze

Ako termin probije prag kašnjenja, sistem može poslati upozorenje budućim klijentima tog dana.

Ako koristite pauzu između servisa za “upijanje kašnjenja”, moguće je označiti da koristite pauzu (da se auto upozorenja ne šalju).

## 6) Najčešći problemi i rješenja

- **Ne vidim Inbox**: provjerite da imate STYLIST rolu i da ste u Stylist mode-u.
- **Ne mogu startati termin**:
  - provjerite status (mora biti `ATTENDANCE_CONFIRMED`)
  - provjerite postoji li raniji termin koji treba prvo obraditi
  - provjerite da li klijent ima pending reschedule/reorder prijedlog
- **Ne stižu push notifikacije**:
  - push zavisi od uređaja, permisija, Expo projekta i build konfiguracije; za dijagnostiku koristite konfigurisan development/production build i provjerite registraciju tokena

