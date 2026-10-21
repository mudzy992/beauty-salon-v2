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
| `backend`     | package-local `npm ci`, Prisma client generation/schema validation, migrations on disposable PostgreSQL 16, Nest build, sanitizer regression, DB-backed `SEC-01`/`SEC-07` HTTP E2E, then mocked Jest unit tests `--runInBand --json` | Hard gate; E2E URL is restricted to loopback PostgreSQL and a test/e2e/ci database name; E2E failure emits test/suite-name annotations; unit failure annotations remain; no shared/production DB or deployment verification |
| `frontend`    | package-local `npm ci`, `npm run test:socket-recovery`, `npm run build` (includes `tsc -b`)                                                        | Hard gate; reconnect unit coverage is deterministic Node/fake-socket testing; no browser/component tests yet                                                                                                                   |
| `mobile`      | package-local `npm ci`, `npm run test:socket-recovery`, `npm run typecheck`                                                                       | Hard gate; reconnect unit coverage is deterministic Node/fake-socket testing; no device/Expo runtime tests yet                                                                                                                 |

## Deliberately not gated yet

- Backend `npm run lint`: the prior command mutated files via `--fix`; it is now made read-only and a separate `lint:fix` is explicit, but legacy diagnostics/config need review before a stable gate.
- Frontend/mobile ESLint: package scripts exist but dependency/config were not found, so running these in CI would be a misleading always-failing gate.
- `npm audit`: current packages have 61 package-level advisories including two critical; the report is documented in `FINDINGS.md`. Bulk `npm audit fix` was intentionally not run. Track/upgrade them in reviewed changes, then promote an audit policy.
- Locale key parity and selected contrast are report-only for the existing known gaps; add `--strict` after translations/theme tokens meet approved thresholds.
- PostgreSQL business concurrency/race tests, browser Playwright/axe, mobile simulator/device checks, SMTP/FCM/Expo production calls, Docker image build and EAS build. The narrow SEC-01/SEC-07 HTTP E2E suite does use the disposable PostgreSQL service.

## Safe expansion checklist

1. **Implemented for narrow security contracts:** CI starts a fresh PostgreSQL 16 service, applies tracked migrations, and uses synthetic fixtures; verify the deployed major version separately before treating this as deployment compatibility.
2. **Implemented for SEC-01/SEC-07 HTTP contracts:** `backend/test/jest-e2e.json` runs real Nest routes/JWT/role guards and Prisma reads against that isolated service. Broader security/API contracts and concurrency races remain future work.
3. Add frontend Vitest/RTL and Playwright + axe; add Expo Jest tests and simulator/device smoke workflow.
4. Fix lint configurations/baselines and make all scripts read-only by default.
5. Resolve advisory paths in staged dependency upgrades; re-run builds/native Expo compatibility and produce a time-stamped audit report.
6. Promote locale and contrast checks to strict gates after approved complete baseline.
7. Keep all deployment/release operations manual and outside this workflow unless product owner separately approves a deployment design. This task explicitly does not create or enable deployment automation.

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
