# Preostali nalazi audita i fazni plan implementacije

**Datum:** 2026-11-04

**Stanje:** detaljan source-review dodatak i Phase 2 progress log; audit findings iz prvobitnog review-a ostaju razdvojeni od naknadnih implementacija i runtime/deployment evidence.

**Grana:** `arena/657dba19-beauty-salon-v2`
**Baza za ovaj pregled:** nakon sigurnog fast-forwarda na `origin/master` commit `44a0b1f` (`Update app.config.js`).

Ovaj dokument precizira šta je u preostalim SEC/AUTH/OPS/API/UX/UI/A11Y/I18N tokovima potvrđeno u kodu, šta je samo mogući nalaz ili vlasnička/operativna odluka, i kojim redom treba raditi eventualne popravke. Ne zamjenjuje hronološki dokaz u [`FINDINGS.md`](FINDINGS.md), postojeći širi plan u [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md), ni mobile inventory u [`MOBILE_COMPLETE_AUDIT.md`](MOBILE_COMPLETE_AUDIT.md). Ako se historijska bilješka u tim fajlovima razlikuje od trenutnog izvornog koda, trenutni source je mjerodavan samo za source tvrdnju; produkcijski status mora ostati zasebno označen.

## 1. Kako čitati rezultate

Oznake u ovom dokumentu:

- **Potvrđeno u source-u:** ponašanje slijedi iz trenutnih poziva, DTO-a, upita i kontrolera. Nije dokaz da je putanja korištena u produkciji.
- **Source + CI:** postojeća CI provjera pokriva izvorni kod/test fixture, ponekad uz disposable PostgreSQL. To nije dokaz deployed ponašanja, korisničkih podataka, stvarnog SMTP-a ili stvarnog Redis-a.
- **Owner-reported:** vlasnik je prijavio rezultat; agent ga nije nezavisno ponovio.
- **Operativno otvoreno:** zahtijeva deployer/DBA/vlasnika sistema, staging ili stvarno okruženje. Nije razlog da se izvorni kod pogrešno proglasi provjerenim.
- **Policy gate:** kod se ne mijenja dok vlasnik ne odluči očekivani proizvodni/podatkovni ugovor.

Nisu čitani `.env`, tajne, Redis URL/password, produkcijska baza ili storage volume. Nisu slani emaili, rađeni DB upisi/migracije, browser zahtjevi niti deployment.

## 2. Izvršni sažetak

Najkonkretnije preostale stavke iz ovog pregleda su:

1. **Potvrđen API/UI ugovor mismatch u finansijskom ručnom prihodu:** frontend traži klijente sa `search`, `role=CLIENT`, `limit=20`, ali `GET /api/users` te parametre ignoriše i vraća cijelu admin projekciju svih korisnika kada nisu poslani i `page` i `pageSize`. Manual-entry forma zatim te rezultate prikazuje kao klijente. Backend DTO i servis za ovu putanju ne potvrđuju da je izabrani `clientId` zaista CLIENT. Ovo je prioritetni funkcionalni i data-integrity slice; ne tvrdimo da je već napravljen pogrešan finansijski zapis.
2. **Nepaginirani picker dnevnika vraća sve aktivne naloge, bez filtera CLIENT role.** Odgovor je mali po poljima, ali poziv je dopušten stilistima i neograničen je brojem redova. Postoji već paginirani `/api/users/clients` sa CLIENT filterom i minimalnom projekcijom; treba odlučiti da li oba dnevnik potrošača mogu preći na njega.
3. **Rezervacijski endpoint ima kompatibilni, ali neograničeni put:** bez oba pagination parametra radi `findMany` bez `take`; `page` nema maksimum u DTO-u, a `pageSize` se tiho odsijeca na 100 u servisu. Trenutni callers nisu svi paginirani. Potrebna je fazna promjena API ugovora, ne slijepa promjena response oblika.
4. **Kampanje i neki cron side-effecti ostaju direktni i at-least-once/negarantovani:** kampanja učita cijelu publiku, šalje jedan-po-jedan u HTTP zahtjevu, ne čita email preference, i nema recipient cap/outbox/retry/idempotency. `reservation.created` outbox ima atomsku claim zaštitu, ali nema pronađen periodični retry/lease-recovery worker; reminder tokovi šalju prije sent-marker upisa.
5. **Runtime i UX acceptance nisu agentom potvrđeni:** stvarni Redis/više instanci, primjena AUTH-02 migracije, production storage/backup, preflight/CSP/edge, browser/axe i puni route/screen coverage. Vlasnička SEC-08, Android i Redis-ACL potvrda ostaje owner-reported prema ranijem handoff-u.

Nema osnova da se iz ovih opažanja zaključi da su se desili dupli emaili, pogrešno knjiženje, neovlašten pristup, eksfiltracija ili deployment incident. Potrebni su ciljano testiranje i/ili vlasničke odluke.

## 3. Detaljan preostali API pregled

### API-R1 — Finansijski picker traži filter koji backend ne primjenjuje

**Izvorni dokaz:**

- [`lookups.api.ts`](../../frontend/src/features/finance/api/lookups.api.ts#L25-L32) poziva `GET /api/users` sa `{ search, role: "CLIENT", limit: 20 }` i prihvata niz ili `{items}`.
- [`use-lookups.ts`](../../frontend/src/features/finance/hooks/use-lookups.ts#L31-L43) čeka dok upit nema najmanje dva znaka, pa koristi rezultat kao pretragu.
- [`manual-entry-dialog.tsx`](../../frontend/src/features/finance/income/manual-entry-dialog.tsx#L117-L155) rezultate prikazuje kao klijente i dozvoljava izbor.
- [`UsersController.findAll`](../../backend/src/users/users.controller.ts#L95-L107) čita samo `page` i `pageSize`; nema `search`, `role` ni `limit` parametra/DTO-a.
- [`UsersService.findAll`](../../backend/src/users/users.service.ts#L147-L179) postavlja `where = {}`. Ako nisu prisutni oba pagination parametra, vraća sve redove sa `ADMIN_USER_LIST_SELECT`; taj select uključuje email, telefon, aktivnost i role names ([`users.service.ts`](../../backend/src/users/users.service.ts#L104-L118)). Ako jesu oba parametra, stranica je ograničena na 100, ali filter i dalje ostaje prazan.
- [`CreateIncomeBookManualEntryDto`](../../backend/src/finance/dto/create-income-book-manual-entry.dto.ts#L3-L29) validira `clientId` kao UUID, ne kao korisnika s CLIENT ulogom. Pregledani [`IncomeManualEntriesService.create`](../../backend/src/finance/income-manual-entries.service.ts#L54-L110) upisuje ID; za dug dalje ga predaje [`syncDebtForManualEntry`](../../backend/src/finance/utils/manual-entry-debt.sync.ts#L20-L63), koji zahtijeva ID i stilista, ali ne provjerava CLIENT rolu.

**Zaključak:** očekivani search/role/limit ugovor ne odgovara backend ruti. Ako admin/owner otvori ovu formu nakon upita od najmanje dva znaka, source trenutno vraća cijelu admin korisničku listu, ne samo matching klijente. UI je zatim može ponuditi kao klijente. Pošto server-side manual-entry path u pregledanom kodu ne potvrđuje CLIENT rolu, odabrani postojeći User ID može se zapisati kao `clientId`; ako se traži dug, može završiti u `ClientDebt` uz taj ID. To je konkretan source-level rizik za pravilnost kategorije/finansijskog zapisa i data minimization, ali nema dokaza da je stvarni zapis napravljen.

**Predložena popravka:** koristiti postojeći paginirani minimalni endpoint `GET /api/users/clients` sa `q`, `page`, `pageSize` i čitati `items`; u finansijskom ručnom unosu tražiti samo klijentsku minimalnu projekciju. Na backendu validirati da optional `clientId` pripada aktivnom korisniku sa CLIENT rolom kada poslovno pravilo traži klijenta; ako historijski manual entries smiju referencirati šire kategorije korisnika, vlasnik mora to potvrditi prije enforce-a. Ne uvoditi novu `/api/users` search semantiku bez razloga.

**Acceptance:** test da search endpoint šalje `q/page/pageSize`; HTTP/DB test da vraća samo CLIENT-e, stabilno praznu listu za nema rezultata i maksimalno 100 redova; test da ne-CLIENT UUID bude odbijen prije ledger/debt upisa; test da CLIENT selection ostaje kompatibilan u ručnoj KIF formi; regression da admin user detail/list response ne promijeni postojeću allowlistu.

### API-R2 — `/api/users/for-daily-log` nije CLIENT-only niti paginiran

[`UsersController`](../../backend/src/users/users.controller.ts#L109-L114) dopušta `STYLIST`, `SYSTEM_ADMIN`, `OWNER`. [`UsersService.findForDailyLog`](../../backend/src/users/users.service.ts#L129-L145) radi `findMany({ where: { isActive: true }, select: { id, username, firstName, lastName, gender }, orderBy })`: nema role relation filtera, query DTO-a, `skip` ili `take`. Mobile [`DailyLogNewEntryScreen`](../../mobile/src/screens/stylist/DailyLogNewEntryScreen.tsx#L180-L191), frontend [`use-daily-log-data.ts`](../../frontend/src/features/daily-log/use-daily-log-data.ts#L45-L58) i stylist workbook [`stylist-workbook.api.ts`](../../frontend/src/features/stylist-workbook/api/stylist-workbook.api.ts#L33-L40) koriste endpoint kao client picker; mobile runtime parser traži samo shape polja, ne CLIENT role. Postojeći `GET /api/users/clients` već ima strogi CLIENT filter, bounded `ClientListQueryDto` (`page 0–100000`, `pageSize 1–100`) i minimalnu picker projekciju.

**Policy gate:** potvrditi da li manual daily-log business rule dopušta izbor bilo kojeg aktivnog user accounta ili samo CLIENT uloge. UI/API nazivi i konkurentni `/clients` endpoint ukazuju na CLIENT picker, ali to nije dovoljno da se bez odobrenja promijeni istorijski ugovor.

**Predložena popravka nakon odluke:** prebaciti sve tri potrošačke putanje na paginirani client-picker endpoint; da se izbjegne promjena response oblika, ne vraćati novi objekt na staroj ruti dok se svi callers/testovi ne prebace. Nakon prelaska endpoint se može ostaviti kao deprecated compatibility shim ili ukloniti u zasebnom breaking-change slice-u. Filter treba biti `isActive` + CLIENT role; search treba obuhvatiti dogovorena polja, a page size server-side ograničiti.

**Acceptance:** controller/service contract tests za STYLIST/ADMIN/OWNER; CLIENT-only fixtures koji uključuju multi-role account, inactive CLIENT i aktivnog ADMIN/STYLIST bez CLIENT; paginacija bez preskakanja/duplikata; frontend web + mobile test da parser i retry rade; load/performance test nad sintetičkim velikim brojem naloga.

### API-R3 — `/api/users` fallback je neograničen i caller contract nije jedinstven

`GET /api/users` je OWNER/SYSTEM_ADMIN-only, ali bez oba `page` i `pageSize` servira cijeli user list. Ovu ne-paginiranu rutu još koriste:

- dashboard [`use-dashboard-data.ts`](../../frontend/src/features/dashboard/use-dashboard-data.ts#L29-L48) kao listu radi summary izračuna;
- finance `searchClients` (API-R1), koji šalje parametre koje backend ignoriše.

User management ekran više nije osnovni consumer ove rute za CLIENT listu: koristi `/api/users/system-admins`, `/api/users/stylists`, `/api/users/clients/admin`, i reset-candidate ID endpoint ([`Users.tsx`](../../frontend/src/pages/Users.tsx#L230-L248)). Admin-only `system-admins` i `stylists` liste su i same nepagirane u [`UsersService`](../../backend/src/users/users.service.ts#L182-L203), ali su očekivano male staff-liste; nakon mjerljivog rasta treba paginirati ili postaviti tvrdu gornju granicu.

**Validacijski detalj:** controller radi `parseInt` direktno. Ako je samo `page` ili samo `pageSize` prisutan, service tretira upit kao ne-paginiran; ako su oba prisutna ali jedan postane `NaN`, `hasPagination` je ipak true i `skip`/`take` mogu biti neispravni. Nepoznati `search`, `role`, `limit` query parametri se ne mapiraju kroz DTO i tiho se ignorišu. U query DTO-u za client picker postoji numerička validacija; ovdje je nema.

**Predloženi redoslijed:** (a) prebaciti finance picker na `/api/users/clients`; (b) dashboardu dati mali aggregate/count endpoint ili zasebne count upite, umjesto skidanja svih usera; (c) nakon pregleda drugih callsite-ova, napraviti default-pagination ugovor za `/api/users` ili ga ograničiti na eksplicitne admin use-case-ove; (d) paginirati staff liste samo ako realni obim zahtijeva. Pri promjeni response oblika prvo ažurirati svaki frontend consumer i testirati deployed compatibility period.

**Acceptance:** controller DTO odbija ne-cijele/negativne/unsafe `page`, prisustvo samo jednog pagination parametra ima definisano ponašanje, user list je bounded i dashboard count je isti kao prije za synthetic fixtures; response projekcija i roles ostaju isto ograničene.

### API-R4 — Rezervacije su bez oba pagination parametra neograničene

[`ReservationsController.findAll`](../../backend/src/reservations/reservations.controller.ts#L72-L85) prihvata `QueryReservationsDto`. **Inventory baseline:** DTO ([`query-reservations.dto.ts`](../../backend/src/reservations/dto/query-reservations.dto.ts#L13-L63)) nije imao gornje granice, a queryless `findMany` nije imao `take`. **Poslije backend slice-a `10a0b8d`:** `page`/`pageSize` moraju doći u paru; `pageSize` je ograničen na 50, `page` i computed offset na 1000, sa stabilnim `id` tie-break. Queryless poziv i dalje zadržava legacy array bez server-side cap-a dok se consumer migracije ne završe. Role/account scoping i removal internal bearer/idempotency fields moraju ostati nepromijenjeni.

**Consumer ugovor:** admin Reservations list šalje page+pageSize; admin calendar (`bc03e85`) šalje bounded date-window stranice; stylist portal (`93d6252`) i mobile stylist schedule/stats/inbox/detail (`e3bb420`, `39fb164`, `7c110cf`, `586efe3`) koriste bounded helpers; mobile My Reservations/Services/Home (`115dd6a`, `def2259`, `5f432ef`) i web client history (`e630315`) također su migrirani. Dashboard (`92ac58c`) koristi server-side monthly/pending counts i samo 8 recent redova, bez list download-a. Svih 13/13 mapiranih consumer grupa sada je bounded; migracije čuvaju date windows, identity guards, stale-data/loading/error/retry ugovore. Legacy-array compatibility window još nije započeo jer branch nije pušten u release.

**Predloženi popravak:** inventarizovati svaki consumer i odlučiti po prikazu: bounded calendar/date window, bounded page-based history/inbox ili server-side page cap. Dodati maksimum `page`/`pageSize` u DTO i odbaciti unsafe offsets umjesto tihega huge `skip`; definirati ponašanje kad stigne samo jedan parametar. Zadržati array response samo gdje su svi caller-i dokazano mali i ograničeni date range-om; ostale postepeno prebaciti na `{items,total,page,pageSize}` ili cursor envelope.

**Acceptance:** test svih user role/scoping cases, max page/pageSize, missing-one-param, date-only window, status filter, stable order tie-breaker, stale data/retry u web/mobile, DB-backed fixture koji dokazuje da query nikad ne vrati više od dogovorene granice.

### API-R5 — Šta je već bounded (ne uvoditi duplikatne popravke)

Postojeći [`API-02`](FINDINGS.md#api-02--public-api-bounds-analytics-ranges-and-request-rates-source-and-synthetic-ci-verified) bilježi bounded public blog/comments/reviews, catalogs i nested relations, gallery page/random sample, availability date window/batch i analytics ranges. HTTP rate policies imaju dedicated `HTTP_RATE_LIMIT_REDIS_URL` namespace; auth rute fail-closed, public-read limiti fail-open ako Redis counter nije dostupan. Ove source/CI granice ne potvrđuju real Redis, agregatnu concurrency kontrolu ili production load. Ne mijenjati te ugovore bez posebnog testa ili load dokaza.

## 4. OPS pregled — campaign, outbox i cron

### OPS-R1 — Email kampanja radi pun recipient query i SMTP slanje unutar HTTP zahtjeva

- Admin/owner-only routes su [`POST /api/notifications/campaigns/audience` i `/send`](../../backend/src/notifications/notifications.controller.ts). Početni audit je našao da nije bilo per-route `@HttpRateLimit` ni server-side recipient cap; sada max 100 primaoca i delivery concurrency/pacing enforce-a campaign service/DB worker. Poseban HTTP route limiter nije uveden.
- Početno stanje je bilo da [`CampaignAudienceDto`](../../backend/src/notifications/dto/campaign-audience.dto.ts) nema `ArrayMaxSize`, a role/include/exclude filteri su djelimično radili u memoriji. U `d2866b2`/`2105d8d` su uvedeni limiti za ID/tag/role nizove, server-side DB filteri i audience query `take: 101`; slanje odbija publiku veću od 100. Verified email i zasebni `optedIn=true` consent su obavezni bez obzira na `onlyEmailVerified` request flag.
- `d2866b2` je dodao `CampaignEmailConsent` (legacy default opt-out), transakcijski opt-in/opt-out audit i prijavljenom korisniku vezani `GET/PUT /api/notifications/campaigns/consent`. U tadašnjem stanju API je postojao bez UI-ja/email linka; consent nije povezan s opštim `NotificationPreference` i ne nasljeđuje njen default. UI i unsubscribe link su naknadno dodani u `729a415`/`86c173d`.
- `f48c74c`/`ac32bb7` uvode `CampaignJob`, per-recipient snapshot/state, idempotentni enqueue key, DB transakciju za job + primaoce, progress endpoint, cancellation, retry failed recipienta uz eksplicitnu at-least-once potvrdu i actor/request/time audit. Worker obrađuje jedan recipient po tick-u, koristi globalni DB lease i zadržava barem 1s sender interval; verified email i isti consent record/timestamp se ponovo provjeravaju pred delivery. Greške se spremaju sanitizovano, a istekli PROCESSING claim postaje FAILED umjesto automatskog resend-a.
- `be85ce8` CI `41917243860` je potvrdio backend queue/schema i disposable-Postgres testove s fake delivery sink-om, ali nije SMTP transport test. Raniji CI pokušaji našli su generated model type imports, Jest fake fixture/claim expectation i statički sanitizer import problem; ispravljeni su prije green run-a. Nijedna migracija nije primijenjena na korisničku bazu.
- Email template sanitizacija/placeholder escaping ima ciljane testove i CI evidence; kampanjski sanitizer se ne predlaže ponovo pisati bez novog konkretnog regresijskog nalaza.
- Trenutna implementacija: `381295e` dodaje BS/EN consent/queue copy; `729a415` consent UI, queue progress/status/cancel/retry UI i payload-fingerprint stabilan idempotency key; `233f31b` unsubscribe lokalizaciju; `86c173d` javnu eksplicitno potvrđenu unsubscribe stranicu, domain-separated HMAC token vezan za consent ID/timestamp, audit source `EMAIL_UNSUBSCRIBE` i worker re-check istog consent snapshot-a. `785699a`/`91f9f21` dodaju lokalni fake-SMTP test za poruku/link, privremeni SMTP failure i izgubljeni 250 ACK nakon primljenog DATA (ambiguous acceptance + manual retry). Green CI: `41925481179` za `91f9f21`, uključujući fake-SMTP tests; `41924143470` za UI/unsubscribe backend slice. Testovi koriste samo loopback fake SMTP; nema real SMTP/recipient slanja.

**Owner policy (approved 2026-11-03):** separate explicit marketing consent/unsubscribe, verified email only, max 100 recipients/campaign, 1 email/second and concurrency 1. These values are not open to implementation inference. `GENERAL.emailEnabled` is not a substitute for marketing consent.

**Preostala implementacija:** uvesti job + eligible recipient snapshot u jednoj DB transakciji; unique `(jobId,userId)` sprečava dupli recipient task. DB worker/outbox koristi claim/lease, jedan globalni sender i pacing 1/sec; recipient state bilježi pending/sending/sent/skipped/failed/cancelled, attempt/backoff i actor-audited retry gdje treba. SMTP ne smije držati HTTP zahtjev otvorenim; API vraća job ID/status, UI prikazuje queued/running/partial/failed/delivered i eksplicitan retry. Ne uvoditi Redis/BullMQ bez posebnog odobrenja. Fake SMTP isključivo u testovima; ne slati pravi email iz CI ili bez izričitog runtime odobrenja.

### OPS-R2 — Cron `waitForCompletion` nije distribuirani lock; sent-markeri su poslije external side-effecta

Repozitorijski source inventory nalazi pet aktivnih `@Cron` entrypointa:

1. [`ReservationDelayCron.tick`](../../backend/src/reservations/reservation-delay.cron.ts#L20-L36) svake minute poziva reservation maintenance i reminder queue producers.
2. [`ReservationOutboxService.retryPending`](../../backend/src/reservations/reservation-outbox.service.ts#L326-L365) skenira bounded batch, oporavlja istekle leaseove i claimuje podržane reservation/reminder evente.
3. [`DailyLogCompletionOutboxService.retryPending`](../../backend/src/daily-log/daily-log-completion-outbox.service.ts#L166-L203) svake minute skenira batch od 25 i koristi DB claim/lease recovery.
4. [`IncomeCronService.handleIncomeBookCatchUp`](../../backend/src/finance/income-cron.service.ts#L17-L27) dnevno radi KIF catch-up.
5. [`IncomeCronService.handleExpenseBookRollover`](../../backend/src/finance/income-cron.service.ts#L29-L55) mjesečno osigurava KUF knjigu.

`waitForCompletion` sprečava overlap samo unutar istog Nest scheduler procesa; drugi backend replica i dalje može pokrenuti isti Cron. Tri reminder producera sada koriste DB dedupe/CAS i durable outbox, a oba outbox workera claimuju preko baze. KIF/KUF rollover i ostali reservation maintenance poslovi zahtijevaju zasebnu duplicate-safety provjeru.

**Source detalji i razlika po jobu:**

- Delay reminder producer [`ReservationDelayReminderService.processReservationDelayReminders`](../../backend/src/reservations/reservation-delay-reminder.service.ts#L30-L106) snapshotuje primaoce/sadržaj i u jednoj DB transakciji claimuje `delayNotifiedAt` te kreira per-recipient outbox evente ([claim/queue](../../backend/src/reservations/reservation-delay-reminder.service.ts#L125-L147)). Isporuka je nakon transakcije; push ostaje at-least-once.
- Appointment reminder producer kreira jedinstven event po rezervaciji i rasporedu; worker ponovo provjerava status, datum/vrijeme i reminder window te stale event označi obrađenim bez slanja ([queue](../../backend/src/reservations/reservation-appointment-reminder.service.ts#L32-L83), [delivery](../../backend/src/reservations/reservation-appointment-reminder.service.ts#L85-L167)).
- Pending daily-log reminder producer deduplicira event po entryju; worker ponovo provjerava PENDING/deleted/reservation state i cutoff te stale event obrađuje bez slanja ([queue](../../backend/src/reservations/reservation-direct-daily-log-cron.service.ts#L79-L126), [delivery](../../backend/src/reservations/reservation-direct-daily-log-cron.service.ts#L127-L188)).
- Direct-booking SERVICE daily-log seed zadržava postojeću djelimičnu unique zaštitu i conditional seed; taj duplicate-row problem se ne rješava ponovo ovdje.
- Inbox timeouts/expired lock/attendance/reschedule putanje imaju conditional `updateMany`/status checks; to samo po sebi ne daje exactly-once notification delivery.
- Daily-log completion outbox claimuje `PENDING -> PROCESSING`, otključava istekle leaseove i uzima `take=25`; eksterni receipt/push/socket je at-least-once.

**Faza 3 worker gap zatvoren u source/CI:** [`ReservationOutboxService.retryPending`](../../backend/src/reservations/reservation-outbox.service.ts#L326-L365) sada daje lease recovery, backoff, bounded retries i DEAD_LETTER za podržane evente; HTTP `dispatchAfterCommit` i Cron worker se međusobno isključuju DB CAS claimom. `NotificationsService.send` koristi source-event notification upsert, ali nakon provider acceptance i marker-write failure push/email se može ponoviti. Zato provider kanali i dalje imaju at-least-once semantiku, ne exactly-once.

**Predložena implementacija:** prvo definirati failure semantics po eventu; zatim DB lease/CAS claim + scheduled bounded worker, stale PROCESSING lease recovery, exponential backoff/max attempts/DLQ/operativni pregled. Za push/email koristiti zaseban per-recipient/per-channel delivery status/idempotency where provider supports it; ne obećavati exactly-once za SMTP/FCM. Za websocket invalidation dovoljna je retryable best-effort invalidacija ako HTTP refetch ostane source-of-truth. Dodati failure-injection tests za crash između send i delivered, dva paralelna worker-a, lease expiry i replay.

**Deployment gate:** vlasnik potvrđuje broj backend replica/worker instanci, schedules/timezone, log/alert ownership i recovery runbook. Nije potvrđeno je li produkcija jedna ili više instanci; ne pretpostavljati.

## 5. SEC / AUTH detaljna preostala acceptance lista

### SEC-06 — Socket.IO

Izvor sada: optional token dozvoljava anonymous/public socket; prisutni token se validira prema database user state/current roles/stylist eligibility, JWT exp se prati, poznate account/role/profile mutation putanje disconnectaju user sockets; globalni `emitToAll` i `public` room prolaze kroz event/payload allowlistu. Pregledani backend ne sadrži `@SubscribeMessage` client event handler-e, a `emitToRoom` nema trenutnih produkcijskih callsite-ova; interni `emitToAdmins`/`emitToStylists` prenose reservation projections, pa se njihovi callsites nastavljaju tretirati kao privilegovani server kod.

**Preostalo:** Redis adapter je obavezan u multi-instance modu; source gate rejects connection kad adapter nije ready i lokalno disconnecta socket sesije kad readiness padne. Mock/ephemeral in-process CI ne dokazuje Redis Pub/Sub, dva odvojena backend procesa, TLS/CA/ACL permissions, room membership propagation ili cross-instance disconnect pri role revoke/JWT expiry.

**Acceptance sequence:** disposable/staging Redis sa zasebnim least-privilege app userom i jedinstvenim channel prefixom; dvije Nest instance; connect anonymous/user/admin/stylist; current-role refresh; revoke/deactivate/password change iz drugog procesa; Redis disconnect/reconnect; provjeriti da client ne primi globalne/private payload-e i da reconnect ostaje fail-closed. Nikad ne zapisivati stvarni URL/password/log secret. Vlasnik je prijavio Redis ACL/login problem riješenim; agent nije radio live test.

### AUTH-01 — HTTP limiter

Auth login/register/verification/reset politike su source fail-closed na Redis brojač i vraćaju generički 503/Retry-After; public-read rate policies fail-open su vlasnički odabrana/sačuvana politika. HTTP limiter Redis endpoint/prefix odvojeni su od Socket.IO identiteta/namespace-a. AUTH-01 source tests ne uspostavljaju realni Redis ACL/TLS/DNS readiness niti outage test.

**Operativno:** vlasnik potvrđuje dedicated `HTTP_RATE_LIMIT_REDIS_URL` readiness nakon redeploy-a, sigurnu login funkciju i planned outage 503 u non-production-u. Agent ne traži stvarne env vrijednosti. Rate-limit disconnect/failover/cluster behavior ostaje real-service test.

### AUTH-02 — initial password reset links

Source ima admin/owner-only pojedinačni issuance, `mustChangePassword=true`, verified email gate, 32-byte random URL token, DB HMAC/hash-only storage, 7-day expiry, compare-and-set issuance/consumption, session invalidation i user session disconnect. Unverified emails se preskaču; flow ne radi reset ostalim nalozima. `backend/prisma/migrations/20261102170000_auth02_password_reset_links/migration.sql` je additive nullable columns + unique token-hash index.

**Preostalo:** handoff navodi da migration nije primijenjena na korisničku bazu; status nije nezavisno provjeren. Nakon user-side merge owner/DBA ručno primjenjuje migration; admin pojedinačno izdaje link samo kandidatu sa verificiranim emailom, uz potvrđen SMTP i HTTPS `APP_PUBLIC_URL`. Ako SMTP send padne nakon DB token update-a, admin ponovo izdaje link kad mail transport radi. Bez odobrenja/config-a ne šaljati stvarni email i ne pokretati migration.

**Acceptance:** migration status owner report; synthetic/staging tested token-link, email host/url, expiration/replay, forced-change clear, invalidation of previous sessions; account allowlist verified without resetting unrelated users.

### SEC-05 / AUTH-03 / SEC-04 / SEC-08 boundaries

- **SEC-05:** startup validira JWT secret ≥32 UTF-8 bytes i settings key kao kanonski Base64 tačno 32 bytes. Vlasnik je prijavio varijable prisutne; agent ne smije tražiti/čitati vrijednosti. Nema rotacije u ovoj fazi; encryption-key promjena traži zaseban decrypt/re-encrypt/backup/rollback plan.
- **AUTH-03:** exact CORS origin allowlist i security-header middleware su u source-u; vlasnik je prijavio dozvoljene origins. Nema browser preflight/proxy/deployed-edge potvrde. CORS nije auth/CSRF i `Origin` može nedostajati native clientu.
- **SEC-04/PRIV-01:** vlasnik prijavljuje da su legacy fajlovi ručno preseljeni; agent nije provjerio volume/DB paths. Backup/restore/rollback rehearsal, retention, actual UID/permissions/capacity/hard-link and direct static-root isolation ostaju cutover gates. Ne pokretati runner ni produkcijski DB/volume rad.
- **SEC-08:** vlasnik je prijavio završenim, uključujući redeploy/email/browser testove, i agent to bilježi kao owner-reported complete. Ne reopen-ovati samo zato što nema nezavisnog dokaza; ne tvrditi agentom provjereno.

## 6. UX / UI / A11Y / I18N — šta je dokazano i šta još fali

### I18N

- Trenutni `python scripts/check_i18n.py --strict` rezultat: 2,340 BS i 2,340 EN leaf keys, bez missing/extra. To je web key parity, ne skeniranje svih UI stringova ni browser acceptance.
- Frontend sadrži velik broj namjenskih Node source-contract/key-reference tests i CI koraka; oni ciljano čuvaju odabrane flow-ove, ne sve rute/komponente.
- Mobile i18n guard trenutačno ima 19 eksplicitnih source fajlova; repo inventory ima 56 non-test fajlova u `mobile/src/screens` i 51 non-test TS/TSX fajl u `mobile/app`. Guard je namjerno inkrementalan, ne globalna pokrivenost. `mobile/src/i18n/bs.ts` je jedini mobilni jezik; da li se mobile treba prevesti na EN je vlasnička odluka.
- Potrebno je route/screen inventory za web i mobile: hard-coded tekst i API error fallback, i18n key usage, plural/date/number, dynamic user/content vs static UI copy, text expansion/diacritics, language persistence/reload i `html lang`. Media-consent policy body ostaje backend legal copy; prije EN prijevoda treba owner-approved tekst/version, ne samostalno prevođenje.
- Historical implementation summaries sadrže ranije counts; ovaj dokument koristi aktuelni script output. `IMPLEMENTATION_PLAN.md` / `MOBILE_COMPLETE_AUDIT.md` treba kasnije uskladiti odvojeno, bez prepisivanja historijskih CI evidencija.

### A11Y / UI

- `python scripts/check_ui_contrast.py --strict`: 44/44 odabranih source token pairs prolaze. Skripta eksplicitno nije rendered-page audit.
- Zajednički mobilni `DateTimeField`, `Input`, `Button` imaju source-level accessibility props tests; vlasnik je prijavio Android fizičke testove za prijavu, profil, stilist, dnevnik i kompletan rezervacijski tok. Ovaj owner report je ograničen tim flow-ovima/uređajima; agent nije nezavisno testirao accessibility tree.
- U pretraženim frontend/mobile dependency i CI manifests nema `axe-core` ni Playwright. Zato nema browser computed style, full keyboard, axe, focus-order, hover/disabled state, zoom/reflow ili VoiceOver/TalkBack uređaj acceptance. Izvorni props test ne dokazuje da se poruka čitača ekrana čuje u ispravnom redoslijedu.
- Nedostaje globalni audit svakog route-a u dark/light, loading/empty/error/success/disabled/focus modal/drawer, responsive widths, 200% font scaling, contrast on images/gradients, keyboard/touch target, semantic headings/labels/table status and announcements.

**Predloženi UX audit instrument:** početni source-derived web/mobile route i shared-component spisak je u [`UX_UI_ROUTE_INVENTORY.md`](UX_UI_ROUTE_INVENTORY.md); on nije per-route audit ni acceptance. Za svaki route zabilježiti persona/role, initial/loading/empty/error/stale/success states, keyboard/touch route, labels/hints/errors, focus management, locale behavior, responsive breakpoints, source test and manual owner result. Ne mijenjati boje ili layout globalno na osnovu samo 44 para.

## 7. Owner decisions / release gates

| ID | Odluka ili dokaz | Zašto blokira kod/closure | Vlasnik |
|---|---|---|---|
| D-01 | Da li daily-log/manual-income picker smije prikazivati samo CLIENT role? | Određuje API filter i backend `clientId` enforcement. | Product/data owner |
| D-02 | Campaign email consent: koristiti postojeći `GENERAL.emailEnabled` kao unsubscribe ili odvojiti marketing opt-in/unsubscribe? | Utiče na recipient eligibility, model, migration, UI i email footer. | Product/privacy owner |
| D-03 | Default kampanje samo verified email? Maksimalan broj primatelja i per-domain rate? | Kontroliše slučajno slanje i operativno opterećenje. | Email owner |
| D-04 | Deployment broj backend replica i koji proces je scheduler/worker? | Određuje treba li DB lease, dedicated worker i multi-instance acceptance. | Deploy owner |
| D-05 | Koji users/reservation listovi moraju zadržati legacy array shape i bez page? | Sprečava tihe frontend regressions pri pagination rollout-u. | API/UI owner |
| D-06 | Treba li mobile EN locale ili ostaje Bosnian-only? | određuje obim i18n resource/runtime/acceptance rada. | Product owner |
| D-07 | Odobreni EN media-consent legal text i policy version? | Legal/data text se ne prevodi automatski. | Privacy/legal owner |
| G-01 | AUTH-02 migration deploy status i pojedinačno slanje eligible reset linkova. | Source CI koristi disposable DB; produkcijska schema/mail neprovjereni. | Owner/DBA |
| G-02 | HTTP Redis rate-limiter ready + outage behavior; Socket.IO Redis cross-instance test. | Vlasnička popravka prijavljena, live test nije urađen. | Deploy owner |
| G-03 | SEC-04 volume/path/permissions + verified backup/restore/rollback. | Fizičko preseljenje prijavljeno, neprovjereno od agenta. | Owner/infra |
| G-04 | Browser rendered/a11y route audit i owner fizički test pre production builda. | Source/CI i ograničeni fizički report nisu cijeli app. | Owner + QA |

## 8. Fazni plan implementacije

Faze su zavisne; ne treba preskakati policy gate. Svaki source slice treba zasebno ciljano testirati, commit/pushati na ovu granu i pregledati CI prije sljedećeg slice-a. User sam radi merge; ne otvarati PR niti merge-ati bez novog zahtjeva. Database migrations nikad ne primjenjuje agent na user DB; ako source slice doda migration, obavijestiti ownera za ručni deploy. KUF reconciliation i i18n ostaju zasebni targeted commits.

### Faza 0 — Odluke i ugovor (bez source izmjene)

**Rad / izlaz (owner odgovori zabilježeni 2026-11-03):** endpoint/consumer map nalazi se u [PHASE_0_DECISION_AND_CONSUMER_MAP.md](PHASE_0_DECISION_AND_CONSUMER_MAP.md), uključujući 13 direktnih reservations-list consumer-a. D-01 CLIENT-only za daily-log/manual finance, D-02 odvojeni explicit marketing opt-in/unsubscribe, D-03 verified-only + max 100/campaign + 1 email/s + concurrency 1, D-04 jedna backend replika (owner report), D-05 migracija svih poznatih consumer-a uz legacy array najduže jedan release ciklus poslije migracije i D-06 mobile BS-only su zabilježeni. D-07 legal/media-consent tekst i policy version nisu odobreni; tekst ne prevoditi/mijenjati, ali to ne blokira nepovezani API-R1.

**Done when:** policy-sensitive acceptance criteria su odobreni ili izričito gated; no assumed consent/role policy. Faza 1 API-R1 je policy-unblocked prema D-01, uz D-04 deployment acceptance i D-07 legal copy i dalje odvojeno otvorene/gated stavke.

### Faza 1 — API-R1 finance client search + server-side role validation

**Status — source implementacija završena na ovoj grani; CI `41736972799` green (4/4 jobs, 2026-11-03):** finance lookup koristi postojeći bounded `GET /api/users/clients` ugovor sa `q`, `page=0`, `pageSize=20` i parsira samo `{items}`; više ne poziva generic `/api/users` niti šalje nevažeće `search/role/limit` parametre. Ručni income create i update provjeravaju finalni non-null `clientId` unutar iste Prisma transakcije: mora imati CLIENT i ne smije imati SYSTEM_ADMIN/STYLIST/OWNER role. U suprotnom vraća generički Bad Request prije insert/update/debt sync. Nevalidni/role-promijenjeni ID se ne prepisuje; postojeća istorija nije migrirana. Nije dodana schema/migration izmjena.

**Acceptance evidence:** backend service tests pokrivaju create/update reject i precizan role predicate; DB-backed HTTP test kreira entry za čist CLIENT (201), odbija CLIENT+STYLIST nalog (400) i potvrđuje da odbijeni entry nije upisan. Frontend source contract test i production TypeScript/build prolaze u CI; DB suite se izvršava isključivo na disposable CI PostgreSQL-u.

**Preostalo izvan Faze 1:** dashboard još koristi nepaginated `/api/users`; web/mobile daily-log i svi `/api/reservations` list consumer-i su Faza 2. Ova Faza 1 ne mijenja `GET /api/users/for-daily-log`, response contracts drugih ruta, legacy role/account data ili production DB. Finance UX loading/error copy nije mijenjan; nema i18n/resource promjena.

### Faza 2 — API-R2/R3/R4 bounded lists i validirani pagination

**Rad:**
1. Ukloniti `/api/users` iz finance lookup-a; dashboardu izložiti bounded aggregate counts umjesto full directory download-a. **Završeno:** finance lookup je prebačen u Fazi 1; dashboard koristi `GET /api/users/dashboard-count` u `fc45b97` (CI `41779416929`, sva 4 posla green).
2. CLIENT-only daily-log pickers prebaciti na shared bounded client endpoint (ili dodati novu paginarnu rutu s kompatibilnim rollout-om). **Završeno u `b7af9e6`:** `/api/users/for-daily-log` sada traži aktivan CLIENT bez staff/owner rola, podržava server-side case-insensitive `q`, validirani page/pageSize do 50 i zasebni bounded lookup za trenutno izabrani client u edit formi; bez pagination parametara vraća legacy array sa `take: 50`. Web dnevni log, mobile dnevni log i stylist-workbook koriste paginated search/lookup. DB-backed HTTP i service tests pokrivaju CLIENT-only/active filter, minimalni fields, page envelope, legacy cap, partial/oversized query i lookup. CI `41782344067` prošao je sva 4 posla. Nema stvarne DB/runtime/deployment provjere.
3. Za `/api/users`, `system-admins`, `stylists` definisati pagination defaults/maxima ili eksplicitnu capped compatibility response; validirati `page`, `pageSize` i partial-param behavior. **Završeno u `ee3f835`:** paginated callers šalju oba parametra (`page` 0–1000, `pageSize` 1–50) i dobijaju `{items,total,page,pageSize}`; djelimični/invalid parametri se odbijaju. Bez parametara ostaje legacy array, ali sa `take: 50` tokom dogovorene compatibility window. `Users.tsx` sistemskih administratora i stilista čita kroz bounded stranice (postojeći client-side maksimum 1,050 redova). DB-backed HTTP i service testovi pokrivaju envelope, capped legacy shape i partial/invalid query; CI `41780354779` prošao je sva 4 posla.
4. Za `/api/reservations` odrediti page/default/date windows prema consumers; DTO max/safe offset; ažurirati frontend/mobile parser-e i stale/empty/retry UX. **Backend validation slice `10a0b8d`:** DTO odbija `pageSize > 50` i page izvan 0–1000; paginated request traži oba parametra i servis odbija computed `skip > 1000`, uz stabilni `id` tie-break. Unit/DB-backed HTTP tests pokrivaju pair, max pageSize, max offset i scoped page response; CI `41783543047` green. **Consumer slice `bc03e85`:** admin calendar zadržava vidljivi date range, fetch-a bounded stranice (`pageSize=50`, max offset 1000), validira envelope i prikazuje stale-data/error toast + retry bez brisanja postojećih rezultata; contract test je uključen u frontend build lifecycle. CI `41790691429` green. **Consumer slice `93d6252`:** stylist portal inbox/schedule/stats/detail dijele isti bounded page helper; postojeći React Query error/stale-data/refetch UI ostaje, a preko 1.050 rezultata greška se vraća umjesto nepotpune liste. Contract testovi prošireni; CI `41791933994` green. **Consumer slice `e3bb420`:** mobile stylist schedule bounded-fetch-a svoj 30-dnevni date window (`pageSize=50`, max offset 1000), zadržava payload validation i postojeći stale-data/retry UI; test je proširen u postojećem CI step-u. CI `41793186288` green. **Consumer slice `39fb164`:** mobile stylist stats paginira reservations u tekućem kalendarskom mjesecu preko istog helpera; independent error/stale/retry semantics ostaju, uz test u postojećem CI step-u. CI `41794286518` green. **Consumer slice `7c110cf`:** mobile stylist inbox paginira `asStylist` listu kroz isti helper bez promjene identity guards, normalization ili stale-data/retry behavior; postojeći `private-read-recovery` test proširen, CI `41795517944` green. **Consumer slice `586efe3`:** mobile start-order detail check paginira jedan-datum stylist query i ostaje fail-closed za malformed/read error, uz retry; test u postojećem CI step-u, CI `41796708701` green. **Consumer slice `115dd6a`:** mobile My Reservations koristi bounded client pages uz identity guards, payload normalization i postojeći stale-data/error/retry UI; `private-read-recovery` contract proširen, CI `41798030621` green. **Consumer slice `def2259`:** mobile Services personalizirani reservation read koristi shared bounded helper uz odvojeni retry/error state; `services-optional-read-recovery` contract i CI `41799366668` prolaze. **Consumer slice `5f432ef`:** mobile Home upcoming reservation read koristi isti helper uz status/date filtering, generation guard i postojeći retry; `home-read-recovery` contract i CI `41799899480` prolaze. **Consumer slice `e630315`:** web client My Reservations paginira kroz shared bounded helper, uz nepromijenjen partitioning, loading i action flow; contract test i CI `41801197214` green. **Consumer slice `92ac58c`:** dashboard mjesečne/pending countove dobija agregatno, a recent list je server-side ograničen na 8; controller/service/e2e + frontend contract tests su prošli CI `41802917486`. **Migracija consumera završena:** 13/13 mapiranih grupa bounded. **D-05 rollout status (2026-11-04):** vlasnik prijavljuje da je redeploy uredno prošao; compatibility window je označen kao započet prema owner reportu, bez nezavisne agent provjere. Legacy array i dalje nema server-side cap; uklanjanje ostaje gated do završetka jednog uspješnog release ciklusa.

**Consumer migration gate — MET (13/13):** inventory je migriran, source/HTTP contracts pokrivaju bounded shape i role scope, dashboard koristi aggregate counts + `take: 8`, a CI `41802917486` je green. **D-05 rollout gate — IN PROGRESS (owner-reported):** vlasnik 2026-11-04 prijavio je uspješan redeploy nakon consumer migracija; agent nije nezavisno provjerio runtime/release. Sačekati jedan puni uspješan release ciklus uz legacy array fallback; tek nakon toga ukloniti queryless legacy response/add final server-side cap. Ne raditi broad query rewrite preko svih 141 `findMany`; klasifikovati svaki po route/expected cardinality.

### Faza 3 — OPS-R2 Reservation outbox durable recovery

**Rad:** dodati bounded poller/worker za `reservation.created` događaje, lease timeout recovery, retry/backoff/max attempts/terminal status, metrics/admin diagnosis. Aparteksi event type/recipient/channel idempotency; duplicate-side-effect design mora razlikovati notification DB upsert od push/email provider side-effecta. Zadržati booking transaction only DB; external I/O poslije commit-a.

**Initial recovery slice `3935b00` (CI `41808937161` green):** minute cron sequentially retries up to 25 due `reservation.created` events; PROCESSING leases older than 5 minutes are recovered, attempts use exponential backoff capped at one hour, and 10 failed attempts move an event to `DEAD_LETTER`. Existing DB status string supports this without schema migration. Unit tests cover successful delivery, sanitized error classification, retry timing, terminal transition, bounded scan, stale-lease recovery, and no-overlap cron metadata. The immediate post-commit attempt remains; provider push/email delivery is at-least-once across crash windows, not exactly-once.

**Concurrent claim acceptance `ff5c298` (CI `41811272636` green):** a disposable-PostgreSQL E2E test creates one due outbox event and calls `dispatchAfterCommit` concurrently through two independent service instances. It asserts one query/notification side-effect path, one call per event emitter, and a single `DELIVERED` row with one attempt. This verifies the database claim race for this path; it does not establish exactly-once behavior for external provider delivery or cover crash injection.

**Admin diagnostics API `470be93` (CI `41812539924` green):** `GET /api/reservations/ops/outbox` is restricted to `SYSTEM_ADMIN`/`OWNER` and returns per-status counts, due-pending/stale-lease counts, and at most 50 recent nonterminal/dead-letter rows. It omits payload and aggregate IDs and redacts unrecognized stored error text.

**Dashboard diagnostics UI `16387be` (CI `41815032214` green):** the admin dashboard now shows a localized Bosnian/English outbox panel for `SYSTEM_ADMIN`/`OWNER`, with state counts, due/stale counts, up to 10 recent rows, a manual refresh control, and the at-least-once delivery warning. It displays the backend's redacted error summary and has no replay/mutation action.

**Delivery-marker failure regression `1c4e517` (CI `41816122326` green):** a unit test simulates successful notification/socket side effects followed by failure to persist `DELIVERED`, and asserts the event returns to `PENDING`. This codifies the external side-effect duplicate window and does not simulate a real database crash or provider acceptance.

**PostgreSQL retry persistence acceptance `abd91b8` (CI `41817843468` green):** on disposable PostgreSQL, the test claims a due event, substitutes a failing fake notification provider, then verifies the actual row is requeued as `PENDING` with one attempt, future backoff time, cleared lease, and sanitized error text. The reservation lookup and transport are controlled test doubles; real external delivery is not exercised.

**Audited replay API `cfa1072` (CI `41819570276` green):** `POST /api/reservations/ops/outbox/:id/replay` requires `SYSTEM_ADMIN`/`OWNER` and `confirmAtLeastOnce: true`. A transaction compare-and-sets only `DEAD_LETTER -> PENDING` and appends requester ID, timestamp, event ID, and attempts-at-request to a separate audit table. Attempts are not reset; the normal bounded worker performs delivery later, outside the request. Disposable-PostgreSQL E2E covers unauthenticated/client denial, missing acknowledgment, concurrent duplicate requests (exactly one queues), and durable audit record.

**Dashboard replay control `0dbc930` (CI `41820727651` green):** dead-letter rows now expose a replay action in the admin dashboard. It requires checking an explicit at-least-once/duplicate-delivery acknowledgment, explains that attempt count is preserved, and queues the action through the audited API. The UI has no direct delivery call.

**Delivered-marker database fault injection `cdd493d` (CI `41822132643` green):** a disposable-PostgreSQL E2E test installs a narrowly filtered trigger that rejects only the `DELIVERED` update for the synthetic outbox row. The fake notification/socket effects run first; the actual DB then verifies the worker requeues to `PENDING`, clears the lease, applies backoff, and stores only a sanitized error category. This exercises the post-side-effect marker-write failure boundary, not a hard process kill or real provider.

**Lease recovery PostgreSQL acceptance `362c6a3` (CI `41831617790` green):** one disposable-PostgreSQL E2E exercises `retryPending()` against two stale `PROCESSING` rows: below the attempt limit, the worker clears the expired lease, makes it due, claims it and delivers it with an incremented attempt; at the limit, it persists `DEAD_LETTER` and does not call the fake provider. This verifies persisted recovery state, not real cron timing or multi-replica scheduling.

**At-least-once redelivery acceptance `7d53526` (CI `41833084306` green):** the PostgreSQL delivered-marker trigger now fails only for attempt 1. The test observes the persisted retryable row, advances its due time in the disposable database, then runs the normal poller and asserts a second fake push/socket effect with final `DELIVERED`, `attempts: 2`. This makes the duplicate side-effect window explicit; it neither promises exactly-once external delivery nor uses a real provider.

**Final provider-attempt PostgreSQL acceptance `3ca2afb` (CI `41836191875` green):** an event starting at nine attempts fails through a fake provider on its tenth claim. PostgreSQL confirms terminal `DEAD_LETTER`, attempt 10, released lease, future retry timestamp, and sanitized error; no real provider is used.

**Deployment evidence (owner-reported, 2026-11-04):** `prisma migrate deploy` applied `20261104120000_reservation_outbox_replay_audit`, and `docker inspect` showed the backend's internal `/health/ready` Docker healthcheck as `healthy`. The supplied public-domain `curl /health/ready` returned the frontend SPA HTML, so it does not verify API-domain routing/readiness. **Still open:** read-only outbox diagnostics and a controlled worker delivery smoke; API-domain probe; replica/scheduler topology; alert ownership and recovery runbook. No live replay or production reservation was initiated by the agent. [Operator runbook draft](RESERVATION-OUTBOX-RUNBOOK.md) records safe readiness, diagnostics, triage and audited replay steps; deployment-specific owners/thresholds remain unconfirmed.

**Done when:** concurrent two-worker claim yields one active worker; expired PROCESSING leases recover; failure at each boundary persists retryable result; duplicate delivery behavior documented at-least-once; dead-letter/alerting and manual replay tested on disposable PostgreSQL/fake transport; no effect on reservation create idempotency.

### Faza 4 — OPS-R2 process-local cron work and marker idempotency

**Rad:** reservation delay, appointment reminder and pending daily-log reminder become atomic DB claims/outbox events before external send; scheduled trigger is singleton/DB-lease or duplicate-safe. Keep direct seed unique index and existing conditional FSM updates. KIF/KUF rollover separately prove DB idempotency; avoid making financial period state dependent on Redis.

**Owner-approved delivery decisions (2026-11-04):** appointment and pending-daily-log reminders must revalidate eligibility at delivery and be suppressed as handled when stale; delay-warning recipients are snapshotted when the threshold is crossed and retries target that same set; DEAD_LETTER reminder events may use audited admin replay with explicit at-least-once confirmation and persistent actor/time/event audit. These decisions preserve at-least-once push/email semantics and do not promise exactly-once provider delivery.

**Source/CI progress (2026-11-04):** appointment reminder queue, stale-state revalidation, event diagnostics/replay support and PostgreSQL concurrent-scan test are in `e9ceaa1` (CI `41847075134`); pending daily-log event, stale-state revalidation and PostgreSQL concurrent-scan test are in `1bfaaa9` (CI `41848313681`); delay-warning snapshot plus transactional marker CAS/event insert and concurrent scheduler acceptance are in `2d5c382` (CI `41849787391`). Appointment marker-write fault injection proves retry may invoke the fake external delivery a second time (`7aa2e57`, CI `41850639379`); daily-log marker-write failure/retry is covered by `100b152` (CI `41873750842`); delay-warning delivered-marker failure/retry and event-specific replay/audit acceptance for daily-log and delay-warning are covered by `88126b9` (CI `41879247263`); outbox insert fault injection verifies the delay claim rolls back and can be retried in `5a50ff9` (CI `41888055346`); pending daily-log queue insert failure leaves the reminder eligible for the next cron pass in `d144e97` (CI `41899966278`); appointment outbox insert failure likewise leaves the marker unset and allows a later scan to queue in `f117440` (CI `41902502302`). The owner selected salon wall-clock semantics for `system_notif_reminder_hours`; appointment queueing and delivery revalidation now use that policy. Europe/Sarajevo 2026 spring-forward/fall-back tests assert a 24-local-hour lead can span 23/25 elapsed hours (`8dbbde7`, CI `41879247263`). The owner separately selected elapsed real minutes for delay-warning threshold crossing; the producer resolves scheduled end time in the salon timezone and compares actual elapsed duration against `floor(pauseBetweenServices / 2)`. Spring-forward and fall-back tests cover the former early-trigger and late-trigger errors (`6190f10`, CI `41883921623`). Pending daily-log reminder age remains elapsed duration from `createdAt`; producer and delivery cutoff boundaries across both Sarajevo DST transitions are covered by `1e28235` (CI `41885627622`). `8dbbde7` first failed because two older E2E date-service doubles lacked the new method; fixed in `797dc4b` (CI `41877006985` green). All latest source/CI acceptance is green. These are source/disposable-PostgreSQL CI results, not real provider or staging evidence. **Owner-reported topology (2026-11-04):** one backend instance runs the reminder cron and outbox worker in the same process. This report is not independently verified against the deployed revision or staging.

**Still open:** confirm that the reported topology matches the deployed/staging revision and complete the controlled staging delivery smoke; Phase 3 API readiness/outbox snapshot/smoke gate is also still open.

**Done when:** two concurrent scheduler instances process each reminder candidate once at DB-claim level; external channels are documented at-least-once; crash injection tests prove no silent lost notification or infinite duplicate; timezone boundary tests use Europe/Sarajevo; owner confirms runtime replica topology and supplies sanitized staging evidence.

### Faza 5 — OPS-R1 campaign consent and queue

**Precondition:** D-02/D-03 approved (zaseban eksplicitni marketing opt-in/unsubscribe; samo verified email; najviše 100 primalaca; 1 email/sekundu i concurrency 1).

**Status — OPS-R1 implementacija završena; rollout ostaje owner-operated:** `d2866b2` dodaje consent modele/migraciju, self-service API, transakcijski audit, verified+consented DB eligibility, bounded preview (101 sentinel), send cap 100 i DTO niz limits; `2105d8d` popravlja kombinovani include/exclude filter. `f48c74c`/`ac32bb7` dodaju trajni `CampaignJob` i per-recipient consent/email snapshot, DB transactional enqueue, idempotency key, global-lock worker, delivery eligibility re-check, 1 email/second pacing, cancellation, progress endpoint i manually retriable FAILED recipients. Retry traži `confirmAtLeastOnce=true` i bilježi actor/request/time/count; expired delivery lease prelazi u FAILED da ne bi bilo tihog automatskog resend-a. `381295e`/`729a415` dodaju BS/EN copy, odvojeni consent UI, stabilan request fingerprint/idempotency key, progress/status/cancel/retry UI i bounded audience feedback. `233f31b`/`86c173d` dodaju public unsubscribe confirmation page, HMAC token za consent snapshot i auditable opt-out; worker ne isporučuje stale consent snapshot nakon withdrawal/re-opt-in. `785699a`/`91f9f21` fake-SMTP testiraju signed unsubscribe link, temporary failure/retry i ambiguous acceptance nakon izgubljenog SMTP acknowledgement-a. CI `41925481179` green za cijeli repo, uključujući Prisma schema/migracije na disposable CI PostgreSQL, Jest, frontend/mobile i loopback fake-SMTP testove. Nema real SMTP/recipient slanja. Kampanjska migracija NIJE primijenjena na korisničku bazu.

**Owner-reported operativni update (2026-11-05):** vlasnik prijavljuje da SMTP radi, marketing notifikacije i kampanje rade, redeploy je prošao i migracije su prošle. Ovo je owner report, ne nezavisna agent provjera deployed verzije, baze ili stvarne dostave; agent nije pregledao produkcijsku bazu niti slao email. Raniji status „migracija nije primijenjena” ostaje historijski tačan za vrijeme tog pregleda, ali je zamijenjen novijim owner-reported statusom. Ne uvoditi novu queue infrastrukturu bez odluke.

**Done when:** opt-out ne može biti zaobiđen ni nakon enqueue-a; preview i snapshot su bounded/reproducibilni; max/rate/concurrency caps enforce-ani server-side; cancellation/retry semantika i ambiguous SMTP outcome su jasne; fake SMTP/DB tests pokrivaju crash windows i sanitizer; UI prikazuje progress/djelimičan ishod i consent stanje; nijedan real recipient nije korišten.

### Faza 6 — SEC/AUTH operational acceptance (owner-operated, not agent DB work)

**Radni redoslijed:**
1. Owner checks AUTH-02 migration status; applies it manually after merge; verifies public HTTPS app URL and SMTP readiness; resets only individually identified eligible verified-email accounts as authorized.
2. Owner verifies HTTP limiter Redis readiness/outage 503 in non-production; no reuse of Socket.IO identity/ACL by assumption.
3. Owner/QA does two-instance Redis Socket.IO staging exercise (connect/revoke/disconnect/reconnect and privacy payloads), exact allowed browser origins/preflight and edge headers.
4. Owner/infra records SEC-04 file path mapping, static-root exclusion, UID/permission/capacity, backup restore and rollback evidence. No assistant operation on production data/volume.
5. SEC-05 keys are never read/requested/rotated as part of this phase; key rotation is separate owner-controlled re-encryption project. SEC-08 remains owner-reported complete unless owner supplies a new specific failure.

**Done when:** operator supplies sanitized status/result records (no secrets), deployment version and timestamp; report labels owner-reported vs agent/CI evidence accurately.

### Faza 7 — UX/UI/A11Y/I18N complete route inventory and remediation

**First pass:** source route/component enumeration is started in [`UX_UI_ROUTE_INVENTORY.md`](UX_UI_ROUTE_INVENTORY.md) for all declared web/mobile route families and shared mobile controls. Still enumerate/record route-specific states, copy source/API fallback, labels/roles/hints/errors, keyboard order/focus, contrast, font scaling/reflow, dark/light and dynamic data. Expand the mobile guard along with each screen slice; decide mobile EN. Do not claim full repo localization from web key parity.

**Web:** finance manual-income source pass fixed the selected-client label association in `manual-entry-dialog.tsx` with a two-test source contract; this does not verify browser/focus/search behavior. Reservation-list pass now distinguishes request failure from valid empty results, adds localized/announced retry/loading states, ignores stale/out-of-order requests, and names the desktop table with a caption and scoped headers, covered by source-contract tests; browser rendering and actual announcements remain open. Public reservation booking controls now associate the service, notes, and loyalty inputs with labels, expose the current booking progress step, group date/time choices with legends, label calendar navigation, and expose full date/selected-state semantics; focused source-contract tests are registered. The latest reservation slice distinguishes service/date/slot fetch failures from valid empty results, offers localized retry actions, announces loading/errors, and ignores stale date/slot responses; source-contract tests cover these branches and guard patterns, not mounted network flows. The profile source slice now exposes its page title as an `h1`, gives the email-verification code field a localized accessible name, and exposes profile-loading plus username-availability feedback through polite status regions; focused source-contract tests cover these semantics. These are not browser/keyboard/screen-reader acceptance. New owner-requested email-editor work: existing transactional templates are field-based while campaign templates have a basic block editor plus raw-HTML mode; design a shared, modular visual editing/preview experience for both, with safe content blocks and a polished premium salon aesthetic. The current source slice now shares a block editor and sample-data preview across both template tabs, adds title/text/highlight/button/divider/spacer modules with drag and keyboard/button reordering, preserves legacy transactional configs and the advanced campaign HTML mode, escapes generated campaign text, and validates structured blocks with bounded counts/lengths and safe server-side HTML rendering. Source/build evidence does not verify mail-client fidelity or a real inbox render. Preserve campaign consent, audience caps, pacing/concurrency, and delivery safeguards. A shared admin-settings slice now associates every typed input (including boolean switches, paired color controls, and image file selection) with an accessible name, announces loading, preserves previous settings while surfacing fetch failures with retry, guards stale overlapping settings requests, and contains save rejections after localized toast feedback; targeted source-contract tests are in CI. This is not mounted browser/device verification. Finance's shared table skeleton now announces loading in a polite status region and hides decorative skeleton cells; the shared error state remains an alert with explicit retry, covered by a focused source-contract test. The stylist direct-booking form now associates all client/date/time/notes labels, exposes the services choices as a fieldset, and announces selected client/service states with `aria-pressed`; targeted source tests are registered, with rendered keyboard behavior still unverified. Continue with remaining finance routes/states, stylist portal, public content, and shared dialogs. Add component/rendered tests only after choosing a supported browser harness; `axe`/Playwright dependencies are not currently an existing gate.

**Mobile:** current owner report covers selected Android flows; do remaining route families and shared controls; source changes to date/picker/button/input not reclassified as full TalkBack acceptance. User remains the physical-device reviewer.

**I18N commits:** translation resources, strings and i18n tests remain separate targeted commits from functional API/business logic; specifically never combine KUF reconciliation with I18N. Keep server-provided names/configured legal text in the dynamic-data category unless owner approves a translated version.

**Done when:** route checklist has source evidence, required tests, owner manual acceptance where needed; no unreviewed hard-coded user-facing copy on in-scope routes; correct locale/date/plural behavior; browser/keyboard/axe and owner device checks recorded with environment.

### Faza 8 — final whole-repository audit closure

**Code audit closure requires:** whole backend route/guard/DTO/response/query inventory; all public routes rate/bounds review; every high-cardinality `findMany` classified (paginate/aggregate/static small/internally bounded); frontend route and mobile route/component inventory; test coverage gaps accepted or remediated; docs’ current summaries reconcile; full required CI green on latest branch head.

**Operational close is a separate sign-off:** user DB migration list, production secrets (never copied into audit), Redis/cron topology, storage backups/restore, deployment version, browser/device acceptance. Mark every external item `owner-reported`, `verified in staging` or `not verified`; do not turn source/CI evidence into production claims.

## 9. Closeout checklist (to update after each phase)

- [ ] D-01..D-07 decisions recorded.
- [ ] API-R1 finance client picker and backend client-role contract fixed/tested.
- [ ] API-R2 daily-log picker client-role/pagination behavior approved and tested.
- [ ] API-R3 `/api/users` dashboard/finance all-row dependencies removed; query DTO validated.
- [ ] API-R4 reservation consumer inventory, bounds and compatibility rollout complete.
- [ ] OPS-R1 consent/opt-out semantics approved; campaigns bounded, persisted, retryable and observable.
- [ ] OPS-R2 outbox/cron leases, crash windows, multi-process behavior and retry ceilings tested.
- [ ] AUTH-02 migration status and scoped reset emails confirmed by owner; no unrelated resets.
- [ ] AUTH-01 HTTP Redis tested in non-production; SEC-06 two-instance Redis flow tested in staging.
- [ ] SEC-04 storage/backup/restore/rollback owner acceptance recorded.
- [ ] UX/UI route inventory completed; A11Y rendered/browser + screen reader/manual evidence distinguished.
- [ ] I18N web/mobile scope decision; key parity plus actual route copy/runtime acceptance complete.
- [ ] Existing docs’ current status blocks reconciled without deleting historical CI records.
- [ ] Latest branch CI green; no production DB/SMTP/Redis secret value in commits/logs.
- [ ] User performs their own merge; no PR/merge/deploy by agent without request.

## 10. Source files reviewed for this addendum

Backend auth/rate-limit and reset: `backend/src/auth/auth.controller.ts`, `auth.service.ts`, `auth-rate-limit.policy.spec.ts`, `backend/src/common/rate-limiting/*`, `backend/prisma/migrations/20261102170000_auth02_password_reset_links/migration.sql`.

Realtime/deployment: `backend/src/events/events.gateway.ts`, `redis-io.adapter.ts`, `socket-io-runtime-config.ts`, `docker-compose.yml`, `backend/Dockerfile`.

API lists/finance: `backend/src/users/users.controller.ts`, `users.service.ts`, `dto/client-list-query.dto.ts`, `backend/src/reservations/reservations.controller.ts`, `reservation-list.service.ts`, `dto/query-reservations.dto.ts`, frontend finance `lookups.api.ts`, `use-lookups.ts`, `use-manual-entry-form.ts`, `manual-entry-dialog.tsx`, dashboard data hook, mobile daily-log/stylist picker consumers, manual-income DTO/service/debt sync.

OPS/notifications: `backend/src/notifications/notifications.controller.ts`, `notifications.service.ts`, `notifications.repository.ts`, campaign DTOs, `backend/src/reservations/reservation-delay.cron.ts`, `reservation-delay-reminder.service.ts`, `reservation-appointment-reminder.service.ts`, `reservation-direct-daily-log-cron.service.ts`, `reservation-outbox.service.ts`, `backend/src/daily-log/daily-log-completion-outbox.service.ts`, `backend/src/finance/income-cron.service.ts`.

UX and gates: `.github/workflows/ci.yml`, `scripts/check_i18n.py`, `scripts/check_ui_contrast.py`, `mobile/scripts/check-mobile-i18n.cjs`, frontend/mobile package scripts, and audit docs cited above.
