# Nalazi statičkog audita

**Datum pregleda:** 2026-10-21 (UTC)<br>
**Status:** kod i deklarisana konfiguracija; navedeni HTTP/DB exploit i race slučajevi nisu izvršeni nad runtime instancom.<br>
**Arhitektura:** [ARCHITECTURE.md](ARCHITECTURE.md) · **Implementacijski plan:** [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) · **Handoff:** [HANDOFF.md](HANDOFF.md)

## Kako čitati nalaze

- **P0 / kritično:** containment/incident-response ili hitna zaštita prije normalnog release-a.
- **P1 / visoko:** riješiti u narednom sigurnosnom/finansijskom release-u; može izložiti vjerodajnice/PII ili narušiti novac/booking integritet.
- **P2 / srednje:** ograničiti prije širenja opterećenja/funkcionalnosti; dodati regresijske testove i owner sign-off.
- **P3 / nisko:** održavanje i UX polish.
- **Kod potvrđuje** znači da su route/service/schema/klijentski kod pokazali putanju. To ne znači da je podatak eksfiltriran, exploit izvršen ili produkcijski incident potvrđen.
- Za sve P0/P1 treba provjeriti deployment, pristupne logove i stvarne postavke prije zaključka o izloženosti korisničkih podataka.

## Prioritetni sažetak

1. **SEC-01 — baseline public review detail je mogao vratiti puni `stylist.user`; source branch sada uklanja anonimni pristup detail ruti, koristi approved-only display allowlists i odvaja admin moderaciju.** In-process Nest HTTP contract test s mock service-om pokriva 401/authenticated response/404; deployed/live HTTP nije provjeren, a incident status ostaje owner action.
2. **Trenutni Git index više ne sadrži ranije tracked env/Firebase Admin credential fajlove, ali Git historija nije rewrite-ovana i rotacija nije potvrđena.** Tretirati ih kao kompromitovane dok credential owner ne potvrdi rotaciju/revokaciju.
3. **SEC-02 — baseline `/api/users/clients` vraćao je full User modele; source branch sada koristi minimalni picker, a expanded client list je admin-only allowlist.** Deployment/HTTP potvrda još nedostaje.
4. **Upload root je javno statički poslužen** i uključuje dokumente; delete endpoint nema vlasničku/reference provjeru.
5. **Finansijski/booking side-effecti nisu svi u jednoj transakciji/outbox-u**, a repayment nema status uslov u samom update-u; retry/race scenariji mogu ostaviti netačne ili duplirane zapise.
6. **Postojeći critical/high npm advisory-ji, značajni EN prevod nedostaci i niske provjerene kontrastne vrijednosti.**

## P0 — hitna zaštita / incident review

### SEC-01 — Review API response exposure (baseline P0; source-branch hotfix)

**Baseline evidence:** prije ove izmjene `GET /api/reviews/:id` je bio `@Public()` i `ReviewsService.findOne` uključivao je `stylist.user: true`; review list je dopuštao da `approved=false`/izostanak filtera vrati pending zapise. `User` model i dalje sadrži osjetljive account scalars ([`User` model](../../backend/prisma/schema.prisma#L44-L64)); početno stanje je zabilježeno u prethodnom audit pregledu.

**Hotfix u ovom branch-u:** [`REVIEW_DISPLAY_SELECT`](../../backend/src/reviews/reviews.service.ts#L11-L25) bira samo review display polja i ime/prezime; nema `User` account polja, `userId` ni reservation ID. Public list [`findAllPublic`](../../backend/src/reviews/reviews.service.ts#L97-L110) uvijek postavlja `isApproved: true`. Detail handler [`findOne`](../../backend/src/reviews/reviews.controller.ts#L63-L66) više nije `@Public()` i zato je zaštićen globalnim JWT guardom; service [`findOne`](../../backend/src/reviews/reviews.service.ts#L133-L140) dodatno ograničava lookup na `isApproved: true`, pa pending/nepostojeći ID oba vraćaju NotFound. Public featured/random također koristi isti select ([`findOneRandomApproved`](../../backend/src/reviews/reviews.service.ts#L82-L95)). Review moderation list je izdvojena na [`GET /api/reviews/admin`](../../backend/src/reviews/reviews.controller.ts#L47-L60), zaštićena sa `RolesGuard` i `SYSTEM_ADMIN`/`OWNER`. Controller regression test potvrđuje da approved list ostaje public, ali detail nema public metadata; service tests pokrivaju query/projection.

**Uticaj baseline-a:** prije hotfix-a, anonimni ID lookup je mogao vratiti sve `User` scalar fields za povezanog stilistu, a javni list pending review-e. U source branch-u detail sada zahtijeva JWT, a javni list samo approved zapise i display polja. Ovo je bila potencijalna exposure putanja; nije urađen HTTP request niti potvrđen deployment/access log, pa se ne tvrdi eksfiltracija.

**Preostala reakcija:** provjeriti access logove, deployed app version i exposure window; prema incident policy-ju procijeniti poništenje verification tokena / credential reset. Source branch promjena sama po sebi ne utiče na već deployanu aplikaciju.

**Stanje:** source-branch containment uključuje uklanjanje `@Public()` sa detail rute, approved-only display queries i admin-only moderation route; review service/controller unit tests prolaze, a `security-contract.spec.ts` koristi stvarni Nest routing, JWT guard i service stub da provjeri anonymous 401, authenticated display response i pending 404. HTTP contract test nije DB-backed i mock service ne potvrđuje Prisma response u runtime-u. Generated-Prisma typecheck, live/deployed HTTP provjera i incident review ostaju otvoreni.

### OPS-SEC-01 — Vjerodajnice su ranije bile commitovane; historija ostaje

**Dokaz/stanje:** tokom početne audit faze uklonjeni su iz indexa `backend/.env`, `frontend/.env`, `mobile/.env` i Firebase Admin JSON. Na nastavku rada hygiene provjera neočekivano je utvrdila da su sva četiri path-a opet bila u Git indexu (tri lokalna `.env` fajla postoje; service-account JSON nije bio u workspaceu). U ovom nastavku `git rm --cached -f` ponovo je uklonio index zapise bez brisanja lokalnih env fajlova; `git ls-files` ih više ne navodi, a `git check-ignore` potvrđuje ignore pravila. Git historija nije prepisana (namjerno), tako da su stari blobovi i dalje dostupni kroz commit historiju ako su već pushani/klonirani.

**Uticaj:** uklanjanje iz posljednjeg tree-a ne opoziva DB, SMTP, JWT, encryption ili Firebase vjerodajnice. Nisu ispisane vrijednosti i nisu testirane; ne zaključujemo koji su još aktivni.

**Preporučena reakcija:** credential owner neka pregleda istoriju i deployment secret manager izvan ovog repozitorija; rotira/revokuje svaki nekad commitovan secret; invalidira izdate tokene gdje je potrebno; provjeri Firebase audit i DB/SMTP logove. **Ne rotirati `APP_SETTINGS_ENCRYPTION_KEY` bez kontrolisanog re-encryption/dual-key plana**, jer baza može imati enkriptovane AppSetting vrijednosti.

**Stanje:** hygiene fix u worktree-u; van-repo rotacija i log review čekaju owner potvrdu.

## P1 — visoko

### SEC-02 — `/api/users/clients` baseline returned full User records to stylists (source-branch mitigation)

**Baseline:** previous controller allowed `SYSTEM_ADMIN`, `OWNER`, and `STYLIST`; previous service used a scalar `include` (plus `userRoles`/`stylistProfile`) and returned all matching users if pagination was absent. The [`User` model](../../backend/prisma/schema.prisma#L44-L64) contains password hashes, email-verification tokens, social IDs and contact PII.

**Mitigation on this branch:** `GET /api/users/clients` remains available to those staff roles only as a bounded picker. [`CLIENT_PICKER_SELECT`](../../backend/src/users/users.service.ts#L16-L22) returns only `id`, `username`, first/last name and `gender`; total client count and account scalars are not returned. Picker search matches username/name only; email search is reserved for admin. `ClientListQueryDto` validates page/pageSize/search length ([DTO](../../backend/src/users/dto/client-list-query.dto.ts#L11-L30)); service defaults/caps page size and clamps page to result bounds ([picker service](../../backend/src/users/users.service.ts#L134-L154)). The admin user-management screen now uses separate [`GET /api/users/clients/admin`](../../backend/src/users/users.controller.ts#L44-L52), role-guarded for `SYSTEM_ADMIN`/`OWNER`, with an explicit UI-only allowlist ([`ADMIN_CLIENT_SELECT`](../../backend/src/users/users.service.ts#L24-L37)); sensitive password/token/social fields are not selected. Booking-picker consumers continue using the minimal route.

**Impact baseline:** before the branch change, a stylist token could potentially receive hashes/tokens/contact data and an unbounded result. HTTP role/response testing had not been executed; production exposure is not established.

**State:** query/select/pagination and route-role unit tests are included and pass; frontend build passes. Source-branch mitigation only—generated Prisma typecheck, live HTTP/DB and deployment verification remain pending.

### SEC-03 — Stylist može čitati open dugove proizvoljnog klijenta

[`client-debts.controller.ts#L23-L27`](../../backend/src/finance/client-debts.controller.ts#L23) prihvata `clientId` i uključuje `STYLIST`. [`client-debts.service.ts#L27-L63`](../../backend/src/finance/client-debts.service.ts#L27) provjerava samo da je caller stylist; ne provjerava da je klijent vezan za tog stilistu ili da je dug njegov. Response vraća iznose, servis, stylist profile, vrijeme i creator metadata; samo sakriva note kada ga nije kreirao caller. Za razliku od toga `listForStylistMe` je po stylist profile-u ograničen ([service L69-L84](../../backend/src/finance/client-debts.service.ts#L69)).

**Uticaj:** ako je politika da stylist vidi samo dugove u svom radnom odnosu, client IDOR izlaže finansijske podatke drugih klijenata/stilista. Namjera aplikacije (zajednički pregled svih dugova) nije potvrđena.

**Popravka:** eksplicitno usaglasiti policy; ako nije globalni salon-wide pristup, query ograničiti na `stylistProfileId`/reservation/work relationship; dodati tests za own/other stylist/client/admin.

### SEC-04 — Uploadi su javno dohvatljivi, a path-delete nema owner/reference authorization

- [`main.ts#L21-L24`](../../backend/src/main.ts#L21) statički servira cijeli `UPLOAD_ROOT` pod `/uploads/` bez auth.
- [`uploads.controller.ts#L19-L49`](../../backend/src/uploads/uploads.controller.ts#L19) zahtijeva JWT za upload, ali ne za `DELETE by-path-original`; handler ne prosljeđuje `CurrentUser`.
- [`uploads.service.ts#L69-L74`](../../backend/src/uploads/uploads.service.ts#L69) prihvata MIME vrijednosti sa `file.mimetype`; Multer filter provjerava samo da postoji originalno ime ([controller L24-L35](../../backend/src/uploads/uploads.controller.ts#L24)). PDF/Word/Excel su dopušteni; originali se javno posluže.
- [`uploads.service.ts#L129-L155`](../../backend/src/uploads/uploads.service.ts#L129) traži record po putanji, briše fajlove i DB record, bez ownership/attachment-reference provjere; controller ruta zahtijeva JWT globalno, ali bilo koji prijavljeni korisnik koji sazna path može pozvati delete.

**Uticaj:** privatni dokumenti (npr. finance attachment) mogu biti javni svakome ko sazna/otkrije URL; prijavljeni korisnik može obrisati tuđi upload na osnovu putanje. Putanje mogu biti iz API-ja/DB-a; nije dokazano da su sve putanje enumerabilne.

**Popravka:** odvojiti `public-assets` i private upload storage; privatne fajlove servira autorizovan controller ili kratkoživući signed URL; provjeravati file signature (`file-type`) i per-category allowlist; owner/admin + reference check u delete-u, soft delete/audit; bez SVG/HTML direktnog public serve-a; limits/rate limit/quota.

### PRIV-01 — Before/after galerija javno vraća fotografije bez consent polja u pregledanom modelu

[`daily-log.controller.ts#L82-L95`](../../backend/src/daily-log/daily-log.controller.ts#L82) izlaže `GET /api/daily-log/before-after` anonymous. [`daily-log-public.service.ts#L66-L76`](../../backend/src/daily-log/daily-log-public.service.ts#L66) bira sve completed, undeleted service zapise sa before i after slikom; mapper vraća direktne upload path-ove ([L129-L149](../../backend/src/daily-log/daily-log-public.service.ts#L129)). Pregledani [`DailyLogImage` model](../../backend/prisma/schema.prisma#L470-L485) nema consent/status/expiry polja.

**Uticaj:** fotografije ili prepoznatljivi klijenti mogu biti javno prikazani bez dokazivog consent state-a u ovom modelu. Moguće je da postoji zaseban papirni/UI policy izvan pregledanog scope-a; njegovo postojanje nije dokazano ni opovrgnuto.

**Popravka:** pravni/product owner potvrdi opt-in pravilo; dodati timestamp/version/scope consent record i creator; default existing records na *not-public* dok se ponovo ne odobri; public query traži važeći consent; revocation uklanja iz feeda i invalidira cache.

### SEC-05 — JWT hardcoded fallback i tajna settings enkripcija fail-open

- JWT secret ima fallback literal `change-me-in-production` u [`jwt.strategy.ts#L14-L18`](../../backend/src/auth/strategies/jwt.strategy.ts#L14), [`auth.service.ts#L252-L257`](../../backend/src/auth/auth.service.ts#L252) i [`auth.module.ts#L22-L30`](../../backend/src/auth/auth.module.ts#L22). Startup ne odbija missing/short JWT secret.
- [`settings-encryption.service.ts#L13-L22`](../../backend/src/settings/settings-encryption.service.ts#L13) vraća `null` za missing/neispravan 32-byte key; [`encrypt` L29-L41](../../backend/src/settings/settings-encryption.service.ts#L29) tad čuva plaintext, a [`decrypt` L44-L58](../../backend/src/settings/settings-encryption.service.ts#L44) kod missing key vrati ciphertext string.
- Registry označava SMTP password kao secret, ali `.env.example` encryption key je komentarisani optional template; production config nije provjeren.

**Uticaj:** pogrešno konfigurisan deployment može izdavati forgeable JWT-e ili čuvati SMTP secret plaintext. Existing ciphertext bez ključа se ne dešifruje, pa startup fail-closed mora ići uz migration/key handling plan.

**Popravka:** validation at startup: production bez jakog random `JWT_SECRET` (min 32 bytes/appropriate entropy) i bez validnog base64 32-byte `APP_SETTINGS_ENCRYPTION_KEY` ne smije bootati; development mora koristiti eksplicitni local-only key, nikad shared fallback. Test missing/invalid key; migration job pre re-key.

### SEC-06 — Socket.IO šalje PRIVATE setting vrijednosti svim konekcijama i koristi JWT role claims bez DB refresh-a

- `EventsGateway` dopušta anonymous konekciju i spaja je u `public`; valjan token stavlja korisnika u rooms na osnovu **JWT payload role claims**, bez ponovne DB provjere ([`events.gateway.ts#L33-L73`](../../backend/src/events/events.gateway.ts#L33)). JWT važi 7d po podrazumijevanju; HTTP JWT strategy osvježava role iz DB-a, Socket.IO ne.
- `emitToAll` je `server.emit` na sve konekcije ([`events.gateway.ts#L87-L105`](../../backend/src/events/events.gateway.ts#L87)). [`settings.service.ts#L245-L248`](../../backend/src/settings/settings.service.ts#L245) šalje key/value; null se postavlja samo za `isSecret`, ne za `scope === PRIVATE`. Registry ima private vrijednosti kao salon timezone, email host/username, settings/policy toggles ([`settings-registry.ts#L92-L110`](../../backend/src/settings/settings-registry.ts#L92)); samo email password je označen `isSecret` u tom segmentu.

**Uticaj:** anonymous/stale-role sockets mogu čuti internal setting metadata/value, odnosno zadržati privileged room poslije promjene/ukidanja role do reconnect/token expiry. Nisu urađeni Socket.IO runtime probes.

**Popravka:** broadcast samo safe `PUBLIC` keys ili event `key` bez vrijednosti; private updates preko admin room; DB-validate active user/current roles pri handshake i re-auth/revoke strategy; disconnect/rejoin nakon role changes; odrediti allowlisted origins i payload DTO.

### SEC-07 — Public blog/comments draft and pending exposure (baseline; source-branch mitigation)

**Baseline evidence:** before this branch's mitigation, `GET /api/blog` was public and only `published=true` enabled a published filter; absent/false query returned drafts. `GET /api/blog/:postId/comments` similarly trusted `approved=true`, so omitted/false query could return pending comments. Authenticated `GET /api/blog/:id` had no role check and returned drafts and all comments. These were static source findings, not live HTTP observations.

**Mitigation in this branch:** public `GET /api/blog` now always filters `isPublished: true` and selects only list display fields; `GET /api/blog/slug/:slug` remains published-only and now uses an explicit public detail projection without internal author ID or embedded comment rows. Public `GET /api/blog/:postId/comments` ignores caller-supplied filter values, requires `isApproved: true` and a published parent post, and selects display fields only. All-post list `/api/blog/admin`, by-ID draft detail `/api/blog/:id`, and unfiltered comment list `/api/blog/:postId/comments/admin` require `SYSTEM_ADMIN`/`OWNER`; admin Blog page and dashboard callers were moved to the corresponding routes. Public web/mobile callers no longer send published/approved query flags as a security control.

Review-list baseline is separately contained under SEC-01: public `GET /api/reviews` is approved-only and moderation uses an admin-only route. `PublicBlogPost` still renders published post HTML, but SEC-08 now sanitizes content on the backend write and public-read paths; this SEC-07 access-control change does not itself validate that separate trust boundary or prove its deployment.

**Uticaj:** baseline je omogućavao anonimno čitanje editorial drafts i pending comments, te svakom autentifikovanom nalogu čitanje drafta po ID-u. Source branch sada razdvaja javne i admin read surface. In-process Nest HTTP contract test with mocked services verifies public list/comments paths ignore legacy filter flags and client role receives `403` on admin reads; this does not prove database query behavior or deployment behavior.

**Stanje:** SEC-07 source mitigation is implemented. All blog Jest suites pass (4 suites/16 tests); the targeted HTTP contract suite covers review detail and public/admin blog route behavior (3 tests), while existing service tests check actual Prisma filters/projections. Frontend build and mobile typecheck pass. Generated-Prisma full typecheck, DB-backed/live HTTP integration and deployment verification remain pending.

### SEC-08 — Stored HTML XSS na javnom blogu i inline SVG (source mitigations; runtime/deployment unverified)

**Baseline evidence:** blog admin editor prihvata `HTML/Tekst`, backend je ranije čuvao sadržaj bez sanitizacije, a public page ga je ubacivao preko `dangerouslySetInnerHTML` ([`PublicBlogPost.tsx`](../../frontend/src/pages/public/PublicBlogPost.tsx), editor [`blog-post-form-dialog.tsx`](../../frontend/src/features/blog/blog-post-form-dialog.tsx)). Fetched SVG logo se regex-transformisao i ubacivao inline preko drugog `dangerouslySetInnerHTML` sink-a ([baseline source path](../../frontend/src/components/brand/uploaded-brand-logo.tsx)); regex obrada nije bila parser-based allowlist. Ovo su source-path nalazi, ne reprodukovani browser exploits.

**Mitigation in this branch:**

- Backend uses pinned `sanitize-html@2.18.1` with an explicit editorial allowlist: basic headings/paragraphs/lists/emphasis/tables, links and images; only limited attributes; HTTP(S)/mailto/tel links, HTTP(S) image sources, and no protocol-relative URLs. Script/style/iframe/SVG tags, event attributes and unapproved attributes are discarded.
- `BlogService.create` and `update` sanitize before persistence. Public `findBySlug` sanitizes again on output, covering legacy rows that predate the write-side change. Public list does not include `content`; by-ID/admin reads are role-guarded and the admin UI treats content as textarea text.
- `PublicBlogPost` still has an HTML insertion sink, now documented as requiring the sanitized public API boundary. A client-side sanitizer was not added; its safety depends on keeping this route/service boundary mandatory.
- `UploadedBrandLogo` no longer fetches SVG text or inserts markup: SVG is consumed as an external CSS mask image, so script-capable source markup is not inserted into the document. Configured monochrome color is preserved. The shared URL helper passes through any path beginning with `http` (intended absolute HTTP(S) URLs); external asset privacy/availability policy was not changed here.
- Blog editor help text now explains that basic formatting is supported and active/embedded markup is removed.

**Verification:** sanitizer regression tests pass 2/2 using Node's test runner (`npm run test:blog-sanitizer`); all blog Jest suites pass (4 suites/16 tests; the service spec is 8/8), including create/update/public-read sanitizer-boundary assertions; isolated TypeScript check of the sanitizer utility passes. Frontend TypeScript/Vite production build passes (4,811 modules; 1,999.52 kB JS chunk warning). `npm audit --omit=dev` currently reports 15 backend production-tree advisories (2 moderate, 12 high, 1 critical); `sanitize-html@2.18.1` itself has no advisory in that snapshot. Backend full build remains blocked by the missing generated Prisma Client (650 diagnostics including absent Prisma delegates; engine download was TLS-blocked). No browser payload execution, HTTP/DB test, CSP test or production deployment verification was run.

**Residual/owner actions:** source changes reduce the reviewed sinks, but are not deployed proof. Keep `PublicBlogPost` connected only to the sanitized slug route; add a browser-level malicious-content test and consider defense-in-depth frontend sanitization/CSP. Confirm external logo URL policy and monitor the remaining dependency advisories. Do not claim exploitation or production exposure without logs/runtime evidence.

### API-01 — Public stylist/service catalog defaultira na inactive records i vraća PII

- Stylist `GET /api/stylists` je public; `activeOnly` prosljeđuje samo kad tačan string `true`, default `false` ([controller L27-L38](../../backend/src/stylists/stylists.controller.ts#L27)); service default vraća inactive profile ([`stylists.service.ts#L16-L41`](../../backend/src/stylists/stylists.service.ts#L16)). Lista vraća stylist email, a public detail vraća email + phone ([`stylists.service.ts#L76-L102`](../../backend/src/stylists/stylists.service.ts#L76)); detail nema `activeOnly` guard.
- Public categories/subcategories/services prihvataju `activeOnly`, ali false po defaultu; category/detail uključuju inactive children/services ([`services.controller.ts#L40-L49`](../../backend/src/services/services.controller.ts#L40), [L73-L88](../../backend/src/services/services.controller.ts#L73), [L115-L137](../../backend/src/services/services.controller.ts#L115); [`services.service.ts#L80-L99`](../../backend/src/services/services.service.ts#L80)).

**Uticaj:** bivši/inactive stylist kontakt podaci i neaktivna ponuda mogu ostati javni; online clients ne mogu razlikovati internal catalog od public catalog.

**Popravka:** public DTO sa poljima eksplicitno odobrenim za display; public `isActive=true` kao nepromjenjiv default i detail provjera; admin route za neaktivne; email/phone po eksplicitnoj business policy.

### BIZ-01 — Deaktivirani servis i dalje prolazi API booking validaciju

[`ReservationCreateService.create`](../../backend/src/reservations/reservation-create.service.ts#L50) učitava servise po `id` bez `isActive: true`; [`AvailabilitySlotsService.getAvailableSlots`](../../backend/src/reservations/availability-slots.service.ts#L28-L40) radi isto. Public `GET /api/services` može izložiti inactive ID (API-01); ako stylist-service relacija ostane, inactive service i dalje može dobiti slot/booking.

**Uticaj:** deaktivacija u admin katalogu nije server-side booking stop. Runtime create nad poznatim inactive ID-em nije pokrenut.

**Popravka:** aktivnost provjeravati u centralnoj booking/availability domain service i recheck-ati u finalnoj DB transakciji; inactive endpoint detail vrati 404/410 za public; test inactive ID ne može stvoriti reservation.

### BIZ-02 — Reservation create nije jedna DB transakcija i nema durable outbox

[`reservation-create.service.ts#L88-L163`](../../backend/src/reservations/reservation-create.service.ts#L88) prvo kreira reservation, pa zasebno service items, stylist response, notif send, loyalty redeem, read-back i Socket events. U ovom toku nema jedne `$transaction`/outbox boundary.

**Uticaj:** greška nakon prvog write-a može vratiti HTTP error uz orphan/partial reservation ili bez notifikacije/loyalty/eventa. Race na availability check i create nije zaštićen DB exclusion/lock mehanizmom u pregledanom toku. PostgreSQL concurrent requests nisu reprodukovani.

**Popravka:** transakcija za reservation + items + stylist response + loyalty debit/idempotency; persistirati outbox event unutar iste transakcije, worker šalje email/push/socket i retry-uje; DB-level slot overlap/capacity enforcement (ili tested serializable/advisory lock) nakon business rule provjere; stale request/idempotency key.

### BIZ-03 — Daily-log completion može ostati kompletiran bez KIF/loyalty sync-a i blokirati retry

[`DailyLogService.complete` L644-L705](../../backend/src/daily-log/daily-log.service.ts#L644) update-uje log na `COMPLETED`, zatim reservation, zatim poziva KIF; KIF error se loguje i ponovo baca ([L683-L691](../../backend/src/daily-log/daily-log.service.ts#L683)). Retry odmah odbija već `COMPLETED` status ([L645-L647](../../backend/src/daily-log/daily-log.service.ts#L645)). Loyalty account error se namjerno swallowed ([L679-L701](../../backend/src/daily-log/daily-log.service.ts#L679)).

**Uticaj:** request može završiti 5xx uz committed `COMPLETED`, a KIF manjkati; normalni retry više ne ulazi u sync. Loyalty earn greška može ostati neprimijećena. Nije poznato da li operator ima manual reconcile tool; reviewed flow ga ne pokazuje.

**Popravka:** state + reservation + KIF entry u transaction; outbox/idempotent post-commit side-effects; completion retry idempotentan i vraća status; reconcile job/dashboard za pending/unposted rows.

### BIZ-04 — Dug se pre-čita kao OPEN, a repayment transakcija nema conditional status guard

[`repayDebt`](../../backend/src/finance/client-debts.service.ts#L153-L194) provjerava `status === OPEN` izvan transactiona. U transakciji radi `clientDebt.update({ where: {id}, data: {status: SETTLED} })` bez `where: {status: OPEN}` ([L194-L203](../../backend/src/finance/client-debts.service.ts#L194)), a zatim kreira novi DEBT_PAYMENT `DailyLogEntry` i manual KIF stavku ([L205-L236](../../backend/src/finance/client-debts.service.ts#L205)). Pregledani schema nema unique constraint na `dailyLogEntry.debtId`/payment reference ([`schema.prisma#L403-L451`](../../backend/prisma/schema.prisma#L403), [`#L660-L720`](../../backend/prisma/schema.prisma#L660)).

**Uticaj:** dvije concurrent repayment operacije mogu obje proći stari OPEN read i napraviti dvije payment/KIF stavke. Race nije reproduciran.

**Popravka:** unutar transactiona prvo `updateMany({ where: {id,status:OPEN}, data: SETTLED })`; zahtijevati `count===1`; unique idempotency/debt repayment relation; reconciliation query; concurrency test sa dva clients/barrier.

### BIZ-05 — Loyalty redeem/earn concurrency i idempotency su slabi

- `redeemPoints` pročita `account.points`, zatim radi `points: { decrement }` u zasebnom update-u ([`loyalty.service.ts#L450-L495`](../../backend/src/loyalty/loyalty.service.ts#L450)).
- `redeemForReservation` prvo provjerava `reservation.loyaltyPointsUsed`, zatim kasnije čita account/services i mutira reservation/account ([`loyalty.service.ts#L500`](../../backend/src/loyalty/loyalty.service.ts#L500)); check/marker/debit nisu pokazani kao jedna guarded DB operation.
- `earnFromDailyLog` increment + transaction row postoji, ali nema inspected idempotency key/unique on `source` ([L183-L251](../../backend/src/loyalty/loyalty.service.ts#L183)).

**Uticaj:** concurrent redeem može prekoračiti bodove ili primijeniti isti reservation benefit dva puta; replay/recovery može duplirati earn. Nije database-reproduced.

**Popravka:** guarded atomic update (`points >= requested`), row lock/transaction, atomic reservation marker, unique idempotency key (`source operation + type`), earn/reversal tests.

### AUTH-01 — Public auth/email verification nema app-level throttling, verifikacijski kod je kratak i važi 24h

`AuthController` ima public register/login/verify-email (`auth.controller.ts#L37-L93`); `AuthService` koristi 6-digit code i 24h expiry ([L18-L20](../../backend/src/auth/auth.service.ts#L18), [L189-L244](../../backend/src/auth/auth.service.ts#L189)). U app kodu nije pronađen Nest throttler/rate-limit guard. External proxy/WAF limiter nije provjeren.

**Uticaj:** bez edge rate limit-a login/register/verification email endpointi mogu biti brute-force/spam target. Ne tvrdimo da produkcija nema proxy zaštitu.

**Popravka:** per-IP + per-account throttling, resend cooldown, verification attempt counter/short TTL, response normalization, abuse logging; prove edge limiter config. Dodati password reset account recovery kao odvojeni signed/one-time flow.

### AUTH-02 — Hardcoded admin-created initial password i backend ne provodi forced-change globalno

[`UsersService`](../../backend/src/users/users.service.ts#L212) defaultira praznu/izostavljenu admin password na hardcoded shared initial-password constant (linije 246-284; vrijednost namjerno nije ponovljena ovdje), vraća `initialPassword` u response-u i postavlja `mustChangePassword:true`. Frontend/mobile preusmjere UI na password-change, ali backend globalni JWT guard/strategy ne provjerava `mustChangePassword` (guard [`jwt-auth.guard.ts#L16-L23`](../../backend/src/common/guards/jwt-auth.guard.ts#L16), strategy [`jwt.strategy.ts#L21-L25`](../../backend/src/auth/strategies/jwt.strategy.ts#L21)); samo pojedini service tokovi provjeravaju.

**Uticaj:** više naloga kreiranih bez password inputa može dijeliti poznati initial password; direktan API client može pozivati rute uprkos forced-change UI redirect-u. Nije provjereno da li taj default korišten u production.

**Popravka:** random per-user one-time password/reset link generisan i prikazan jednom, bez global shared default; backend `MustChangePasswordGuard` allowlist samo change-password/logout/me; notify admin; expire/reset credentials gdje je primijenjeno.

## P2 — srednje / preventivno

### API-02 — Availability date range i random before/after query nemaju DB-work cap

- Authenticated availability-date flow prima `fromDate`/`toDate` i nema maksimalan broj dana u [`availability-dates.service.ts#L17-L43`](../../backend/src/reservations/availability-dates.service.ts#L17). Za svaki radni/eligible dan pokreće `getAvailableSlots` paralelno kroz `Promise.all` ([L89-L122](../../backend/src/reservations/availability-dates.service.ts#L89)). Public Reserve client šalje 60 dana ([`PublicReserve.tsx#L519-L530`](../../frontend/src/pages/public/PublicReserve.tsx#L519)), ali attacker može poslati širi range uz auth.
- Anonymous `random=true` before/after grana učitava sve eligible DailyLog IDs prije memory shuffle ([`daily-log-public.service.ts#L79-L112`](../../backend/src/daily-log/daily-log-public.service.ts#L79)). `limit` je capped, ali ID query nije; offset nije gornje ograničen.

**Uticaj:** database burst/memory/latency growth kada data volume ili caller range poraste; load test nije urađen.

**Popravka:** availability `MAX_RANGE_DAYS` (npr. 90), `from<=to`, query budget; bounded concurrency/batched SQL; random sampling u DB ili deterministic pagination/cache; rate limit anonymous gallery.

### BIZ-06 — Date-only UI koristi UTC ISO string umjesto salon calendar timezone

[`PublicReserve.tsx#L519-L530`](../../frontend/src/pages/public/PublicReserve.tsx#L519) uzima lokalni `new Date()` pa šalje `toISOString().slice(0,10)`. Isti obrazac postoji u stylist/month/date filters u frontend/mobile (npr. `frontend/src/features/stylist-portal/pages/stylist-stats-page.tsx`, `mobile/src/screens/stylist/StylistStatsScreen.tsx`). U `Europe/Sarajevo`, lokalni period 00:00–01:59 (zimsko/ljetno offset zavisno) serijalizuje prethodni UTC datum; month-start ranges mogu započeti zadnjim UTC danom prethodnog mjeseca. Backend availability/calendar/cron kod koristi i explicit salon TZ i process-local `getHours`/`getDay` ([`reservation-date.service.ts`](../../backend/src/reservations/reservation-date.service.ts), [`reservation-delay.cron.ts#L45-L53`](../../backend/src/reservations/reservation-delay.cron.ts#L45)); Dockerfile ne postavlja `TZ`.

**Uticaj:** off-by-one date filter/today/month totals i cron wall-time mogu se razlikovati oko ponoći/DST/deployment TZ. Ne navodimo da se svaki booking pomjera; tačan uticaj zavisi od route parse/UI filtera.

**Popravka:** `YYYY-MM-DD` date-only helper koji ne koristi `toISOString`; salon TZ (`Europe/Sarajevo`) kao business clock; persist date-only kao calendar date; sve Cron-e eksplicitno time-zone aware; tests oko 00:00, mjeseca, CET↔CEST DST boundary i process `TZ=UTC`/`Europe/Sarajevo`.

### BIZ-07 — Per-client same-day/capacity check je read-before-write bez DB exclusion

Availability i `assertClientDayBookingAllowed` prvo čitaju zauzeća, a create kasnije insertuje. Više requesta može proći check prije prvog commit-a. DB ima unique relation constraints za items/responses, ali reviewed Reservation schema nema Postgres exclusion constraint za stylist/date/time overlap. User-day rule je check u servisu, ne unique lock. E2E race nije urađen.

**Uticaj:** potencijalni double-booking/duplicate day booking pod simultaneous requests. Ovo je race kandidat, ne dokaz da su duplikati već nastali.

**Popravka:** confirmed slot occupancy model; use exclusion constraint na `tstzrange`/date+minutes gdje je model moguće mapirati, ili transactional advisory lock per stylist/date; retry 409; concurrent integration tests.

### BIZ-08 — Expense/Income book close i cancellation count imaju race kandidata

- Expense book `lockBook` čita `isClosed`, pa zatim unconditional update ([`expense-books.service.ts#L102-L118`](../../backend/src/finance/expense-books.service.ts#L102)); create/read/edit također provjeravaju lock odvojeno od write-a.
- `ClientCancellationCount` se prebroji pa upsert-uje apsolutna vrijednost u reservation shared service (nalaz u [HANDOFF §12-13](HANDOFF.md)); parallel cancel/reorder može izgubiti increment.

**Popravka:** conditional update/transaction + lock event; ledger create check i write u jednoj tx; counter `increment` atomically; test concurrency. Finansijski lock policy i staff cancellation edge cases trebaju owner sign-off.

### API-03 — Review može nastati bez završenog booking evidence-a

[`ReviewsService.create` L15-L55](../../backend/src/reviews/reviews.service.ts#L15) provjerava `reservationId` samo ako je poslan, zatim ownership; ne provjerava `COMPLETED`, service match ili reservation-linked uniqueness. Bez reservationId jedinstvenost je per user/service samo kroz pre-check (race bez unique constraint). `serviceId` i optional stylistProfile nisu vezani za završeni work record.

**Uticaj:** user može ocijeniti uslugu bez dokaza završene rezervacije; policy možda namjerno dopušta free-form review, pa business decision nije pretvoren u tehnički nalaz.

**Popravka:** owner odluči “verified booking” policy; ako je obavezna, zahtijevati completed reservation, potvrditi service/stylist relation i unique DB constraint per reservation/service; otherwise označiti review verified/unverified.

### OPS-01 — Scheduled jobs su process-local; duple instance mogu duplirati side-effects

`@nestjs/schedule` jobs su registrovani unutar aplikacijskog procesa; npr. minute reservation tick [`reservation-delay.cron.ts#L25-L37`](../../backend/src/reservations/reservation-delay.cron.ts#L25), monthly finance rollover [`income-cron.service.ts#L16-L21`](../../backend/src/finance/income-cron.service.ts#L16). Nema pregledanog distributed lock/queue adaptera/Redis cron lock-a. Dvije replike bi mogle istovremeno process-ovati istu batch operaciju; neke imaju idempotency/unique guards, druge treba pregledati.

**Popravka:** prvo osigurati idempotent job marker/DB conditional update; zatim single scheduler deployment ili DB advisory lock/Redis lock sa TTL + owner token; tests pod dvije instance.

### OPS-02 — Multi-recipient notifications/campaigns rade sekvencijalno u request-u bez queue/retry contract-a

`NotificationsService.sendToMany` čeka svaki `send()` u `for...of` ([`notifications.service.ts#L151-L161`](../../backend/src/notifications/notifications.service.ts#L151)); campaign tok takođe iterira recipients ([L319 onward](../../backend/src/notifications/notifications.service.ts)). Nema reviewed BullMQ/queue/outbox module.

**Uticaj:** spor request i partial sends kod SMTP/push failure; timeout/volume risk, ne dokaz trenutnog timeouta.

**Popravka:** persist campaign job + recipient cursor/outbox; worker concurrency/rate limits; per-recipient result and retry/idempotency; unsubscribe/preferences/privacy policy review.

### OPS-03 — Docker migrations se pokreću u API container start command-u

[`backend/Dockerfile`](../../backend/Dockerfile) u startup `CMD` pokreće `prisma migrate deploy` prije Nest procesa. Compose nema odvojeni migration job ni healthcheck. Ovo otežava rollout/multi-replica startup i readiness; schema backward compatibility treba deploy plan.

**Popravka:** odvojeni one-shot migration job, healthcheck/readiness, expand-contract migrations, non-root process, production dependencies prune; rollback plan. Ne dodavati prod auto-deploy.

### OPS-04 — Build-time database URL risk (code remediated in this branch; image check pending)

**Before this branch:** Compose passed `DATABASE_URL_BUILD` as a backend build arg and Dockerfile put that URL in runtime `ENV`, which could expose a real build value through image configuration/history. **Current code:** Compose no longer has a DB build arg; [`backend/Dockerfile`](../../backend/Dockerfile) uses only a dummy URL in the builder stage, and the runtime stage injects `DATABASE_URL` from environment. The `.dockerignore` excludes local env files and the archived MySQL migration SQL. No real URL value is documented here.

**Residual verification:** Docker CLI/image build is unavailable in this audit environment, so final `docker image inspect` was not run. With Docker available, assert final image `Config.Env` has no `DATABASE_URL`; retain runtime secret injection only.

### SCM-01 — NPM audit snapshot sadrži 61 advisory, među njima 2 critical

`npm audit --omit=dev --json` snapshot 2026-10-21:

| Paket | Total | Moderate | High | Critical |
|---|---:|---:|---:|---:|
| backend | 15 | 2 | 12 | 1 |
| frontend | 5 | 3 | 2 | 0 |
| mobile | 41 | 12 | 28 | 1 |
| **Ukupno** | **61** | **17** | **42** | **2** |

Critical examples: backend `proxy-addr` GHSA-jqcg-44mw-7w3h; mobile `shell-quote` GHSA-pqg4-j6r4-53mv. `npm audit fix` nije pokrenut; application reachability/exploitability nije runtime-proven. `npm audit` root-level ne radi jer nema root lockfile (`ENOLOCK`).

**Popravka:** inspect dependency paths (`npm explain`), upgrade direct dependencies/lockfiles u malim PR-ovima; test builds/native Expo compatibility; do not blanket `npm audit fix --force`; run post-upgrade audit + regression. Package-level `/tmp/beauty-salon-*-audit.json` samo je privremeni snapshot.

### A11Y-01 — Provjerene brand/text kontrast vrijednosti ispod WCAG AA normal-text cilja

Read-only `scripts/check_ui_contrast.py` izračunao je 23 odabrana source-token para; 9 je ispod konfigurisanog praga. Primjeri: web light primary/background **2.37:1**, muted-foreground/muted **4.40:1**, destructive-foreground/destructive **3.59:1**; mobile light gray400/white **1.88:1**, gold/white **2.21:1**, rose/white **2.73:1**, gray400/gray50 **1.80:1**; mobile dark gray600/black **3.78:1**. Normalni text cilj je 4.5:1; ring UI indicator cilj 3:1. To nisu kompletne rendered-pair provjere; dark mode, hover, opacity, image overlay, actual text size and accessibility tree nisu provjereni u browseru.

**Popravka:** token pair test nad computed CSS + native themes; izabrati tamniju text shade za primary/secondary/disabled labels; status boja + tekst/ikona; manual keyboard/screen-reader pass + axe/Playwright.

### I18N-01 — EN web resource nedostaje 182 od 290 BS leaf ključeva; mobile ima samo BS

`frontend/src/i18n/locales/bs.json`: 290 leaf keys; `en.json`: 108; missing EN: 182, extra EN: 0. Mobile resursi su samo `mobile/src/i18n/bs.ts`. i18next fallback/config može prikazati BS/key string pri odabiru EN; browser runtime language-switch test nije urađen.

**Popravka:** ključ parity check u CI (report-only dok baseline sređen); prevesti i provjeriti terminologiju; izvlačiti hardcoded UI stringove; product potvrdi da mobile ostaje BS-only ili dodati EN.

### TEST-01 — Web/mobile nemaju detektovane test suite-ove; backend E2E config nedostaje

Backend ima 53 Jest spec fajla, ali `test:e2e` target `backend/test/jest-e2e.json` ne postoji. Frontend/mobile nisu imali detektovane test suite fajlove. Browser/a11y, Expo device, API/DB integration i race testovi nisu izvršeni.

**Popravka:** phased test matrix u [TEST_WORKFLOW.md](TEST_WORKFLOW.md): route security contracts, Postgres integration, frontend Playwright + axe, mobile Jest/Expo device smoke.

### TEST-02 — Backend `npm run lint` je mutirajući i front/mobile lint scripts nisu instalirani

Backend lint script je prvobitno bio `eslint ... --fix`, što može mijenjati fajlove; frontend/mobile imaju ESLint komandu ali nisu pronađeni ESLint dependency/config. Lint nije validna CI gate dok se konfiguracija i baseline riješe.

**Popravka/stanje:** ovaj branch mijenja backend `lint` u read-only i dodaje `lint:fix`; `lint` nije CI gate dok errors ne budu uklonjeni. Mobile dobija `typecheck` script.

### DEV-01 — Vite source config and tracked emitted config could diverge for local proxy routes (fixed in this branch)

`SocketContext` defaults to same-origin when `VITE_API_URL` is empty and Socket.IO uses its default `/socket.io` path. The tracked `vite.config.js` and `vite.config.ts` had diverged; installed Vite resolves `vite.config.js` before `.ts`, while the `dev` script invoked bare `vite`. The committed JS had `/socket.io` but no `/uploads`; the TS source had neither. This made local behavior dependent on stale generated config and did not proxy local upload URLs introduced in the env template. This was a development-config discrepancy, not evidence of a production API outage.

**Fix applied:** `vite.config.ts` now declares `/api`, `/auth`, `/socket.io` (WebSocket upgrade) and `/uploads` proxies; frontend `dev`, `build` and `preview` scripts explicitly select `vite.config.ts`. A tracked emitted JS config remains generated by `tsc -b` as the repo currently tracks it. `npm run build` passes after the change; browser/Socket.IO live connectivity was not exercised.

### MOB-01 — Mobile API fallback `localhost` ne radi na fizičkom uređaju

[`mobile/src/services/api.ts#L5-L10`](../../mobile/src/services/api.ts#L5) defaultira `EXPO_PUBLIC_API_URL` na `http://localhost:3000`. Na fizičkom Android/iOS uređaju `localhost` označava uređaj, ne dev host. Emulatori takođe koriste platform-specific host mapiranja.

**Popravka:** dev/build profile mora setovati non-secret `EXPO_PUBLIC_API_URL`; startup/dev check upozori kad je `localhost`; documented Android emulator/iOS simulator/LAN config; no browser-facing localhost calls.

### AUTH-03 — Socket/HTTP security headers/CORS policy nije production allowlist-om kodirana

[`main.ts#L32-L35`](../../backend/src/main.ts#L32) koristi `origin: true, credentials: true`; [`events.gateway.ts#L13-L16`](../../backend/src/events/events.gateway.ts#L13) koristi wildcard origin + credentials. HTTP API token je u Authorization headeru (ne cookie) pa ne tvrdimo cross-site account takeover. Helmet/CSP/rate-limit/edge proxy policy nisu vidljivi u repo.

**Popravka:** explicit trusted origin allowlist per environment; Socket.IO auth test; safe security headers/CSP report-only rollout; document trusted proxy and CSRF/cookie decision.

## Pozitivni kontrolleri / postojeće zaštite

- Globalne HTTP routes JWT-guarded su defaultom; public routes moraju biti eksplicitne `@Public()`; HTTP strategy odbija inactive/missing user i učitava aktuelne role iz DB-a.
- Globalni validation pipe koristi whitelist + `forbidNonWhitelisted` + transform.
- Reservation lifecycle ima status helpers/FSM, availability i stylist lock flow; dashboard/client journey ne oslanja se samo na UI za većinu glavnih checks.
- DB ima unique relation constraints za service item/stylist response, unique income entry per `(bookId,dailyLogEntryId)` i monthly book period.
- Mobile auth token je u SecureStore; Android updater provjerava downloaded APK SHA-256.
- Expense/manual income ima audit entities/lock events; debt write-off zahtijeva admin/owner.
- `.gitignore` i index secret cleanup su već u worktree-u; service-account JSON je uklonjen.

## Nesuglasice postojeće dokumentacije (dokaz i korektivna radnja)

| Dokument | Nesuglasica na početku audita | Kod/repo dokaz i stanje nakon izmjene |
|---|---|---|
| `SOURCE_OF_TRUTH.md` | Aktivan `@prisma/adapter-mariadb`, Expo 55 i stariji post-faza snapshot; migration archive je naveden kao MySQL historija — taj path je tačan, ali nije aktivan migration path | `PrismaService` koristi `PrismaPg`, runtime odbija provider koji nije postgres; aktivne PG migracije postoje; `mobile/package.json` declares Expo `~57.0.14`; archive `backend/prisma/migrations_mysql_backup/` exists (34 tracked files). Root source-of-truth je ažuriran i archive je označen kao historijski. |
| `docs/codebase-map/REPO-TOOLING.md` | Opisivao deploy workflow na `master`, MariaDB, tracked secret paths i staru Docker topology | `deploy.yml` ne postoji; ovaj branch dodaje checks-only `ci.yml`; Compose/config su provjereni; secret cleanup nije rewrite-ovao Git historiju. Tooling map je ažuriran. |
| `docs/codebase-map/MOBILE.md` | Expo SDK 55 | Package declares Expo `~57.0.14`, React Native `0.86.2`; map je ažuriran. |
| `backend/POSTGRES_MIGRATION.md` | Tvrdio da je aktivna PostgreSQL migrations mapa namjerno prazna | `prisma/migrations/` sadrži baseline + blog SEO migraciju; historical MySQL archive postoji. Migration runbook je zamijenjen sigurnim opisom, bez tvrdnje o production data cutover-u. |
| `backend/README.md` | Generički Nest starter sadržaj i zastarjeli migration/run instructions | Backend-specific README je napisan; archive path je potvrđen i objašnjen kao inactive legacy history. |
| Presentation docs/user guides | Nekoliko MySQL/SDK55 i email-stub opisa | Diagrams now say PostgreSQL/Expo 57; obsolete SDK55 statements removed from guides; notification copy distinguishes existing `sendMail` code from unverified SMTP delivery. |
| `.cursor/plans/*.md` | Repo-root code paths bili su relativno linkani iz `.cursor/plans`; nekoliko lokalnih absolute paths/assets je zastarjelo | 299 existing repo-root code links su popravljeni; current asset/link/local path references su ispravljeni ili označeni kao historijski tekst; `check_doc_links.py` prolazi nad svim repo Markdown fajlovima. |

Root `SOURCE_OF_TRUTH.md` sada sadrži aktuelni repository snapshot i odvojenu historijsku milestones sekciju; audit dokumenti i kod ostaju granica za runtime claims.

## Granice i koraci za final proof

- Nije bilo live prod/QA HTTP testa, DB querya/migration runa, browser/manual screen-reader testa, PostgreSQL concurrency reprodukcije ni SMTP/FCM delivery testa.
- Prisma client generate/validate i backend test/build dio bili su blokirani sandbox TLS engine download-om/nedostajućim generated client-om. Nakon što je backend lint učinjen read-only, `npm run lint` je izvršen i exit 1 sa 6,418 problema (6,070 errors, 348 warnings); generated Prisma Client nedostaje u ovom sandboxu, pa broj nije nužno clean code-only baseline.
- Nema zaključka o produkcijskoj proxy/WAF rate-limit, SMTP config, DB grants, Redis ACL, backup, log retention, public domain response ili actual customer consent.
- Redis nije korišten/audit-runtime nije proveo connection. Kod/package/Compose pretrage nisu pokazale Redis wiring; opcionalni plan je [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).
- Nema ručnog DB mutationa, production API calla, `npm audit fix`, migration, `git history` rewrite, PR prema `master` ili merge-a.
