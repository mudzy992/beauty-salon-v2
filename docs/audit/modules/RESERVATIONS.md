# Reservations module audit

**Status:** source review complete; RES-01 and RES-03 are implemented and CI-verified. RES-02 is deferred until the D-05 release-cycle gate passes.
**Review date:** 2026-11-05  
**Scope:** NestJS reservation API and lifecycle/availability services; web and mobile reservation list, create, cancellation, attendance, and reschedule consumers; current backend tests.  
**Verification boundary:** source inspection and the listed tests only. No production database, production query plan, browser, physical-device, or load testing was performed.

## Summary

The module has several strong controls already in place: creation is transactional and can use an idempotency key; slot allocation uses a date advisory lock and rechecks capacity at write time; the public view token is 32 random bytes; reservation list pages have a bounded size and offset; and current web/mobile create flows send idempotency keys. The current source retains the intentionally unbounded queryless list compatibility path pending D-05 rollout approval. The owner-selected ten-service ceiling is now enforced at reservation and availability API boundaries.

## Findings

### RES-01 — Lifecycle transitions can race after validation (P2, remediated in source and CI-verified)

**Evidence (before remediation):** `backend/src/reservations/reservation-client-actions.service.ts` read a reservation, checked its status, then updated using only the reservation ID in client cancellation and attendance confirmation. Client cancellation incremented the cancellation/penalty counter after that update in a separate operation. Admin cancellation followed the same read-then-update pattern. `reservation-reschedule-client.service.ts` similarly read a pending decline request and then updated by ID. In contrast, reschedule acceptance and admin update already used conditional `updateMany` checks.

**Impact:** overlapping requests could both pass the stale status check and produce duplicate side effects; in cancellation this could double-increment the client penalty count. Competing lifecycle actions could overwrite a transition that became invalid after the initial read. The risk was concurrency-dependent and was not reproduced against a live database.

**Remediation:** implemented compare-and-set predicates using the observed status/request state for client/admin cancellation, client attendance confirmation, and client reschedule decline. A zero-row update now returns a conflict. Client cancellation and its penalty-counter update now share one transaction. Reschedule acceptance now requires a confirmed reservation and guards the observed status in its update, preventing acceptance after a concurrent cancellation. Focused tests cover guarded cancellation, stale-write behavior, and rejection of acceptance for an already-cancelled reservation. The complete slice passed backend build/unit tests and the repository CI checks in run `42107410391`.

### RES-02 — Queryless reservation listing remains unbounded (P2, deferred by rollout gate)

**Evidence:** `backend/src/reservations/reservation-list.service.ts` validates and caps paginated requests, but the branch without `page`/`pageSize` calls `reservation.findMany` without `take`. `QueryReservationsDto` permits both pagination fields to be omitted. Current web/mobile list consumers found in this review use the pagination helpers; the queryless array path remains available for backwards compatibility.

**Impact:** any authenticated, authorized caller that uses the compatibility form can cause a complete matching result set (and its nested service/client/stylist data) to be loaded and returned. This is not a finding that current first-party clients are using that path.

**Remediation / decision:** the repository's D-05 owner decision requires keeping the legacy array fallback for one full successful release cycle after consumer migration. Historical source map records 13/13 known consumers migrated; the owner reported a redeploy on 2026-11-04. On 2026-11-05 the user chose to respect this gate, so no silent cap or breaking response change is being made. Revisit only after the full cycle is confirmed; then remove the legacy array contract or introduce explicit continuation without silent truncation.

### RES-03 — Multi-service selection limit was missing (P2, fixed with owner-approved cap of 10)

**Evidence (before fix):** the three create DTOs accepted unbounded UUID arrays, availability endpoints accepted raw comma-separated `serviceIds`, and service code did not impose a count ceiling.

**Impact:** unusually large requests could increase validation/query/write work.

**Remediation:** the user approved a maximum of **10 services per reservation**. Backend DTO validation now bounds client, standard/admin, and stylist-direct creates; service-layer checks also protect create paths if called without HTTP DTO validation. Availability query parsing rejects more than ten raw IDs before de-duplication, and both availability services independently enforce the same ceiling. Focused tests cover the exact boundary, duplicate-heavy query lists, all three DTO types, and the legacy single-service query. Local focused tests passed (2 suites/22 tests); CI run `42110794961` passed all jobs.

## Phased remediation and verification

### Phase 0 — Lifecycle integrity
- [x] RES-01: guarded client/admin cancellation, client attendance confirmation, and client reschedule-decline transitions; client cancellation and counter update are atomic.
- [x] Added an eligibility/status guard for reschedule acceptance and focused tests for compare-and-set, stale writes, and cancelled-reservation rejection.
- [x] Full Phase 0 slice passed backend build/unit tests and the repository CI checks in run `42107410391`. Local full reservation tests are blocked until the Prisma client is generated.

### Phase 1 — Compatibility and request bounds
- [ ] RES-02: wait for confirmation that the full successful D-05 release cycle after the 2026-11-04 redeploy has elapsed; then remove/deprecate the legacy array contract without silent truncation.
- [x] RES-03: enforce the owner-approved ten-service ceiling on DTO, service, and availability API entry points; focused tests and CI pass.

### Phase 2 — Integration and operational verification
- [x] Backend generation/build/tests and schema/migration checks passed in CI run `42110794961` (migration checks used disposable CI PostgreSQL only).
- [ ] Exercise competing reservation actions and list bounds against disposable PostgreSQL.
- [ ] Separately schedule production query-plan/load checks and user browser/device checks. These are not evidenced by source tests or CI alone.

## Verification log

- 2026-11-05 — Source review covered reservation create, availability, list, public-token lookup, cancellation, attendance, rescheduling, and identified web/mobile callers.
- 2026-11-05 — `cd backend && npm test -- --runInBand reservations`: 11 suites passed; 18 suites could not load because the generated Prisma client is absent (`Cannot find module '.prisma/client/default'`). This is an environment/setup failure, not a Reservations test failure. No local Prisma generation was retried because the recorded environment cannot fetch Prisma's schema engine.
- 2026-11-05 — User decision: enforce a maximum of 10 services per reservation and keep RES-02's legacy array until the full D-05 release-cycle gate is confirmed.
- 2026-11-05 — Focused backend command `npm test -- --runInBand reservation-service-limits availability.service`: 2 suites/22 tests passed. ESLint passed on the limit utility, its tests, and all three create DTOs.
- 2026-11-05 — CI run `42110794961` passed: Prisma generation/schema validation, migration deployment to disposable CI PostgreSQL, backend build/unit tests, frontend production build, mobile checks, and repository hygiene checks.
- Production, browser, physical-device, live concurrency, and load verification: **not performed**.
