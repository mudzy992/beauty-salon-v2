# Fazni implementacijski plan

**Datum izrade:** 2026-10-21 (UTC)<br>
**Ulaz:** [FINDINGS.md](FINDINGS.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [TEST_WORKFLOW.md](TEST_WORKFLOW.md)<br>
**Stanje:** fazni plan; Phase 0A `SEC-01` review-response containment i Phase 0C `SEC-02` client-data minimization implementirani su u source branch-u, ali nisu deployani/live-tested. `SEC-03` debt scope traži owner policy odluku; ostali booking/finance/security fixes ostaju planirani. Repo dokumentacija, read-only checks i no-deploy CI takođe su pripremljeni.<br>

## 1. Principi i redoslijed

1. **Zaštititi korisničke podatke prije feature rada:** prvo `SEC-01`, `OPS-SEC-01`, `SEC-02`–`SEC-08`, `PRIV-01`.
2. **Transakcijska DB konzistentnost prije paralelizacije/queue-a:** prvo idempotency i PostgreSQL concurrency tests, pa background processing/Redis.
3. **API sigurnost ne zavisi od web/mobile UI-a:** svi access/status/ownership/business pravila se validiraju backend-om.
4. **Backward-compatible migrations:** expand → deploy app that supports old/new → data backfill → contract; backup/restore rehearsal prije finansijskih schema promjena.
5. **Mjeriti, ne pretpostaviti:** svaki severity nalaz se zatvara acceptance testom; runtime/production incident status posebno potvrđuje operator.
6. **No automatic deployment:** GitHub Actions isključivo radi verifikacije; vlasnik sistema odlučuje o ručnom merge-u i deploymentu.
7. **Redis je ograničen na odobrenu Socket.IO multi-instance funkciju:** PostgreSQL ostaje source-of-truth; produkcijski adapter zahtijeva runtime `SOCKET_IO_REDIS_URL` osim eksplicitnog single-instance override-a. Prije deploymenta potvrditi Redis ACL/network/persistence/availability; druge Redis namjene ostaju uslovne.

Severity P0/P1/P2 i finding IDs definisani su u `FINDINGS.md`.

## 2. Faza 0 — sigurnosno containment / kritični podaci

**Cilj:** zatvoriti javni account-data leak i credential/privacy exposure prije normalnog feature release-a. Hotfix se može isporučiti odvojeno od većih schema radova.

### 0A. Public review response hotfix — `SEC-01`

**Branch progress:** approved public list/featured responses use a safe display projection; review detail is no longer `@Public()` and therefore requires the global JWT guard; moderation reads are separated to `GET /api/reviews/admin` guarded for `SYSTEM_ADMIN`/`OWNER`. Admin web/dashboard callers use the admin route. Targeted service/controller tests pass (9 review-specific tests). HTTP/DB and deployed-version validation remain pending; see `HANDOFF.md`.

- `GET /api/reviews/:id` is authenticated-only in this branch (no `@Public()`); the product owner may later decide whether approved display detail should be anonymous, but absent that confirmation it stays protected.
- **Implemented:** public list/featured and authenticated detail use an explicit allowlist; no `include: { user: true }`, account fields or ownership/reservation IDs.
- **Implemented:** public review list is fixed to `where: {isApproved:true}`; moderation list is role-guarded on a separate endpoint.
- **Partial acceptance:** 9 review-specific tests inspect approved filters/projection and route metadata, including the non-public detail regression. Still required: HTTP integration tests with generated Prisma client (anonymous detail must return 401; approved detail with JWT must return the safe projection; unapproved detail must return 404).
- **Incident check (owner):** review access logs / deployed app version / exposure window; do not infer exfiltration from source code.

### 0B. Credential incident response — `OPS-SEC-01`

- Credential owner identifikuje sve vrijednosti koje su ikad commitovane (Git history i artefakti/image/cache).
- Revokovati/rotirati Firebase Admin key, DB user password, JWT signing secret, SMTP credentials i ostale stvarne secrets koji su bili prisutni; provjeriti access logs/audit.
- JWT rotation planira access token revocation/re-login; ne ostavljati stari/new secret istovremeno bez key-id/dual-key strategije.
- **Encryption key:** prije `APP_SETTINGS_ENCRYPTION_KEY` promjene export+decrypt/encrypt dry-run svih `enc:v1` settings; verified backup; fail on malformed ciphertext; staged rotation with restore plan.
- Ne history-rewrite prije dogovora sa remote/deploy/clone ownerima; ako se radi, obavijestiti sve klonove i očistiti build/log artifacts.
- **Acceptance:** secret owner potvrdio revocation/version; app boot radi sa novim secretima; previous keys fail; ciphertext decrypt/roundtrip tests; logs ne sadrže secret.

### 0C. PII response minimization i debt scope — `SEC-02`, `SEC-03`

- **SEC-02 implemented on this branch:** shared client picker selects only `id`, username/display fallback, first/last name and gender; page/pageSize/q are validated and bounded, and the total client count is not exposed to stylist callers. Admin user management uses a separate admin/owner-only endpoint and UI-only allowlist without password/token/social IDs.
- Targeted service/route role tests and frontend build pass; live HTTP/DB response tests and generated Prisma typecheck remain pending.
- `GET /api/client-debts?clientId=` (`SEC-03`): product/finance owner must confirm whether stylist may see salon-wide debt or only debt linked to their reservations/daily log. Implement policy in query, not just note masking.
- **Acceptance still pending:** DB-backed role matrix tests (CLIENT self/other, STYLIST related/unrelated, OWNER/ADMIN); forbidden-field HTTP assertions; pagination performance regression.

### 0D. Upload isolation + before/after consent — `SEC-04`, `PRIV-01`

- Odvojiti public image assets od privatnih finance/docs/avatar/operational uploads; postojeće URL-ove mapirati prije promjene.
- Private download je authed + role/attachment-owned ili signed URL sa kratkim TTL; upload row/path ne smije omogućiti download preko `/uploads/*` bez auth.
- Delete-by-ID/path prima current user, provjerava owner/role/reference, cascade/soft-delete + audit; reference check prije unlink.
- MIME header nije vjerodostojan: sniff signature, allowed extensions/MIME pairs, safe generated filename, reject executable/HTML; SVG rasterize ili vetted sanitize library. Malware scan/quarantine prema hosting mogućnosti.
- Consent schema: `consentedAt`, purpose/version, actor/source, revokedAt (policy se usaglašava). Existing rows se backfill-uju na `not public`; admin UI eksplicitno prikazuje consent state; revoke odmah uklanja iz public API.
- **Acceptance:** anonymous direct URL ne može dohvatiti private document; random other authenticated user ne može delete; referenced upload safe; no-consent image absent; revocation hides it; upload content-type mismatch rejected. Migrate safely uz backup.

### 0E. Auth, secrets, HTML/SVG — `SEC-05`, `SEC-08`, `AUTH-01`, `AUTH-02`

- Production startup fail-closed za missing/weak `JWT_SECRET` i missing/invalid 32-byte base64 encryption key. Remove shared signing fallback from code/config; local dev uses ignored env.
- Add explicit backend `MustChangePassword` policy allowing only change-password/logout/profile bootstrap routes until changed; do not rely on React Router/Expo redirect.
- Replace shared initial password constant with cryptographically random per-user invite/reset flow; display secret once only through protected admin workflow; never log/replay it. Audit affected users and reset if used.
- Add per-IP/account throttling on login/register/verify/resend/reset, resend cooldown and verification attempt limit/short TTL; confirm reverse-proxy trusted IP handling before IP limit.
- Implement secure password-reset (one-time high entropy token, hashed at rest, short expiry, atomic consume, email enumeration-safe response) and add email verified policy separately.
- Render blog as plain text/Markdown or use allowlisted sanitizer on write and at output; safe URL protocol/attribute policy; sanitize campaign email templates. Use CSP report-only then enforce after allowlist.
- Inline user SVG: avoid `dangerouslySetInnerHTML`; prefer `<img>` or rasterized output. If inline required, vetted SVG parser/allowlist and fuzz/test malicious payloads.

**SEC-08 source progress (2026-10-21):** blog write/public-read sanitization and the SVG no-inline rendering change are implemented on this branch; unit/regression results and exact policy are in [FINDINGS.md](FINDINGS.md#sec-08--stored-html-xss-na-javnom-blogu-i-inline-svg-source-mitigations-runtimedeployment-unverified). Browser-level payload testing, CSP rollout, production/runtime validation, and any email-template HTML review remain open. This does not mark the entire Phase 0E complete.

**SEC-05 narrow source progress (2026-10-21):** following the approved limited scope, non-empty secret settings writes now require a canonical Base64 key decoding to exactly 32 bytes; a missing/invalid key raises before repository upsert, while an empty value can still clear the secret. No startup policy, JWT fallback, password/logout UX, decryption path, or existing DB value was changed. The targeted settings suites pass 2/2 suites and 11/11 tests with only the Prisma DI token mocked; the encryption service passes an isolated TypeScript check. Details and residual risks are in [FINDINGS.md](FINDINGS.md#sec-05--jwt-hardcoded-fallback-i-tajna-settings-enkripcija-fail-open-djelimicna-source-mitigacija). Startup validation, JWT fallback removal, and legacy-secret/key-migration work remain open and are not implied complete. This does not mark the entire Phase 0E complete.

- **Acceptance:** integration tests missing env boot failure, weak env boot failure, forced-password blocked route matrix, rate-limit 429/cooldown, password reset single-use/replay denial, browser-level stored-XSS payloads rendered inert, supported rich text regression.

## 3. Faza 1 — DB/business consistency and idempotency

**Cilj:** financial ledger, reservation, daily-log, loyalty have single authoritative committed state and replay safety.

### 1A. Reservation create/availability — `BIZ-01`, `BIZ-02`, `BIZ-07`

- Centralize service eligibility; enforce `Service.isActive`, active category/subcategory and allowed stylist-service relation in create/availability **and** final write transaction.
- Make reservation + service items + stylist responses + points debit/marker atomic in PostgreSQL transaction. Do not send SMTP/push/Socket.IO inside retryable transaction.
- Add idempotency key for client create; unique DB constraint; retries return same booking result.
- Lock per stylist/date/slot or introduce a normalized slot-claim model. Review capacity/business rules first: multiple stylists, multi-service duration, salon-wide capacity, response/lock expiry, reschedules, canceled statuses.
- Candidate DB enforcement: PostgreSQL exclusion/unique model after schema design, not a blind `UNIQUE(date,startTime)` (that would block valid separate stylists). Create collision-safe migration with lock/canary strategy.
- Add outbox row in same transaction for reservation-created/availability-changed and delivery workers in later phase.
- **Acceptance:** at least 20 concurrent requests to same one-capacity slot produce exactly one active booking; different eligible stylists can book same time; inactive service rejects; reschedule/cancel frees occupancy; retry with same idempotency key creates no duplicate.

### 1B. Daily-log, KIF and reservations — `BIZ-03`

- Define authoritative state transition and transaction contract for `DailyLogEntry` + linked Reservation + `IncomeBookEntry`/KIF sync + loyalty ledger state.
- Refactor `IncomeSyncService` to accept tx-bound Prisma client or implement dedicated domain transaction; avoid nested client transactions.
- Completion is idempotent: second call returns completed result and runs/reconciles missing durable side effects rather than throws after partial state.
- Persist outbox jobs transactionally for email/receipt/realtime; retry idempotently.
- Create reconciliation report for legacy completed logs missing KIF/loyalty and duplicate/partial rows before automatic repair.
- **Acceptance:** injected failures at each write boundary rollback local records or leave explicit retryable outbox status; repeated completion produces exactly one ledger entry/earn; response and DB align.

### 1C. Debt repayment/write-off — `BIZ-04`

- In one transaction, conditional claim debt `OPEN -> SETTLED`, assert updated count 1, create exactly one debt-payment daily-log and manual KIF entry keyed by idempotency key.
- Add database-level unique constraint/idempotency model that handles existing rows and any reversal/repayment policy; validate duplicates before migration.
- Make all related ledger row creation fail/rollback together; expose a reconciliation path for existing cases.
- **Acceptance:** concurrent two repayments yield exactly one success and one conflict; retry same request returns same outcome; no duplicate daily-log/KIF entries; failed insert rolls back settlement.

### 1D. Loyalty — `BIZ-05`

- Use conditional `updateMany`/row lock `points >= delta`; transaction stores balance mutation + transaction row + reservation/daily-log marker.
- Add explicit `idempotencyKey` for earn/redeem/reversal/adjust operations. Existing `source` text is display/reference, not uniqueness guarantee.
- Use integer point math and decimal price math consistently; document rounding order and cap calculation; prevent concurrent tier recalc lost updates.
- Add reconciliation for negative balances, markers without transaction, transaction without marker.
- **Acceptance:** two concurrent redemptions never drive negative balance; same reservation cannot redeem twice; replayed daily-log completion does not earn twice; reversal/recompletion idempotent.

### 1E. Finance book closure — `BIZ-08`

- Make expense/income writes check lock within the same transaction as create/update/delete; closing uses conditional update/lock event with one winner.
- Cancellation counters use atomic increment or transactionally derived counts; avoid read-set overwrite.
- Confirm opened/closed book policy, time zone and audit requirement with finance owner.
- **Acceptance:** close-vs-write concurrency leaves no unlogged write into a closed book; two cancellations both counted; lock/unlock audit exactly one event.

## 4. Faza 2 — API contracts, privacy defaults, catalog policy

**Cilj:** public and role-scoped endpoints return only fields/data that caller should see.

**SEC-07 branch status:** public blog list is published-only with an explicit display projection; public comments are approved-only and require a published parent; draft detail, all-post list and unfiltered comments are admin/owner guarded. Admin callers use dedicated routes. Targeted tests/builds pass; HTTP/DB/deployment validation remains pending.

- Public blog/reviews/comments default to published/approved only; separate admin preview/moderation routes. (`SEC-07`)
- Public service/stylist lists/detail require active profile and explicit display DTO; do not return stylist email/phone unless product owner requires them. (`API-01`, `BIZ-01`)
- Review policy decision: verified booking required? If yes, require matching client, COMPLETED status, exact service and stylist; enforce unique reservation/service. If no, mark review verified/unverified and throttle. (`API-03`)
- Audit every Prisma `include`/`findMany` returning User/Upload/SalonSettings: use response DTO allowlists; add `select` guard tests.
- Add pagination and strict query validation to public lists/availability/gallery/comments/reviews/analytics; use request budgets and maximum `limit`/date range. (`API-02`)
- Normalize API response shapes and errors with OpenAPI contract snapshots (not all client-specific types in controllers).
- **Acceptance:** contract tests enumerate anonymous/client/stylist/admin fields; hidden/draft/inactive rows never returned on public routes; list caps verified with high row count.

## 5. Faza 3 — Realtime, security headers, deployment topology

**Cilj:** keep Socket.IO/HTTP/containers consistent with API authorization and secrets.

**SEC-06 partial source progress (2026-10-21):** `SettingsService.set` globally broadcasts only non-secret `PUBLIC` setting values and sends key-only invalidation for `PRIVATE`/secret settings to the `admin` room; `SalonService.update` emits only a key-only salon invalidation instead of the full salon/holiday record. `EventsGateway` validates active user/current DB roles, requires an expiring JWT, disconnects authenticated sockets at expiry, and admits `STYLIST` to its room only for an active stylist profile. Known `UsersService` and `StylistsService` account/role/profile eligibility changes disconnect that user's sockets after the DB change. A Redis Socket.IO adapter is now provided for multi-instance room operations: production defaults to multi-instance and requires `SOCKET_IO_REDIS_URL`; `SOCKET_IO_MULTI_INSTANCE=false` is an explicit single-instance override. Socket.IO/service tests use mocked Prisma, and the Redis adapter/config tests use mocked clients; no real Redis or deployed multi-instance test has run. The final combined local run passes 11 suites/42 tests (details in `TEST_WORKFLOW.md`). Push-triggered CI runs `39653882891`, `39654632552` and `39655079268` exposed `TS18048` for optional `payload.exp` in `EventsGateway`; commit `7bc4eaf` added an explicit numeric guard. The subsequent run `39655630416` passes all four jobs, including backend build/sanitizer/full Jest, frontend build, mobile typecheck and repository checks; documentation-only runs `39655988745`, `39656281443` and `39656492431` also pass. Real Redis/database/deployment behavior remains unverified. The user selected automatic web/mobile socket recovery after server disconnects, using the current token so each backend handshake rechecks DB state, bounded exponential backoff for transient adapter/transport failures, and no retry on `Unauthorized`. Both app-local controllers now disable Socket.IO Manager reconnection, retry server/transport disconnects and non-`Unauthorized` connect errors with 1s/2s/4s/5s-capped backoff, and stop on exact `Unauthorized`. Node regression suites pass 6/6 per app; frontend production build and mobile typecheck pass. These checks do not exercise live Redis, DB, browser/device, or deployment. No auth/logout UX change was made. Password-change token invalidation, the anonymous `public` room policy, browser CORS allowlisting, real DB behavior and Redis failover remain open; Phase 3 acceptance criteria are not complete.

- Settings events broadcast only `PUBLIC` values or key-only invalidation; private setting event to `admin` room; Salon payload projection to public DTO. (`SEC-06`)
- Socket handshake verifies active account/current DB roles; no anonymous `public` data channel unless explicit event allowlist; role revocation disconnects/re-auths existing sockets; test JWT expiry/revoke/role change.
- CORS uses environment allowlist for HTTP and Socket.IO; set trusted proxy explicitly; add security headers/CSP with safe staged rollout. (`AUTH-03`)
- Remove DB URL runtime `ARG`/`ENV` from image; build with dummy `DATABASE_URL` only for Prisma generation; audit built image metadata. (`OPS-04`)
- Use separate one-shot migration job; API readiness healthcheck follows migration; non-root runtime user; production-only dependency prune; ensure `/uploads` permissions and private mount.
- If horizontal replicas: DB advisory lock or a dedicated job runner ensures one scheduler, but only after all jobs idempotent. (`OPS-01`, `OPS-03`)
- **Acceptance:** anonymous socket cannot observe private values; stale role loses admin stream; CORS only configured origins; image config has no database credentials; no migration race on startup; healthcheck reports DB readiness.

## 6. Faza 4 — Time zone and bounded background work

**Cilj:** calendar date and wall time use salon timezone consistently; messaging load does not hold HTTP request open.

- Create one date-only utility for browser + mobile, using `YYYY-MM-DD` calendar components and explicit salon time zone where “today” is business-defined. Remove business date conversions via `toISOString().slice(0,10)`. (`BIZ-06`)
- Backend distinguishes `Date` (instant) from date-only values; use `ReservationDateService`/zoned utilities consistently. Remove process-local getters from salon business paths or explicitly set `TZ=Europe/Sarajevo` in each runtime plus still test UTC.
- Make every `@Cron` timezone-explicit; define catch-up behavior at month boundary; use idempotent job markers; test DST spring gap/fall overlap and late-night hours.
- Cap availability date range; bounded slot query concurrency; optimize anonymous random before/after query. (`API-02`)
- Move multi-recipient push/email campaign into durable job/outbox; per recipient status/attempt count, concurrency/rate limits, backoff/jitter, DLQ/manual retry, cancellation and progress. (`OPS-02`)
- **Acceptance:** date-range snapshots same in `TZ=UTC` and `TZ=Europe/Sarajevo`; expected salon dates around midnight/month/DST; HTTP campaign returns accepted/job ID quickly; worker failure resumes without duplicate notifications/charges.

## 7. Faza 5 — Accessibility, contrast, localization

- Accessibility token table with tested foreground/background pairs for light/dark and dynamic brand override; adjust colors to WCAG AA normal text and UI component thresholds; use text+icon for status not color-only. (`A11Y-01`)
- Add web keyboard/focus/labels/error/status live-region tests; React Native accessible roles/labels, touch target and font scaling tests; manual VoiceOver/TalkBack journey.
- Translate missing 182 web EN keys and decide mobile language scope; automate leaf parity check. (`I18N-01`)
- Replace hardcoded user-visible strings in errors/toasts/forms; test long strings, Bosnian diacritics, pluralization, locale dates/currency, fallback.
- **Acceptance:** no missing locale keys; contrast automation no newly failing tokens and owner-approved legacy exceptions; Playwright+axe baseline; manual booking/profile/screen-reader signoff.

## 8. Faza 6 — Tests, tooling and CI gates

**Repo branch groundwork (implemented):** this branch adds read-only hygiene/Markdown-link/i18n/contrast scripts, safe env/build contexts, an explicit mobile typecheck and a non-deploy CI workflow. Local script/build checks pass where the sandbox permits; backend Prisma runtime CI has not yet run on GitHub. Phase 0A `SEC-01` and Phase 0C `SEC-02` are the first application security fixes on this branch; other P0/P1 application fixes remain unmodified.

- Keep `npm ci` lockfile-based; use Node 22 and each app workspace independently.
- **Completed on this branch:** `npm run lint` is read-only, `lint:fix` is explicit, and mobile `typecheck` exists. Backend lint still reports 6,418 diagnostics in the sandbox without generated Prisma Client; add/repair frontend/mobile ESLint configs/deps and promote lint only after baseline cleanup. (`TEST-02`)
- Restore/create backend E2E config `backend/test/jest-e2e.json`; PostgreSQL CI service with empty disposable DB for migrations/integration; keep unit tests with mocks fast.
- Add frontend unit/component + Playwright browser smoke; mobile Jest/Expo component tests and device/simulator smoke. (`TEST-01`)
- Add security contract tests for each P0/P1 response; DB-backed two-client concurrency suite; a11y and i18n checks; upload/HTML fuzz corpus.
- CI should be branch-scoped/manual as appropriate, least permissions, read-only, no secret/deploy environment, no `pull_request` to `master`, no auto merge/deploy; upload test/build artifacts only if useful and safe.
- Dependencies upgrades are separate small changes with advisory paths and Expo SDK matrix; no blanket force upgrade. (`SCM-01`)
- **Acceptance:** clean branch CI passes from lockfiles; code generation/migration reproducible from empty DB; tests cover security/finance/booking; CI has no deploy/SSH credentials.

## 9. Faza 7 — odobreni Socket.IO Redis adapter i uslovne dodatne namjene

User confirms the global Redis container is `redis-core` on standard port `6379` on the same Docker host, reachable through external Docker network `redis_net`; other applications have their own ACL users/prefixes/workers. Compose now attaches only this backend to `redis_net` in addition to its existing `db_net`. This is user-reported topology, not a runtime connectivity check. Do not put credentials in repo/docs.

**Terminology:** `SOCKET_IO_MULTI_INSTANCE=true` refers to multiple running instances/replicas of this same backend, not to multiple unrelated applications using the shared Redis server. Check the deployed backend container count before choosing the in-memory single-instance override.

### Use cases that can justify Redis

- **Rate limiting** shared by multiple backend replicas (if in-memory limiter is insufficient).
- **BullMQ** notifications/campaign jobs after transactional outbox/idempotency and operational metrics are in place.
- **Socket.IO Redis adapter implemented on this branch:** production Compose explicitly defaults `SOCKET_IO_MULTI_INSTANCE=true` and requires `SOCKET_IO_REDIS_URL`; `SOCKET_IO_MULTI_INSTANCE=false` selects process-local single-instance mode and may not be combined with a Redis URL. `SOCKET_IO_REDIS_CHANNEL_PREFIX` is passed as the adapter key (default `beauty-salon-v2:<NODE_ENV>`; Compose defaults to `beauty-salon-v2:production`) so multiple applications/environments can isolate Pub/Sub channels. Runtime rejects URLs without a non-default ACL username/password. Adapter readiness/reconnect/config tests use mocks; no real Redis endpoint, cross-instance delivery or deployment has been validated.
- **Distributed scheduler lock** only after job operations are idempotent; PostgreSQL advisory lock is a reasonable alternative.

### Conditions before use

- Owner reports `redis-core:6379` on external `redis_net`; this branch attaches the backend container to that network. Still verify container DNS/reachability, Redis TLS state/version, the dedicated ACL user, backend replica count, memory/eviction policy, persistence, HA/failover, backup and monitoring in a non-production environment.
- Create a dedicated least-privileged ACL user specifically for this app's Socket.IO adapter, separate from other apps and BullMQ workers; provide its username/password only through runtime secret storage, never the default user. The adapter uses Pub/Sub channels, not Redis key storage. Candidate command permissions for current `@socket.io/redis-adapter@8.3.0` + `redis@6.3.0`: `HELLO`, `PUBLISH`, `SUBSCRIBE`, `PSUBSCRIBE`, `UNSUBSCRIBE`, `PUNSUBSCRIBE`, and `PUBSUB NUMSUB`; verify against the actual Redis version and a non-production ACL before applying. `CLIENT SETINFO` is attempted by node-redis but its failure is explicitly ignored.
- Use a unique `SOCKET_IO_REDIS_CHANNEL_PREFIX` per app/environment (all replicas of the same app/environment share one value); use a different prefix/user for staging or other apps. This prefix scopes Pub/Sub channels, not Redis keys. Redis 7.4.11's ACL check matches a `PSUBSCRIBE` pattern literally against an ACL channel rule, so a broad `&<prefix>*` rule allows matching literal channels but does not by itself authorize the adapter's subscription pattern. For the adapter key `<prefix>` in the root namespace, include the exact `&<prefix>#/#*` rule; also scope literal request/response channels, e.g. `&<prefix>-request#/#` and `&<prefix>-response#/#*`. Validate with `ACL DRYRUN` against the actual adapter channels before deploying. Do not widen channel access to `&*`.
- Queue jobs have idempotency keys, retry ceilings, DLQ, alerting, metrics, operator replay; Redis loss/restart is exercised.
- Add integration tests with ephemeral Redis, but CI should not require shared environment Redis.

### Do not use Redis for

- Financial ledger authoritative balances or book lock state.
- A replacement for DB transactions/unique constraints.
- Long-lived user PII cache with no expiry/purge policy.

**Acceptance before production adapter use / additional Redis workloads:** verify the approved adapter endpoint, ACL/network, data classification, failure model, secret path, monitoring and restart/failover behavior in a non-production environment. Any Redis use beyond the existing Socket.IO adapter still requires an architecture decision record, owner approval, operational plan and measured need; no real Redis validation has occurred in this work.

## 10. Release/rollback gates

### Before implementing or deploying any phase

1. Make a sanitized prod-like backup and verify restore in a non-production DB; do not run tests against production.
2. Review exact Prisma SQL and constraint lock duration; seed anonymized test data only.
3. Capture current P0 routes/ledger integrity baseline for incident/reconciliation; no secrets in logs/fixtures.
4. Use additive migration/feature flag; deploy code compatible with old/new schema; run data backfill with count/hash checks.
5. Run full [TEST_WORKFLOW.md](TEST_WORKFLOW.md), app owner signoff, then manually deploy.

### Rollback

- If new DB constraints fail or booking/finance errors rise: disable affected feature flag/endpoint, preserve outbox/audit rows, do **not** silently reverse settled ledger rows or drop data; use forward repair migration.
- Revert app code only while schema remains backward compatible; roll back additive schema only after proving no dependent rows.
- After security hotfix, do not restore the old vulnerable endpoint on rollback; use maintenance/disabled route instead.
- Monitor 4xx/5xx, failed reservations, orphan service items, debt payment duplicates, KIF reconciliation, queue retries/DLQ, sockets and upload 403/404 rates.

## 11. Business/privacy decisions requiring owner answers

Do not resolve these by assumption during implementation:

1. Which account fields (if any) may appear on public stylist profile (email/phone)?
2. Can any stylist see any client's open debts, or only debts linked to their services?
3. Must public reviews require a completed reservation, and can one reservation review multiple services/stylists?
4. Is explicit opt-in required before before/after images become public? How are legacy images handled and consent withdrawn?
5. Are PDF/Office uploads intended to be public or only finance users? Who may delete and how long to retain?
6. What is actual deployed PostgreSQL major, trusted proxy/rate limit, production TZ, job replica count and source of backups?
7. Does mobile need English; what are required minimum text contrast/tone for brand palette?
8. Is Redis shared service approved for application usage; which ACL user/key prefix/HA guarantees apply?

## 12. Stable finding-to-phase map

| Finding | Target |
|---|---|
| SEC-01, OPS-SEC-01 | Phase 0A–0B |
| SEC-02, SEC-03 | Phase 0C |
| SEC-04, PRIV-01 | Phase 0D |
| SEC-05, SEC-08, AUTH-01, AUTH-02 | Phase 0E |
| BIZ-01–BIZ-05, BIZ-07–BIZ-08 | Phase 1 |
| SEC-07, API-01, API-03, API-02 | Phase 2 |
| SEC-06, AUTH-03, OPS-03–OPS-04, OPS-01 | Phase 3 |
| BIZ-06, OPS-02 | Phase 4 |
| A11Y-01, I18N-01 | Phase 5 |
| TEST-01–TEST-02, SCM-01 | Phase 6 |
| Redis optional (no finding/mandatory dependency) | Phase 7 |
