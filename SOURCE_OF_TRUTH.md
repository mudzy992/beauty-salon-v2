# SOURCE OF TRUTH – Beauty Salon Nejra v2

_Ažurirano: Post-Faza 10 – Analytics, Loyalty, finalizacija_

## 1. Šta je source of truth?

- **Kod** je primarni izvor istine za ponašanje aplikacije.
- **Dokumentacija** u `.cursor/docs/` je autoritativna za namjeru i ciljnu arhitekturu.
- **Rules** u `.cursor/rules/` i **Skills** u `.cursor/skills/` definišu kako AI tumači kod i dokumentaciju.

U slučaju konflikta:
1. Za “šta se dešava danas” – preferiraj **implementirani kod**.
2. Za “šta treba dugoročno” – koristi **`.cursor/docs/`** i plan u `.cursor/plans/`.
3. Razlike zabilježi u `.cursor/docs/03_gap_analysis.md` i ažuriraj `.cursor/docs/06_tasks.md`.

## 2. Ključna dokumentacija

- Arhitektura i faze: **plan** (beauty_salon_nejra_v2)
- Pravila i skillovi: **`.cursor/rules/*.mdc`**, **`.cursor/skills/*/SKILL.md`**
- Poslovna pravila i šema: **`.cursor/docs/05_matrice_i_poslovna_pravila.md`**, **`backend/prisma/schema.prisma`**
- Taskovi i gap: **`.cursor/docs/06_tasks.md`**, **`.cursor/docs/03_gap_analysis.md`**
- Notifikacije (implementirano vs. SDK55): **`.cursor/docs/10_phase10_notifications.md`**

## 3. Trenutno stanje (Post-Faza 8)

- **Backend**: NestJS 11, **Prisma 7** s `@prisma/adapter-mariadb`. Moduli: `config`, `prisma`, `auth`, `uploads`, `users`, `salon`, `services`, `stylists`, `settings`, `reservations`, `notifications`, `daily-log`, `finance`, `blog`, `gallery`, `reviews`, **`events`** (Socket.IO), **`analytics`** (dashboard: prihod/rashod po mjesecu, performanse stilista, top usluge, konverzija), **`loyalty`** (accounts list, get one, PATCH isActive). Blog, galerija, recenzije, holiday notifikacije (v. Faza 5).
- **Socket.IO**: `EventsGateway` (@nestjs/websockets + socket.io). JWT autentifikacija na konekciju. Sobe: `user:{id}`, `admin`, `stylists`, `public`. Eventi: `reservation:created/updated/cancelled/confirmed/stylist_response`, `notification:new`, `settings:updated`, `salon:updated`, `availability:changed`. Globalni modul (EventsModule).
- **Availability**: Refaktorisano – svi podaci (salon sati, praznici, stilist radni sati) se dohvaćaju unaprijed, provjera u memoriji (Set/Map). Dijagnostički endpoint `GET /api/reservations/availability/debug?serviceId=`. Salon automatski kreira default radno vrijeme (Pon-Pet 09-17) pri kreiranju.
- **Settings**: Ključevi na javnim stranicama usklađeni s admin definicijama (`public_contact_address`, `public_contact_phone`, `public_contact_working_hours_text`, `public_footer_*`, `public_social_*`). `RolesGuard` poštuje `@Public()` dekorator.
- **Baza**: Kompletna Prisma šema. **Inicijalizacija**: `npm run db:migrate`, `npm run db:seed`, ili `npm run db:init`. URL u `prisma.config.ts`. MySQL na hostu.
- **Docker**: Traefik (websecure, nejra-v2.ba101.top). Frontend na root, backend na `/backend`. Portovi: frontend 10000, backend 10001.
- **Frontend**: **Socket.IO klijent** (`socket.io-client`): `SocketProvider` u `App.tsx`, `useSocket()` i `useSocketEvent()` hook-ovi. Vite proxy za `/socket.io`. **Javna stranica**: Rezervacija (`/rezervacija`) – autocomplete pretraga servisa, kalendar s dostupnim/nedostupnim datumima, step-by-step flow, real-time ažuriranje slotova. PublicContact/PublicHome koriste ispravne setting ključeve. PublicLayout footer prikazuje kontakt, social linkove i copyright iz postavki. **Admin Dashboard** pod `/admin/*`: Sidebar grupiran (Operativno: Rezervacije, Dnevna knjiga; Salon: Salon, Servisi, Stilisti; Finansije; Sadržaj: Blog, Galerija, Recenzije; Korisnici: Korisnici, Analitika klijenata; Analitika; Postavke: Postavke, Notifikacije, Loyalty program). Stranice: Dashboard, Users, Salon, Services, Stylists, Reservations, Daily log, Finance, Blog, Gallery, Reviews, Settings, Notifications, Client Analytics, **Analytics** (grafici prihod/rashod, performanse stilista, top usluge, konverzija), **Loyalty** (uključivanje programa, pregled računa, aktivacija po računu). Svi s real-time Socket.IO gdje je primjenjivo. **Settings** – tab-ovi (Javna Stranica, Sistem), accordion grupe, type-aware editori. **Salon** – automatski kreira default radno vrijeme ako ne postoji.
- **Mobile**: **Expo SDK 55** (React Native). **Client app**: tema (dark/light/system, branding), i18n (BS), auth (login/register), bottom tabs (Početna, Usluge, Rezervacije, Profil), home (hero, usluge po kategorijama, blog), usluge (kategorije → detalji), rezervacija (4-step wizard), moje rezervacije, blog, reviews, profil (theme, prelazak na Stylist app ako ima STYLIST rolu), notifikacije, push (Expo Notifications). **Stylist app** (za korisnike s STYLIST rolom): tabovi Inbox (lock/accept/reject rezervacija), Dnevna knjiga (lista zapisa, detalj, završi zapis, before/after slike – expo-image-picker + upload), Raspored (rezervacije po danu), Statistika (završene rezervacije, prihod, napojnice za mjesec), Profil (prelazak na Client app, odjava). **Prelazak Client ↔ Stylist**: appMode store; Root navigator bira Main vs StylistMain prema rolama i appMode. Store: Zustand (auth, notifications, appMode). API: axios + SecureStore JWT. Strogi TypeScript, zero errors.

## 4. Changelog po fazama

| Faza | Datum      | Opis |
|------|------------|------|
| 1    | Završeno   | Repo, backend boilerplate, Prisma šema, Auth, Uploads, seed, Docker, rules/skills/docs, SOURCE_OF_TRUTH, Auth/Upload testovi, i18n (BS), frontend/mobile skeleton. |
| 2    | Završeno   | Docker-compose: Traefik (websecure, nejra-v2.ba101.top), backend samo /backend, MySQL uklonjen (host). Users, Salon (radno vrijeme, praznici), Services (kategorije/podkategorije/servisi), Stylists, Settings. Salon test. Prisma 7 + @prisma/adapter-mariadb, inicijalizacija (migracije + seed). |
| 3    | Završeno   | Reservation Engine: AvailabilityService (dostupni datumi + slotovi), ReservationsService (CRUD, FSM), stylist lock/accept/reject, otkazivanje klijenta (rok + penalizacija), NotificationsModule (zapis, preferencije; FCM/Email stub). Testovi: time-slot utils, availability, reservations. |
| 4    | Završeno   | Daily log (create, from-reservation, complete → income entry), slike. Finance: expense templates + polja, kategorije, knjige rashoda (getOrCreate, close), rashodi (field values, prilozi). Income: knjige (getOrCreate), zapisi iz daily log, CRON 1. u mjesecu. Testovi: daily-log, expense-books, income-books. |
| 5    | Završeno   | Blog: CRUD, slug (dijakritici), publish/draft, komentari (approve). Gallery: kategorije + slike (uploadId). Reviews: service/stylist rating 1–5, approve. Holiday: slanje push/email (POST salon/holidays/:id/send-notification). Testovi: blog, slug.utils, reviews, gallery, holiday-notifications. |
| 6    | Završeno   | Admin Dashboard: Vite + Chakra UI + Tailwind, theme (branding), i18n (bs). Auth (login, JWT), zaštićene rute, layout (sidebar, header, breadcrumbs). Stranice: Dashboard, Users, Salon, Services, Stylists, Reservations, Daily log, Finance, Blog, Gallery, Reviews, Settings. List/overview s backend API-ja. |
| 7    | Završeno   | Public Website: PublicLayout (header, footer), one-page početna (hero, o nama, usluge, galerija, kontakt). Stranice: /usluge (kategorije/servisi), /blog + /blog/:slug, /galerija, /register, /rezervacija (flow: servis→datum→termin→submit). Admin pod /admin/*. Login redirect po ulozi. |
| Extra  | Završeno   | Naknadne funkcionalnosti (van plana): Socket.IO (backend EventsGateway + frontend SocketProvider), real-time ažuriranje na svim stranicama. Rezervacija UX: autocomplete pretraga servisa, kalendar s disabled datumima, real-time slotovi. Settings: potpuni redizajn s type-aware editorima, accordion grupama, inline editiranje. |
| Bugfix | Završeno   | RolesGuard + @Public() konflikt (settings 403). AvailabilityService refaktorisan (in-memory provjera, eliminisan OR+null Prisma bug, N+1→4 upita). Setting ključevi usklađeni (public_contact_* umjesto salon_*). Salon auto-kreira default radno vrijeme. Dijagnostički availability endpoint. PublicLayout footer (kontakt, social, copyright iz postavki). Google Maps embed. |
| 8    | Završeno   | Mobile Client App: Expo SDK 55, dark/light/system theme, i18n (BS), React Navigation (tabs + stacks), auth (login/register), home (hero, featured services, blog), service browsing (kategorije, detalji), reservation 4-step wizard (servis→datum→termin→submit), moje rezervacije (potvrda dolaska, otkazivanje), blog (lista + detalj), reviews (star rating), profile (theme toggle, logout), notifications (tipske ikone, unread badge), push notifikacije (Expo Notifications), Zustand stores (auth, notifications), axios + SecureStore JWT. Zero TS errors. |
| 9    | Završeno   | Backend: automatska STYLIST rola pri kreiranju StylistProfile, uklanjanje pri brisanju profila; blokada ručnog dodavanja/uklanjanja STYLIST role (assignRole, removeRole, create user). Frontend admin: STYLIST nije u dropdownu za uloge, Create User samo SYSTEM_ADMIN/OWNER/CLIENT. Mobile Stylist App: Inbox (lock/accept/reject), Dnevna knjiga (lista, detalj, complete, before/after slike – image picker + upload), Raspored (rezervacije po danu), Statistika (prihod, napojnice, broj rezervacija), Profil; prelazak Client ↔ Stylist (appMode store). |
| 10   | Završeno   | Admin sidebar: grupirana navigacija (Operativno, Salon, Sadržaj, Korisnici, Postavke). Backend: Analytics modul (GET /api/analytics/dashboard – prihod/rashod po mjesecu, performanse stilista, top usluge, konverzija). Loyalty modul (GET/PATCH /api/loyalty/accounts). Frontend: stranica Analitika (recharts: bar chart, tabele), stranica Loyalty (uključivanje programa preko postavke loyalty_enabled, lista računa, toggle isActive). Dokumentacija: `.cursor/docs/10_phase10_notifications.md` – šta je implementirano za notifikacije, šta na čekanju zbog SDK55 (Expo Go Android, FCM/email stub). |
| KUF+ | 2026-08-11 | **Modularne kategorije rashoda (COMPLETED)**: category-centric admin wizard; `lineRole` kolone; notes `v:2` + legacy adapter; dinamički LineItemsEditor; bootstrap-legacy-columns. Matrica: `.cursor/docs/matrices/finance/`; plan: `.cursor/plans/expense-categories-modular/`. |

## 6. Rezervacije – Manual start, attendance deadline, auto reorder (April 2026)

### 6.1 Pravilo vremena (bez “ponoćnih” edge-caseova)
- **reservationStartAt**: `combine(reservationDate, startTime)` (vidi `ReservationDateService.combineDateAndTime`).
- **Attendance deadline**: `reservationStartAt - 24h`.
- **Client cancel deadline**: `reservationStartAt - cancellationDeadlineHours` (iz `salon_settings`).

### 6.2 FSM pravila (statusi ostaju isti)
Tok:
- `PENDING → STYLIST_REVIEW → CONFIRMED → ATTENDANCE_CONFIRMED → IN_PROGRESS → COMPLETED`
Alternativno:
- `CANCELLED_BY_CLIENT`, `CANCELLED_BY_STYLISTS`, `NO_SHOW`

**Sistemski otkaz zbog nepotvrđenog dolaska** (bez novog statusa – Opcija A):
- `status = CANCELLED_BY_CLIENT`
- `cancelReason = 'Nije potvrđen dolazak u roku'`
- notifikacija `data.kind = 'attendance_timeout_cancelled'`

### 6.3 Autostart uklonjen
- `IN_PROGRESS` nastaje isključivo ručnim startom stiliste.
- U cron tick-u se više ne poziva `autoStartUpcomingReservations()`.

### 6.4 Ručni start (“jedini gate”)
Start je dozvoljen samo ako:
- status je `ATTENDANCE_CONFIRMED`
- nema pending reschedule/reorder (`rescheduleStatus !== 'PENDING'`)
- **now je u prozoru**: `plannedStart ≤ now ≤ plannedEnd + 60min`
- nema ranijih termina tog dana koji čekaju obradu (postojeće pravilo)

### 6.5 Attendance enforcement (auto-otkaz + penal)
Cron svake minute provjerava `CONFIRMED` bez `attendanceConfirmedAt` i kada uđu u 24h window:
- automatski otkazuje rezervaciju (`CANCELLED_BY_CLIENT` + reason)
- primjenjuje penal (`incrementCancellationCount`)
- emituje socket evente + `availability:changed`

### 6.6 Auto reorder (poslije attendance otkazivanja)
Kad enforcement otkaže nepotvrđene, sistem pokušava “popuniti rupe” za potvrđene klijente:
- ciljna grupa: `ATTENDANCE_CONFIRMED` (po stilistu i danu)
- poštuje `salonWorkingHours` (`openTime`, `closeTime`) i `pauseBetweenServices`
- algoritam: greedy “pomjeri ranije” bez kaskadnih promjena; svaka rezervacija dobije **opcionalan** prijedlog.

Reorder je uvijek **siguran**:
- postavlja se `rescheduleStatus = 'PENDING'` + `rescheduleProposedStartTime/EndTime`
- klijent može **prihvatiti** ili **odbiti**\n  - ako odbije, ostaje originalni termin i može ga kasnije otkazati dok ne uđe u deadline

### 6.7 UI konzistentnost
- Web + Mobile prikazuju specifičan label za sistemski otkaz:\n  `CANCELLED_BY_CLIENT` + `cancelReason === 'Nije potvrđen dolazak u roku'` → **“Otkazano (nepotvrđen dolazak)”**

## 5. Kako proširiti

- Pri većim feature-ima ili refaktorima ažuriraj odgovarajuće `.cursor/docs/*.md`.
- Ako ponašanje odstupi od dokumentacije, osvježi `03_gap_analysis.md` i `06_tasks.md`.
- Drži `.cursor/rules/` i `.cursor/skills/` usklađenim sa šemom i API-jem.
