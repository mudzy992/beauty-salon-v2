# Backend codebase map

**Current snapshot:** 2026-10-21 · NestJS 11 · TypeScript · Prisma 7 · PostgreSQL. For cross-app architecture see [ARCHITECTURE.md](../audit/ARCHITECTURE.md); security/business evidence and caveats are in [FINDINGS.md](../audit/FINDINGS.md).

## Stack and entrypoints

- `backend/src/main.ts`: app bootstrap, `/uploads/` static root, CORS/validation setup and listener.
- `backend/src/app.module.ts`: feature module composition.
- `backend/prisma/schema.prisma`, `backend/prisma.config.ts`: Prisma schema and Prisma 7 config.
- `backend/src/prisma/prisma.service.ts`: `PrismaPg` adapter; runtime rejects provider values other than `postgres`.
- `backend/src/auth/`: JWT strategy, guards, role decorators and auth controllers.
- `backend/src/common/`: shared decorators, guards, pipes, filters and helpers.

Global HTTP authentication is default-deny for protected routes; `@Public()` explicitly opens endpoints. Role guards apply role-specific access. This describes code-level architecture, not a complete penetration-test result.

## Feature module map

| Module | Responsibility / controller prefix |
|---|---|
| `auth` | login/register, JWT, password/onboarding actions (`/auth`) |
| `users` | profiles/users/roles; bounded client picker (`/api/users/clients`) and admin-only expanded list (`/api/users/clients/admin`) |
| `salon` | salon settings, schedules and holidays (`/api/salon`) |
| `services` | service/category catalog (`/api/services`) |
| `stylists` | stylist profile, work schedule and availability (`/api/stylists`) |
| `reservations` | booking, availability, lifecycle, public reservation views (`/api/reservations`, `/api/public/reservations`) |
| `daily-log` | completed/manual service records (`/api/daily-log`) |
| `finance` | income/expense books, expenses/templates/categories, client debts (`/api/income-books`, `/api/expense-books`, `/api/expenses`, `/api/expense-templates`, `/api/expense-categories`, `/api/client-debts`) |
| `loyalty` | client/stylist/admin loyalty surfaces (`/api/loyalty`) |
| `notifications` | in-app and push-token operations (`/api/notifications`) |
| `events` | Socket.IO gateway and rooms (no REST controller) |
| `blog`, `gallery`, `reviews` | `/api/blog` public list/detail/comment reads are published/approved-only with display projections; draft/all-content reads use admin routes. Review public list/featured are approved-only, detail requires JWT, moderation list is role-guarded (`/api/reviews/admin`) |
| `settings` | app configuration/settings (`/api/settings`) |
| `analytics` | dashboard reporting (`/api/analytics`) |
| `app-releases` | mobile release metadata/public update routes (`/api/app-releases`, `/api/public/app-releases`) |
| `uploads` | file upload/delete API (`/api/uploads`) |
| `config`, `prisma`, `i18n` | configuration, persistence and translations |

Controller files define the precise route/guard/DTO contract; the table is only a module index.

## Core data and request flows

### Authentication and route access

JWT strategy loads the user and current roles; global guards protect routes unless `@Public()` opts out. Authenticated identity comes from request claims plus DB lookups. See `src/auth/` and per-controller decorators. The audit identifies places where returned projections/ownership checks may be insufficient; see the user/client, review and upload findings in [FINDINGS.md](../audit/FINDINGS.md).

### Reservation lifecycle and availability

1. Availability service loads service, salon, stylist schedules, holidays and existing appointments, then builds available dates/slots.
2. `ReservationsService` validates request, selects/reserves stylist responses and persists service items/status.
3. Stylist/admin lifecycle actions advance or cancel a reservation; attendance/start/complete/no-show and optional reschedule/reorder actions are separate transitions.
4. `DailyLogService` can create/complete an entry for performed service. Finance and loyalty may then receive derived writes; downstream consistency/races need PostgreSQL tests.
5. Services emit Socket.IO events and notifications around relevant operations.

Read implementation in `src/reservations/`, `src/daily-log/`, `src/finance/` and `src/loyalty/`; this list is not a concurrency proof. Several writes need transaction/idempotency review in the phased plan.

### Finance and debts

Finance maintains monthly income/expense books, entries, manual income, expense configuration and client debt/repayment flows. Closed-book checks exist in individual services; verify transactional semantics under concurrent close/write with the planned isolated PostgreSQL tests. Financial correctness findings are linked in [FINDINGS.md](../audit/FINDINGS.md).

### Files and external services

- Upload handler is in `src/uploads/`; files are stored beneath `UPLOAD_ROOT` and the upload root is statically served by `main.ts` under `/uploads/`.
- Notifications include in-app persistence/socket delivery and Expo push integration. External SMTP/push delivery configuration is not runtime-verified.
- Blog content may include HTML; public rendering/sanitization review is documented in the findings.

### Socket.IO and scheduled work

- `src/events/events.gateway.ts` manages authentication/rooms; `src/events/socket-events.ts` lists event contracts. There is no Redis Socket.IO adapter in current wiring; room and connection maps are process-local.
- `@nestjs/schedule` jobs are registered in-process (reservation timeout/delay and finance rollover/reminder jobs). No distributed lock/queue is configured. Horizontal replica safety must be established before scaling these jobs.

## Database and migration layout

- Active PostgreSQL migration files: `prisma/migrations/20260822100257_postgresql_baseline/` and `prisma/migrations/20260915085100_blog_post_seo/`.
- Historical MySQL migration archive: `prisma/migrations_mysql_backup/` (tracked, separate from the active path; do not apply through the PostgreSQL migrator).
- Root Compose does not provide a DB; backend connects through external network `db_net`.
- No claim is made here about production DB version, data migration history, backup or restore status.

Migration operations and caveats: [`backend/POSTGRES_MIGRATION.md`](../../backend/POSTGRES_MIGRATION.md).

## Build, tests and deployment boundary

- Package scripts live in `backend/package.json`; backend Jest specs are colocated with source. `test:e2e` currently references absent `test/jest-e2e.json`.
- `npm run lint` is read-only; `npm run lint:fix` is explicitly mutating. The existing type-aware lint baseline is not a gate while Prisma Client generation is blocked/missing and diagnostics remain.
- The backend Docker entrypoint runs `prisma migrate deploy` before Nest. Docker build uses a dummy generate-only URL; runtime `DATABASE_URL`/JWT/encryption key come from environment.
- Root Compose contains frontend/backend only, expects external `db_net`, and mounts uploads. It does not declare PostgreSQL, Redis, healthchecks or deployment proxy labels.
- No live production API/database, browser, device or external notification service was accessed for the audit. See [TEST_WORKFLOW.md](../audit/TEST_WORKFLOW.md).
