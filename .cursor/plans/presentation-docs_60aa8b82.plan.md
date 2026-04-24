---
name: presentation-docs
overview: Kreiramo set prezentacijskih dokumenata za backend/frontend/mobile, plus detaljna korisnička uputstva po ulogama (ADMIN/OWNER/STYLIST/CLIENT). Svi dokumenti se zasnivaju na jednom end-to-end workflow-u rezervacije sa svim grananjima (attendance deadline, cancel, stylist response, manual start, no-show, reorder/reschedule, notifikacije, real-time, daily log i finansije).
todos:
  - id: inventory_sources
    content: Pročitati/izvući ključne tokove i edge-caseove iz postojeće dokumentacije i relevantnih modula (reservations, daily-log, finance, notifications, events).
    status: completed
  - id: write_backend_presentation
    content: Napisati `docs/presentation/backend-presentation.md` sa arhitekturom, API, realtime, notifikacije, FSM i cron scenarijima.
    status: completed
  - id: write_frontend_presentation
    content: Napisati `docs/presentation/frontend-presentation.md` sa public/admin tokovima i real-time ponašanjem UI-ja.
    status: completed
  - id: write_mobile_presentation
    content: Napisati `docs/presentation/mobile-presentation.md` sa client/stylist tokovima i push ograničenjima.
    status: completed
  - id: write_role_guides
    content: Napisati 4 user guide dokumenta (admin/owner/stylist/client) sa koracima + 'šta ako' scenarijima.
    status: completed
  - id: review_consistency
    content: Provjeriti konzistentnost termina (statusi, role, screen/page nazivi), linkovati na postojeće codebase-map dokumente i SOURCE_OF_TRUTH.
    status: completed
isProject: false
---

# Prezentacijski dokumenti (backend / frontend / mobile) + uputstva po rolama

## Cilj i format
- **Cilj**: Jedan “kompletan workflow” rezervacije, opisan iz 3 ugla (backend, frontend, mobile) + zasebna, detaljna korisnička uputstva po ulogama.
- **Format**: Markdown u repozitoriju (predlog lokacije: `docs/presentation/`), sa jasnim sekcijama, linkovima na relevantne module/route-ove i “scenario” podsekcijama.
- **Source of truth**: `SOURCE_OF_TRUTH.md` + postojeće mape u `docs/codebase-map/` + poslovna pravila u `.cursor/docs/05_matrice_i_poslovna_pravila.md` + notifikacije u `.cursor/docs/10_phase10_notifications.md`.

## Jedan end-to-end workflow (rezervacije) koji dokumenti moraju pokriti
Workflow priča ostaje ista, samo se objašnjava po slojevima.

### Glavni tok (happy path)
- **Guest/Client** bira servis i termin (web public ili mobile client) → kreira rezervaciju.
- **STYLIST** dobija zahtjev (stylist mobile) i radi lock/accept → rezervacija ide prema potvrdi.
- **CLIENT** potvrđuje dolazak (24h prije starta) → status `ATTENDANCE_CONFIRMED`.
- **STYLIST** ručno starta termin u dozvoljenom vremenskom prozoru → `IN_PROGRESS` → završava → `COMPLETED`.
- **Daily log** entry se kreira / završava i upisuje finansijski efekat (KIF) + optional loyalty earn.
- **Notifikacije + real-time**: Socket.IO eventi (rezervacije, availability, notification:new) + push (Expo; uz poznata SDK55 ograničenja) + email (stub).

### Obavezna grananja/scenariji
- **Nema dostupnosti**: availability vraća disabled datume/slotove (web/mobile).
- **Stilist odbija / ne odgovori**: `CANCELLED_BY_STYLISTS` ili alternativni tok (kako je implementirano u reservations servisu).
- **Client otkazuje** prije deadline-a i poslije deadline-a (penalizacija kroz cancellationCount pravila).
- **Attendance enforcement**: ako nema `attendanceConfirmedAt` u 24h prozoru → auto-cancel (`CANCELLED_BY_CLIENT` + reason “Nije potvrđen dolazak u roku”) + emit `availability:changed`.
- **Manual start gate**: start dozvoljen samo za `ATTENDANCE_CONFIRMED`, bez pending reorder/reschedule, u prozoru (plannedStart..plannedEnd+60min), i bez “ranijih termina tog dana koji čekaju obradu” (postojeće pravilo).
- **No-show**: `NO_SHOW` i posljedični efekti (notifikacije, availability).
- **Auto reorder** nakon attendance auto-cancel: predlog vremena (`rescheduleStatus='PENDING'`) → client accept/decline.
- **Loyalty popust** (ako aktivan): odabir percent-a na rezervaciji, validacija bodova, upis na `Reservation` polja; finansijski efekat kroz `DailyLogEntry.actualPrice`.

## Deliverables (fajlovi) i sadržaj

### 1) Backend prezentacija (za tehničku publiku)
- **Fajl**: `docs/presentation/backend-presentation.md`
- **Sadržaj**:
  - Arhitektura modula (mapa + ključni moduli): auth, reservations, availability, notifications, events, uploads, daily-log, finance, loyalty.
  - API površina i role-based zaštita (`@Public()`, global guard, `@Roles`).
  - Realtime (Socket.IO): sobe (`admin`, `stylists`, `user:{id}`, `public`) i ključni eventi (rezervacije, availability, notification:new).
  - Notifikacije: in-app + push (Expo) + email (stub) i SDK55 ograničenja.
  - Rezervacija FSM + cron enforcement + reorder/reschedule.
  - Finansije (KIF/KUF) + kako daily-log puni KIF.
  - Uploads servis (derivative images, allowed docs, “path-only” u bazi).

### 2) Frontend prezentacija (web: public + admin)
- **Fajl**: `docs/presentation/frontend-presentation.md`
- **Sadržaj**:
  - Javne stranice: rezervacija flow (`/rezervacija`) + prikaz dostupnosti/slotova + edge-case poruke.
  - Admin dashboard: glavne sekcije relevantne workflow-u (Reservations, Daily log, Finance, Notifications, Settings, Loyalty).
  - Realtime: SocketProvider + reakcija UI-ja na reservation/availability/notification evente.
  - Role-based pristup (ko vidi šta, u skladu sa `SYSTEM_ADMIN/OWNER/CLIENT`).

### 3) Mobile prezentacija (client + stylist)
- **Fajl**: `docs/presentation/mobile-presentation.md`
- **Sadržaj**:
  - Client app: rezervacija wizard, moje rezervacije (attendance confirm, cancel), notifikacije.
  - Stylist app: inbox (lock/accept/reject), schedule, daily log (complete, slike upload), stats.
  - Push notifikacije: šta radi u Expo Go vs dev/production build (prema `.cursor/docs/10_phase10_notifications.md`).

### 4) Korisnička uputstva po rolama (detaljna)
- **Fajlovi**:
  - `docs/presentation/user-guide-admin.md`
  - `docs/presentation/user-guide-owner.md`
  - `docs/presentation/user-guide-stylist.md`
  - `docs/presentation/user-guide-client.md`
- **Sadržaj (šablon za svaki guide)**:
  - Prijava i osnovna navigacija.
  - “Šta je moj posao u workflow-u rezervacije” (koraci + očekivani rezultati).
  - “Šta ako…” sekcija (poklapa grananja iz gore navedenih scenarija).
  - Notifikacije i real-time: kako prepoznati promjene, šta znači badge/unread.
  - Najčešće greške i kako ih riješiti (npr. ne stiže push u Expo Go; nema dostupnih slotova jer praznik/working hours; start nije dozvoljen zbog statusa).

## Minimalni vizuelni dijagrami (mermaid)
U svaki “presentation” dokument ubaciti po 1 dijagram:
- **SystemContext**: web/mobile → backend → DB + uploads + socket.
- **ReservationFSM**: statusi + ključni triggeri.

## Acceptance kriteriji
- Dokumenti pokrivaju **jedan kompletan workflow** i uključuju **sva važna grananja** (attendance timeout, cancel, stylist response, manual start, reorder/reschedule, no-show, notifikacije, daily-log/finansije, loyalty).
- Svaka uloga (ADMIN/OWNER/STYLIST/CLIENT) ima guide sa konkretnim koracima i “šta ako” sekcijama.
- Dokumenti jasno razlikuju web public, web admin, mobile client i mobile stylist tokove.

## Referentni izvori (postojeći)
- `SOURCE_OF_TRUTH.md`
- `docs/codebase-map/BACKEND.md`
- `docs/codebase-map/FRONTEND.md`
- `docs/codebase-map/MOBILE.md`
- `.cursor/docs/05_matrice_i_poslovna_pravila.md`
- `.cursor/docs/10_phase10_notifications.md`
