# Reproducibilan test workflow

**Datum:** 2026-10-25 (Europe/Sarajevo)<br>
**Audit evidence:** [FINDINGS.md](FINDINGS.md) · [Arhitektura](ARCHITECTURE.md) · [Implementation plan](IMPLEMENTATION_PLAN.md) · [CI scope](CI.md)

## 1. Test safety / preconditions

- Testirati samo na local/disposable DB i accounts. **Nikada ne koristiti production `DATABASE_URL`, production push tokens, SMTP recipients ili stvarne client fotografije.**
- Pri implementaciji koristiti ignored local env fajlove iz safe `.env.example`; nikad kopirati pravi secret u tracked file, log, screenshot ili test fixture.
- Testni data mora biti sintetički/anonymized i removable. Finance tests koriste isolated `beauty_salon_test` DB/period, ne shared DB.
- Novi GitHub backend job koristi kratkoživući PostgreSQL 16 service (`beauty_salon_ci`), koji se odbacuje po jobu. Ovo potvrđuje migracije i integration contract na CI verziji, ali **ne potvrđuje** PostgreSQL major verziju ili konfiguraciju deploymenta.
- DB-backed E2E suites (HTTP contracts and Socket.IO role revocation) read only `E2E_DATABASE_URL` and reject it before connecting unless PostgreSQL is on a loopback host and the database name contains a separate `test`, `e2e`, or `ci` segment. Never point this variable at a shared/production database.
- Ne pokretati `prisma migrate dev` na staging/production; deployment migrations imaju odvojenu runbook/review.
- Database tests/race scenarios ne pokretati paralelno nad istom DB schema-om osim ako test harness pravi per-worker DB/schema.

## 2. Baseline provedene u ovom auditu

- `npm ci --no-audit --no-fund` prošao u `backend/`, `frontend/`, `mobile/`.
- Backend DB-backed E2E coverage includes `backend/test/security-reviews-blog.e2e-spec.ts` and the role-revocation `backend/test/events.gateway.e2e-spec.ts`; Jest discovers both under `backend/test/jest-e2e.json`. SEC-01/SEC-07 passed against disposable PostgreSQL 16 in run `39683834085`; SEC-02 user-detail/client-list cases passed in run `39736393872`. The API-02 gallery route case seeds two synthetic completed entries and upload records, rejects fractional limits/offsets above 1,000, and checks page ordering plus `hasMore`; it passed in disposable-PostgreSQL CI run `39765885619`. A new bounded public-review HTTP case uses two synthetic approved reviews plus a pending review to check fractional/over-cap query rejection, legacy `approved=true` compatibility, approved-only safe projection, stable two-page ordering, default metadata and `hasMore`; it passed on disposable PostgreSQL in CI run `39778669381`. A new availability dates/slots HTTP case uses a synthetic salon/service/stylist schedule to check auth, range errors, and a valid response. Its first CI run (`39770636311`) reached the valid query (HTTP 200) but failed the exact response-body equality assertion. Source inspection found that a local-noon cursor was compared with a midnight `toDate`, omitting the inclusive final day. `AvailabilityDatesService` now normalizes `end` to noon and a date-only unit regression covers the issue; the availability dates/slots HTTP case and fix passed in disposable-PostgreSQL CI run `39771808375`. A report-only 10-parallel-request availability HTTP smoke sample that reports p50/p95/max to the CI summary passed in run `39773145965`; it is not sustained load testing. A separate 60-second synthetic availability/non-random-gallery soak sample (four concurrent requests per endpoint) passed in CI run `39775823675` after the first attempt (`39775340983`) hit a Supertest listener reset; it has no latency/throughput gate and is not production load testing. The sandbox has no disposable PostgreSQL; do not point these DB-backed suites at a shared or production database.
- Earlier narrow SEC-04 upload-delete source tests (`uploads.controller.spec.ts`, `uploads.repository.spec.ts`, `uploads.service.spec.ts`) pass locally: 3 suites/13 tests; CI run `39753417714` passed all jobs, but that run did not cover the upload DELETE route. SEC-04/PRIV-01 planner and synthetic temporary-filesystem specs pass 2 suites/27 tests (2026-10-23, after the Gallery allowlist regression). The helper tests path traversal/symlink rejection, directory/file modes, metadata-stripping public image copies, APK ZIP/hash/size verification, byte-identical private copies, idempotent copy validation, explicit cleanup and automatic cleanup after a later copy failure. Synthetic added coverage verifies that unmapped/orphan files under the new public root—including legacy `entity=public` source paths—are checksum-copied into private quarantine, removed from the public static root, restored if DB mapping rolls back, and that nested public-root symlinks plus symlinked cleanup parents fail closed. Latest combined SEC-04/PRIV-01 run (Gallery, public daily-log, consent, users/avatar, uploads, reviews/stylists, migration planner/filesystem and AppRelease) passes 10 suites/131 tests (updated 2026-10-23) using a temporary local Prisma enum/class stub and mocked service/repository boundaries; no database is used. Coverage includes linked-client, completed `SERVICE`, undeleted-entry and before/after eligibility in Gallery/direct-file/protected-consent paths; a distinct before/after pair requires two different actively consented images; one auto-publish category receives both API conflict handling and database-unique protection; direct Gallery uploads require non-client attestation while consented client photos use only the picker path; public avatar visibility is self-only, owner-bound and private by default; migration tests distinguish category-bound `PUBLIC` Gallery assets from legacy/unlinked uploads; and protected access denies OWNER/SYSTEM_ADMIN/uploader bypass after derivative revocation plus path traversal outside `private/consented/`. The gallery attestation is not automated person detection. The disposable-PostgreSQL HTTP suite has synthetic consented/unconsented Gallery entries, authenticated client revoke, immediate feed removal and direct-file 404 assertions, but was not run locally; the latest push-triggered CI attempts were blocked before jobs started by GitHub billing/spending-limit restrictions and provide no validation result. The strict isolated helper/planner/spec TypeScript check passes; the runner compiles with temporary Prisma model declarations but query implicit-any diagnostics had to be disabled because the stub has no generated query types. Generated Prisma client/build/schema validation remains unverified locally. Do not point any test at production/shared DB or volume. See [SEC-04 migration runbook](SEC-04-MIGRATION-RUNBOOK.md); it is a draft and its apply command must not be run until all backup/rollback/retention/classification cutover gates are signed off.
- API-02 prior CI evidence: the availability range/concurrency unit tests passed run `39758303548`; the non-random gallery query/page bounds passed run `39763455951`; the synthetic gallery HTTP contract passed run `39765885619`; availability date/slot HTTP plus inclusive-end correction passed run `39771808375`; report-only smoke/soak passed runs `39773145965`/`39775823675` (not production-load evidence); and public review pagination HTTP passed disposable PostgreSQL CI run `39778669381`. Current follow-on source covers blog/comments, service/stylist/category/subcategory/per-stylist-service pages, analytics ranges, both daily-log gallery modes, and approved HTTP rate limits. Its focused local command passes 19 suites/114 tests in both the default timezone and `TZ=America/Los_Angeles`, across date helpers, limiter, analytics, blog/comments, availability, reviews, catalog, and gallery; analytics UTC defaults, dashboard month buckets and years below 0100 are regression-tested. Frontend build passes (4,813 modules; 2,001.13 kB chunk advisory); mobile typecheck and E2E Jest discovery pass. The updated DB-backed suite was discovered but not executed locally because disposable PostgreSQL is unavailable. Push-triggered CI run `39829622132` for `b8c02fa` passed all four jobs, including Prisma generation/schema/migration/build, backend full unit suite, expanded DB-backed HTTP contracts on disposable PostgreSQL, repository checks, frontend build and mobile typecheck. The preceding `39828859848` failure was the now-corrected stale in-process blog-pagination contract. Actual Redis and production-load behavior are not tested. The indexed random-key gallery no longer materializes all eligible IDs, but its eligibility filters can still cause PostgreSQL to inspect ineligible rows. The approved request-rate budgets are in source; actual Redis and representative deployed load remain untested.
- Latest frontend `npm run build` passes (4,840 modules; 2,042.21 kB JS chunk advisory, 2026-10-26); mobile `npm run typecheck` passes.
- **BIZ-03 verification (2026-10-25):** six focused backend Jest suites/47 tests pass only with a temporary `@prisma/client` runtime stub and disabled `ts-jest` diagnostics; the combined 7 suites/60 tests (including the corrected ClientDebts fixture) also pass under that stub, and 18 targeted backend files pass syntax transpilation. Initial CI `40137063851` exposed three old `findUnique` stubs after the tx-safe book upsert change; test-only correction `dd5cef0` was pushed, then full CI `40137519486` passed all four jobs. Its disposable PostgreSQL run passed Prisma generation/schema/migrations, backend build/full unit suite and the complete DB-backed E2E with BIZ-03 trigger rollback/retry/read-only report cases. Frontend build (4,816 modules; 2,018.14 kB advisory), mobile typecheck/socket/multipart, repo hygiene and Markdown links pass. No production/shared DB is used.
- Mobile `npm run typecheck` passes after the review-page/load-more caller change.
- From `backend/`, `npm run test:blog-sanitizer` passes 2/2, `npm test -- --runInBand src/blog` passes 4 suites/16 tests, and `npm test -- --runInBand src/security/security-contract.spec.ts` passes 3 in-process Nest HTTP contract tests (real routing/JWT/role guards, mocked services; no database).
- SEC-06 settings verification: `npm test -- --runInBand src/settings` passes 2 suites/8 tests (SettingsService 6/6). The rerun used `npm ci --ignore-scripts` without a generated Prisma Client, so Jest received a temporary mock of only the `PrismaService` DI token; SettingsRepository, database calls, and Socket.IO runtime were not exercised.
- SEC-05 settings-key guard: the targeted `settings.service.spec.ts` and `settings.controller.spec.ts` suites pass 2/2 suites and 11/11 tests with a temporary Jest setup mocking only the `PrismaService` DI token. Tests cover missing, non-canonical and wrong-length key rejection before repository/event calls, empty-secret clearing, valid-key encryption and settings-controller regressions. The encryption service passes an isolated `tsc --noEmit` check; no DB was used. Default Prettier check reports both edited TS files as unformatted, but it reports the same for their `HEAD` baseline, so no broad reformat was applied.
- SEC-06 salon-event follow-up: `SalonService.update` coverage asserts the global event is key-only even when its service result includes holiday push metadata.
- SEC-06 live Socket.IO/revocation follow-up: `events.gateway.integration.spec.ts` runs a real ephemeral Nest/Socket.IO server but mocks `PrismaService.user.findUnique`. It verifies current-role room assignment, active stylist-profile gating, invalid/missing/inactive/non-expiring-token rejection, disconnecting all user sessions after simulated role/account revocation, and disconnect at JWT expiry.
- **SEC-06 DB-backed Socket.IO role/password revocation E2E (2026-10-25):** `backend/test/events.gateway.e2e-spec.ts` uses the actual `UsersService`/`AuthService`, Prisma, and an in-process Socket.IO server. Its existing case confirms the admin room is DB-derived, removing `SYSTEM_ADMIN` disconnects the session, and reconnecting with the same token does not restore admin access. The added password-change case starts a claimless legacy session, calls the real password-change service, verifies socket disconnection, verifies `AuthService.validateUser` rejects the claimless token and Socket.IO rejects that token on reconnect, and accepts the returned replacement token. Local DB execution was skipped; CI run `40236113107` passed all four jobs, including this E2E against disposable PostgreSQL. This synthetic test does not verify production/shared DB behavior, real Redis/cross-instance delivery, browser CORS, or deployment.
- **SEC-06 password-version local verification (2026-10-25; CI run `40236113107` passed):** backend targeted Jest passes 4 suites/24 tests (`auth.service`, password-version helper, JWT strategy, and gateway integration); scoped Prettier passes. Frontend production build passes; mobile typecheck and socket-recovery tests pass 6/6. The guarded DB-backed Socket.IO E2E passed in CI against disposable PostgreSQL and was intentionally not executed locally because no disposable PostgreSQL is configured.
- SEC-06 Redis adapter/config coverage: `redis-io.adapter.spec.ts` and `socket-io-runtime-config.spec.ts` pass 2 suites/10 tests with mocked Redis clients. They verify adapter attachment with the app-specific channel key, initial connection failure cleanup, readiness gating, local disconnect, mode/URL/ACL-credential validation and safe channel-prefix parsing. No Redis endpoint or multi-process Socket.IO cluster was started; network/ACL/TLS and cross-app channel isolation are not live-tested.
- Combined local backend `npm test -- --runInBand src/events src/users src/stylists src/settings src/salon` passes 11 suites/42 tests using a temporary Jest setup that mocks only the PrismaService DI token; no real DB is queried. `npm ci --ignore-scripts --no-audit --no-fund` installed 963 locked backend packages; generated Prisma Client was not produced.
- Web and mobile reconnect policy tests: `npm run test:socket-recovery` passes 6/6 in each app using Node's built-in test runner, a fake Socket.IO socket, and injected timers. Coverage includes server disconnect, Redis readiness/transport errors, capped exponential delays, `Unauthorized` stop, success/reset, and client cleanup. These are deterministic unit tests, not browser/device or live Socket.IO/Redis/DB tests.
- Targeted Prettier/ESLint and isolated TypeScript checks pass for the new Redis adapter/config/main wiring. Other backend lint remains limited by the missing generated Prisma Client and pre-existing diagnostics; do not broad-autofix.
- Compose YAML parsing confirms the backend joins external `db_net` and `redis_net` and passes `SOCKET_IO_MULTI_INSTANCE`, `SOCKET_IO_REDIS_URL` and the per-environment channel prefix; this parses configuration only, not live network reachability. Push-triggered CI runs `39653882891`, `39654632552` and `39655079268` initially failed at backend build; run `39655630416` after the `payload.exp` type-guard fix passed all four jobs. Documentation-only runs `39655988745`, `39656281443`, `39656492431` and `39656768762` also passed. Repository hygiene, backend Prisma generation/schema/build/sanitizer/Jest, frontend production build and mobile typecheck all passed. The local combined targeted Jest run is 11 suites/42 tests; local gateway ESLint remains affected by missing generated Prisma types, while targeted adapter/config/bootstrap lint and isolated TypeScript checks pass. No real Redis or production DB was used.
- Browser-enforced CORS, Playwright, mobile device, real SMTP/push, PostgreSQL race and production endpoints are untested.
- `npm audit --omit=dev --json` bilježi findings u [FINDINGS.md § SCM-01](FINDINGS.md#scm-01--npm-audit-snapshot-sadrži-61-advisory-među-njima-2-critical); `npm audit fix` nije pokrenut.

## 3. Machine/tool prereqs

- Node.js 22.x (usklađeno s backend Docker builder); npm included version; Git.
- PostgreSQL: disposable instance iste major verzije kao deployment za migration/integration workflow.
- Docker/Compose po želji za local DB/E2E; audit sandbox nema Docker CLI, zato Docker workflow nije lokalno izvršen.
- `npm ci` se pokreće odvojeno po svakoj aplikaciji — nema repo root lockfile/package.
- Prisma engine/client prvi put može zahtijevati pristup npm/Prisma engine downloadu. U audit sandboxu TLS prekinuo engine preuzimanje; ponoviti u standardnom CI/dev networku ili preconfigured cache-u, ne koristiti neprovjeren generated artifact.

## 4. Čista instalacija i baseline checks

```bash
cd backend && npm ci --no-audit --no-fund
cd ../frontend && npm ci --no-audit --no-fund
cd ../mobile && npm ci --no-audit --no-fund
```

Nakon promjena: `git status --short` i `git diff --check`; pregledati da `npm ci` nije izmijenio lockfiles/untracked generated files.

### Static repo checks (branch deliverables)

```bash
python3 scripts/check_repo_hygiene.py
python3 scripts/check_doc_links.py
python3 scripts/check_i18n.py --strict        # web BS/EN leaf-key parity gate
python3 scripts/check_ui_contrast.py --strict # checked source-token pairs are a CI gate
```

`check_i18n.py --strict` je CI gate samo za web BS/EN resurse (747 leaf ključeva po jeziku); mobile language scope ostaje otvoren i mobile resursi nisu dio ovog checka. Runtime language-switch/fallback i šira pokrivenost UI stringova provjeravaju se odvojeno. `check_ui_contrast.py --strict` je CI gate za imenovane source-token parove; frontend `npm run test:brand-colors` pokriva dinamičke HEX override-e. Kontrastne provjere nisu rendered-UI/axe/manual dokaz. Repo hygiene check je gate od početka.

## 5. Backend local test sequence

### 5.1 Prisma client, schema i compile

U `backend/` i uz local disposable env:

```bash
npm run db:generate
npm run db:validate
npm run build
npm run lint
```

- `db:generate` mora završiti prije Jest suite-a koji importuje `@prisma/client`.
- `db:validate` čita Prisma config/schema, ne dokazuje konekciju/permissions/target deployment status.
- `npm run lint` je read-only nakon ovog audit tooling change-a; `npm run lint:fix` je namjerno mutirajući i pokreće se samo kad se želi automatsko uređivanje. Prvobitni backend lint baseline imao je hiljade diagnostics uz missing client; prvo generisati client i klasificirati/fixati baseline.
- Build ne zamjenjuje tests ni migrations test.

### 5.2 Unit suite

```bash
npm run test:blog-sanitizer
npm test -- --runInBand src/blog
npm test -- --runInBand src/security/security-contract.spec.ts
npm test -- --runInBand src/settings
npm test -- --runInBand src/salon
npm test -- --runInBand src/users src/stylists
npm test -- --runInBand src/reviews/reviews.service.spec.ts src/reviews/reviews.controller.spec.ts src/reviews/dto/public-reviews-query.dto.spec.ts
npm test -- --runInBand src/events/events.gateway.integration.spec.ts
npm test -- --runInBand
```

The Node test runner is used for the direct sanitizer regression because the current Jest CJS runtime cannot load sanitize-html's ESM parser dependency directly; blog Jest specs and the new DB-backed HTTP suite mock only the sanitizer utility, while the Node test exercises the real package. BlogService tests verify create/update/public-read paths call the sanitizer. The original in-process security contract suite starts a local Nest HTTP app with the actual JWT/role guards but mocked data services; it checks route status/response boundaries, not Prisma queries or DB behavior. Run the independent sanitizer regression before the full Jest suite so its result is retained if a later suite fails. Očekivanje nakon generated client/network setup-a: pokrenuti cijeli backend Jest suite (`src/**/*.spec.ts`); test fail se istražuje, ne preskače radi zelenog statusa. Coverage:

```bash
npm run test:cov -- --runInBand
```

`backend/test/jest-e2e.json`, `backend/test/security-reviews-blog.e2e-spec.ts`, and `backend/test/events.gateway.e2e-spec.ts` are present. `npm run test:e2e -- --runInBand` runs the DB-backed security/business HTTP contracts (including booking/BIZ-02 and daily-log/BIZ-03) plus Socket.IO role- and password-revocation coverage. Do not run the command without a dedicated disposable PostgreSQL database; the E2E suites fail fast unless `E2E_DATABASE_URL` uses loopback PostgreSQL and a database name containing a `test`, `e2e`, or `ci` segment. CI provisions its own PostgreSQL service and applies migrations automatically.

### 5.3 PostgreSQL migration/integration suite

1. Use a fresh local disposable PostgreSQL database (e.g. `beauty_salon_test`) and confirm the service is loopback-only. Never copy production data or reuse a shared application database. CI uses its per-job PostgreSQL 16 service; deployed PostgreSQL version remains unconfirmed.
2. Set `DATABASE_URL` for Prisma migration commands and `E2E_DATABASE_URL` for the HTTP suite to the same disposable local test DB. Do not print either URL; `E2E_DATABASE_URL` is required and the test refuses remote/non-test URLs.
3. From `backend/`, run:

```bash
npm run db:validate
npm run db:migrate:deploy
npm run db:migrate:status
npm run test:e2e -- --runInBand
```

4. The E2E suite creates unique synthetic users, category/service, reviews, posts/comments, booking and BIZ-03/BIZ-05 loyalty fixtures, then deletes those fixtures. The BIZ-03 case uses temporary PostgreSQL triggers at daily-log update, reservation update, KIF insert/totals update, loyalty EARN insert and outbox insert boundaries; failures assert rollback, followed by completion retry and read-only reconciliation. The BIZ-05 case uses disposable data to check reservation replay and rejection of a changed second redemption, concurrent manual redemption without a negative balance, daily-log redemption replay/marker, manual adjustment replay, a temporary loyalty-ledger trigger failure with balance rollback/retry, daily-log earn replay/reversal/recompletion generations, negative-balance and marker/transaction reconciliation, OWNER-vs-CLIENT access, and unchanged balance/ledger counts across repeated read-only reports. It does not run `prisma/seed.ts`, use production data, call Redis, SMTP, push, browser, or deployment endpoints. Canonical `CLIENT`/`OWNER` role rows are upserted in the disposable DB and may remain there. BIZ-03 passed full CI `40137519486`; BIZ-05 and the complete suite passed CI `40140672041` against disposable PostgreSQL. BIZ-08 adds synthetic finance-book/cancellation fixtures: the suite pauses a KIF manual-entry and a KUF expense insert with disposable PostgreSQL triggers during close, checks one audit per concurrent lock/unlock transition, verifies closed-book write rejection and confirms 12 parallel cancellation increments. BIZ-08 DB-backed E2E and all four CI jobs passed in run `40181315467` on disposable PostgreSQL; first run `40180891191` exposed test-only cancellation mock/fixture leakage, corrected in `2949b16`. Do not run these tests against production/shared data.
5. CI workflow is configured to apply tracked migrations to a new empty PostgreSQL service before E2E tests; existing mocked unit tests remain a separate step.
6. After local execution, stop/drop the disposable DB/volume; do not leave the URL pointing at a shared service.

### 5.4 Obavezni backend security/business contract tests

| Area | Test matrix |
|---|---|
| Public reviews | Anonymous list/authenticated detail; approved vs pending isolation; serializer omits password hash, verification data, email/phone/social IDs; default/max page size, offset cap, deterministic order and `hasMore` metadata. |
| Users/clients | CLIENT self/other, STYLIST, OWNER/ADMIN; forbidden field absence; default/max pagination. |
| Debt privacy | Own stylist/other stylist/unrelated client/admin matrix; policy expectation confirmed by product owner. |
| Uploads | Anonymous public asset vs private document, owner/other-owner delete, attachment referenced delete, MIME spoof/size/traversal, retention. |
| Before/after | No consent hidden, consented visible, revoked hidden, deleted/completed policy, response paths. |
| Blog/comments/reviews | Public defaults published/approved only; admin preview protected; `sanitizeBlogContent` allows intended formatting but removes active HTML, unsafe protocols/attributes; legacy public slug content is sanitized too; HTML payloads inert. |
| Auth | Missing/weak production secrets fail startup; rate limits; verification expiry/replay; reset token single-use; forced password blocks protected mutation endpoints. |
| Socket.IO | Anonymous sees only allowlisted/projected public events; PRIVATE setting never broadcast; DB-backed role-removal test verifies disconnect and no admin-room/settings access after reconnect; password-change `pwdv` invalidates claimless/stale sessions and replacement token can reconnect; expired/revoked token rejected. The role-revocation E2E passed against disposable PostgreSQL in CI run `40233753136`; the password-change E2E passed against disposable PostgreSQL in CI run `40236113107`. Live Redis/cross-instance behavior is not covered. |
| Booking | Inactive service rejects; stale slot; policy/penalty; multi-service duration; idempotent retry; cancelled/lock expiry. |
| Booking race | `N` simultaneous requests to same one-capacity stylist/date/time: one active booking; legal separate stylist capacity remains available. |
| Daily log/KIF | Inject failure at each state transition; retry completion yields exactly one KIF entry/loyalty earn; outbox retry is idempotent. |
| Debt repayment | Two concurrent repayment requests result in one settlement/payment/ledger entry; repeat idempotency key returns prior result. |
| Loyalty | Concurrent manual redemption leaves a non-negative balance; reservation and daily-log markers commit with one idempotent ledger row; manual adjustment/reversal replay is idempotent; reversal/recompletion uses a fresh generation key; read-only reconciliation reports negative balances and marker↔transaction mismatches without writes. |
| Finance book | Close-vs-expense write, close-vs-manual income, double lock/unlock, cancellation count parallel increment. |
| Time | `TZ=UTC` and `TZ=Europe/Sarajevo`; 00:00–02:30 local, month boundary, CET/CEST transitions, business date filters. |

**BIZ-06 local + synthetic evidence (2026-10-25):** the shared Node date suite passes 6/6 under each process TZ; 16 focused backend Jest suites/124 tests pass under both TZs using a temporary Prisma runtime stub with `ts-jest` diagnostics disabled. Frontend production build and mobile typecheck pass. Local Prisma generation remains TLS-blocked, but CI run `40220450677` passed generated Prisma Client, schema validation, all migrations, backend build/full unit suite and DB-backed HTTP E2E on disposable PostgreSQL, plus frontend build/typecheck, mobile typecheck and repository checks. The `hire_date` migration ran in disposable CI; the owner separately reports manually applying it successfully. That report is not independently verified, and the agent did not access the owner’s database. No production/shared/development user DB, real Redis, browser/CORS or deployment was accessed.

**OPS-03 readiness/container checks (2026-10-25; synthetic CI run `40224124967` passed):** focused `AppController` Jest passes 1 suite/4 tests, covering successful migration-ledger readiness, missing tracked migration and generic DB-error responses. The DB-backed HTTP suite includes an unauthenticated readiness assertion and passed in CI against disposable PostgreSQL. The container-check built both Docker targets, inspected non-root/config separation, and passed Node-only runtime/migrator module checks; it did not start the API, run the image migration command, or connect either image to a DB. The wider backend CI generated Prisma, validated schema/migrations, built, passed DB-backed HTTP E2E and full unit tests; frontend, mobile and repo jobs passed. Local `npm run build` remains invalid because the sandbox generated client is incomplete (797 diagnostics); Docker CLI is unavailable locally. No production/shared DB, real Redis, browser/CORS, Docker deployment or host-volume test was run.

**OPS-01 single-replica cron guard (2026-10-25; synthetic CI run `40227330516` passed):** local targeted Jest passes 2 suites/33 tests: four decorator-metadata checks assert `waitForCompletion: true`, and reservation service regressions cover successful conditional timeout transition, reorder timeout and the lost-race path where no counter/notification runs. CI passed backend generated-client build, schema/migrations on disposable PostgreSQL, full unit + DB-backed HTTP suites, frontend, mobile and repository jobs. The CI tests do not start scheduled ticks or run a two-instance scheduler/PostgreSQL race; the owner reports one intended backend replica, not independently verified. No schema migration, production/shared DB or deployment was used.

Use transaction barriers/two Prisma clients for race tests. A pair of sequential Jest mocks does not prove a PostgreSQL race is closed.

## 6. Frontend workflow

### Current checks

```bash
cd frontend
npm run test:socket-recovery
npm run test:brand-colors
npm run test:registration-errors
npm run test:locale-formatting
npm run test:reservation-errors
npm run test:client-reservation-errors
npm run test:admin-api-errors
npm run test:profile-api-errors
npm run test:i18n-language
npm run build
npm run lint
```

- `test:socket-recovery` uses Node's built-in runner and needs no additional dependency; it verifies the reconnect controller, not React rendering or browser/Socket.IO server behavior.
- `build` executes `tsc -b` and `vite build`; preserve and review Vite bundle-size warning. The frontend Docker image must be built with the repository root as context: frontend modules import `shared/business-date.mjs` outside `frontend/`. CI run `40229785202` passed the Docker image build from that root context and the primary Compose context assertion.
- `lint` is not an established gate until ESLint dependency/config are present and legacy errors resolved. The command must not mutate source.
- `test:socket-recovery`, `test:brand-colors`, `test:registration-errors`, `test:locale-formatting`, `test:reservation-errors`, `test:client-reservation-errors`, `test:admin-api-errors`, `test:profile-api-errors`, and `test:i18n-language` use Node's built-in test runner. Locale-formatting tests cover BS/EN date-only, weekday, date-time, number and KM amount output; the error mappers cover known auth, booking, client-action, admin user/stylist, and profile errors plus localized fallbacks. `test:i18n-language` covers BS/EN normalization, safe preference persistence, runtime i18next switching and fallback to Bosnian resources. These tests do not exercise the React switcher or localized pages in a browser; rendered/mobile viewport and keyboard acceptance remain open.

### Add as implementation progresses

- Vitest/RTL component tests for auth/role gates, booking step validation, inactive catalog filtering, amount/date helpers, locale/theme.
- Playwright public/admin/stylist smoke tests against disposable seeded API; do not test through a real production API.
- Security contract tests must verify API response schema independently from what UI renders.
- `@axe-core/playwright` for automated WCAG checks + manual keyboard/focus/contrast/zoom/screen reader review.
- Network/timezone tests use explicit test clock/timezone; do not rely on runner local timezone.

Suggested browser flows: public home/services/blog/reviews; login/onboarding/forced password; client booking and cancellation; stylist inbox/accept/daily log/debt; owner finance close/audit; settings and brand image safety.

## 7. Mobile workflow

### Current checks

```bash
cd mobile
npm run test:socket-recovery
npm run test:stylist-daily-log-entry-form-errors-i18n
npm run test:stylist-daily-log-entry-form-pickers-i18n
npm run typecheck
npm run lint
```

`typecheck` script is added in this branch; equivalent baseline command `npx tsc --noEmit` passed. `test:socket-recovery` uses Node's built-in runner and passes 6/6 for the mobile controller; it does not require a database, Redis or device. Focused localization source-contract tests are registered individually in `mobile/package.json` and `.github/workflows/ci.yml`; `test:stylist-daily-log-entry-form-errors-i18n` covers daily-log editor validation/error resources and guards its edit/create/error-passthrough contracts, while `test:stylist-daily-log-entry-form-pickers-i18n` checks client/service picker copy and preserves filtering/selection behavior (2 tests each). These are source-contract checks, not React Native rendering or device locale tests. `lint` remains non-gating until ESLint is installed/configured.

### Add as implementation progresses

- Jest + React Native Testing Library with Expo preset for stores, API error handling, navigation/auth guards, booking form, date helpers, consent visibility, locale/theme.
- Expo compatibility check (`npx expo-doctor`) in environment with working registry/network; audit sandbox Expo compatibility command failed at TLS network stage.
- Android emulator and iOS simulator smoke where available; test physical-device API URL (`localhost` is not host machine), deep links, secure token storage, push permission denied/accepted, foreground/background notification, APK hash mismatch/release optional update.
- Accessibility: large font, TalkBack/VoiceOver, labelled controls, contrast in light/dark/system, reduced motion, error announcement, minimum touch target.
- Do not create a production EAS build as a CI side effect; use an approved manual release profile.

## 8. Dependency audit workflow

Per package, from its directory:

```bash
npm audit --omit=dev --json > /tmp/<app>-audit.json
npm audit --json > /tmp/<app>-audit-all.json
```

`npm audit` can exit non-zero when advisories exist; preserve/parse JSON, do not treat that as a shell interruption. Evaluate each advisory by direct/transitive path, affected version, fix range, actual runtime/build reachability, Expo compatibility and lockfile diff. Apply targeted upgrades one app at a time; run build/unit/native compatibility and post-update audit. Never run `npm audit fix --force` or bulk major updates without a reviewed upgrade matrix. Root `npm audit` is invalid because no root lockfile exists.

## 9. Accessibility, locale and privacy review

1. `check_i18n.py --strict` enforces leaf-key parity for the web BS/EN resources. Web `LanguageSwitcher` stores the normalized selection in `localStorage` (`APP_LOCALE`), and `test:i18n-language` covers normalization, storage failures, runtime i18next switching and Bosnian fallback. Manual browser checks for initial preference after reload, public/admin/stylist shell rendering, responsive placement, keyboard use, long text and diacritics remain required. Mobile locale scope is not included and remains an owner decision.
2. `check_ui_contrast.py --strict` recalculates 44 named web/mobile source-token pairs, including light/dark semantic badges and status labels. `frontend/src/utils/brand-colors.test.mjs` tests custom HEX normalization, light/dark text derivatives and focus-ring variants. These are source/helper tests only: they do not inspect computed browser styles, opacity/gradient composition, every component pairing, axe output or device rendering.
3. Run axe/browser across public home, public booking, admin settings and finance, plus color contrast with computed styles.
4. Manual check keyboard-only, focus order/visible focus, error summary, labels, `aria-live`, zoom/reflow, disabled states, high contrast and reduced motion.
5. Mobile TalkBack/VoiceOver, device font scaling, display contrast and touch target review.
6. Verify before/after consent and private upload policy with product/privacy owner before any public-data migration.

## 10. CI acceptance and artifact safety

- CI workflow uses read-only checkout, Node 22, package-local npm ci, branch/manual trigger, no deployment/SSH/GitHub write token, and no production secrets.
- The configured backend job provisions disposable PostgreSQL 16, generates Prisma Client, validates the schema, applies tracked migrations, builds the backend, runs the sanitizer and DB-backed HTTP/Socket.IO E2E suites, then runs backend unit tests. Other jobs run repository hygiene/static reports (including strict web locale parity), web/mobile socket-recovery checks, frontend brand-color, registration-error, locale-formatting, public-reservation-error, client-reservation-error, admin-api-error, profile-api-error, and i18n-language Node tests plus the frontend build, and mobile typecheck. CI run `40233753136` passed all four jobs with the DB-backed role-revocation test included; run `40236113107` passed all four jobs with the password-change E2E included. These are synthetic/disposable checks only. Backend CI also runs `scripts/check_backend_container.sh` with synthetic Compose values, builds and inspects local `runtime`/`migrator` images, and performs Node-only container metadata checks; it does not connect those images to DB or deploy. Flaky/external SMTP/FCM/Expo tests are mocked.
- PostgreSQL integration tests must use the per-job disposable service and synthetic fixtures; never add shared Redis credentials or production secrets to CI.
- npm audit findings are reported in a separate/manual scheduled workflow until existing critical advisories have a reviewed action plan; do not hide current critical counts with a broad allowlist.
- Locale parity and selected contrast checks are strict CI gates. Promote lint and additional frontend/mobile component/E2E checks after their baselines and disposable-test setup are repaired.
- Workflow must not deploy, merge, open a PR, push to `master` or act on production.

## 11. Final local release checklist

- [ ] `git status --short`; no `.env`, service-account or signing secrets staged/tracked.
- [ ] `git diff --check`.
- [ ] `python3 scripts/check_repo_hygiene.py` passes.
- [ ] `npm ci` in each app from committed lockfile.
- [ ] Prisma generate/validate, all backend unit tests and build pass.
- [ ] Database migrations apply to empty disposable DB of deployment major; migration SQL reviewed.
- [ ] Booking/finance concurrency and security response tests pass.
- [ ] Frontend build/component/e2e/a11y and mobile typecheck/test/simulator checks pass.
- [ ] Dependency upgrades reviewed and full audit snapshot retained in approved CI artifact, no secret data.
- [ ] Manual security/privacy/accessibility/product owner sign-off.
- [ ] Manual deployment/merge decision by user; no automatic workflow.
