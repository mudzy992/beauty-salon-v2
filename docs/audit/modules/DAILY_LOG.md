# Daily Log module audit

- **Review date:** 2026-11-06
- **Audited revision:** source inventory at `845f1b347a2afb155d2f811c0a0fe224c3f75f55`; remediation status recorded through `114013495c14eb6599373f67a7c0ae3f3788b9bf`.
- **Status:** source review complete for the scoped API and current web/mobile consumers; DL-01, DL-02 and DL-04 are fixed in source and CI-verified; DL-03 and DL-05 remain open.
- **Scope:** `backend/src/daily-log/` controllers, DTOs, services and focused tests; directly connected upload access checks; web `features/daily-log` and `features/stylist-workbook` callers; mobile stylist daily-log list, create, detail, disposition and statistics callers.
- **Verification boundary:** source inspection, focused DTO validation tests/lint, and the repository CI run listed below only. No production/shared database, live API, browser, physical-device, concurrency or load verification was performed.

## Summary

Several safeguards are present: a stylist can read/mutate only entries belonging to their own stylist profile; completion locks and re-reads the entry and commits its status, KIF entry, loyalty earning and durable completion outbox event together; debt settlement uses conditional debt claims and a transaction; a partial unique index prevents multiple SERVICE entries for one reservation; and the public before/after gallery requires active, purpose- and policy-version-matched consent before returning consent-file routes. Private upload reads separately enforce uploader/record relationship or privileged access.

The source review also found missing class-validator metadata on request fields that current first-party clients send. That made manual entry creation and the disposition route reject otherwise valid requests under the global strict whitelist. The input-validation defect, split-write creation flow and future-restore scheduling/atomicity are fixed in source. Disposition atomicity and unbounded list reads remain open.

## Findings

### DL-01 — Strict DTO whitelist rejected supported Daily Log fields (P1, fixed in source and CI-verified)

- **Evidence before remediation:** `backend/src/main.ts` enables `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`. `CreateDailyLogEntryDto.isManual` and `DailyLogDispositionDto.applyPenalty` had no validation decorators. Current manual-create callers in `mobile/src/screens/stylist/DailyLogNewEntryScreen.tsx`, `frontend/src/features/daily-log/use-daily-log-form.ts`, and `frontend/src/features/stylist-workbook/pages/workbook-new-entry-page.tsx` send `isManual`; mobile and workbook disposition callers send `applyPenalty`. Those fields were consequently treated as non-whitelisted and rejected before reaching the service. `AddDailyLogImageDto.sortOrder` likewise had no validator and was rejected if supplied.
- **Impact:** supported first-party manual-create and disposition requests could fail at DTO validation; optional image ordering could not be submitted. This is a source-level conclusion; no deployed HTTP request was made.
- **Fix:** commit `9ae383b` adds `@IsOptional()` plus `@IsBoolean()` for `isManual` and `applyPenalty`, and `@IsInt()` plus `@Min(0)` for `sortOrder`. `backend/src/daily-log/dto/daily-log-input-validation.dto.spec.ts` exercises these bodies with the same strict whitelist/forbid settings, including invalid negative/fractional image ordering.
- **Verification:** focused Jest suite passed (1 suite, 3 tests); targeted ESLint and `git diff --check` passed. CI run `42177289515` passed all four jobs, including generated Prisma/schema/migration checks on disposable CI PostgreSQL, backend build/unit/HTTP tests, frontend, mobile and repository checks.

### DL-02 — Daily Log creation was split across independent writes (P2, fixed in source and CI-verified)

- **Evidence before remediation:** `DailyLogService.create()` and `createFromReservation()` created the entry before separately writing service items, optional loyalty/debt effects, and selected-debt settlement.
- **Fix:** commit `3983336` now runs both creation workflows in a single Prisma transaction. The entry, service-item rows, loyalty redemption, tip adjustment, debt creation, debt claims, debt-payment entries and KIF manual entries are all written using the same transaction client. `settleDebtsAndCreateLedgerEntries()` accepts an existing transaction client instead of opening a nested transaction. Debt notifications are sent only after commit.
- **Regression coverage:** two focused service tests inject a child-item/debt failure and assert that creation and related writes use the transaction client and no debt notification is sent before a successful commit. CI run `42181025320` passed all four jobs, including generated Prisma Client, backend build/full unit and DB-backed HTTP suites, frontend, mobile and repository checks. These focused tests are unit/failure-injection tests; no dedicated disposable-PostgreSQL rollback scenario for these create paths was run.
- **Residual:** manual creation still has no request idempotency key, so this change prevents partial database state but does not eliminate duplicate entries after an ambiguous network retry. Debt notifications are sent after commit but are not tied to a durable outbox event, so a process failure in the post-commit gap could omit the notification. No production incident/data corruption was observed or checked.

### DL-03 — Disposition soft-deletes the Daily Log entry separately from its reservation transition (P2, open)

- **Evidence:** `DailyLogDispositionService.dispose()` calls `DailyLogAdminService.softDelete()` and only afterwards runs `applyStylistCancel`, `applyClientCancel`, `applyNoShow` or `applyDirectReorder` (`daily-log-disposition.service.ts`). The pending entry soft-delete and reservation mutation are separate DB operations; cancellation/no-show helpers also perform penalty and notification side effects around their reservation update (`daily-log-disposition-apply.ts`).
- **Impact:** if a later operation fails, the request may leave the entry deleted while the reservation remains in `AWAITING_DAILY_LOG`, or may commit the reservation transition while a later penalty/notification operation fails. This is a source-level partial-failure window; no incident was reproduced.
- **Acceptance direction:** make the entry and reservation state changes plus any database penalty-counter update atomic, and dispatch external notifications only after commit. Add rollback/failure-injection tests for each disposition family; retain the existing role/status checks and reorder conflict checks.

### DL-04 — Future restore could orphan the reservation or race a competing booking (P2, fixed in source and CI-verified)

- **Evidence before remediation:** `DailyLogRestoreService.restoreAsReservation()` checked stylist conflicts and then separately created a reservation, optional service-item rows, and the Daily Log link. It did not use the normal reservation date coordination lock or a client-day booking policy check.
- **Impact:** concurrent booking/restore attempts could both pass the preflight conflict read, and an intermediate write failure could leave a reservation without its restored Daily Log link. This was a code-path risk, not a reproduced race or observed orphan.
- **Fix:** commits `7421e55` and `1140134` put the future-restore flow in one Prisma transaction. It row-locks and rechecks that the Daily Log entry is still deleted, acquires the same transaction-scoped salon-day advisory lock as reservation creation, rechecks stylist conflicts and client-day booking policy on the transaction client, and performs code allocation, reservation creation, service-item writes and Daily Log relinking atomically.
- **Regression coverage:** `daily-log-restore.service.spec.ts` covers the transaction path and both service-item/link writes, failure before Daily Log relinking, and a concurrent restore that finds the source entry already restored. CI run `42183179155` passed all four jobs, including generated Prisma Client, backend build/unit and DB-backed HTTP suites. The failure-injection test is unit-level; no concurrent restore-vs-create test on disposable PostgreSQL was performed.
- **Verification boundary:** source and unit/CI verification only. No production database or live concurrency test was performed.

### DL-05 — Authenticated Daily Log list endpoint has no result bound (P2, open)

- **Evidence:** `DailyLogService.findAll()` in `backend/src/daily-log/daily-log.service.ts` applies optional date/stylist/deleted filters and calls `dailyLogEntry.findMany()` with no `take`, page contract or maximum date range. The relation include contains entry items, debt payments, client/stylist/reservation, images and upload metadata. Current web, mobile and workbook list/statistics callers generally send date windows, but the API permits both dates to be omitted; the web date filters can also be cleared.
- **Impact:** an authorized caller can request an arbitrarily large matching history and its nested relations, growing database work, response size and client memory with retained history. First-party default date windows reduce routine exposure but do not bound the API contract. No production-volume or load test was performed.
- **Acceptance direction:** inventory all array-response consumers and choose a compatible pagination or bounded-window rollout. If introducing a paginated envelope, migrate and test web/mobile/workbook/statistics consumers first; do not silently truncate the existing array response.

## Verification and remaining gates

- 2026-11-06 — Confirmed before implementation that local branch, `origin/master`, and `origin/arena/657dba19-beauty-salon-v2` were aligned at `845f1b3`; no uncommitted changes existed.
- 2026-11-06 — DTO remediation committed/pushed as `9ae383b`; focused Jest (3/3), targeted ESLint and diff check passed; CI `42177289515` passed all four jobs.
- 2026-11-06 — Atomic creation remediation committed/pushed as `3983336`; Prettier and diff checks passed. Local service Jest execution was blocked because the generated Prisma Client is absent (`.prisma/client/default`); CI generated Prisma Client and run `42181025320` passed all four jobs. No standalone DB rollback test was added for this slice.
- 2026-11-06 — Future-restore atomicity remediation committed/pushed as `7421e55`, with a TypeScript nullability correction in `1140134`; Prettier and diff checks passed. The first CI build exposed the narrowing issue; final CI run `42183179155` passed all four jobs, including backend build/unit and DB-backed HTTP suites. Local Prisma Client generation was blocked by unavailable access to the Prisma binary host, so generated-client build/test verification was performed in CI.
- No production/shared database access, live HTTP, browser, physical-device, runtime concurrency or load verification was performed.
- **Separate carried gate:** RES-02 in [`RESERVATIONS.md`](RESERVATIONS.md) remains intentionally deferred until one full successful release cycle after the owner-reported 2026-11-04 redeploy is confirmed. This Daily Log review did not alter the Reservations compatibility decision.
