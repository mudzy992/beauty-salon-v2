# SOURCE OF TRUTH — Beauty Salon Nejra v2

**Current code/documentation snapshot:** 2026-10-21. This is a repository-level orientation, not a claim that every behavior has passed runtime or production verification.

## Authority and evidence

1. **For behavior currently implemented:** inspect the code, active package manifests/lockfiles, Prisma schema and `backend/prisma/migrations/`.
2. **For reviewed architecture and audit evidence:** use the [architecture](docs/audit/ARCHITECTURE.md), [findings](docs/audit/FINDINGS.md), [implementation plan](docs/audit/IMPLEMENTATION_PLAN.md), [test workflow](docs/audit/TEST_WORKFLOW.md), [CI scope](docs/audit/CI.md) and the continually updated [handoff](docs/audit/HANDOFF.md).
3. **For product intent/history:** `.cursor/docs/`, `.cursor/rules/` and `.cursor/plans/` contain project design material. A design statement is not proof that the current code implements it; resolve conflicts against code and the audit evidence above.
4. Earlier phase notes below are historical. They are not release sign-off, current infrastructure configuration or a substitute for tests.

## Current system snapshot

- **Backend:** NestJS 11 / TypeScript / Prisma 7. The active Prisma service uses `@prisma/adapter-pg`; only PostgreSQL is accepted by runtime configuration. Active PostgreSQL migrations are `20260822100257_postgresql_baseline` and `20260915085100_blog_post_seo`. The historical MySQL migration archive remains at `backend/prisma/migrations_mysql_backup/`; it is not the active PostgreSQL migration directory and must not be run through the PostgreSQL migrator.
- **Web:** React 18 + TypeScript + Vite SPA with public-site and admin routes, Axios, Zustand auth, TanStack Query provider and Socket.IO client. Frontend routes and role gates are documented in [the web map](docs/codebase-map/FRONTEND.md).
- **Mobile:** Expo `~57.0.14`, React Native `0.86.2`, Expo Router route tree, screen adapter, Zustand, Axios and SecureStore. Client and stylist experiences are modes/routes in the same app. The mobile translation resource is Bosnian only.
- **Persistence and files:** PostgreSQL is external to the root Compose file. Prisma migrations are repository artifacts, not evidence of production migration state. Upload files are served under `/uploads/`; Compose mounts a host upload directory. Production topology, DB contents, backup/recovery, TLS and proxy policy are not verified by this source snapshot.
- **Realtime and jobs:** Socket.IO and in-process scheduled jobs run in the backend. No Redis client/adapter/queue/distributed lock is wired in the repository; adding Redis is conditional, not a current dependency or required fix.
- **Build/test baseline:** frontend production build and mobile TypeScript check pass in the audit workspace; frontend bundle warning remains. Backend Prisma engine/client setup was blocked by sandbox TLS; backend test/build status is recorded with evidence and limitations in the audit handoff. No live HTTP, production DB, browser accessibility or physical-device test is implied.
- **CI:** `.github/workflows/ci.yml` is branch-local verification only, triggered by `arena/**` push/manual dispatch. It does not deploy, merge or operate on production. See [CI.md](docs/audit/CI.md).

## Safe local commands

Each app has its own lockfile; there is no root `package.json`.

```bash
# In each of backend/, frontend/, mobile/:
npm ci --no-audit --no-fund

# Backend: set a disposable/local PostgreSQL DATABASE_URL first.
cd backend
npm run db:validate
npm run db:generate
npm run build
npm test -- --runInBand

# Frontend and mobile
cd ../frontend && npm run build
cd ../mobile && npm run typecheck

# Read-only repository checks (locale/contrast currently report known gaps)
cd ..
python3 scripts/check_repo_hygiene.py
python3 scripts/check_doc_links.py
python3 scripts/check_i18n.py
python3 scripts/check_ui_contrast.py
```

Do not point tests, migrations, seeds or ad-hoc scripts at production. The backend test/config limitations and full safe matrix are in [TEST_WORKFLOW.md](docs/audit/TEST_WORKFLOW.md).

## Security and operational boundary

- Tracked `backend/.env`, `frontend/.env` and `mobile/.env` entries were removed from the current Git index; local ignored `.env` copies remain in the worktree. The Firebase Admin service-account JSON was removed from the index and workspace. Historical Git objects were **not** rewritten. Coordinate revocation/rotation with the credential owner outside this repository. Do not copy secret values into docs, issues or chat.
- `mobile/google-services.json` is client-side Firebase configuration, not the removed Admin service-account private key; still verify Firebase project restrictions separately.
- Do not rotate `APP_SETTINGS_ENCRYPTION_KEY` without a controlled re-encryption/dual-key migration plan for existing encrypted settings.
- The audit findings are primarily static code analysis. Severity, confidence, evidence, runtime caveats and owners' external decisions are in [FINDINGS.md](docs/audit/FINDINGS.md).

## Historical development milestones

This condensed record preserves the earlier project chronology; descriptions are historical claims, not current tests or infrastructure guarantees. Current stack/version facts are the snapshot above.

| Milestone | Recorded scope |
|---|---|
| 1–2 | Repository foundation, authentication, uploads, Prisma schema, users, salon, services, stylists and settings; deployment topology was later changed. |
| 3 | Availability, reservation lifecycle, stylist responses, cancellation and notifications. |
| 4 | Daily log and income/expense book workflows. |
| 5 | Blog, gallery, reviews and holiday notification workflows. |
| 6–7 | Admin dashboard and public website. |
| Extra / bugfix | Socket.IO updates, public settings/layout, availability and reservation UX refinements. |
| 8–9 | Mobile client and stylist workflows; role/mode transitions, daily log and schedule. |
| 10 | Analytics, loyalty and additional admin surfaces. |
| KUF+ | Expense category/line-item modularization and related finance work, recorded 2026-08-11. |

For the step-by-step audit status and actions taken, continue with [HANDOFF.md](docs/audit/HANDOFF.md).