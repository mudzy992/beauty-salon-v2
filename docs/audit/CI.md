# CI scope and operation

**Workflow:** [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)<br>
**Runbook:** [TEST_WORKFLOW.md](TEST_WORKFLOW.md) · **Status:** branch-local verification only; no deployment.

## Trigger and permission boundary

- `push` on `arena/**` and manual `workflow_dispatch` only.
- No `pull_request` trigger, no `master` push trigger, no production environment/SSH/registry credentials, no write permission. The only declared GitHub permission is `contents: read`.
- No workflow step deploys, merges, opens a PR, pushes commits, rewrites Git history, mutates a production DB or provisions shared Redis.
- CI uses a dummy, non-secret PostgreSQL URL for Prisma generation/schema validation; those steps do not connect to a DB. Backend checks run the Node blog-sanitizer regression before the Jest unit suite; neither connects to a DB.

## Current jobs

| Job           | Checks                                                                                                                                             | Gate status                                                                                                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `repo-checks` | `check_repo_hygiene.py`, `check_doc_links.py`, report-only `check_i18n.py`, report-only `check_ui_contrast.py`                                     | Hygiene and local Markdown targets/line anchors are hard gates; locale/contrast report known existing baseline until remediated                                                                                                |
| `backend`     | package-local `npm ci`, Prisma client generation, schema validate, Nest build, `npm run test:blog-sanitizer`, Jest unit tests `--runInBand --json` | Hard gate; sanitizer test runs first; backend build failure adds the last 120 build-output lines to the GitHub step summary and the last 40 lines as a check annotation; on Jest failure, a local script emits failed test/suite names as GitHub check annotations (not raw assertion messages); no PostgreSQL E2E because `backend/test/jest-e2e.json` is absent |
| `frontend`    | package-local `npm ci`, `npm run build` (includes `tsc -b`)                                                                                        | Hard gate; no browser/unit tests yet                                                                                                                                                                                           |
| `mobile`      | package-local `npm ci`, `npm run typecheck`                                                                                                        | Hard gate; no device/Expo runtime tests yet                                                                                                                                                                                    |

## Deliberately not gated yet

- Backend `npm run lint`: the prior command mutated files via `--fix`; it is now made read-only and a separate `lint:fix` is explicit, but legacy diagnostics/config need review before a stable gate.
- Frontend/mobile ESLint: package scripts exist but dependency/config were not found, so running these in CI would be a misleading always-failing gate.
- `npm audit`: current packages have 61 package-level advisories including two critical; the report is documented in `FINDINGS.md`. Bulk `npm audit fix` was intentionally not run. Track/upgrade them in reviewed changes, then promote an audit policy.
- Locale key parity and selected contrast are report-only for the existing known gaps; add `--strict` after translations/theme tokens meet approved thresholds.
- PostgreSQL integration/race tests, browser Playwright/axe, mobile simulator/device checks, SMTP/FCM/Expo production calls, Docker image build and EAS build.

## Safe expansion checklist

1. Add disposable PostgreSQL service matching deployment major; use synthetic seed; run migration deploy/status and DB-backed tests in an isolated schema.
2. Restore a valid Nest E2E config and test security/API contracts plus concurrency races.
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
(cd frontend && npm ci --no-audit --no-fund && npm run build)
(cd mobile && npm ci --no-audit --no-fund && npm run typecheck)
```

Backend generation may require a working Prisma engine download. Runtime/database-specific verification should follow [TEST_WORKFLOW.md](TEST_WORKFLOW.md), not use production variables.
