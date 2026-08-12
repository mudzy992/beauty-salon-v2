# Taskovi po fazama

## Faza 1 (trenutna)
- [x] Git repo, folder struktura
- [x] Backend NestJS + Prisma + MySQL
- [x] Kompletna Prisma šema
- [x] Auth modul (JWT, register, login)
- [x] Upload modul (sharp, multi-size)
- [x] Docker, .env.example, SOURCE_OF_TRUTH, rules, skills, docs
- [x] Auth testovi, Upload testovi
- [x] i18n infrastruktura (BS) na backendu (backend/src/i18n/constants.ts)

## Faza 2 (završeno)
- [x] User management (CRUD, role assignment, profile)
- [x] Salon settings (CRUD, working hours per day, holidays)
- [x] Service modul (kategorije, podkategorije, servisi)
- [x] Stylist modul (profili, radno vrijeme, kompetencije – stylist_services)
- [x] App Settings modul (key-value)
- [x] Salon service test (findFirst, findOne, setWorkingHours)
- [x] Prisma 7 + @prisma/adapter-mariadb (connection string u PrismaService i seed)
- [x] Inicijalizacija: migracije (prisma migrate deploy), seed (roleovi), skripte db:migrate, db:seed, db:init

## Faza 3 (završeno)
- [x] Availability engine (dostupni datumi, dostupni slotovi po datumu – salon, praznici, radno vrijeme stilista)
- [x] Reservation CRUD + FSM (create, list, getOne, cancelByClient, confirmAttendance)
- [x] Stylist response: lock (s timeoutom), accept, reject; provjera da stilist radi samo na svom profilu
- [x] Cancellation policy (rok sati, ClientCancellationCount, penalizacija)
- [x] Notifications modul (send, sendToMany, preferencije, list, markAsRead; FCM/Email pripremljeni)
- [x] Testovi: time-slot.utils, availability.service, reservations.service

## Faza 4 (završeno)
- [x] Daily log modul (create, createFromReservation, complete, addImage; complete → IncomeBookEntry)
- [x] Expense: šabloni (CRUD + polja), kategorije (CRUD), knjige (getOrCreate za mjesec, close), rashodi (CRUD s fieldValues i attachments)
- [x] Income: knjige (getOrCreate), zapisi iz daily log pri complete, CRON 1. u mjesecu (open new, close previous)
- [x] Testovi: daily-log.service, expense-books.service, income-books.service

## Faza 5 (završeno)
- [x] Blog: CRUD (slug iz naslova, dijakritici), publish/draft, findBySlug (public)
- [x] Blog komentari: create (na objavljeni članak), approve, remove
- [x] Gallery: kategorije (CRUD), slike (add/update/remove s uploadId)
- [x] Reviews: create (serviceRating 1–5, opciono stylistRating, reservationId), list (filter po service/stylist, approved), approve
- [x] Holiday notifikacije: sendForHoliday(holidayId) – push/email svim aktivnim korisnicima, pushSentAt
- [x] Testovi: blog.service, slug.utils, reviews.service, gallery.service, holiday-notifications.service

## Faza 6 (završeno)
- [x] Vite + React + TypeScript, Chakra UI + Tailwind, theme (branding), i18n (bosanski)
- [x] Auth: login stranica, JWT u localStorage, zaštićene rute, API klijent (axios)
- [x] Layout: sidebar (navigacija), header (breadcrumbs, logout), responsive (drawer na mobilnom)
- [x] Stranice: Dashboard (početna), Users, Salon, Services, Stylists, Reservations, Daily log, Finance (knjiga prihoda / rashoda), Blog, Gallery, Reviews, Settings
- [x] Pregled podataka s backend API-ja (list/tablični prikazi)

## Faza 7 (završeno)
- [x] PublicLayout (header s nav, footer), javne rute na root
- [x] One-page početna: hero, o nama, usluge (link), galerija (link), kontakt
- [x] Usluge: lista kategorija/podkategorija/servisa (API categories + category/:id)
- [x] Blog: lista objavljenih članaka, detail po slug
- [x] Galerija: kategorije sa slikama (categories + category/:id za slike)
- [x] Registracija (POST /auth/register), Login redirect (admin → /admin, ostali → /)
- [x] Rezervacija: za prijavljene; odabir servisa, datuma, termina, napomena; POST /api/reservations
- [x] Admin dashboard premješten pod /admin/*

## Naknadne funkcionalnosti (van plana, završeno)
- [x] Socket.IO backend: EventsGateway, EventsModule (JWT auth, rooms: user, admin, stylists, public)
- [x] Socket.IO backend integracija: ReservationsService, NotificationsService, SettingsService, SalonService emituju evente
- [x] Socket.IO frontend: socket.io-client, SocketProvider, useSocket(), useSocketEvent() hook-ovi
- [x] Vite proxy za /socket.io WebSocket konekciju
- [x] Real-time ažuriranje: Dashboard, Reservations, Notifications, Settings, Salon – sve stranice reaguju na Socket.IO evente
- [x] Rezervacija (PublicReserve): autocomplete pretraga servisa (filtriranje po imenu, kategoriji), kalendar s dostupnim/nedostupnim datumima, step-by-step flow (1→2→3→4), pregled prije slanja, real-time ažuriranje slotova putem Socket.IO
- [x] Settings (Admin): potpuni redizajn – tabovi (Javna Stranica, Sistem, Ostale), accordion grupe s ikonama i progress tag-ovima, type-aware editori (Switch za boolean, NumberInput za brojeve, URL/Image preview, email input s addonom), inline editiranje, real-time ažuriranje

## Bugfixevi (završeno)
- [x] **RolesGuard + @Public() konflikt**: `RolesGuard` sada provjerava `IS_PUBLIC_KEY` metadata i preskače role check za javne endpointe – riješen 403 na `/api/settings`
- [x] **AvailabilityService refaktoring**: Zamijenjeni N+1 Prisma upiti s bulk fetch + in-memory provjera (Set/Map). Eliminisan problematični `OR` + `dateOverride: null` Prisma query koji nije radio s MySQL. Sada 4 upita umjesto 3*N
- [x] **Setting ključevi usklađeni**: PublicContact, PublicHome, PublicLayout koriste ispravne ključeve (`public_contact_address`, `public_contact_phone`, `public_contact_working_hours_text`, `public_footer_*`, `public_social_*`) umjesto starih `salon_*`
- [x] **Salon auto working hours**: `SalonService.create()` automatski kreira default radno vrijeme (Pon-Pet 09-17, Sub-Ned neradni). `ensureWorkingHoursExist()` endpoint za popunjavanje praznina. Frontend Salon stranica automatski poziva ensure ako nema radnog vremena
- [x] **Dijagnostički endpoint**: `GET /api/reservations/availability/debug?serviceId=` – vraća kompletnu dijagnozu (salon sati, stilisti, radni sati, issue detekcija)
- [x] **PublicLayout footer**: Prikazuje kontakt info, social linkove (Facebook, Instagram, TikTok), copyright iz postavki
- [x] **PublicContact mapa**: Google Maps embed iframe iz `public_contact_map_embed` postavke (s fallback placeholder-om)

## Faza 8 (završeno)
- [x] Expo SDK 55 setup: package.json, app.json, tsconfig, babel.config.js, dependencies
- [x] Theme system: dark/light/system mode, branding boje (Gold, Black, Champagne, Rose, DarkGray), ThemeProvider + ThemeContext
- [x] i18n: bosanski default (bs.ts – svi stringovi), react-i18next, infrastruktura za EN
- [x] API klijent: axios s Expo SecureStore za JWT, interceptori (auth header, 401 redirect), getImageUrl helper
- [x] Zustand stores: authStore (login, register, logout, initialize, refreshProfile), notificationStore (fetch, markAsRead, unreadCount)
- [x] React Navigation: RootStack (Auth/Main), AuthStack (Login, Register), MainTab (Home, Services, Reservations, Profile), nested stacks
- [x] UI komponente: Button (4 varijante, 3 veličine), Input (ikone, password toggle, error), Card (pressable, shadow), Badge (5 varijanti, status mapa), LoadingScreen, EmptyState
- [x] Auth screens: Login (email/username + password, validacija), Register (ime, prezime, username, email, telefon, password s potvrdom)
- [x] Home screen: hero sekcija, popularne usluge (horizontal scroll s karticama), najnoviji blog postovi, quick-book dugme
- [x] Service browsing: kategorije lista, detalj s podkategorijama i servisima (SectionList), cijena + trajanje, rezerviši dugme
- [x] Reservation flow: 4-step wizard (servis→datum→termin→pregled), service search/autocomplete, kalendar (react-native-calendars) s dostupnim/nedostupnim danima, time slot grid, napomena, review & submit
- [x] Moje rezervacije: SectionList (nadolazeće/prošle), status badge, potvrda dolaska, otkazivanje (s razlogom), write review za completed
- [x] Blog: lista objavljenih članaka s hero slikama, detalj po slug (strip HTML tags)
- [x] Reviews: star rating komponenta (servis + stilist), komentar, odabir servisa, submit
- [x] Profile: avatar (inicijali), user info, notifications link, theme toggle (light/dark/system), logout
- [x] Notifications: lista s tipskim ikonama (reservation, review, blog, holiday, system), unread dot, mark as read, pull-to-refresh
- [x] Push notifikacije: Expo Notifications setup (permissions, token, channel), usePushNotifications hook, foreground handler
- [x] TypeScript: strogi režim, zero compilation errors

## Faza 9 (završeno) – Stylist role + Mobile Stylist App
- [x] **Backend – automatska STYLIST rola**: Pri kreiranju StylistProfile (dodavanje korisnika u Stylists) automatski se dodjeljuje STYLIST rola; pri brisanju profila (DELETE stylist) rola se uklanja.
- [x] **Backend – blokada ručne STYLIST role**: assignRole i removeRole odbijaju STYLIST (poruka da se dodaje/uklanja u Stylists); create user također ne dozvoljava role STYLIST.
- [x] **Frontend admin**: U User managementu STYLIST nije u dropdownu za dodavanje uloge; u Create User samo SYSTEM_ADMIN, OWNER, CLIENT; tag STYLIST nema dugme za uklanjanje (oznaka „Stylists“ + napomena).
- [x] **Mobile – Stylist app**: Za korisnike s rolom STYLIST prikazuje se Stylist app (tabovi Inbox, Dnevnik, Raspored, Statistika, Profil). Inbox: lista rezervacija (asStylist) s PENDING/STYLIST_REVIEW; **Lock / Accept / Reject** (zaključaj → prihvati ili odbij) s API pozivima; useStylistProfile hook za /api/stylists/me.
- [x] **Mobile – prelazak Client ↔ Stylist**: appMode store (client | stylist); u Client Profile „Prebaci na Stylist app“, u Stylist Profile „Prebaci na Client app“; Root navigator bira Main vs StylistMain prema rolama i appMode.
- [x] **Mobile – Dnevna knjiga**: Lista zapisa (GET /api/daily-log?stylistProfileId=…); detalj zapisa (servis, klijent, cijena, napojnica, status); **Završi zapis** (POST complete → upis u knjigu); **Before/after slike**: prikaz postojećih, **Dodaj prije / Dodaj poslije** (expo-image-picker → upload → POST /api/daily-log/:id/images).
- [x] **Mobile – Raspored**: SectionList rezervacija po danu (asStylist, fromDate–toDate), grupisano po datumu, prikaz vremena i statusa.
- [x] **Mobile – Statistika**: Za trenutni mjesec: broj završenih rezervacija, predstojeći potvrđeni termini, ukupan prihod (iz dnevne knjige), napojnice.

## Post-Faza — Modularne kategorije rashoda / KUF (COMPLETED 2026-08-11)
- [x] AS-IS snapshot + rollback (`EXPENSE_CATEGORIES_AS_IS.md`)
- [x] Category-centric admin wizard (template ispod haube)
- [x] `lineRole` na template poljima + notes `v:2` + legacy adapter
- [x] Dinamički LineItemsEditor; bootstrap-legacy-columns
- [x] Finance MATRIX + plan folder closed
