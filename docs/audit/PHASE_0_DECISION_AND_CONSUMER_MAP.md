# Faza 0 — odluke i consumer map

**Datum source pregleda:** 2026-11-03

**Pregledani commit:** `3a98b1b3115fb83a59c0ae7cbd4e90dbc93c388f` (aktivna grana i `origin/master` su bili poravnati)

**Status:** consumer inventar i owner odgovori su zabilježeni. D-01–D-06 imaju odluku; D-07 je izričito odgođen dok privacy/legal ne odobri tekst/verziju. Nema izmjena aplikacijskog koda.

Ovaj dokument završava tehnički dio Faze 0 za client pickere, user/dashboard liste i sve pronađene direktne `GET /api/reservations` pozive. Policy/deployment odluke koje zahtijevaju owner nisu pretpostavljene. Faza 1 i druge policy-sensitive izmjene ostaju blokirane dok se ne zabilježe odgovori.

## 1. D-01 — CLIENT politika za pickere i finansijski upis

**Source stanje**

- `GET /api/users/clients` ima paginirani `ClientListQueryDto` (`page`, `pageSize`, `q`) i strict role predicate: CLIENT, ali ne SYSTEM_ADMIN/STYLIST/OWNER; vraća `{ items, page, pageSize }`. Pozivaju ga `frontend/src/features/reservations/components/ReservationScheduler.tsx`, `frontend/src/features/stylist-portal/pages/stylist-direct-booking-page.tsx` i `mobile/src/screens/stylist/use-stylist-direct-booking-form.ts`.
- `GET /api/users/for-daily-log` vraća ne-paginiranu listu svih aktivnih korisnika, bez CLIENT predicate-a. Consumer-i: `frontend/src/features/stylist-workbook/api/stylist-workbook.api.ts` + `frontend/src/features/daily-log/use-daily-log-data.ts`; `mobile/src/screens/stylist/DailyLogNewEntryScreen.tsx`.
- Finance `frontend/src/features/finance/api/lookups.api.ts` šalje `GET /api/users` s `{ search, role: "CLIENT", limit: 20 }`. `UsersController.findAll` čita samo `page`/`pageSize`, a `UsersService.findAll` bez oba vraća cijeli admin user-directory. Manual income DTO/service prihvataju `clientId`, ali pregledani upis ne provjerava CLIENT ulogu.
- Dashboard `frontend/src/features/dashboard/use-dashboard-data.ts` također poziva ne-paginirani `GET /api/users` radi broja korisnika.

**Predloženi ugovor (nije usvojen bez potvrde):** ručni prihod/dug i dnevni-log izbor klijenta prikazuju samo role CLIENT, a server-side zapis odbija ID koji nije klijent. Odvojiti dashboard aggregate/count od user-directory rute. Finance koristi već postojeći `/api/users/clients` sa minimalnom projekcijom i page/search; daily-log dobije isti ili ekvivalentan bounded contract uz provjeru postojećeg poslovnog toka. Provjeriti da se anonimizirani/obrisani klijent i historical ledger zapisi ne mijenjaju retroaktivno.

**Owner odluka (2026-11-03):** CLIENT-only pravilo važi i za daily-log i za manual finance izbor/upis; backend treba odbiti clientId koji nije CLIENT. Pri implementaciji ipak testirati postojeći ledger/historical data ponašanja i reservation-derived scenarije. D-01 je zatvoren za Fazu 1.

## 2. D-05 — user-list response shape i kompatibilnost

| API | Trenutni oblik | Poznati consumer-i | Napomena za rollout |
|---|---|---|---|
| `GET /api/users` | Bez oba pagination parametra vraća array cijelog user-directory; sa `page`+`pageSize` vraća `{items,total,page,pageSize}`. | Finance lookup (šalje ignorisane `search/role/limit`); dashboard (bez pagination). | Oba poziva treba ukloniti s ove rute prije promjene defaulta; pagination contract ne treba implicitno vezati uz stari `limit`. |
| `GET /api/users/clients` | Uvijek paginirani `{items,page,pageSize}`; `q`, page i pageSize DTO-validirani. | Web reservation scheduler, stylist direct booking web/mobile. | Već postojeći contract prikladan je za picker; provjeriti search lifecycle i pagination consumers. |
| `GET /api/users/clients/admin` | Paginirani `{items,total,page,pageSize}`. | Admin Users strana (`frontend/src/pages/Users.tsx`). | Trenutni UI već koristi envelope. |
| `GET /api/users/for-daily-log` | Nepaginirani array. | Web daily-log (dva data hooka); mobile DailyLogNewEntry. | Treba bounded replacement/compatibility rollout; ne mijenjati response iznenada. |
| `GET /api/users/system-admins`, `GET /api/users/stylists` | Nepaginirani array; endpointi nemaju list DTO. | Admin Users strana (`frontend/src/pages/Users.tsx`). | Definisati da li su male administrativne role-liste izuzete s hard cap-om ili prelaze na envelope. |

**Owner odluka (2026-11-03):** poznate web/mobile consumere migrirati na dogovoreni bounded response; legacy array response ostaje samo tokom jednog uspješnog release ciklusa nakon što su svi poznati consumer-i migrirani. Prije uvođenja envelope/defaulta ne stavljati tihi cap na staru rutu. Za `system-admins`/`stylists` tokom migracije dodati eksplicitni pagination/cap ugovor i UI obradu; compatibility period ne ukida boundedness acceptance.

## 3. D-05 — svi pronađeni direktni `GET /api/reservations` consumer-i

Controller `ReservationsController.findAll` prihvata `fromDate`, `toDate`, `status`, `clientSearch`, `asClient`, `asStylist`, `page`, `pageSize`. **Baseline u trenutku inventara:** array se vraćao ako nedostaje bilo koji od `page`/`pageSize`, bez server-side result cap-a; DTO nije imao gornje granice. **Ažuriranje nakon `10a0b8d`:** oba parametra su obavezna kao par; `pageSize` je najviše 50, `page` i izračunati offset najviše 1000, uz stabilan `id` tie-break. Queryless pozivi i dalje vraćaju legacy array bez server-side cap-a do D-05 compatibility window-a.

**Consumer rollout status nakon `92ac58c` (CI `41802917486` green):** admin list je već koristio bounded pages; admin calendar (`bc03e85`) zadržava vidljivi date range, fetch-a stranice do `total` i poštuje page size 50/offset 1000, a greška čuva postojeće podatke i nudi retry. Stylist portal (`93d6252`), mobile stylist schedule (`e3bb420`), stats (`39fb164`), inbox (`7c110cf`), detail start-order check (`586efe3`), mobile client history (`115dd6a`), Services (`def2259`), Home (`5f432ef`), web client history (`e630315`) i dashboard reservation summary (`92ac58c`, zamjenjuje dva list poziva agregatnim count + bounded recent sample) koriste bounded reads. Web/mobile legacy array fallback prihvata najviše 1.050 stavki. Svih 13/13 mapiranih consumer grupa sada je bounded. Vlasnik 2026-11-04 prijavio je da je redeploy uredno prošao; D-05 compatibility window se označava kao započet prema toj prijavi, ali agent ga nije nezavisno provjerio i jedan uspješan release ciklus još mora završiti prije uklanjanja legacy-array response-a.

| Consumer | Parametri/oblik koji koristi | Trenutni adapter/ograničenje |
|---|---|---|
| `frontend/src/pages/Reservations.tsx` (admin list) | `fromDate`, `toDate`, `status`, `clientSearch`, `page`, `pageSize` | Parsira array ili envelope; koristi total. |
| `frontend/src/pages/ReservationsCalendar.tsx` (admin calendar) | vidljivi date range + `page=0..20`, `pageSize=50` | Migriran u `bc03e85`: učitava envelope stranice do `total` i offset 1000; greška čuva postojeće stavke i nudi retry. Legacy array fallback je klijentski ograničen na 1.050 stavki; server-side legacy cap ostaje D-05 završni korak. |
| `frontend/src/pages/public/MyReservations.tsx` (client) | `asClient: 'true'` + page loop | Migriran u `e630315` na shared web bounded helper; postojeće partitioning, loading i action/error flow ostaju. Preko 1.050 zapisa helper prijavljuje grešku umjesto nepotpune istorije. |
| `frontend/src/features/stylist-portal/api/stylist-portal.api.ts` (stylist portal: inbox, schedule, stats, detail check) | `asStylist: true`, mogući `fromDate/toDate` | Migriran u `93d6252` na shared bounded page helper (`pageSize=50`, max offset 1000, ukupno do 1.050 stavki); React Query zadržava data/error i izlaže retry. Preko limita se prikazuje query greška umjesto nepotpune liste. |
| `frontend/src/features/dashboard/use-dashboard-data.ts` (dashboard) | trenutni mjesec `fromDate/toDate`; drugi poziv `status=PENDING`; oba bez pagination | Pomoćni `asArray`; oba query-ja mogu doseći sve odgovarajuće redove u periodu. |
| `mobile/src/screens/client/ServicesScreen.tsx` (client) | `asClient: true` + page loop | Migriran u `def2259` na shared mobile bounded helper; personalized-service reservation list, nezavisna greška i retry ostaju. Rezultati preko 1.050 odbijaju se umjesto djelimičnog prikaza. |
| `mobile/src/screens/client/HomeScreen.tsx` (client) | `asClient: true` + page loop | Migriran u `5f432ef` na shared mobile bounded helper; upcoming-summary filter, identity generation guard i retry ostaju. Rezultati preko 1.050 daju postojeće retryable error stanje. |
| `mobile/src/screens/client/MyReservationsScreen.tsx` (client) | `asClient: true` + page loop | Migriran u `115dd6a` na bounded helper (`pageSize=50`, max offset 1000); identity guards, payload normalization, stale-data i retry ostaju. Rezultati preko 1.050 odbijaju se umjesto prikaza djelimične istorije. |
| `mobile/src/screens/stylist/StylistInboxScreen.tsx` (stylist) | `asStylist: true` + page loop | Migriran u `7c110cf` na bounded helper (`pageSize=50`, max offset 1000); identity guards, payload normalization, stale-data i retry ostaju. Preko 1.050 stavki završava u load-error/retry stanju. |
| `mobile/src/screens/stylist/StylistScheduleScreen.tsx` (stylist) | `asStylist: true`, 30-dnevni date window + page loop | Migriran u `e3bb420` na mobile bounded helper (`pageSize=50`, max offset 1000); payload normalizacija, stale-data i retry UI ostaju. Preko 1.050 rezultata vraća error state umjesto djelimičnog rasporeda. |
| `mobile/src/screens/stylist/StylistStatsScreen.tsx` (stylist) | `asStylist: true`, tekući kalendarski mjesec + page loop | Migriran u `39fb164` na bounded helper; normalizacija, nezavisni load/error stanja i stale-data/retry za reservations i daily-log ostaju. |
| `mobile/src/screens/stylist/reservation-detail/hooks/use-reservation-detail-status.ts` | `asStylist: true`, jedan datum + page loop | Migriran u `586efe3` na bounded helper; start-order check i dalje blokira start pri invalid/failing read, uz postojeći retry. |
| `mobile/src/screens/stylist` direct list consumer-i u datotekama iznad | Nema drugih pronađenih literalnih `GET '/api/reservations'` u `frontend/src`, `mobile/src` ili `mobile/app` nakon isključenja testova. | ID-detail, availability i mutation rute nisu list consumer-i. |

### Predloženi reservation rollout (D-05 odluka potrebna)

1. Admin Reservations list već koristi pagination envelope; zadržati ga i dodati DTO `Max`/partial-parameter validation bez tihe promjene.
2. Admin calendar sada koristi capped page path za vidljivi date range i eksplicitno obrađuje grešku/retry; dashboard reservation reads i dalje trebaju bounded ponašanje i aggregate count gdje su primjereni, bez oslanjanja na download svih matching reservations.
3. Stylist portal inbox/schedule/stats/detail, mobile stylist schedule/stats/inbox/detail start-order lookup, mobile My Reservations history, Home, Services i web client My Reservations koriste bounded page helpers; dashboard koristi server-side counts i bounded sample. Date windows, identity guards, stale-data/error/retry ugovori i sažetak dashboarda ostaju usklađeni.
4. Svi mapirani consumer-i su sada migrirani i testirani. I dalje ne mijenjati queryless response dok promjene nisu puštene: nakon jednog uspješnog release ciklusa treba ukloniti legacy array fallback i provjeriti server-side cap/telemetriju; izvorni caller audit nije zasnovan samo na string search-u.
5. Tests: DTO rejects negative/partial/oversized values; each web/mobile parser handles agreed shape; page-boundary totals stable; synthetic high-cardinality DB proves bounded result; existing role scoping and date semantics preserved.

## 4. D-02 / D-03 — kampanja eligibility, consent i opterećenje

**Source stanje:** preferences endpoint sprema `type`, `pushEnabled`, `emailEnabled`; default `emailEnabled` je `true`. Campaign UI šalje role listu, `onlyActive`, `onlyEmailVerified`, `includeUserIds`/`excludeUserIds` mogu biti direktno zadani API fields; audience resolver i send path ne pokazuju u ovom source pregledanom dijelu consent predicate. Campaign send radi redom u istom requestu preko SMTP-a, bez kampanjskog queue/job state-a. Recipient ID array DTO nema `ArrayMaxSize`.

**Owner odluke (2026-11-03):** marketing zahtijeva odvojeni eksplicitni opt-in/unsubscribe; `GENERAL.emailEnabled` nije marketing saglasnost. Dozvoljeni su samo verificirani emailovi. Max 100 primatelja po kampanji, globalno najviše 1 email/sekundu i SMTP concurrency 1. Ovo su owner-odobreni implementacijski limiti, ne testirana tvrdnja o SMTP provider kvoti. Policy za ručno `includeUserIds`, opt-out/suppression i evidence/withdrawal audit treba implementirati tako da direktni ID ne može zaobići consent; ne slati realnu kampanju u CI.

## 5. D-04 — worker/scheduler topology

Source sadrži cronove i outbox tokove, ali repo kod ne dokazuje koliko produkcijskih backend replica/worker procesa radi. Scheduler koji je process-local može se izvršiti više puta uz više replica; outbox failure recovery i SMTP poslije slanja imaju at-least-once/duplicate caveat.

**Owner report (2026-11-03):** jedna backend replika. Za planiranje tretirati scheduler/outbox poller kao single-instance process-local work; ne dodavati Redis dependency. Agent nije nezavisno provjerio produkcijsku topologiju, proces restart ponašanje, worker izdvajanje, timezone/monitoring ili runbook; te stavke ostaju deployment acceptance gates. Outbox lease/retry treba i dalje tolerisati crash/restart.

## 6. D-06 / D-07 — jezik i media-consent tekst

Source inventory navodi jedan mobilni jezik (`mobile/src/i18n/bs.ts`); web BS/EN parity guard sam po sebi ne određuje mobile product scope.

- **D-06 owner odluka (2026-11-03):** mobile ostaje Bosnian-only; ne dodavati EN locale u ovaj slice.
- **D-07 owner status (2026-11-03):** media-consent EN tekst/policy version još nije odobren. Ne prevoditi niti mijenjati legal copy dok owner/privacy/legal ne dostavi tačan tekst i verziju. D-07 ostaje gated; ne blokira nepovezani API-R1 rad.

## 7. Faza 0 status i izlazni gate

| ID | Status poslije pregleda | Potreban za zatvaranje |
|---|---|---|
| D-01 | CLOSED FOR IMPLEMENTATION | Owner potvrdio CLIENT-only za daily-log i manual finance; server-side odbijanje non-CLIENT ID-a. |
| D-02 | CLOSED FOR IMPLEMENTATION | Odvojeni explicit marketing opt-in/unsubscribe; GENERAL.emailEnabled nije consent. |
| D-03 | CLOSED FOR IMPLEMENTATION | Samo verified email; max 100/campaign; 1 email/s; concurrency 1. Real SMTP quota nije testirana. |
| D-04 | OWNER-REPORTED | Jedna backend replika; deployment/runtime ponašanje i runbook nezavisno nisu provjereni. |
| D-05 users | DIRECTION APPROVED | Poznati consumer-i migriraju na bounded responses; legacy array jedan release ciklus nakon svih migracija. |
| D-05 reservations | INVENTORY + CONSUMER MIGRATION COMPLETE; RELEASE WINDOW IN PROGRESS (OWNER-REPORTED) | Svih 13 mapiranih consumer grupa su bounded. Vlasnik 2026-11-04 prijavio je uredan redeploy; agent nije nezavisno provjerio release/runtime. Jedan uspješan release ciklus još mora biti opažen prije uklanjanja legacy-array response-a; removal ostaje gated. |
| D-06 | CLOSED FOR CURRENT SCOPE | Mobile ostaje BS-only. |
| D-07 | GATED — LEGAL COPY PENDING | Nema odobrenog teksta/verzije; ne prevoditi ili mijenjati media-consent copy. Ne blokira API-R1. |

**Faza 0 exit:** product/policy smjernice su zabilježene za implementacijski rad i consumer inventory je gotov. D-04 je owner-reported, a ne agentom nezavisno potvrđen. D-07 ostaje izričito gated: bez odobrenog legal teksta ne mijenjati media-consent copy. API-R1 može krenuti prema D-01; kampanja se može izvorno implementirati tek uz consent/suppression safeguards i odobrene cap-ove iz D-02/D-03. Nema deployment/real SMTP acceptance tvrdnje.
