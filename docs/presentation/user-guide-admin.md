# Korisničko uputstvo — ADMIN (SYSTEM_ADMIN)

Ovaj vodič je fokusiran na **jedan kompletan workflow rezervacije** i sve prateće scenarije koje ADMIN treba razumjeti i rješavati.

## 1) Šta ADMIN radi u sistemu

- Upravlja **sistemskim postavkama** aplikacije (ključne vrijednosti koje utiču na rezervacije, UI i notifikacije).
- Ima **admin pristup** listama i detaljima (rezervacije, korisnici, postavke, notifikacije).
- Operativno može intervenisati kroz admin cancel i podešavanje pravila.

## 2) Ulaz u admin panel

- Prijava na web: `/login`
- Admin panel: `/admin/*`
- Ako se nakon login-a desi redirect: to je zbog route-guard pravila (token refresh, onboarding pravila za klijente ne važe za admina).

## 3) Workflow rezervacije — ADMIN pogled (end-to-end)

### 3.1 Kreiranje i pregled rezervacije

- Web: Admin lista je u **Rezervacije** (`/admin/reservations`).
- Lista se može filtrirati po:
  - datumu (`fromDate/toDate`)
  - statusu (`PENDING`, `STYLIST_REVIEW`, `CONFIRMED`, `ATTENDANCE_CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, otkazani, no-show)

**Šta gledati u detalju rezervacije**:
- klijent + kontakt
- servis / više servisa (items)
- `confirmedStylist` (ko je preuzeo)
- `stylistResponses` (ko je lockovao/odbijao)
- `cancelReason` (posebno za sistemski otkaz)
- `rescheduleStatus` i predložena vremena (reorder/reschedule)
- loyalty polja (ako postoje): `loyaltyDiscountPercent`, `loyaltyDiscountAmount`, `loyaltyPointsUsed`

### 3.2 Realtime ponašanje (šta znači “automatski osvježeno”)

Admin lista rezervacija se refresha na Socket.IO evente:
- `reservation:created|updated|cancelled|confirmed|stylist_response`
- `availability:changed`

U praksi: ako stilist prihvati/odbije ili se desi auto-otkaz zbog attendance deadline-a, ADMIN će to vidjeti bez ručnog refresh-a (ili uz minimalno kašnjenje).

## 4) Scenariji i kako ADMIN reaguje (“šta ako…”)

### 4.1 “Otkazano (nepotvrđen dolazak)”

**Simptom**:
- rezervacija je `CANCELLED_BY_CLIENT`
- `cancelReason = 'Nije potvrđen dolazak u roku'`

**Objašnjenje**:
- sistem svake minute provjerava `CONFIRMED` rezervacije bez `attendanceConfirmedAt`
- kad uđu u 24h window, auto-otkazuje ih

**Šta ADMIN radi**:
- tipično ništa (ovo je očekivano ponašanje)
- po potrebi provjeri da su postavke i komunikacija prema klijentima jasne (npr. copy u UI-ju, push dostupnost)

### 4.2 “Klijent kaže da nije dobio push”

**Bitno ograničenje**:
- push zavisi od Expo projekta, build profila, permisija i provider runtime-a; za dijagnostiku koristite konfigurisan development/production build i sintetički nalog. Eksterna isporuka nije potvrđena ovim vodičem.

**ADMIN checklist**:
- da li je u mobile build-u uključen `EXPO_PUBLIC_PUSH_ENABLED=true`
- da li postoji `EXPO_PUBLIC_EAS_PROJECT_ID`
- da li backend prima token (endpoint `/api/notifications/push-token`)
- da li klijent uopšte ima dozvolu za notifikacije na uređaju

### 4.3 “Stilist ne može startati termin”

Najčešći razlozi:
- status nije `ATTENDANCE_CONFIRMED`
- postoji `rescheduleStatus='PENDING'` (čeka se potvrda klijenta)
- termin još nije počeo ili je izvan dozvoljenog prozora
- postoji raniji termin istog dana koji treba prvo obraditi

Šta ADMIN radi:
- provjeri status rezervacije i reschedule stanje u detalju
- ako je problem u procesu (npr. klijent nije potvrdio dolazak), ADMIN komunicira klijentu šta treba uraditi

### 4.4 “Auto reorder prijedlog — klijent se zbunio”

**Simptom**:
- `rescheduleStatus='PENDING'` i predložena ranija vremena

**Objašnjenje**:
- nakon attendance auto-otkazivanja, sistem predlaže ranije termine potvrđenim klijentima (reorder)

**Uputa klijentu**:
- u “Moje rezervacije” (mobile) može accept/decline prijedlog
- decline za reorder zadržava originalni termin

## 5) Postavke koje utiču na rezervacije (što ADMIN treba znati)

Najvažnije kategorije (zavisno od implementacije u Settings):
- radno vrijeme salona i pauza između servisa (utiče na slotove i delay warning prag)
- praznici (disabled datumi)
- maintenance mode (blokiranje public UI-ja)
- push/email konfiguracija (kod koristi Expo push API i Nodemailer/SMTP; stvarna isporuka zahtijeva ispravnu runtime konfiguraciju i nije potvrđena ovim auditom)

## 6) Brzi troubleshooting (najčešće greške)

- **Nema slotova**: provjeriti working hours, praznike, da stilist nudi servis i radi taj dan.
- **Public rezervacija javlja grešku pri submit-u**: slot je postao zauzet; tražiti korisniku da refresh-a slotove.
- **Admin vidi “staro stanje”**: provjeriti da je Socket konekcija aktivna (connected), i da proxy/cors dozvoljava websocket.

