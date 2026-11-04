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

- Admin/owner-only routes su [`POST /api/notifications/campaigns/audience` i `/send`](../../backend/src/notifications/notifications.controller.ts#L107-L122). Kontroler nema per-route `@HttpRateLimit` niti recipient cap.
- [`CampaignAudienceDto`](../../backend/src/notifications/dto/campaign-audience.dto.ts#L12-L38) validira arrays/unique/string/role/booleans, ali `includeUserIds`/`excludeUserIds` nemaju `ArrayMaxSize`; `SendCampaignDto` takođe nema max count za `tags`.
- [`resolveCampaignAudienceUsers`](../../backend/src/notifications/notifications.service.ts#L870-L903) povlači matching users bez `take`/paginacije, uključuje sve role relations, pa `roles` filter radi u memoriji. `onlyActive` defaultuje true; `onlyEmailVerified` defaultuje false. `getCampaignAudienceSummary` vraća prvih 10 uz email, ali route je owner/admin zaštićena.
- [`sendCampaign`](../../backend/src/notifications/notifications.service.ts#L312-L383) šalje `transporter.sendMail` serijski unutar `for...of`; nema persistent campaign/job/recipient status, cancellation, retry cursor ili idempotency key. Mail se šalje prije in-app notification insert-a; DB insert može pasti nakon već poslanog emaila. SMTP fail za jednog korisnika prekida request nakon prethodnih isporuka i caller dobija djelimičan/greška ishod bez trajnog statusnog izvještaja.
- Normalni [`NotificationsService.send`](../../backend/src/notifications/notifications.service.ts#L95-L164) čita per-type `NotificationPreference`; campaign path ne zove taj helper i ne provjerava preference. Preference model defaultuje `emailEnabled=true` ([`schema.prisma`](../../backend/prisma/schema.prisma#L987-L999)). Admin UI šalje tags `marketing`/`campaign`; pregledan kod ne implementira dedicated marketing opt-in/unsubscribe. Ovo je code-path observation, ne pravni/compliance zaključak.
- Email template sanitizacija/placeholder escaping već ima ciljane testove i CI evidence; kampanjski sanitizer se ne predlaže ponovo pisati u ovom slice-u bez novog konkretnog regresijskog nalaza.

**Policy gates prije koda:** da li marketing koristi `GENERAL.emailEnabled` kao opt-out ili traži poseban consent/unsubscribe; da li se šalje samo verified emailu; kako obraditi stare naloge bez preference; koja je maksimalna publika i concurrency/rate cap; kako admin treba vidjeti parcijalni rezultat.

**Predložena implementacija:** nakon tih odluka upisati job + snapshot eligible recipient IDs i preference/consent snapshot u transakciju; worker/outbox radi DB lease/claim, batch i rate limit, recipient-level status, pokušaje/backoff i replay; unique `(jobId,userId)` sprečava dupli recipient task. SMTP ne treba držati otvorenim HTTP requestom; endpoint vraća job ID/status, UI prikazuje queued/running/partial/failed/delivered i eksplicitan retry. Ne birati Redis/BullMQ prije owner odluke i DB idempotency spec-a; PostgreSQL outbox je prihvatljiva prva opcija.

**Acceptance:** unit + disposable-Postgres testovi za consent, opt-out, verified/unverified i include/exclude; max audience/tags; SMTP failure nakon N primalaca, DB failure nakon SMTP uspjeha, worker restart, lease expiry, duplicate click/replay, retry bez nepotrebnog dupliranja; fake SMTP sink; UI potvrda broja primalaca i djelimičnog ishoda. Ne slati pravi email iz CI ili bez izričite runtime konfiguracije/odobrenja.

### OPS-R2 — Cron `waitForCompletion` nije distribuirani lock; sent-markeri su poslije external side-effecta

Repozitorijski source inventory nalazi četiri aktivna `@Cron` entrypointa:

1. [`ReservationDelayCron.tick`](../../backend/src/reservations/reservation-delay.cron.ts#L29-L45) svake minute poziva timeout/attendance/reorder/daily-log seed/reminder/appointment reminder/expired-lock/inbox timeout work i zatim delay notifications.
2. [`DailyLogCompletionOutboxService.retryPending`](../../backend/src/daily-log/daily-log-completion-outbox.service.ts#L166-L203) svake minute skenira batch od 25 i koristi DB claim/lease recovery.
3. [`IncomeCronService.handleIncomeBookCatchUp`](../../backend/src/finance/income-cron.service.ts#L17-L27) dnevno radi KIF catch-up.
4. [`IncomeCronService.handleExpenseBookRollover`](../../backend/src/finance/income-cron.service.ts#L29-L55) mjesečno osigurava KUF knjigu.

Sve imaju `waitForCompletion`; to sprečava overlap samo unutar istog Nest scheduler procesa. Ne sprečava drugi backend replica da pokrene isti Cron.

**Source detalji i razlika po jobu:**

- Delay reminders uzimaju `delayNotifiedAt: null`, šalju notification za buduće klijente, pa tek zatim upisuju marker ([`reservation-delay.cron.ts`](../../backend/src/reservations/reservation-delay.cron.ts#L58-L76), [#L103-L124](../../backend/src/reservations/reservation-delay.cron.ts#L103-L124)). Crash poslije send-a, a prije marker-a može ponoviti poruku; dvije instance mogu obje pročitati null.
- Appointment reminders isto šalju `NotificationsService.send` prije `reminderSentAt` update-a ([`reservation-appointment-reminder.service.ts`](../../backend/src/reservations/reservation-appointment-reminder.service.ts#L28-L68)).
- Pending daily-log reminders šalju prije `pendingReminderSentAt` marker-a ([`reservation-direct-daily-log-cron.service.ts`](../../backend/src/reservations/reservation-direct-daily-log-cron.service.ts#L67-L110)).
- Direct-booking SERVICE daily-log seed ima zasebnu djelimičnu unique zaštitu i conditional seed; taj duplicate-row problem ne treba ponovo rješavati neovisno.
- Inbox timeouts/expired lock/attendance/reschedule putanje imaju conditional `updateMany`/status checks; one ne znače da su notification deliveries tačno jednom.
- Daily-log completion outbox claimuje `PENDING -> PROCESSING`, otključava istekle leaseove i uzima `take=25`; eksterni receipt/push/socket i dalje je deklarisan at-least-once.

**Preostali konkretan outbox gap:** [`ReservationOutboxService.dispatchAfterCommit`](../../backend/src/reservations/reservation-outbox.service.ts#L38-L139) atomarno claimuje `PENDING` i vraća grešku u `PENDING`, a booking replay može dispatchati još jednom ako pronađe PENDING događaj ([`reservation-create.service.ts`](../../backend/src/reservations/reservation-create.service.ts#L86-L110), [#L259-L265](../../backend/src/reservations/reservation-create.service.ts#L259-L265)). Pretraženi backend nema drugi `reservation.created` polling Cron/worker: nema lease expiry recovery za worker koji se ugasi dok status ostane `PROCESSING`, nema scheduled retry kada se booking HTTP replay ne desi, i nema next-attempt backoff / terminal failure policy. DB notification upsert unique po `(sourceEventId,userId)` štiti notification row, ali `NotificationsService.send` nakon upsert-a i dalje šalje push/email na svaki dispatch pokušaj; external channel replay može biti duplikatan.

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

**Predloženi UX audit instrument:** po route-u zabilježiti persona/role, initial/loading/empty/error/stale/success states, keyboard/touch route, labels/hints/errors, focus management, locale behavior, responsive breakpoints, source test and manual owner result. Ne mijenjati boje ili layout globalno na osnovu samo 44 para.

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

**Done when:** concurrent two-worker claim yields one active worker; expired PROCESSING leases recover; failure at each boundary persists retryable result; duplicate delivery behavior documented at-least-once; dead-letter/alerting and manual replay tested on disposable PostgreSQL/fake transport; no effect on reservation create idempotency.

### Faza 4 — OPS-R2 process-local cron work and marker idempotency

**Rad:** reservation delay, appointment reminder and pending daily-log reminder become atomic DB claims/outbox events before external send; scheduled trigger is singleton/DB-lease or duplicate-safe. Keep direct seed unique index and existing conditional FSM updates. KIF/KUF rollover separately prove DB idempotency; avoid making financial period state dependent on Redis.

**Done when:** two concurrent scheduler instances process each reminder candidate once at DB-claim level; external channels are documented at-least-once; crash injection tests prove no silent lost notification or infinite duplicate; timezone boundary tests use Europe/Sarajevo; owner confirms runtime replica topology.

### Faza 5 — OPS-R1 campaign consent and queue

**Precondition:** D-02/D-03 approved.

**Rad:** policy-specific eligibility; bounded audience query with chunking; `ArrayMaxSize` or avoid client-supplied huge ID lists; snapshot of verified/consented preference; campaign job and per-recipient delivery state; worker concurrency/SMTP rate; cancellation and idempotent retries; admin progress/partial-result/retry UI. Use DB outbox first unless queue infrastructure is separately approved.

**Done when:** opt-out cannot be bypassed by direct API; audience preview equals queued job snapshot; max size and rate caps enforced server-side; failure/replay tests with fake SMTP; content sanitizer regression still passes; no live recipients used.

### Faza 6 — SEC/AUTH operational acceptance (owner-operated, not agent DB work)

**Radni redoslijed:**
1. Owner checks AUTH-02 migration status; applies it manually after merge; verifies public HTTPS app URL and SMTP readiness; resets only individually identified eligible verified-email accounts as authorized.
2. Owner verifies HTTP limiter Redis readiness/outage 503 in non-production; no reuse of Socket.IO identity/ACL by assumption.
3. Owner/QA does two-instance Redis Socket.IO staging exercise (connect/revoke/disconnect/reconnect and privacy payloads), exact allowed browser origins/preflight and edge headers.
4. Owner/infra records SEC-04 file path mapping, static-root exclusion, UID/permission/capacity, backup restore and rollback evidence. No assistant operation on production data/volume.
5. SEC-05 keys are never read/requested/rotated as part of this phase; key rotation is separate owner-controlled re-encryption project. SEC-08 remains owner-reported complete unless owner supplies a new specific failure.

**Done when:** operator supplies sanitized status/result records (no secrets), deployment version and timestamp; report labels owner-reported vs agent/CI evidence accurately.

### Faza 7 — UX/UI/A11Y/I18N complete route inventory and remediation

**First pass:** enumerate all routes/screens and common components by persona and states; record copy source, API fallback, labels/roles/hints/errors, keyboard order/focus, contrast, font scaling/reflow, dark/light and dynamic data. Expand the mobile guard along with each screen slice; decide mobile EN. Do not claim full repo localization from web key parity.

**Web:** begin with finance manual income and reservation list (because Faza 1/2 changes them), then public reservation/profile, admin settings/finance, stylist portal, public content, shared dialogs. Add component/rendered tests only after choosing a supported browser harness; `axe`/Playwright dependencies are not currently an existing gate.

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

OPS/notifications: `backend/src/notifications/notifications.controller.ts`, `notifications.service.ts`, `notifications.repository.ts`, campaign DTOs, `backend/src/reservations/reservation-delay.cron.ts`, `reservation-appointment-reminder.service.ts`, `reservation-direct-daily-log-cron.service.ts`, `reservation-outbox.service.ts`, `backend/src/daily-log/daily-log-completion-outbox.service.ts`, `backend/src/finance/income-cron.service.ts`.

UX and gates: `.github/workflows/ci.yml`, `scripts/check_i18n.py`, `scripts/check_ui_contrast.py`, `mobile/scripts/check-mobile-i18n.cjs`, frontend/mobile package scripts, and audit docs cited above.
