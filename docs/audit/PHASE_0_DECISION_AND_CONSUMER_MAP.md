# Faza 0 — odluke i consumer map

**Datum source pregleda:** 2026-11-03

**Pregledani commit:** `3a98b1b3115fb83a59c0ae7cbd4e90dbc93c388f` (aktivna grana i `origin/master` su bili poravnati)

**Status:** inventar i predloženi ugovori su spremni za owner odluku; D-01–D-07 nisu proglašeni zatvorenim. Nema izmjena aplikacijskog koda.

Ovaj dokument završava tehnički dio Faze 0 za client pickere, user/dashboard liste i sve pronađene direktne `GET /api/reservations` pozive. Policy/deployment odluke koje zahtijevaju owner nisu pretpostavljene. Faza 1 i druge policy-sensitive izmjene ostaju blokirane dok se ne zabilježe odgovori.

## 1. D-01 — CLIENT politika za pickere i finansijski upis

**Source stanje**

- `GET /api/users/clients` ima paginirani `ClientListQueryDto` (`page`, `pageSize`, `q`) i strict role predicate: CLIENT, ali ne SYSTEM_ADMIN/STYLIST/OWNER; vraća `{ items, page, pageSize }`. Pozivaju ga `frontend/src/features/reservations/components/ReservationScheduler.tsx`, `frontend/src/features/stylist-portal/pages/stylist-direct-booking-page.tsx` i `mobile/src/screens/stylist/use-stylist-direct-booking-form.ts`.
- `GET /api/users/for-daily-log` vraća ne-paginiranu listu svih aktivnih korisnika, bez CLIENT predicate-a. Consumer-i: `frontend/src/features/stylist-workbook/api/stylist-workbook.api.ts` + `frontend/src/features/daily-log/use-daily-log-data.ts`; `mobile/src/screens/stylist/DailyLogNewEntryScreen.tsx`.
- Finance `frontend/src/features/finance/api/lookups.api.ts` šalje `GET /api/users` s `{ search, role: "CLIENT", limit: 20 }`. `UsersController.findAll` čita samo `page`/`pageSize`, a `UsersService.findAll` bez oba vraća cijeli admin user-directory. Manual income DTO/service prihvataju `clientId`, ali pregledani upis ne provjerava CLIENT ulogu.
- Dashboard `frontend/src/features/dashboard/use-dashboard-data.ts` također poziva ne-paginirani `GET /api/users` radi broja korisnika.

**Predloženi ugovor (nije usvojen bez potvrde):** ručni prihod/dug i dnevni-log izbor klijenta prikazuju samo role CLIENT, a server-side zapis odbija ID koji nije klijent. Odvojiti dashboard aggregate/count od user-directory rute. Finance koristi već postojeći `/api/users/clients` sa minimalnom projekcijom i page/search; daily-log dobije isti ili ekvivalentan bounded contract uz provjeru postojećeg poslovnog toka. Provjeriti da se anonimizirani/obrisani klijent i historical ledger zapisi ne mijenjaju retroaktivno.

**Otvoreno:** potvrditi da se CLIENT-only pravilo odnosi i na daily-log, ne samo finance. Dok odgovor ne stigne, nema backend role enforcement izmjene.

## 2. D-05 — user-list response shape i kompatibilnost

| API | Trenutni oblik | Poznati consumer-i | Napomena za rollout |
|---|---|---|---|
| `GET /api/users` | Bez oba pagination parametra vraća array cijelog user-directory; sa `page`+`pageSize` vraća `{items,total,page,pageSize}`. | Finance lookup (šalje ignorisane `search/role/limit`); dashboard (bez pagination). | Oba poziva treba ukloniti s ove rute prije promjene defaulta; pagination contract ne treba implicitno vezati uz stari `limit`. |
| `GET /api/users/clients` | Uvijek paginirani `{items,page,pageSize}`; `q`, page i pageSize DTO-validirani. | Web reservation scheduler, stylist direct booking web/mobile. | Već postojeći contract prikladan je za picker; provjeriti search lifecycle i pagination consumers. |
| `GET /api/users/clients/admin` | Paginirani `{items,total,page,pageSize}`. | Admin Users strana (`frontend/src/pages/Users.tsx`). | Trenutni UI već koristi envelope. |
| `GET /api/users/for-daily-log` | Nepaginirani array. | Web daily-log (dva data hooka); mobile DailyLogNewEntry. | Treba bounded replacement/compatibility rollout; ne mijenjati response iznenada. |
| `GET /api/users/system-admins`, `GET /api/users/stylists` | Nepaginirani array; endpointi nemaju list DTO. | Admin Users strana (`frontend/src/pages/Users.tsx`). | Definisati da li su male administrativne role-liste izuzete s hard cap-om ili prelaze na envelope. |

**Prijedlog kompatibilnosti:** prvo migrirati svaki poznati consumer na dogovoreni novi bounded response; zadržati trenutni array oblik samo u jasno imenovanom privremenom compatibility prozoru ili zasebnoj legacy ruti. Ne stavljati tih default cap na postojeći endpoint koji korisnik trenutno očekuje da vrati sve. Za system-admins/stylists odlučiti eksplicitni cap/pagination umjesto pretpostavke da liste ostaju male.

## 3. D-05 — svi pronađeni direktni `GET /api/reservations` consumer-i

Controller `ReservationsController.findAll` prihvata `fromDate`, `toDate`, `status`, `clientSearch`, `asClient`, `asStylist`, `page`, `pageSize`. Trenutno se array vraća ako nedostaje bilo koji od `page`/`pageSize`; envelope `{items,total,page,pageSize}` vraća se tek kada su oba prisutna. DTO nema `Max` za `pageSize`; servis ga clamp-a na 100 samo kada pagination branch aktivan. Zato partial pagination parametar ne dobija očigledan DTO reject niti bounded envelope.

| Consumer | Parametri/oblik koji koristi | Trenutni adapter/ograničenje |
|---|---|---|
| `frontend/src/pages/Reservations.tsx` (admin list) | `fromDate`, `toDate`, `status`, `clientSearch`, `page`, `pageSize` | Parsira array ili envelope; koristi total. |
| `frontend/src/pages/ReservationsCalendar.tsx` (admin calendar) | vidljivi date range; bez `page/pageSize` | Parsira array ili `{items}`; range je UI-ograničen, API ugovor i max range nisu izvorno garantovani. |
| `frontend/src/pages/public/MyReservations.tsx` (client) | `asClient: true`, bez pagination | Očekuje array. |
| `frontend/src/features/stylist-portal/api/stylist-portal.api.ts` (stylist portal) | `asStylist: true`, mogući `fromDate/toDate`, bez pagination | Očekuje array. |
| `frontend/src/features/dashboard/use-dashboard-data.ts` (dashboard) | trenutni mjesec `fromDate/toDate`; drugi poziv `status=PENDING`; oba bez pagination | Pomoćni `asArray`; oba query-ja mogu doseći sve odgovarajuće redove u periodu. |
| `mobile/src/screens/client/ServicesScreen.tsx` (client) | `asClient: true`, bez pagination | Normalizuje reservations; nema server pagination loop-a. |
| `mobile/src/screens/client/HomeScreen.tsx` (client) | `asClient: true`, bez pagination | Normalizuje reservations radi upcoming summary. |
| `mobile/src/screens/client/MyReservationsScreen.tsx` (client) | `asClient: true`, bez pagination | Normalizuje cijelu listu za screen. |
| `mobile/src/screens/stylist/StylistInboxScreen.tsx` (stylist) | `asStylist: true`, bez date/page | Normalizuje cijeli inbox; lock/hide business logic ostaje backend-owned. |
| `mobile/src/screens/stylist/StylistScheduleScreen.tsx` (stylist) | `asStylist: true`, 30-dnevni date window, bez page | Normalizuje listu kalendara. |
| `mobile/src/screens/stylist/StylistStatsScreen.tsx` (stylist) | `asStylist: true`, tekući kalendarski mjesec, bez page | Provjerava da je normalizovani niz dužine kao raw array. |
| `mobile/src/screens/stylist/reservation-detail/hooks/use-reservation-detail-status.ts` | `asStylist: true`, jedan datum, bez page | Učitava dnevne reservation-e za početak naloga. |
| `mobile/src/screens/stylist` direct list consumer-i u datotekama iznad | Nema drugih pronađenih literalnih `GET '/api/reservations'` u `frontend/src`, `mobile/src` ili `mobile/app` nakon isključenja testova. | ID-detail, availability i mutation rute nisu list consumer-i. |

### Predloženi reservation rollout (D-05 odluka potrebna)

1. Admin Reservations list već koristi pagination envelope; zadržati ga i dodati DTO `Max`/partial-parameter validation bez tihe promjene.
2. Za calendar/dashboard odobriti server-side max date span i/ili capped page path; consumer-i trebaju jasno obrađivati partial/next-page stanje. Dashboard counts ne bi trebali zavisiti od download-a svih matching reservations.
3. Za client history, stylist inbox, schedule i stats dogovoriti da li UX treba sve (infinite/load-more/fetch-all bounded pages) ili samo server-bounded windows; mobilni normalizer trenutno očekuje niz i mora se migrirati prije envelope defaulta.
4. Tek nakon consumer testova promijeniti ponašanje bez `page/pageSize`. Privremeni legacy array window treba imati vlasnika, datum isteka i metriku/telemetriju ako runtime podržava; ne zaključiti da se svi callers nalaze samo iz source string search-a.
5. Tests: DTO rejects negative/partial/oversized values; each web/mobile parser handles agreed shape; page-boundary totals stable; synthetic high-cardinality DB proves bounded result; existing role scoping and date semantics preserved.

## 4. D-02 / D-03 — kampanja eligibility, consent i opterećenje

**Source stanje:** preferences endpoint sprema `type`, `pushEnabled`, `emailEnabled`; default `emailEnabled` je `true`. Campaign UI šalje role listu, `onlyActive`, `onlyEmailVerified`, `includeUserIds`/`excludeUserIds` mogu biti direktno zadani API fields; audience resolver i send path ne pokazuju u ovom source pregledanom dijelu consent predicate. Campaign send radi redom u istom requestu preko SMTP-a, bez kampanjskog queue/job state-a. Recipient ID array DTO nema `ArrayMaxSize`.

**Sigurnosna privremena granica:** ne slati kampanje stvarnim korisnicima niti dodavati consent pretpostavku dok privacy/product owner ne odobri semantics i recipient caps. Admin `emailEnabled` za general notifications nije automatski dokaz marketing opt-in-a.

**Traži owner odgovor:** (a) odvojena marketing opt-in/unsubscribe ili formalno usvojena semantika postojećeg `GENERAL.emailEnabled`; (b) verified email obavezno ili izuzeci; (c) maksimalni batch size i send rate/SMTP concurrency; (d) policy za ručno include ID-jeve i suppression/opt-out. Do odgovora preporuka je odvojen explicit consent + verified only + server caps, ali to nije implementacijski nalog.

## 5. D-04 — worker/scheduler topology

Source sadrži cronove i outbox tokove, ali repo kod ne dokazuje koliko produkcijskih backend replica/worker procesa radi. Scheduler koji je process-local može se izvršiti više puta uz više replica; outbox failure recovery i SMTP poslije slanja imaju at-least-once/duplicate caveat.

**Traži deploy owner odgovor:** produkcijski broj backend replica; scheduler/worker procesi i ko ih pokreće; timezone/leader/lease infrastruktura; način observability/alert/runbook. Bez tog odgovora ne pretpostavljati single instance niti dodavati Redis dependency za finansijski period.

## 6. D-06 / D-07 — jezik i media-consent tekst

Source inventory navodi jedan mobilni jezik (`mobile/src/i18n/bs.ts`); web BS/EN parity guard sam po sebi ne određuje mobile product scope.

- **D-06:** potvrditi treba li mobile dobiti EN locale ili ostaje Bosnian-only. Agentova komunikacija na bosanskom nije product-locale odluka.
- **D-07:** EN media-consent tekst i policy version moraju biti vlasnički/privacy/legal odobreni. Bez teksta/verzije ne prevoditi niti mijenjati legal copy; odgovor “još nije odobreno” ostavlja D-07 otvorenim, bez blokiranja nepovezanog API rada.

## 7. Faza 0 status i izlazni gate

| ID | Status poslije pregleda | Potreban za zatvaranje |
|---|---|---|
| D-01 | OPEN — predložen CLIENT-only, nije usvojen | Owner potvrdi daily-log i manual-income role scope. |
| D-02 | OPEN — nema consent pretpostavke | Privacy/product policy za marketing opt-in i unsubscribe. |
| D-03 | OPEN — nema recipient/rate limita potvrđenog | Verified eligibility, max batch i rate/concurrency. |
| D-04 | OPEN — topology nije izvorno dokaziva | Deploy owner potvrdi replike, worker i scheduler ownership. |
| D-05 users | INVENTORY COMPLETE; rollout policy OPEN | Owner/API UI odluči legacy array window i role-list caps. |
| D-05 reservations | 13 consumer-a mapirano; rollout policy OPEN | Owner/API UI odobri response compat, bounded windows i migration sequence. |
| D-06 | OPEN | Product potvrdi mobile locale scope. |
| D-07 | OPEN | Owner dostavi/odobri tačan legal text + version ili potvrdi da je pending. |

**Faza 0 exit:** consumer inventory je spreman, ali Faza 0 nije zatvorena dok se odluke koje utiču na source contract ne potvrde. Naredni source slice ne treba započeti na osnovu samih prijedloga ovog dokumenta.
