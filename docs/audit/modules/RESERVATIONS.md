# Reservations module audit

**Status:** source review complete; RES-01 code remediation is implemented and awaiting CI verification.
**Review date:** 2026-11-05  
**Scope:** NestJS reservation API and lifecycle/availability services; web and mobile reservation list, create, cancellation, attendance, and reschedule consumers; current backend tests.  
**Verification boundary:** source inspection and the listed tests only. No production database, production query plan, browser, physical-device, or load testing was performed.

## Summary

The module has several strong controls already in place: creation is transactional and can use an idempotency key; slot allocation uses a date advisory lock and rechecks capacity at write time; the public view token is 32 random bytes; reservation list pages have a bounded size and offset; and current web/mobile create flows send idempotency keys. The current source still contains non-atomic read/validate/write lifecycle paths and an intentionally unbounded queryless list compatibility path.

## Findings

### RES-01 — Lifecycle transitions can race after validation (P2, code implemented; extended guard awaiting CI verification)

**Evidence:** `backend/src/reservations/reservation-client-actions.service.ts` reads a reservation, checks its status, then updates using only the reservation ID in client cancellation and attendance confirmation. Client cancellation increments the cancellation/penalty counter after that update in a separate operation. Admin cancellation follows the same read-then-update pattern. `reservation-reschedule-client.service.ts` similarly reads a pending decline request and then updates by ID. In contrast, reschedule acceptance and admin update already use conditional `updateMany` checks.

**Impact:** overlapping requests can both pass the stale status check and produce duplicate side effects; in cancellation this can double-increment the client penalty count. Competing lifecycle actions can overwrite a transition that became invalid after the initial read. The risk is concurrency-dependent and has not been reproduced against a live database.

**Remediation:** implemented compare-and-set predicates using the observed status/request state for client/admin cancellation, client attendance confirmation, and client reschedule decline. A zero-row update now returns a conflict. Client cancellation and its penalty-counter update now share one transaction. Reschedule acceptance now requires a confirmed reservation and guards the observed status in its update, preventing acceptance after a concurrent cancellation. Focused tests cover guarded cancellation, stale-write behavior, and rejection of acceptance for an already-cancelled reservation. The initial CI run passed for the first transition slice; the extended acceptance guard is awaiting CI verification.

### RES-02 — Queryless reservation listing remains unbounded (P2, compatibility decision)

**Evidence:** `backend/src/reservations/reservation-list.service.ts` validates and caps paginated requests, but the branch without `page`/`pageSize` calls `reservation.findMany` without `take`. `QueryReservationsDto` permits both pagination fields to be omitted. Current web/mobile list consumers found in this review use the pagination helpers; the queryless array path remains available for backwards compatibility.

**Impact:** any authenticated, authorized caller that uses the compatibility form can cause a complete matching result set (and its nested service/client/stylist data) to be loaded and returned. This is not a finding that current first-party clients are using that path.

**Remediation:** after the agreed compatibility window, remove the array contract or put a server-side hard cap behind an explicit continuation contract. Until then, preserve the legacy response shape as a compatibility constraint; do not silently truncate results.

### RES-03 — Multi-service selection has no explicit item-count limit (P2, product limit required)

**Evidence:** `CreateReservationDto`, `AdminCreateReservationDto`, and `StylistDirectCreateReservationDto` validate `serviceIds` as UUID arrays but do not declare `ArrayMaxSize`. Availability endpoints accept raw comma-separated `serviceIds`; the services deduplicate and validate existence but do not impose a count ceiling. Booking creation uses the resulting list in database lookups and creates one item per selected service.

**Impact:** unusually large requests can increase validation/query/write work. The repository does not establish a supported maximum number of services per booking, so an appropriate business limit cannot be inferred from source alone.

**Remediation:** obtain/confirm the owner-approved maximum, enforce it consistently on create, direct/admin create, and availability APIs, and test the boundary. No arbitrary cap is introduced in this audit slice.

## Phased remediation and verification

### Phase 0 — Lifecycle integrity
- [x] RES-01: guarded client/admin cancellation, client attendance confirmation, and client reschedule-decline transitions; client cancellation and counter update are atomic.
- [x] Added an eligibility/status guard for reschedule acceptance and focused tests for compare-and-set, stale writes, and cancelled-reservation rejection.
- [x] First transition slice passed CI run `42106710296`; the additional acceptance guard still needs CI verification. Local full reservation tests are blocked until the Prisma client is generated.

### Phase 1 — Compatibility and request bounds
- [ ] RES-02: confirm end of the legacy queryless-list compatibility window; then deprecate/remove or explicitly cap the old contract without silent truncation.
- [ ] RES-03: record the product-approved service-item ceiling, then enforce it across all reservation/availability entry points.

### Phase 2 — Integration and operational verification
- [ ] Run backend generation/build/tests and schema/migration checks in CI; record the exact run.
- [ ] Exercise competing reservation actions and list bounds against disposable PostgreSQL.
- [ ] Separately schedule production query-plan/load checks and user browser/device checks. These are not evidenced by source tests or CI alone.

## Verification log

- 2026-11-05 — Source review covered reservation create, availability, list, public-token lookup, cancellation, attendance, rescheduling, and identified web/mobile callers.
- 2026-11-05 — `cd backend && npm test -- --runInBand reservations`: 11 suites passed; 18 suites could not load because the generated Prisma client is absent (`Cannot find module '.prisma/client/default'`). This is an environment/setup failure, not a Reservations test failure. No local Prisma generation was retried because the recorded environment cannot fetch Prisma's schema engine.
- Production, browser, physical-device, and load verification: **not performed**.
