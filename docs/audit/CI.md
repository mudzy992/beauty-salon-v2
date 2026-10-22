# CI scope and operation

**Workflow:** [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)<br>
**Runbook:** [TEST_WORKFLOW.md](TEST_WORKFLOW.md) · **Status:** branch-local verification only; no deployment.

## Trigger and permission boundary

- `push` on `arena/**` and manual `workflow_dispatch` only.
- No `pull_request` trigger, no `master` push trigger, no production environment/SSH/registry credentials, no write permission. The only declared GitHub permission is `contents: read`.
- No workflow step deploys, merges, opens a PR, pushes commits, rewrites Git history, mutates a production DB or provisions shared Redis.
- Backend CI starts a fresh, per-job PostgreSQL 16 service with an obviously disposable `beauty_salon_ci` database and non-secret CI-only credentials. Prisma generation/schema validation use the same local URL; CI applies only the tracked migrations, runs DB-backed HTTP security tests with synthetic fixtures, and then runs the existing mocked Jest unit suite. No production/shared DB, deployment secret, Redis, mail, push, browser, or production endpoint is used. This service version is a CI contract, not evidence of the deployed PostgreSQL major version.

## Current jobs

| Job           | Checks                                                                                                                                             | Gate status                                                                                                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `repo-checks` | `check_repo_hygiene.py`, `check_doc_links.py`, report-only `check_i18n.py`, report-only `check_ui_contrast.py`                                     | Hygiene and local Markdown targets/line anchors are hard gates; locale/contrast report known existing baseline until remediated                                                                                                |
| `backend`     | package-local `npm ci`, Prisma client generation/schema validation, migrations on disposable PostgreSQL 16, Nest build, sanitizer regression, DB-backed `SEC-01`/`SEC-02`/`SEC-07`/`API-02` gallery and availability HTTP E2E, then mocked Jest unit tests `--runInBand --json` | Hard gate; E2E URL is restricted to loopback PostgreSQL and a test/e2e/ci database name; E2E failure emits suite/test annotations with capped, redacted diagnostics; unit failure annotations remain name-only; no shared/production DB or deployment verification |
| `frontend`    | package-local `npm ci`, `npm run test:socket-recovery`, `npm run build` (includes `tsc -b`)                                                        | Hard gate; reconnect unit coverage is deterministic Node/fake-socket testing; no browser/component tests yet                                                                                                                   |
| `mobile`      | package-local `npm ci`, `npm run test:socket-recovery`, `npm run typecheck`                                                                       | Hard gate; reconnect unit coverage is deterministic Node/fake-socket testing; no device/Expo runtime tests yet                                                                                                                 |

**Latest API-02 verification:** GitHub Actions run `39771808375` for commit `285a864` passed all four jobs. The backend generated/validated Prisma, applied migrations to disposable PostgreSQL 16, built, ran the sanitizer regression and DB-backed HTTP suite (including gallery and availability), and passed the full unit suite; repository checks, frontend build/typecheck and mobile typecheck also passed. The availability contract verifies authentication, invalid/reversed/>90-day range rejection, and a synthetic one-day date response plus slots. It caught the bug where a local-noon cursor was compared to a midnight inclusive `toDate`; commit `285a864` normalizes the end to noon and the date-only regression now passes. The first attempt failed in run `39770636311`; the retest passed. Gallery pagination had already passed in run `39765885619`, and its source implementation passed in `39763455951`. No availability load test has run. These checks use disposable synthetic data, not production/shared database, storage, or deployment. The preceding 90-day range/concurrency implementation passed run `39758303548`; upload-delete mitigation passed run `39753417714`.

## Deliberately not gated yet

- Backend `npm run lint`: the prior command mutated files via `--fix`; it is now made read-only and a separate `lint:fix` is explicit, but legacy diagnostics/config need review before a stable gate.
- Frontend/mobile ESLint: package scripts exist but dependency/config were not found, so running these in CI would be a misleading always-failing gate.
- `npm audit`: current packages have 61 package-level advisories including two critical; the report is documented in `FINDINGS.md`. Bulk `npm audit fix` was intentionally not run. Track/upgrade them in reviewed changes, then promote an audit policy.
- Locale key parity and selected contrast are report-only for the existing known gaps; add `--strict` after translations/theme tokens meet approved thresholds.
- PostgreSQL business concurrency/race tests, browser Playwright/axe, mobile simulator/device checks, SMTP/FCM/Expo production calls, Docker image build and EAS build. The SEC-01/SEC-02/SEC-07 HTTP E2E suite uses disposable PostgreSQL; the SEC-02 assertions passed run `39736393872`. The SEC-04 upload-delete unit mitigation passed run `39753417714`, but that route has no DB-backed HTTP test. API-02 range/concurrency unit coverage passed run `39758303548`; the non-random gallery source change passed run `39763455951`, and the gallery pagination HTTP contract passed in run `39765885619`. The availability dates/slots HTTP E2E, including the date-only inclusive-end regression discovered in run `39770636311`, passed on disposable PostgreSQL in run `39771808375`. Availability load testing and request-volume/rate budgets remain open.

## Safe expansion checklist

1. **Implemented for narrow security contracts:** CI starts a fresh PostgreSQL 16 service, applies tracked migrations, and uses synthetic fixtures; verify the deployed major version separately before treating this as deployment compatibility.
2. **Implemented for SEC-01/SEC-02/SEC-07 HTTP contracts:** `backend/test/jest-e2e.json` runs real Nest routes/JWT/role guards and Prisma reads against that isolated service. SEC-01/SEC-07 passed run `39683834085`; the SEC-02 user-detail/client-list assertions passed run `39736393872`. Broader security/API contracts and concurrency races remain future work.
3. **Narrow SEC-04 source control:** uploader/admin authorization, known-reference preflight and upload-root containment are covered by mocked upload controller/repository/service unit tests and passed the full backend unit CI in run `39753417714`. The upload DELETE HTTP endpoint is not in the DB-backed suite; public/private storage separation and consent migration remain open.
4. **Narrow API-02 source guards:** the 90-day availability range and five-per-request slot-query concurrency tests passed run `39758303548`. A 1,000-offset cap for non-random gallery pagination and query DTO validation are implemented and passed CI in run `39763455951`. The gallery pagination HTTP contract passed in disposable-PostgreSQL CI run `39765885619`. The synthetic availability dates/slots contract and date-only inclusive-end fix passed disposable-PostgreSQL CI run `39771808375`, after the first run `39770636311` exposed the noon/midnight boundary bug. Availability load tests remain open. Random gallery sampling and request-rate controls remain open.
5. Add frontend Vitest/RTL and Playwright + axe; add Expo Jest tests and simulator/device smoke workflow.
6. Fix lint configurations/baselines and make all scripts read-only by default.
7. Resolve advisory paths in staged dependency upgrades; re-run builds/native Expo compatibility and produce a time-stamped audit report.
8. Promote locale and contrast checks to strict gates after approved complete baseline.
9. Keep all deployment/release operations manual and outside this workflow unless product owner separately approves a deployment design. This task explicitly does not create or enable deployment automation.

## Local execution

```bash
python3 scripts/check_repo_hygiene.py
python3 scripts/check_doc_links.py
python3 scripts/check_i18n.py
python3 scripts/check_ui_contrast.py

(cd backend && npm ci --no-audit --no-fund && npm run db:generate && npm run db:validate && npm run build && npm run test:blog-sanitizer && npm test -- --runInBand)
(cd frontend && npm ci --no-audit --no-fund && npm run test:socket-recovery && npm run build)
(cd mobile && npm ci --no-audit --no-fund && npm run test:socket-recovery && npm run typecheck)
```

Backend generation may require a working Prisma engine download. Runtime/database-specific verification should follow [TEST_WORKFLOW.md](TEST_WORKFLOW.md), not use production variables.
