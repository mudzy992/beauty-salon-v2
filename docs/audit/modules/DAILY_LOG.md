# Daily Log module audit

- **Review date:** 2026-11-06
- **Audited revision:** `9ae383baaa3fb6911b4d375b4961a08a6d0f32b1` for the DTO remediation; adjacent write/read-flow evidence was inspected at this revision.
- **Status:** source review complete for the scoped API and current web/mobile consumers; DL-01 is fixed in source and CI-verified; DL-02–DL-05 remain open.
- **Scope:** `backend/src/daily-log/` controllers, DTOs, services and focused tests; directly connected upload access checks; web `features/daily-log` and `features/stylist-workbook` callers; mobile stylist daily-log list, create, detail, disposition and statistics callers.
- **Verification boundary:** source inspection, focused DTO validation tests/lint, and the repository CI run listed below only. No production/shared database, live API, browser, physical-device, concurrency or load verification was performed.

## Summary

Several safeguards are present: a stylist can read/mutate only entries belonging to their own stylist profile; completion locks and re-reads the entry and commits its status, KIF entry, loyalty earning and durable completion outbox event together; debt settlement uses conditional debt claims and a transaction; a partial unique index prevents multiple SERVICE entries for one reservation; and the public before/after gallery requires active, purpose- and policy-version-matched consent before returning consent-file routes. Private upload reads separately enforce uploader/record relationship or privileged access.

The source review also found missing class-validator metadata on request fields that current first-party clients send. That made manual entry creation and the disposition route reject otherwise valid requests under the global strict whitelist. This input-validation defect is fixed. The remaining findings concern partial writes, future restore scheduling, and unbounded list reads; they have not been changed in this slice.

## Findings

### DL-01 — Strict DTO whitelist rejected supported Daily Log fields (P1, fixed in source and CI-verified)

- **Evidence before remediation:** `backend/src/main.ts` enables `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`. `CreateDailyLogEntryDto.isManual` and `DailyLogDispositionDto.applyPenalty` had no validation decorators. Current manual-create callers in `mobile/src/screens/stylist/DailyLogNewEntryScreen.tsx`, `frontend/src/features/daily-log/use-daily-log-form.ts`, and `frontend/src/features/stylist-workbook/pages/workbook-new-entry-page.tsx` send `isManual`; mobile and workbook disposition callers send `applyPenalty`. Those fields were consequently treated as non-whitelisted and rejected before reaching the service. `AddDailyLogImageDto.sortOrder` likewise had no validator and was rejected if supplied.
- **Impact:** supported first-party manual-create and disposition requests could fail at DTO validation; optional image ordering could not be submitted. This is a source-level conclusion; no deployed HTTP request was made.
- **Fix:** commit `9ae383b` adds `@IsOptional()` plus `@IsBoolean()` for `isManual` and `applyPenalty`, and `@IsInt()` plus `@Min(0)` for `sortOrder`. `backend/src/daily-log/dto/daily-log-input-validation.dto.spec.ts` exercises these bodies with the same strict whitelist/forbid settings, including invalid negative/fractional image ordering.
- **Verification:** focused Jest suite passed (1 suite, 3 tests); targeted ESLint and `git diff --check` passed. CI run `42177289515` passed all four jobs, including generated Prisma/schema/migration checks on disposable CI PostgreSQL, backend build/unit/HTTP tests, frontend, mobile and repository checks.

### DL-02 — Daily Log creation is split across independent writes (P2, open)

- **Evidence:** `DailyLogService.create()` creates the entry at `backend/src/daily-log/daily-log.service.ts` before separately creating service items, redeeming loyalty, recalculating the tip, optionally creating a debt, and settling selected debts. `createFromReservation()` similarly creates the entry, service-item rows, and optional debt in separate calls. The entire orchestration is not enclosed in one transaction; the selected-debt settlement has its own later transaction.
- **Impact:** a later database/service failure can return an error after the parent entry (or some related records) has already committed. For reservation-linked creation, a retry can then be stopped by the one-SERVICE-per-reservation unique constraint, without resuming any missing child/side-effect writes. For manual creation, retry behavior is not protected by an idempotency key and could create another entry. These are failure-mode risks identified from source, not observed corrupt records or incidents.
- **Acceptance direction:** add failure-injection tests proving rollback across parent/item/debt/KIF/loyalty state for both create paths, and make external notifications occur only after commit through a durable mechanism. Preserve the existing debt-claim and unique-index safeguards; do not treat a frontend retry alone as idempotency.

### DL-03 — Disposition soft-deletes the Daily Log entry separately from its reservation transition (P2, open)

- **Evidence:** `DailyLogDispositionService.dispose()` calls `DailyLogAdminService.softDelete()` and only afterwards runs `applyStylistCancel`, `applyClientCancel`, `applyNoShow` or `applyDirectReorder` (`daily-log-disposition.service.ts`). The pending entry soft-delete and reservation mutation are separate DB operations; cancellation/no-show helpers also perform penalty and notification side effects around their reservation update (`daily-log-disposition-apply.ts`).
- **Impact:** if a later operation fails, the request may leave the entry deleted while the reservation remains in `AWAITING_DAILY_LOG`, or may commit the reservation transition while a later penalty/notification operation fails. This is a source-level partial-failure window; no incident was reproduced.
- **Acceptance direction:** make the entry and reservation state changes plus any database penalty-counter update atomic, and dispatch external notifications only after commit. Add rollback/failure-injection tests for each disposition family; retain the existing role/status checks and reorder conflict checks.

### DL-04 — Future restore creates a reservation outside the normal booking coordination transaction (P2, open)

- **Evidence:** `DailyLogRestoreService.restoreAsReservation()` checks stylist conflict in `assertNoStylistConflict()`, then separately creates a reservation, optionally creates service-item rows, and updates the daily-log entry to link the new reservation. These operations are not in one transaction and this path does not use the reservation create service's date coordination/advisory-lock workflow.
- **Impact:** concurrent booking/restore attempts can both pass the preflight conflict read before either commits; an intermediate failure can also leave a reservation without the restored entry linked to it (or leave the entry deleted). This is a code-path risk, not a reproduced race or observed orphan.
- **Acceptance direction:** route the restoration through shared reservation write coordination (or an equivalent transaction-scoped lock and final conflict/capacity recheck), and atomically create the reservation/service items/linkage. Test competing restore-vs-create on disposable PostgreSQL and injected failures; separately confirm any client-day booking policy expected for restored reservations.

### DL-05 — Authenticated Daily Log list endpoint has no result bound (P2, open)

- **Evidence:** `DailyLogService.findAll()` in `backend/src/daily-log/daily-log.service.ts` applies optional date/stylist/deleted filters and calls `dailyLogEntry.findMany()` with no `take`, page contract or maximum date range. The relation include contains entry items, debt payments, client/stylist/reservation, images and upload metadata. Current web, mobile and workbook list/statistics callers generally send date windows, but the API permits both dates to be omitted; the web date filters can also be cleared.
- **Impact:** an authorized caller can request an arbitrarily large matching history and its nested relations, growing database work, response size and client memory with retained history. First-party default date windows reduce routine exposure but do not bound the API contract. No production-volume or load test was performed.
- **Acceptance direction:** inventory all array-response consumers and choose a compatible pagination or bounded-window rollout. If introducing a paginated envelope, migrate and test web/mobile/workbook/statistics consumers first; do not silently truncate the existing array response.

## Verification and remaining gates

- 2026-11-06 — Confirmed before implementation that local branch, `origin/master`, and `origin/arena/657dba19-beauty-salon-v2` were aligned at `845f1b3`; no uncommitted changes existed.
- 2026-11-06 — DTO remediation committed/pushed as `9ae383b`; focused Jest (3/3), targeted ESLint and diff check passed; CI `42177289515` passed all four jobs.
- No production/shared database access, live HTTP, browser, physical-device, runtime concurrency or load verification was performed.
- **Separate carried gate:** RES-02 in [`RESERVATIONS.md`](RESERVATIONS.md) remains intentionally deferred until one full successful release cycle after the owner-reported 2026-11-04 redeploy is confirmed. This Daily Log review did not alter the Reservations compatibility decision.
